import { useCallback } from 'react';
import { jsPDF } from "jspdf";
import 'svg2pdf.js'; // Side-effect import
import { parseViewBox } from '../utils/svgUtils.js'; // Removed combineViewBoxes as it's not used directly here
import { vec } from '../utils/geometryUtils.js'; // Although not directly used here, it was in the original file, keeping for potential future use or if renderMeasurementToSvg needs it implicitly.

const LOG_PREFIX = "[PDF Export]";

// Parses layout string "rowsxcols" into [rows, cols] (Copied from Viewbox.jsx)
const parseLayout = (layoutString) => {
  if (!layoutString || !layoutString.includes('x')) {
    return [1, 1]; // Default to 1x1 if invalid
  }
  const [rows, cols] = layoutString.split('x').map(Number);
  return [isNaN(rows) ? 1 : rows, isNaN(cols) ? 1 : cols];
};

// --- Standard Paper Sizes (mm) ---
const PAPER_SIZES = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  // Add more sizes if needed
};

// --- PDF Page Layout Constants (mm) ---
const DEFAULT_PAPER_SIZE = 'a4'; // Or 'letter'
// const PAGE_MARGIN = 10; // mm - Replaced by specific margins
const MARGIN_LEFT_PORTRAIT = 20; // mm
const MARGIN_TOP_LANDSCAPE = 20; // mm
const MARGIN_OTHER = 10; // mm (Top/Bottom/Right for Portrait, Left/Bottom/Right for Landscape)
// const MAIN_TITLE_HEIGHT = 8; // mm - Removed as titles are no longer used
const VIEW_TITLE_HEIGHT = 5; // mm // Height allocated for individual view titles (used within renderViewToPdfSvg)
const MAIN_TITLE_FONT_SIZE = 4; // mm
const VIEW_TITLE_FONT_SIZE = 3; // mm
const VIEW_GAP = 10; // mm // Gap between views in combined part layouts
const PDF_SCALE = 1; // 1 SVG unit = 1 PDF unit (mm) - Assuming SVG units are mm

// --- SVG Path Transformation Helpers (Copied from technicalDrawingProcessor.js) ---

/**
 * Parses an SVG path 'd' attribute string into an array of command objects.
 * Handles absolute/relative commands and various parameter counts.
 * @param {string} d - The SVG path data string.
 * @returns {Array<Object>} Array of command objects (e.g., { command: 'M', values: [x, y] }). Returns empty array on error.
 */
function parsePathData(d) {
  if (!d || typeof d !== 'string') {
    console.error("Invalid input to parsePathData:", d);
    return [];
  }
  // Regex to capture command and parameters, handling scientific notation and optional commas/spaces
  const commandRegex = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/ig;
  const commands = [];
  let match;

  while ((match = commandRegex.exec(d)) !== null) {
    const command = match[1];
    const paramString = match[2].trim();
    // Regex to extract numbers (including scientific notation) separated by spaces, commas, or signs
    const paramRegex = /[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g;
    const values = (paramString.match(paramRegex) || []).map(Number);

    // Basic validation: Check if any extracted number is NaN
    if (values.some(isNaN)) {
      console.warn(`Skipping command due to invalid parameters: ${match[0]}`);
      continue; // Skip this command if parsing failed
    }

    commands.push({ command, values });
  }
  return commands;
}

/**
 * Applies a translation (tx, ty) to the coordinates within a parsed path data array.
 * Modifies the array in place.
 * @param {Array<Object>} pathDataArray - Parsed path data from parsePathData.
 * @param {number} tx - Translation offset in X.
 * @param {number} ty - Translation offset in Y.
 */
function transformPathData(pathDataArray, tx, ty) {
  pathDataArray.forEach(item => {
    const command = item.command;
    const values = item.values;

    // Only transform coordinates for absolute commands
    // Relative commands ('m', 'l', 'h', 'v', 'c', 's', 'q', 't', 'a') remain relative to the previous point
    // and don't need direct translation of their parameters.
    // The absolute 'M' command sets the starting point, which needs translation.
    // Subsequent absolute commands define points in the translated coordinate space.
    if (command === command.toUpperCase() && command !== 'Z') { // Absolute commands (except Z)
      for (let i = 0; i < values.length; i++) {
        // Apply transformation based on command type and parameter index
        // M, L, T: (x y)+ pairs
        // H: x+ values
        // V: y+ values
        // C: (x1 y1 x2 y2 x y)+ triplets
        // S, Q: (x2 y2 x y)+ pairs
        // A: (rx ry x-axis-rotation large-arc-flag sweep-flag x y)+ sets
        // We need to transform the endpoint coordinates (x, y)
        // and control points for curves (x1, y1, x2, y2).
        // Radii (rx, ry) and flags for arcs are not translated.

        switch (command) {
          case 'M':
          case 'L':
          case 'T':
            // Every value is a coordinate pair (x, y)
            values[i] += (i % 2 === 0) ? tx : ty;
            break;
          case 'H':
            // Only x values
            values[i] += tx;
            break;
          case 'V':
            // Only y values
            values[i] += ty;
            break;
          case 'C':
            // (x1 y1 x2 y2 x y) - transform all
            values[i] += (i % 2 === 0) ? tx : ty;
            break;
          case 'S':
          case 'Q':
            // (x2 y2 x y) - transform all
            values[i] += (i % 2 === 0) ? tx : ty;
            break;
          case 'A':
            // (rx ry angle large-arc sweep x y) - only transform last two (x, y)
            if (i >= 5) { // Indices 5 and 6 are x and y
              values[i] += (i % 2 !== 0) ? tx : ty; // Index 5 is x, Index 6 is y
            }
            break;
        }
      }
    }
  });
}


/**
 * Serializes a parsed (and potentially transformed) path data array back into an SVG 'd' string.
 * @param {Array<Object>} pathDataArray - The array of command objects.
 * @returns {string} The reconstructed SVG path data string.
 */
function serializePathData(pathDataArray) {
  return pathDataArray.map(item => {
    // Format numbers to avoid excessive precision, but handle potential scientific notation
    const paramsString = item.values.map(v => {
        // Use exponential notation for very small or very large numbers, otherwise fixed precision
        if (Math.abs(v) > 1e6 || (Math.abs(v) < 1e-4 && v !== 0)) {
            return v.toExponential(4);
        }
        return parseFloat(v.toFixed(4)); // Limit precision
    }).join(' ');
    return `${item.command}${paramsString}`;
  }).join('');
}

// --- End SVG Path Transformation Helpers ---


// --- Helper Function to Determine Optimal Page Layout ---
/**
 * Determines the optimal standard paper orientation, dimensions, margins, and printable area based on content aspect ratio.
 * @param {number} contentWidth - Width of the drawing content (mm).
 * @param {number} contentHeight - Height of the drawing content (mm).
 * @param {string} paperSizeKey - Key for the desired paper size (e.g., 'a4').
 * @returns {{
 *   orientation: 'p'|'l',
 *   width: number, height: number,
 *   marginLeft: number, marginTop: number, marginRight: number, marginBottom: number,
 *   printableX: number, printableY: number,
 *   printableWidth: number, printableHeight: number
 * }}
 */
const getStandardPageLayout = (contentWidth, contentHeight, paperSizeKey = DEFAULT_PAPER_SIZE) => {
  const paper = PAPER_SIZES[paperSizeKey] || PAPER_SIZES.a4;
  const contentAspectRatio = contentWidth > 1e-6 ? contentWidth / contentHeight : 1;

  // Dimensions for portrait and landscape
  const portrait = { width: paper.width, height: paper.height };
  const landscape = { width: paper.height, height: paper.width };

  // Calculate potential printable areas for both orientations *before* deciding orientation
  // Portrait Margins
  const pMarginLeft = MARGIN_LEFT_PORTRAIT;
  const pMarginTop = MARGIN_OTHER;
  const pMarginRight = MARGIN_OTHER;
  const pMarginBottom = MARGIN_OTHER;
  const pPrintableWidth = portrait.width - pMarginLeft - pMarginRight;
  const pPrintableHeight = portrait.height - pMarginTop - pMarginBottom; // Removed MAIN_TITLE_HEIGHT

  // Landscape Margins
  const lMarginLeft = MARGIN_OTHER;
  const lMarginTop = MARGIN_TOP_LANDSCAPE;
  const lMarginRight = MARGIN_OTHER;
  const lMarginBottom = MARGIN_OTHER;
  const lPrintableWidth = landscape.width - lMarginLeft - lMarginRight;
  const lPrintableHeight = landscape.height - lMarginTop - lMarginBottom; // Removed MAIN_TITLE_HEIGHT

  // Calculate scaling factors for both orientations based on their respective printable areas
  const scaleP = Math.min(pPrintableWidth / contentWidth, pPrintableHeight / contentHeight);
  const scaleL = Math.min(lPrintableWidth / contentWidth, lPrintableHeight / contentHeight);

  // Choose orientation that gives better scale (less wasted space)
  if (scaleL > scaleP) {
    // Landscape is better fit
    const marginLeft = lMarginLeft;
    const marginTop = lMarginTop;
    const marginRight = lMarginRight;
    const marginBottom = lMarginBottom;
    const printableX = marginLeft;
    const printableY = marginTop; // Removed MAIN_TITLE_HEIGHT
    const printableWidth = lPrintableWidth;
    const printableHeight = lPrintableHeight;
    return {
      orientation: 'l',
      width: landscape.width,
      height: landscape.height,
      marginLeft, marginTop, marginRight, marginBottom,
      printableX, printableY,
      printableWidth, printableHeight,
    };
  } else {
    // Portrait is better or equal fit
    const marginLeft = pMarginLeft;
    const marginTop = pMarginTop;
    const marginRight = pMarginRight;
    const marginBottom = pMarginBottom;
    const printableX = marginLeft;
    const printableY = marginTop; // Removed MAIN_TITLE_HEIGHT
    const printableWidth = pPrintableWidth;
    const printableHeight = pPrintableHeight;
    return {
      orientation: 'p',
      width: portrait.width,
      height: portrait.height,
      marginLeft, marginTop, marginRight, marginBottom,
      printableX, printableY,
      printableWidth, printableHeight,
    };
  }
};


// --- Helper Function for Measurement SVG Rendering (for PDF) ---
// Replicates MeasurementDisplay logic but creates SVG elements directly
const renderMeasurementToSvg = (measurementData, geometry) => {
  const { pathId, type, textPosition } = measurementData;
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  // Styles (match MeasurementDisplay)
  const strokeColor = "#222222";
  const strokeWidth = 0.08; // Reduced thickness for PDF
  const fontSize = 2.2;
  const arrowSize = 1.2;
  const textOffset = 1.2;
  const extensionGap = 0.8;
  const extensionOverhang = 1.2;

  // Helper to create SVG elements
  const createSvgElement = (tag, attributes) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const key in attributes) {
      el.setAttribute(key, attributes[key]);
    }
    return el;
  };

  if (type === 'line' && geometry?.endpoints) {
    const [p1, p2] = geometry.endpoints;
    const length = geometry.length || 0;
    const textContent = length.toFixed(2);

    const vx = p2[0] - p1[0];
    const vy = p2[1] - p1[1];
    const midX = (p1[0] + p2[0]) / 2;
    const midY = (p1[1] + p2[1]) / 2;
    const lineLen = Math.sqrt(vx * vx + vy * vy);
    const ux = lineLen > 1e-6 ? vx / lineLen : 1;
    const uy = lineLen > 1e-6 ? vy / lineLen : 0;
    const nx = -uy;
    const ny = ux;

    const textOffsetX = textPosition.x - midX;
    const textOffsetY = textPosition.y - midY;
    const offsetDist = textOffsetX * nx + textOffsetY * ny;
    const actualOffsetDist = Math.abs(offsetDist) < textOffset ? Math.sign(offsetDist || 1) * textOffset : offsetDist;

    const dimLineP1 = [p1[0] + nx * actualOffsetDist, p1[1] + ny * actualOffsetDist];
    const dimLineP2 = [p2[0] + nx * actualOffsetDist, p2[1] + ny * actualOffsetDist];
    const extLineP1Start = [p1[0] + nx * Math.sign(actualOffsetDist) * extensionGap, p1[1] + ny * Math.sign(actualOffsetDist) * extensionGap];
    const extLineP2Start = [p2[0] + nx * Math.sign(actualOffsetDist) * extensionGap, p2[1] + ny * Math.sign(actualOffsetDist) * extensionGap];
    const extLineP1End = [dimLineP1[0] + nx * Math.sign(actualOffsetDist) * extensionOverhang, dimLineP1[1] + ny * Math.sign(actualOffsetDist) * extensionOverhang];
    const extLineP2End = [dimLineP2[0] + nx * Math.sign(actualOffsetDist) * extensionOverhang, dimLineP2[1] + ny * Math.sign(actualOffsetDist) * extensionOverhang];

    const arrowNormX = ux;
    const arrowNormY = uy;
    const arrow1 = `M ${dimLineP1[0]} ${dimLineP1[1]} l ${arrowNormX * arrowSize} ${arrowNormY * arrowSize} l ${-arrowNormY * arrowSize * 0.35} ${arrowNormX * arrowSize * 0.35} l ${-arrowNormX * arrowSize * 0.65} ${-arrowNormY * arrowSize * 0.65} z`;
    const arrow2 = `M ${dimLineP2[0]} ${dimLineP2[1]} l ${-arrowNormX * arrowSize} ${-arrowNormY * arrowSize} l ${arrowNormY * arrowSize * 0.35} ${-arrowNormX * arrowSize * 0.35} l ${arrowNormX * arrowSize * 0.65} ${arrowNormY * arrowSize * 0.65} z`;

    const textWidthEstimate = textContent.length * fontSize * 0.65;
    const gapSize = textWidthEstimate + textOffset * 2;
    const halfGap = gapSize / 2;
    const textProj = (textPosition.x - dimLineP1[0]) * arrowNormX + (textPosition.y - dimLineP1[1]) * arrowNormY;
    const breakStartPos = Math.max(arrowSize, textProj - halfGap);
    const breakEndPos = Math.min(lineLen - arrowSize, textProj + halfGap);
    const dimLine1End = [dimLineP1[0] + arrowNormX * breakStartPos, dimLineP1[1] + arrowNormY * breakStartPos];
    const dimLine2Start = [dimLineP1[0] + arrowNormX * breakEndPos, dimLineP1[1] + arrowNormY * breakEndPos];
    const showDimLine1 = breakStartPos > arrowSize + 1e-6;
    const showDimLine2 = breakEndPos < lineLen - arrowSize - 1e-6;

    // Create SVG elements with line caps/joins
    group.appendChild(createSvgElement('line', { x1: extLineP1Start[0], y1: extLineP1Start[1], x2: extLineP1End[0], y2: extLineP1End[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    group.appendChild(createSvgElement('line', { x1: extLineP2Start[0], y1: extLineP2Start[1], x2: extLineP2End[0], y2: extLineP2End[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    if (showDimLine1) group.appendChild(createSvgElement('line', { x1: dimLineP1[0], y1: dimLineP1[1], x2: dimLine1End[0], y2: dimLine1End[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    if (showDimLine2) group.appendChild(createSvgElement('line', { x1: dimLine2Start[0], y1: dimLine2Start[1], x2: dimLineP2[0], y2: dimLineP2[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    group.appendChild(createSvgElement('path', { d: arrow1, fill: strokeColor, stroke: 'none' })); // Arrows don't need linecap/join
    group.appendChild(createSvgElement('path', { d: arrow2, fill: strokeColor, stroke: 'none' })); // Arrows don't need linecap/join
    const textEl = createSvgElement('text', { x: textPosition.x, y: textPosition.y, 'font-size': fontSize, fill: strokeColor, stroke: 'none', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'Arial, sans-serif' });
    textEl.textContent = textContent;
    group.appendChild(textEl);

  } else if (type === 'circle' && geometry?.center && geometry.diameter != null) {
    const [cx, cy] = geometry.center;
    const diameter = geometry.diameter;
    const radius = geometry.radius || diameter / 2;
    const textContent = `⌀${diameter.toFixed(2)}`;

    // Simplified rendering for PDF - always use leader line for now
    const textVecX = textPosition.x - cx;
    const textVecY = textPosition.y - cy;
    const distSqr = textVecX * textVecX + textVecY * textVecY;
    let angle = (distSqr < 1e-9) ? 0 : Math.atan2(textVecY, textVecX);
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    const leaderStart = [cx + cosA * radius, cy + sinA * radius]; // Start on circumference
    const leaderEnd = [textPosition.x - cosA * textOffset, textPosition.y - sinA * textOffset]; // End near text

    group.appendChild(createSvgElement('line', { x1: leaderStart[0], y1: leaderStart[1], x2: leaderEnd[0], y2: leaderEnd[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    const textEl = createSvgElement('text', { x: textPosition.x, y: textPosition.y, 'font-size': fontSize, fill: strokeColor, stroke: 'none', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'Arial, sans-serif' });
    textEl.textContent = textContent;
    group.appendChild(textEl);
  }

  return group;
};



export function useTechnicalDrawingPdfExport(viewboxes, activeMeasurements) { // Updated signature

  // --- PDF Rendering Helper (Modified for Standard Page Size & Printable Area) ---
  // Wrapped in useCallback to ensure stability if passed as dependency
  // Ensure constants defined outside the hook are accessible or passed if needed.
  const renderViewToPdfSvg = useCallback((targetSvgGroup, viewData, viewTitle, position, printableDimensions, viewId, isPartLayout = false, layoutOffsets = {}) => {
    const logPrefixRender = `${LOG_PREFIX} Render[${viewId || viewTitle}]`;
    // position is the top-left of the printable area (e.g., [PAGE_MARGIN, PAGE_MARGIN + MAIN_TITLE_HEIGHT])
    // printableDimensions is the { width, height } of the area *within* margins where content should be drawn
    console.log(`${logPrefixRender} Rendering ${isPartLayout ? 'Part Layout' : 'View'} into printable area at [${position}] target ${printableDimensions.width}x${printableDimensions.height}mm`);

    if (!viewData || !printableDimensions || !viewData.combinedViewBox) {
      console.warn(`${logPrefixRender} Skipping render due to missing data:`, { viewData, printableDimensions });
      return;
    }
    const [printableX, printableY] = position;
    const { width: targetWidth, height: targetHeight } = printableDimensions; // Target *printable* area on PDF page (mm)
    console.log(`${LOG_PREFIX}   View Printable Area: x=${printableX}, y=${printableY}, width=${targetWidth}, height=${targetHeight}`);

    const combinedViewBoxData = parseViewBox(viewData.combinedViewBox);
    console.log(`${logPrefixRender}   Layout Combined ViewBox (Content Source): ${viewData.combinedViewBox}`, combinedViewBoxData);
    if (!combinedViewBoxData || combinedViewBoxData.width <= 0 || combinedViewBoxData.height <= 0) {
      console.warn(`${logPrefixRender} Skipping render due to invalid combined viewBox: ${viewData.combinedViewBox}`);
      return;
    }

    // Create a group for this whole view, positioned at the top-left of the printable area
    const viewGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    viewGroup.setAttribute('transform', `translate(${printableX}, ${printableY})`);
    targetSvgGroup.appendChild(viewGroup);

    // --- Add View Title (Optional, maybe remove if main title is enough?) ---
    // If keeping, position it relative to the viewGroup (printable area)
    // Accessing VIEW_TITLE_HEIGHT and VIEW_TITLE_FONT_SIZE from constants defined outside the hook
    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleText.setAttribute('x', targetWidth / 2); // Center within printable width
    titleText.setAttribute('y', VIEW_TITLE_HEIGHT / 2); // Position within its allocated height
    titleText.setAttribute('font-size', VIEW_TITLE_FONT_SIZE);
    titleText.setAttribute('font-family', 'Arial, sans-serif');
    titleText.setAttribute('text-anchor', 'middle');
    titleText.setAttribute('dominant-baseline', 'middle');
    titleText.setAttribute('fill', '#333333');
    titleText.textContent = viewTitle; // Use the passed title (e.g., "Part Name" or "Standard Layout")
    // viewGroup.appendChild(titleText); // Decide if needed - maybe only for multi-part pages?

    // --- Calculate Transformation (Scale & Center Content within Printable Area) ---
    const contentAreaY = 0; // Start content drawing from the top of the printable area (title space is handled by MAIN_TITLE_HEIGHT)
    const contentAreaHeight = targetHeight; // Use full printable height

    const scaleX = targetWidth / combinedViewBoxData.width;
    const scaleY = (combinedViewBoxData.height > 1e-6) ? contentAreaHeight / combinedViewBoxData.height : 1;
    const scale = Math.min(scaleX, scaleY); // Scale to fit *within* printable area
    console.log(`${logPrefixRender}   Calculated Content Scale: scaleX=${scaleX.toFixed(4)}, scaleY=${scaleY.toFixed(4)}, finalScale=${scale.toFixed(4)}`);

    const scaledContentWidth = combinedViewBoxData.width * scale;
    const scaledContentHeight = combinedViewBoxData.height * scale;
    // Center the scaled content within the printable area
    const contentTranslateX = (targetWidth - scaledContentWidth) / 2 - combinedViewBoxData.x * scale;
    const contentTranslateY = contentAreaY + (contentAreaHeight - scaledContentHeight) / 2 - combinedViewBoxData.y * scale;
    console.log(`${logPrefixRender}   Calculated Content Translation (within printable area): dX=${contentTranslateX.toFixed(2)}, dY=${contentTranslateY.toFixed(2)}`);
    console.log(`${logPrefixRender}   Scaled Content Size: ${scaledContentWidth.toFixed(2)}x${scaledContentHeight.toFixed(2)}mm`);

    // --- Create Main Content Group with Calculated Transform ---
    // This group holds all drawing paths and measurements, scaled and centered
    const mainContentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const mainContentTransform = `translate(${contentTranslateX}, ${contentTranslateY}) scale(${scale})`;
    mainContentGroup.setAttribute('transform', mainContentTransform);
    console.log(`${logPrefixRender}   Applied Main Content Group Transform: ${mainContentTransform}`);
    viewGroup.appendChild(mainContentGroup); // Append to the viewGroup

    // Add Border around the *printable area* (relative to viewGroup)
    const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    borderRect.setAttribute('x', 0);
    borderRect.setAttribute('y', 0); // Border starts at top-left of printable area
    borderRect.setAttribute('width', targetWidth);
    borderRect.setAttribute('height', targetHeight); // Use full printable height
    borderRect.setAttribute('fill', 'none');
    borderRect.setAttribute('stroke', '#000000'); // Changed border to black
    borderRect.setAttribute('stroke-width', 0.2); // Use a fixed stroke width, non-scaling-stroke might not be needed here
    viewGroup.appendChild(borderRect); // Add border relative to the viewGroup

    // Declare view group variables here to be accessible by measurement rendering
    let frontGroup = null, topGroup = null, rightGroup = null;
    let allPaths = []; // For standard layout measurement lookup

    // --- Render Paths into Main Content Group ---
    // Stroke width needs to be scaled inversely if not using vector-effect
    const baseStrokeWidth = 0.15; // Base visible stroke width in mm
    const hiddenStrokeWidth = 0.1; // Base hidden stroke width in mm
    const effectiveStrokeWidth = scale > 0 ? baseStrokeWidth / scale : baseStrokeWidth;
    const effectiveHiddenStrokeWidth = scale > 0 ? hiddenStrokeWidth / scale : hiddenStrokeWidth;
    const strokeScale = scale > 0 ? 1 / scale : 1; // For dash scaling relative to scaled view
    console.log(`${logPrefixRender}   Effective Stroke Widths: Visible=${effectiveStrokeWidth.toFixed(4)}, Hidden=${effectiveHiddenStrokeWidth.toFixed(4)}, DashScale=${strokeScale.toFixed(3)}`);

    const renderPaths = (paths, targetGroup) => {
      if (!paths || !Array.isArray(paths)) return;
      paths.forEach(path => {
        const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathEl.setAttribute('d', path.data);
        const isHidden = path.visibility === 'hidden'; // Check visibility flag
        pathEl.setAttribute('stroke', isHidden ? '#777777' : '#000000');
        // Set stroke width in the original coordinate system (before scaling)
        pathEl.setAttribute('stroke-width', isHidden ? effectiveHiddenStrokeWidth : effectiveStrokeWidth);
        pathEl.setAttribute('stroke-linecap', 'round');
        pathEl.setAttribute('stroke-linejoin', 'round');
        if (isHidden) {
          // Dash array values are also in the original coordinate system
          pathEl.setAttribute('stroke-dasharray', `${2 * strokeScale},${1 * strokeScale}`);
        }
        pathEl.setAttribute('fill', 'none');
        // vector-effect='non-scaling-stroke' is crucial for maintaining constant stroke width visually after scaling
        pathEl.setAttribute('vector-effect', 'non-scaling-stroke');
        targetGroup.appendChild(pathEl);
      });
    };

    // Render paths based on layout type
    if (isPartLayout) {
      console.log(`${logPrefixRender}   Rendering Part Layout Views with Offsets...`);
      // Create groups for each view, applying the calculated offsets relative to the combined layout's origin
      // These offsets were calculated in `calculatePartLayout` based on viewGaps etc.
      // The mainContentGroup already handles the overall scaling and centering of the combined layout.

      // Front View - Assign to pre-declared variable
      frontGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      frontGroup.setAttribute('transform', `translate(${layoutOffsets.front.x}, ${layoutOffsets.front.y})`);
      mainContentGroup.appendChild(frontGroup);
      renderPaths(viewData.frontPaths, frontGroup);

      // Top View - Assign to pre-declared variable
      if (viewData.topPaths && layoutOffsets.top) {
        topGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        topGroup.setAttribute('transform', `translate(${layoutOffsets.top.x}, ${layoutOffsets.top.y})`);
        mainContentGroup.appendChild(topGroup);
        renderPaths(viewData.topPaths, topGroup);
      }

      // Right View - Assign to pre-declared variable
      if (viewData.rightPaths && layoutOffsets.right) {
        rightGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        rightGroup.setAttribute('transform', `translate(${layoutOffsets.right.x}, ${layoutOffsets.right.y})`);
        mainContentGroup.appendChild(rightGroup);
        renderPaths(viewData.rightPaths, rightGroup);
      }
    } else {
      // Standard Layout: Render all paths directly into the scaled/centered mainContentGroup
      console.log(`${logPrefixRender}   Rendering Standard Layout Paths...`);
      // Combine visible and hidden paths for rendering and assign to pre-declared allPaths
      allPaths = [
          ...(viewData.visible?.paths?.map(p => ({ ...p, visibility: 'visible' })) || []),
          ...(viewData.hidden?.paths?.map(p => ({ ...p, visibility: 'hidden' })) || [])
      ];
      renderPaths(allPaths, mainContentGroup);
    }


    // --- Render Measurements ---
    console.log(`${logPrefixRender} Rendering Measurements...`);
    const partNamePrefix = isPartLayout ? viewId.split('_layout_')[0] : null; // Extract PartName_ prefix if it's a part layout

    Object.values(activeMeasurements)
      // Filter measurements:
      // - For standard layout, match exact viewId ("standard_layout")
      // - For part layout, match measurements whose viewId starts with the part name prefix (e.g., "PartName_")
      .filter(m => isPartLayout ? m.viewId?.startsWith(partNamePrefix + '_') : m.viewId === viewId)
      .forEach(measurement => {
        console.log(`${logPrefixRender}   Processing measurement: ${measurement.pathId} (View: ${measurement.viewId})`);
        let targetMeasurementGroup = null; // Group to append the measurement SVG to
        let associatedPath = null;
        let pathsToSearch = [];

        // Determine which group and paths to use based on the measurement's specific viewId
        if (isPartLayout) {
          if (measurement.viewId?.endsWith('_front')) {
            targetMeasurementGroup = frontGroup; // Append to the offset front view group
            pathsToSearch = viewData.frontPaths || [];
            console.log(`${logPrefixRender}     -> Belongs to Front View`);
          } else if (measurement.viewId?.endsWith('_top')) {
            targetMeasurementGroup = topGroup; // Append to the offset top view group
            pathsToSearch = viewData.topPaths || [];
             console.log(`${logPrefixRender}     -> Belongs to Top View`);
          } else if (measurement.viewId?.endsWith('_right')) {
            targetMeasurementGroup = rightGroup; // Append to the offset right view group
            pathsToSearch = viewData.rightPaths || [];
             console.log(`${logPrefixRender}     -> Belongs to Right View`);
          } else {
             console.warn(`${logPrefixRender}     -> Could not determine target view group for part measurement: ${measurement.viewId}`);
             return; // Skip if we can't determine the target group
          }
        } else {
          // Standard layout: target the main group and search combined paths
          targetMeasurementGroup = mainContentGroup;
          pathsToSearch = allPaths || []; // Use the combined paths list
           console.log(`${logPrefixRender}     -> Belongs to Standard Layout`);
        }

        if (!targetMeasurementGroup) {
             console.warn(`${logPrefixRender}     -> Target measurement group is null, skipping measurement ${measurement.pathId}`);
             return;
        }

        // Find the associated path geometry using the measurement.pathId (which is the unique path ID)
        associatedPath = pathsToSearch.find(p => p.id === measurement.pathId);

        if (associatedPath?.geometry) {
          console.log(`${logPrefixRender}     Found geometry for path ${associatedPath.id}`);
          const measurementSvgGroup = renderMeasurementToSvg(measurement, associatedPath.geometry);
          if (measurementSvgGroup) {
              // Measurement coordinates are absolute based on geometry, so they should render correctly
              // relative to the paths within their respective (potentially offset) group.
              targetMeasurementGroup.appendChild(measurementSvgGroup);
              console.log(`${logPrefixRender}     Appended measurement SVG to target group.`);
          } else {
              console.warn(`${logPrefixRender}     renderMeasurementToSvg returned null for ${measurement.pathId}`);
          }
        } else {
           console.warn(`${logPrefixRender}     Could not find geometry for measurement pathId: ${measurement.pathId} in searched paths (count: ${pathsToSearch.length})`);
        }
      });

    console.log(`${logPrefixRender} Finished Rendering ${isPartLayout ? 'Part Layout' : 'View'}`);
  }, [activeMeasurements]); // Dependency: activeMeasurements


  // --- PDF Export Logic ---
  const exportPdf = useCallback(async () => {
    console.log(`${LOG_PREFIX} Starting PDF Export...`);
    // --- !! MAJOR CHANGE: Use viewboxes instead of projections !! ---
    console.log(`${LOG_PREFIX} Input Viewboxes:`, viewboxes);
    console.log(`${LOG_PREFIX} Input Measurements:`, activeMeasurements);


    // Check if we have viewboxes to export
    if (!viewboxes || viewboxes.length === 0) {
      console.error(`${LOG_PREFIX} No viewboxes available for PDF export.`);
      alert("No viewboxes created yet to export.");
      return;
    }

    // Constants defined outside the hook are used here (e.g., PDF_SCALE, PAGE_MARGIN, MAIN_TITLE_HEIGHT, DEFAULT_PAPER_SIZE, VIEW_GAP)

    let pdf;
    let pdfFilename = 'technical-drawing-viewboxes.pdf';
    let isFirstPage = true;

    try {
      // --- Loop through each Viewbox ---
      for (const [index, viewbox] of viewboxes.entries()) {
        console.log(`${LOG_PREFIX} Processing Viewbox ${index + 1}/${viewboxes.length}: ID=${viewbox.id}, Layout=${viewbox.layout}`);

        // --- 1. Prepare SVG Content for this Viewbox ---
        // We need to create an SVG representation of the viewbox grid and its items.
        // This requires calculating the combined bounding box of all items within the viewbox.
        // For simplicity now, let's assume a fixed size or use the first item's viewBox.
        // TODO: Implement proper calculation of combined content bounds for the viewbox grid.
        let combinedContentVB = null;
        const validItems = viewbox.items.filter(item => item && item.svgData && item.svgData.viewBox);

        if (validItems.length > 0) {
          // Simple approach: use the first valid item's viewBox
          // A more robust approach would combine all item viewBoxes considering grid layout.
          combinedContentVB = parseViewBox(validItems[0].svgData.viewBox);
          console.log(`${LOG_PREFIX}   Using viewBox of first item for layout:`, combinedContentVB);
        } else {
          console.warn(`${LOG_PREFIX}   Viewbox ${viewbox.id} has no items with valid viewBox. Using default size.`);
          // Use a default size if no items have a viewBox
          combinedContentVB = { x: 0, y: 0, width: 100, height: 100 }; // Default 100x100 mm content size
        }

        if (!combinedContentVB || combinedContentVB.width <= 0 || combinedContentVB.height <= 0) {
           console.warn(`${LOG_PREFIX}   Skipping Viewbox ${viewbox.id} due to invalid calculated content bounds.`);
           continue; // Skip this viewbox
        }

        // --- 2. Determine Page Layout for this Viewbox ---
        const contentWidth = combinedContentVB.width * PDF_SCALE;
        const contentHeight = combinedContentVB.height * PDF_SCALE;
        const pageLayout = getStandardPageLayout(contentWidth, contentHeight);
        console.log(`${LOG_PREFIX}   Page Layout: size=${DEFAULT_PAPER_SIZE}, orientation=${pageLayout.orientation}, W=${pageLayout.width}mm, H=${pageLayout.height}mm`);
        console.log(`${LOG_PREFIX}   Printable Area: W=${pageLayout.printableWidth}mm, H=${pageLayout.printableHeight}mm`);

        // --- 3. Initialize PDF or Add Page ---
        if (isFirstPage) {
          console.log(`${LOG_PREFIX}   Initializing jsPDF: format='${DEFAULT_PAPER_SIZE}', orientation='${pageLayout.orientation}', unit='mm'`);
          pdf = new jsPDF({ orientation: pageLayout.orientation, unit: 'mm', format: DEFAULT_PAPER_SIZE });
          isFirstPage = false;
        } else {
          console.log(`${LOG_PREFIX}   Adding Page ${pdf.internal.getNumberOfPages() + 1} to PDF: format='${DEFAULT_PAPER_SIZE}', orientation='${pageLayout.orientation}'`);
          pdf.addPage(DEFAULT_PAPER_SIZE, pageLayout.orientation);
        }

        // --- 4. Create Temporary SVG for this page ---
        console.log(`${LOG_PREFIX}     Creating temporary SVG container for viewbox ${viewbox.id} (${pageLayout.width}x${pageLayout.height}mm)...`);
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        tempSvg.setAttribute('width', pageLayout.width);
        tempSvg.setAttribute('height', pageLayout.height);
        tempSvg.setAttribute('viewBox', `0 0 ${pageLayout.width} ${pageLayout.height}`);
        const svgPageGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tempSvg.appendChild(svgPageGroup);

        // --- 5. Render Viewbox Content into Printable Area ---
        // This needs a new helper or modification of renderViewToPdfSvg
        // For now, just draw a placeholder rectangle representing the content area
        console.log(`${LOG_PREFIX}     Rendering viewbox content (Placeholder)...`);
        const printableAreaPos = [pageLayout.printableX, pageLayout.printableY];
        const printableDimensions = { width: pageLayout.printableWidth, height: pageLayout.printableHeight };

        // --- Calculate Scale and Translation for Viewbox Content ---
        const scaleX = printableDimensions.width / combinedContentVB.width;
        const scaleY = printableDimensions.height / combinedContentVB.height;
        const scale = Math.min(scaleX, scaleY); // Fit within printable area

        const scaledContentWidth = combinedContentVB.width * scale;
        const scaledContentHeight = combinedContentVB.height * scale;

        // Center the scaled content within the printable area
        const contentTranslateX = printableAreaPos[0] + (printableDimensions.width - scaledContentWidth) / 2 - combinedContentVB.x * scale;
        const contentTranslateY = printableAreaPos[1] + (printableDimensions.height - scaledContentHeight) / 2 - combinedContentVB.y * scale;

        // --- Create SVG Group for Scaled/Translated Content ---
        const mainContentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        mainContentGroup.setAttribute('transform', `translate(${contentTranslateX}, ${contentTranslateY}) scale(${scale})`);
        // svgPageGroup.appendChild(mainContentGroup); // Don't add the single main group yet

        // --- Render Items based on Grid Layout ---
        const [gridRows, gridCols] = parseLayout(viewbox.layout); // Use existing helper
        const cellWidth = printableDimensions.width / gridCols;
        const cellHeight = printableDimensions.height / gridRows;
        console.log(`${LOG_PREFIX}   Grid: ${gridRows}x${gridCols}, Cell Size: ${cellWidth.toFixed(2)}x${cellHeight.toFixed(2)}mm`);

        const baseStrokeWidth = 0.15; // Base visible stroke width in mm
        const hiddenStrokeWidth = 0.1; // Base hidden stroke width in mm

        viewbox.items.forEach((item, cellIndex) => {
          if (!item || !item.svgData || !item.svgData.paths || !item.svgData.viewBox) {
              console.log(`${LOG_PREFIX}     Skipping cell ${cellIndex}: No valid item data.`);
              return; // Skip empty or invalid items
          }

          const itemVB = parseViewBox(item.svgData.viewBox);
          if (!itemVB || itemVB.width <= 0 || itemVB.height <= 0) {
              console.warn(`${LOG_PREFIX}     Skipping item in cell ${cellIndex}: Invalid viewBox ${item.svgData.viewBox}`);
              return;
          }

          // Calculate cell position
          const colIndex = cellIndex % gridCols;
          const rowIndex = Math.floor(cellIndex / gridCols);
          const cellX = printableAreaPos[0] + colIndex * cellWidth;
          const cellY = printableAreaPos[1] + rowIndex * cellHeight;
          console.log(`${LOG_PREFIX}     Rendering Item ${item.id} in Cell ${cellIndex} (Row ${rowIndex}, Col ${colIndex}) at [${cellX.toFixed(2)}, ${cellY.toFixed(2)}]`);

          // Calculate scale and translation to fit item content within its cell
          const itemScaleX = cellWidth / itemVB.width;
          const itemScaleY = cellHeight / itemVB.height;
          const itemScale = Math.min(itemScaleX, itemScaleY); // Fit within cell

          const scaledItemWidth = itemVB.width * itemScale;
          const scaledItemHeight = itemVB.height * itemScale;

          // Center the scaled item content within its cell
          const itemTranslateX = cellX + (cellWidth - scaledItemWidth) / 2 - itemVB.x * itemScale;
          const itemTranslateY = cellY + (cellHeight - scaledItemHeight) / 2 - itemVB.y * itemScale;

          // Create a group for this specific item, scaled and positioned
          const itemGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          itemGroup.setAttribute('transform', `translate(${itemTranslateX}, ${itemTranslateY}) scale(${itemScale})`);
          svgPageGroup.appendChild(itemGroup); // Add item group directly to the page group

          // Calculate effective stroke widths for this item's scale
          const effectiveItemStrokeWidth = itemScale > 0 ? baseStrokeWidth / itemScale : baseStrokeWidth;
          const effectiveItemHiddenStrokeWidth = itemScale > 0 ? hiddenStrokeWidth / itemScale : hiddenStrokeWidth;
          const itemStrokeScale = itemScale > 0 ? 1 / itemScale : 1;

          // Render item paths within its group
          item.svgData.paths.forEach(path => {
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', path.data);
            const isHidden = path.type === 'hidden' || path.id?.includes('_hidden'); // Check type or ID convention
            pathEl.setAttribute('stroke', isHidden ? '#777777' : '#000000');
            pathEl.setAttribute('stroke-width', isHidden ? effectiveItemHiddenStrokeWidth : effectiveItemStrokeWidth); // Use item-specific stroke width
            pathEl.setAttribute('stroke-linecap', 'round');
            pathEl.setAttribute('stroke-linejoin', 'round');
            if (isHidden) {
              pathEl.setAttribute('stroke-dasharray', `${2 * itemStrokeScale},${1 * itemStrokeScale}`); // Use item-specific dash scale
            }
            pathEl.setAttribute('fill', 'none');
            pathEl.setAttribute('vector-effect', 'non-scaling-stroke');
            itemGroup.appendChild(pathEl); // Add path to the item's transformed group

            // --- Render Measurements Associated with this Path (if any) ---
            // Measurements should be filtered by viewInstanceId which matches item.id
            const measurement = activeMeasurements[path.id];
            if (measurement && measurement.viewInstanceId === item.id && path.geometry) {
               console.log(`${LOG_PREFIX}       Rendering measurement for path ${path.id} in item ${item.id}`);
               const measurementSvgGroup = renderMeasurementToSvg(measurement, path.geometry);
               if (measurementSvgGroup) {
                   // Measurements are rendered in the coordinate space of the path's geometry,
                   // which is already correctly transformed by the parent itemGroup.
                   itemGroup.appendChild(measurementSvgGroup);
               } else {
                   console.warn(`${LOG_PREFIX}       renderMeasurementToSvg returned null for ${measurement.pathId}`);
               }
            }
          });
        });

        // Add Border around the printable area (after content)
        const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        borderRect.setAttribute('x', printableAreaPos[0]);
        borderRect.setAttribute('y', printableAreaPos[1]);
        borderRect.setAttribute('width', printableDimensions.width);
        borderRect.setAttribute('height', printableDimensions.height);
        borderRect.setAttribute('fill', 'none');
        borderRect.setAttribute('stroke', '#000000');
        borderRect.setAttribute('stroke-width', 0.2);
        svgPageGroup.appendChild(borderRect);

        // --- 6. Add SVG element to the *current* PDF page ---
        const currentPageNum = pdf.internal.getNumberOfPages();
        console.log(`${LOG_PREFIX}     Attempting to add SVG element for page ${currentPageNum} (Viewbox ${viewbox.id}) to PDF...`);
        pdf.setPage(currentPageNum);
        await pdf.svg(tempSvg, { x: 0, y: 0, width: pageLayout.width, height: pageLayout.height });
        console.log(`${LOG_PREFIX}     Finished adding SVG for page ${currentPageNum}`);

        // --- 7. Draw Title Block for this Viewbox Page ---
        console.log(`${LOG_PREFIX}       Calculating and drawing title block for viewbox ${viewbox.id}...`);
        const titleBlockLayout = calculateTitleBlockLayout(
            pageLayout.width, pageLayout.height,
            pageLayout.marginLeft, pageLayout.marginTop, pageLayout.marginRight, pageLayout.marginBottom,
            pageLayout.orientation, PAPER_SIZES, DEFAULT_PAPER_SIZE
        );
        // Use the actual title block data from the viewbox state
        drawTitleBlock(pdf, titleBlockLayout, viewbox.titleBlock);

      } // End for...of viewboxes loop

      // --- Save the PDF ---
      if (pdf) {
        console.log(`${LOG_PREFIX} Saving PDF as "${pdfFilename}"...`);
        pdf.save(pdfFilename);
        console.log(`${LOG_PREFIX} PDF Export Successful: ${pdfFilename}`);
      } else {
         console.warn(`${LOG_PREFIX} PDF object was not initialized (likely no viewboxes to export). No export occurred.`);
         alert("Could not generate PDF: No viewboxes found.");
      }

    } catch (error) {
      console.error(`${LOG_PREFIX} Error during PDF generation:`, error);
      alert(`Failed to export PDF: ${error.message}. See console for details.`);
    }

  }, [viewboxes, activeMeasurements, renderViewToPdfSvg]); // Dependencies updated to viewboxes

  return { exportPdf };
}


// --- Helper Function to Calculate Title Block Geometry ---
/**
 * Calculates the geometry for the title block and its internal cells.
 * @param {number} pageWidth - Total width of the PDF page (mm).
 * @param {number} pageHeight - Total height of the PDF page (mm).
 * @param {number} marginLeft - Left margin (mm).
 * @param {number} marginTop - Top margin (mm).
 * @param {number} marginRight - Right margin (mm).
 * @param {number} marginBottom - Bottom margin (mm).
 * @param {'p' | 'l'} orientation - Page orientation.
 * @param {object} paperSizes - Standard paper sizes object (e.g., PAPER_SIZES).
 * @param {string} paperSizeKey - The key for the current paper size (e.g., 'a4').
 * @returns {{
 *   outerBox: { x: number, y: number, width: number, height: number },
 *   cells: Array<Array<{ x: number, y: number, width: number, height: number, textX: number, textY: number, maxWidth: number }>>, // [row][col]
 *   fontSize: number,
 *   lineHeight: number
 * } | null}
 */
function calculateTitleBlockLayout(pageWidth, pageHeight, marginLeft, marginTop, marginRight, marginBottom, orientation, paperSizes, paperSizeKey = DEFAULT_PAPER_SIZE) {
  const logPrefixTB = `${LOG_PREFIX} TitleBlockLayout`;

  // --- Determine Portrait Dimensions for Calculation ---
  const currentPaper = paperSizes[paperSizeKey] || paperSizes.a4;
  const portraitWidth = Math.min(currentPaper.width, currentPaper.height);
  const portraitHeight = Math.max(currentPaper.width, currentPaper.height);
  // Use portrait margins to calculate base printable width
  const pMarginLeft = MARGIN_LEFT_PORTRAIT;
  const pMarginRight = MARGIN_OTHER;
  const pPrintableWidth = portraitWidth - pMarginLeft - pMarginRight;

  // --- Calculate Fixed Title Block Dimensions based on Portrait ---
  const titleBlockWidth = pPrintableWidth / 2;
  const baseHeight = portraitHeight * 0.25;
  const titleBlockHeight = baseHeight * (2 / 3);
  console.log(`${logPrefixTB} Base Calc (Portrait ${portraitWidth}x${portraitHeight}): PrintableW=${pPrintableWidth.toFixed(2)}, TB W=${titleBlockWidth.toFixed(2)}, TB H=${titleBlockHeight.toFixed(2)}`);

  // Constants for internal layout
  const numRows = 3;
  const numCols = 2;
  const colRatio = [1, 2]; // Width ratio for columns 1 and 2
  const totalRatio = colRatio.reduce((a, b) => a + b, 0);

  // Constants for text rendering (adjust as needed)
  const titleBlockFontSize = 2.5; // mm
  const titleBlockLineHeightFactor = 1.2; // Relative to font size
  const textPadding = 0.5; // mm padding inside cells

  // --- Calculate Position based on *Current* Page Layout ---
  // Use the fixed titleBlockWidth and titleBlockHeight calculated earlier
  const titleBlockX = pageWidth - marginRight - titleBlockWidth;
  const titleBlockY = pageHeight - marginBottom - titleBlockHeight;
  console.log(`${logPrefixTB} Final Position (Current Page ${pageWidth}x${pageHeight}, Orientation: ${orientation}): Margins(R/B)=${marginRight}/${marginBottom}, TB X=${titleBlockX.toFixed(2)}, TB Y=${titleBlockY.toFixed(2)}`);


  // Basic validation
  if (titleBlockWidth <= 1e-6 || titleBlockHeight <= 1e-6 || titleBlockX < -1e-6 || titleBlockY < -1e-6) {
      console.error(`${logPrefixTB} Calculated invalid title block dimensions or position.`, { titleBlockX, titleBlockY, titleBlockWidth, titleBlockHeight, pageWidth, pageHeight, marginRight, marginBottom });
      return null; // Indicate error
  }

  const outerBox = { x: titleBlockX, y: titleBlockY, width: titleBlockWidth, height: titleBlockHeight };

  // Calculate Internal Cells
  const rowHeight = titleBlockHeight / numRows;
  const cells = [];

  for (let r = 0; r < numRows; r++) {
    const rowCells = [];
    const cellY = titleBlockY + r * rowHeight;
    let currentX = titleBlockX;
    for (let c = 0; c < numCols; c++) {
        const cellWidth = titleBlockWidth * (colRatio[c] / totalRatio);
        rowCells.push({
            x: currentX,
            y: cellY,
            width: cellWidth,
            height: rowHeight,
            // Add text positioning helpers
            textX: currentX + textPadding,
            textY: cellY + rowHeight / 2, // Vertical center baseline
            maxWidth: cellWidth - 2 * textPadding,
        });
        currentX += cellWidth;
    }
    cells.push(rowCells);
  }

  console.log(`${logPrefixTB} Calculated Layout:`, { outerBox, cells });
  return { outerBox, cells, fontSize: titleBlockFontSize, lineHeight: titleBlockFontSize * titleBlockLineHeightFactor };
}


// --- Helper Function to Draw Title Block using jsPDF ---
/**
 * Draws the title block onto the PDF using jsPDF commands.
 * @param {jsPDF} pdf - The jsPDF instance.
 * @param {object} titleBlockLayout - The layout object from calculateTitleBlockLayout.
 * @param {object} data - Data for the title block cells (e.g., { project: '...', scale: '...' }).
 */
function drawTitleBlock(pdf, titleBlockLayout, data = {}) {
    if (!pdf || !titleBlockLayout) {
        console.warn(`${LOG_PREFIX} DrawTitleBlock: Missing pdf instance or layout data.`);
        return;
    }
    const logPrefixTB = `${LOG_PREFIX} DrawTitleBlock`;
    console.log(`${logPrefixTB} Drawing title block... Data:`, data);

    const { outerBox, cells, fontSize } = titleBlockLayout; // Removed lineHeight as it's not used directly here

    // --- Placeholder Data ---
    // TODO: Replace with actual data source
    const cellData = [
        // Row 0
        [ { label: "Project:", value: data.project || "CAD-OS Demo" }, { label: "Part Name:", value: data.partName || "N/A" } ],
        // Row 1
        [ { label: "Scale:", value: data.scale || "1:1" },        { label: "Material:", value: data.material || "Steel" } ],
        // Row 2
        [ { label: "Drawn By:", value: data.drawnBy || "Cline" },   { label: "Date:", value: data.date || new Date().toLocaleDateString() } ]
    ];

    // --- Styling ---
    const lineWeight = 0.15; // mm
    pdf.saveGraphicsState(); // Save current style settings
    pdf.setLineWidth(lineWeight);
    pdf.setDrawColor(0); // Black
    // Font settings will be applied per text element below
    pdf.setTextColor(0); // Black

    // --- Draw Outer Box ---
    pdf.rect(outerBox.x, outerBox.y, outerBox.width, outerBox.height, 'S'); // 'S' for stroke

    // --- Draw Internal Grid Lines ---
    // Vertical lines (between columns)
    let currentX = outerBox.x;
    for (let c = 0; c < cells[0].length - 1; c++) {
        currentX += cells[0][c].width;
        pdf.line(currentX, outerBox.y, currentX, outerBox.y + outerBox.height);
    }
    // Horizontal lines (between rows)
    let currentY = outerBox.y;
    for (let r = 0; r < cells.length - 1; r++) {
        currentY += cells[r][0].height;
        pdf.line(outerBox.x, currentY, outerBox.x + outerBox.width, currentY);
    }

    // --- Fill Cells with Text ---
    for (let r = 0; r < cells.length; r++) {
        for (let c = 0; c < cells[r].length; c++) {
            const cell = cells[r][c];
            const content = cellData[r] && cellData[r][c]; // Check if row/cell exists

            if (content) {
                // Simple label + value approach for now
                const labelText = content.label || '';
                const valueText = content.value || '';

                // Position label top-left, value below or beside (adjust as needed)
                // jsPDF uses points (pt) for font size by default
                const labelFontSize = 11;
                const valueFontSize = 10;
                // Calculate vertical positions based on new font sizes
                const adjustedLabelY = cell.textY - labelFontSize * 0.15; // Adjust vertical position (approx)
                const adjustedValueY = cell.textY + valueFontSize * 0.35; // Adjust vertical position (approx)

                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(labelFontSize);
                pdf.text(labelText, cell.textX, adjustedLabelY, { align: 'left', baseline: 'middle', maxWidth: cell.maxWidth });

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(valueFontSize);
                pdf.text(valueText, cell.textX, adjustedValueY, { align: 'left', baseline: 'middle', maxWidth: cell.maxWidth });

                // Alternative: Single line centered text
                // const fullText = `${content.label || ''} ${content.value || ''}`;
                // pdf.text(fullText, cell.textX, cell.textY, { align: 'left', baseline: 'middle', maxWidth: cell.maxWidth });
            } else {
                console.warn(`${logPrefixTB} Missing data for cell [${r}][${c}]`);
            }
        }
    }
    pdf.restoreGraphicsState(); // Restore previous style settings
    console.log(`${logPrefixTB} Finished drawing title block.`);
}


// --- Helper Function to Calculate Part *Content* Layout (ViewBoxes, Offsets) ---
// This function NO LONGER calculates page size. It focuses on arranging the views
// relative to each other and determining the combined bounding box of the content.
// It uses VIEW_GAP constant defined outside the hook.
function calculatePartLayout(part, viewGap) {
    const logPrefixPart = `${LOG_PREFIX} PartLayout[${part.name}]`;
    console.log(`${logPrefixPart} Calculating content layout...`);
    const frontView = part.views?.front;
    const topView = part.views?.top;
    const rightView = part.views?.right;

    if (!frontView && !topView && !rightView) {
        console.warn(`${logPrefixPart} Part has no standard views.`);
        return null;
    }

    // --- 1. Get ViewBoxes & Check Validity ---
    const getSafeViewBox = (view) => {
      if (!view) return { x: 0, y: 0, width: 0, height: 0 };
      // Prefer normalizedViewBox if available, as it should represent the view's content bounds accurately
      const vbString = view.normalizedViewBox || view.combinedViewBox || view.visible?.viewBox || view.hidden?.viewBox;
      return parseViewBox(vbString || "0 0 0 0");
    };

    const frontVB = getSafeViewBox(frontView);
    const topVB = getSafeViewBox(topView);
    const rightVB = getSafeViewBox(rightView);
    console.log(`${logPrefixPart}   ViewBoxes (Original Content): Front=`, frontVB, `Top=`, topVB, `Right=`, rightVB);

    // Need at least one view with dimensions to proceed
    const hasFront = frontVB.width > 1e-6 || frontVB.height > 1e-6;
    const hasTop = topVB.width > 1e-6 || topVB.height > 1e-6;
    const hasRight = rightVB.width > 1e-6 || rightVB.height > 1e-6;

    if (!hasFront && !hasTop && !hasRight) {
      console.warn(`${logPrefixPart} Part has no valid view dimensions.`);
      return null;
    }

    // --- 2. Calculate Relative Positions and Combined ViewBox of Content ---
    // Assume Front view is the anchor (0,0) in the relative layout *content* space
    let combinedMinX = 0;
    let combinedMinY = 0;
    let combinedMaxX = hasFront ? frontVB.width : 0;
    let combinedMaxY = hasFront ? frontVB.height : 0;

    // Offsets for placing Top and Right views relative to Front view's *content* origin (0,0)
    let topLayoutPos = { x: 0, y: 0 };
    let rightLayoutPos = { x: 0, y: 0 };

    // Position Top View below Front View (centered horizontally)
    if (hasTop) {
      topLayoutPos.x = hasFront ? (frontVB.width - topVB.width) / 2 : 0;
      topLayoutPos.y = hasFront ? frontVB.height + viewGap : 0; // Use viewGap
      combinedMinX = Math.min(combinedMinX, topLayoutPos.x);
      combinedMaxX = Math.max(combinedMaxX, topLayoutPos.x + topVB.width);
      combinedMaxY = Math.max(combinedMaxY, topLayoutPos.y + topVB.height);
    }

    // Position Right View to the right of Front View (centered vertically)
    if (hasRight) {
      rightLayoutPos.x = hasFront ? frontVB.width + viewGap : (hasTop ? Math.max(topLayoutPos.x + topVB.width + viewGap, viewGap) : 0); // Use viewGap
      rightLayoutPos.y = hasFront ? (frontVB.height - rightVB.height) / 2 : (hasTop ? Math.max(topLayoutPos.y, 0) : 0); // Align with front if exists, else top
      combinedMinX = Math.min(combinedMinX, rightLayoutPos.x); // Should usually be 0 or positive
      combinedMinY = Math.min(combinedMinY, rightLayoutPos.y);
      combinedMaxX = Math.max(combinedMaxX, rightLayoutPos.x + rightVB.width);
      combinedMaxY = Math.max(combinedMaxY, rightLayoutPos.y + rightVB.height);
    }

    // Calculate the combined viewBox of the arranged content
    const combinedContentWidth = combinedMaxX - combinedMinX;
    const combinedContentHeight = combinedMaxY - combinedMinY;
    // The combinedLayoutViewBox origin is (combinedMinX, combinedMinY) relative to the Front view's origin (0,0)
    const combinedLayoutViewBox = `${combinedMinX} ${combinedMinY} ${combinedContentWidth} ${combinedContentHeight}`;
    console.log(`${logPrefixPart}   Calculated Combined Content ViewBox: ${combinedLayoutViewBox}`);

    // --- 3. Calculate Offsets for Rendering ---
    // These offsets translate each view's original paths (which are relative to their own viewBox origin, e.g., frontVB.x)
    // into the combined layout space where the Front view's origin is at (0,0).
    const layoutOffsets = {
      front: { x: -frontVB.x, y: -frontVB.y }, // Translate front paths to start at (0,0)
      top: { x: topLayoutPos.x - topVB.x, y: topLayoutPos.y - topVB.y },
      right: { x: rightLayoutPos.x - rightVB.x, y: rightLayoutPos.y - rightVB.y }
    };
    console.log(`${logPrefixPart}   Calculated Render Offsets: Front=(${layoutOffsets.front.x.toFixed(2)}, ${layoutOffsets.front.y.toFixed(2)}), Top=(${layoutOffsets.top.x.toFixed(2)}, ${layoutOffsets.top.y.toFixed(2)}), Right=(${layoutOffsets.right.x.toFixed(2)}, ${layoutOffsets.right.y.toFixed(2)})`);

    // --- 4. Collect Original Paths ---
    const pathGroups = { frontPaths: [], topPaths: [], rightPaths: [] };
    const collectPaths = (view, groupName) => {
      if (!view) return;
      const addPaths = (paths, visibility) => {
        if (!paths || !Array.isArray(paths)) return;
        paths.forEach(pathObj => {
          if (pathObj && typeof pathObj.data === 'string') {
            // Store original path data along with visibility
            pathGroups[groupName].push({ ...pathObj, visibility });
          }
        });
      };
      // Process hidden first so visible lines draw over them if overlapping exactly
      addPaths(view.hidden?.paths, 'hidden');
      addPaths(view.visible?.paths, 'visible');
    };

    collectPaths(frontView, 'frontPaths');
    collectPaths(topView, 'topPaths');
    collectPaths(rightView, 'rightPaths');
    console.log(`${logPrefixPart}   Collected original paths: Front=${pathGroups.frontPaths.length}, Top=${pathGroups.topPaths.length}, Right=${pathGroups.rightPaths.length}`);

    // Return only the data needed for rendering the content layout
    return {
      combinedLayoutViewBox, // ViewBox encompassing all arranged views
      pathGroups,            // Original paths grouped by view
      layoutOffsets,         // Offsets to position each view's paths within the combined layout
    };
}
