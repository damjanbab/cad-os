import { useCallback } from 'react';
import { jsPDF } from "jspdf";
import 'svg2pdf.js'; // Side-effect import
import { parseViewBox } from '../utils/svgUtils.js'; // Removed combineViewBoxes as it's not used directly here
import { vec } from '../utils/geometryUtils.js'; // Although not directly used here, it was in the original file, keeping for potential future use or if renderMeasurementToSvg needs it implicitly.

const LOG_PREFIX = "[PDF Export]";

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



export function useTechnicalDrawingPdfExport(projections, activeMeasurements) {

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

      // Front View
      const frontGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      frontGroup.setAttribute('transform', `translate(${layoutOffsets.front.x}, ${layoutOffsets.front.y})`);
      mainContentGroup.appendChild(frontGroup);
      renderPaths(viewData.frontPaths, frontGroup);

      // Top View
      if (viewData.topPaths && layoutOffsets.top) {
        const topGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        topGroup.setAttribute('transform', `translate(${layoutOffsets.top.x}, ${layoutOffsets.top.y})`);
        mainContentGroup.appendChild(topGroup);
        renderPaths(viewData.topPaths, topGroup);
      }

      // Right View
      if (viewData.rightPaths && layoutOffsets.right) {
        const rightGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        rightGroup.setAttribute('transform', `translate(${layoutOffsets.right.x}, ${layoutOffsets.right.y})`);
        mainContentGroup.appendChild(rightGroup);
        renderPaths(viewData.rightPaths, rightGroup);
      }
    } else {
      // Standard Layout: Render all paths directly into the scaled/centered mainContentGroup
      console.log(`${logPrefixRender}   Rendering Standard Layout Paths...`);
      // Combine visible and hidden paths for rendering
      const allPaths = [
          ...(viewData.visible?.paths?.map(p => ({ ...p, visibility: 'visible' })) || []),
          ...(viewData.hidden?.paths?.map(p => ({ ...p, visibility: 'hidden' })) || [])
      ];
      renderPaths(allPaths, mainContentGroup);
    }


    // --- Render Measurements ---
    // Measurements are rendered within the mainContentGroup, which is already scaled and positioned.
    // The measurement rendering logic itself (renderMeasurementToSvg) uses absolute coordinates
    // derived from the geometry, so they should appear correctly relative to the scaled paths.
    // TODO: Confirm measurement rendering works correctly with part layouts and nested transforms.
    Object.values(activeMeasurements)
      .filter(m => m.viewId === viewId || m.viewId?.startsWith(viewId)) // Basic filter, needs refinement for part layouts
      .forEach(measurement => {
        let targetMeasurementGroup = mainContentGroup; // Render directly into the main scaled group
        let associatedPath = null;

        // Find the associated path geometry (needs robust way to link measurement to path/view)
        const findPath = (paths) => paths?.find(p => measurement.pathId.startsWith(p.id)); // Example matching logic
        associatedPath = findPath(viewData.frontPaths) || findPath(viewData.topPaths) || findPath(viewData.rightPaths) || findPath(viewData.visible?.paths) || findPath(viewData.hidden?.paths);

        if (associatedPath?.geometry) {
          const measurementSvgGroup = renderMeasurementToSvg(measurement, associatedPath.geometry);
          if (measurementSvgGroup) {
              // Apply vector-effect to measurement lines/text if needed, or adjust stroke widths in renderMeasurementToSvg
              // For simplicity, let's assume renderMeasurementToSvg handles visual consistency for now.
              targetMeasurementGroup.appendChild(measurementSvgGroup);
          }
        } else {
           console.warn(`${logPrefixRender} Could not find geometry for measurement ${measurement.pathId}`);
        }
      });

    console.log(`${logPrefixRender} Finished Rendering ${isPartLayout ? 'Part Layout' : 'View'}`);
  }, [activeMeasurements]); // Dependency: activeMeasurements


  // --- PDF Export Logic ---
  const exportPdf = useCallback(async () => {
    console.log(`${LOG_PREFIX} Starting PDF Export...`);
    console.log(`${LOG_PREFIX} Input Projections:`, projections);
    console.log(`${LOG_PREFIX} Input Measurements:`, activeMeasurements);


    // Check if we have standard layout OR parts data
    if (!projections || (!projections.standardLayout && (!projections.parts || projections.parts.length === 0))) {
      console.error(`${LOG_PREFIX} No projection data available for PDF export (Requires standardLayout or parts array). Data:`, projections);
      alert("No drawing data found to export.");
      return;
    }

    // Constants defined outside the hook are used here (e.g., PDF_SCALE, PAGE_MARGIN, MAIN_TITLE_HEIGHT, DEFAULT_PAPER_SIZE, VIEW_GAP)

    let pdf;
    let pdfFilename = 'technical-drawing.pdf';
    let isMultiPage = false; // Flag to track if we are generating multiple pages
    let firstValidPartIndex = -1; // Declare here for broader scope

    try {
      // --- Determine Export Mode ---
      const hasStandard = projections.standardLayout && projections.standardLayout.combinedViewBox;
      const hasParts = projections.parts && projections.parts.length > 0;

      // --- Case 1: Assembly (Standard Layout + Parts) ---
      if (hasStandard && hasParts) {
        console.log(`${LOG_PREFIX} Exporting Assembly (Standard Layout + Parts)...`);
        pdfFilename = 'technical-drawing-assembly.pdf';
        isMultiPage = true;
        const standardLayout = projections.standardLayout;

        // --- Determine Page Layout for Standard Layout ---
        console.log(`${LOG_PREFIX}   Calculating page layout for Standard Layout...`);
        const layoutVB = parseViewBox(standardLayout.combinedViewBox);
        if (!layoutVB || layoutVB.width <= 0 || layoutVB.height <= 0) {
          throw new Error("Invalid combinedViewBox in standard layout.");
        }
        const contentWidth = layoutVB.width * PDF_SCALE;
        const contentHeight = layoutVB.height * PDF_SCALE;
        // Use the helper function defined outside
        const pageLayout = getStandardPageLayout(contentWidth, contentHeight);
        console.log(`${LOG_PREFIX}   Standard Layout Page: size=${DEFAULT_PAPER_SIZE}, orientation=${pageLayout.orientation}, W=${pageLayout.width}mm, H=${pageLayout.height}mm`);
        console.log(`${LOG_PREFIX}   Printable Area: W=${pageLayout.printableWidth}mm, H=${pageLayout.printableHeight}mm`);

        // --- Initialize PDF ---
        console.log(`${LOG_PREFIX}   Initializing jsPDF for Assembly: format='${DEFAULT_PAPER_SIZE}', orientation='${pageLayout.orientation}', unit='mm'`);
        pdf = new jsPDF({ orientation: pageLayout.orientation, unit: 'mm', format: DEFAULT_PAPER_SIZE });

        // --- Render Standard Layout on Page 1 ---
        console.log(`${LOG_PREFIX}   Creating temporary SVG for Standard Layout page (${pageLayout.width}x${pageLayout.height}mm)...`);
        const tempSvgStd = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvgStd.setAttribute('width', pageLayout.width);
        tempSvgStd.setAttribute('height', pageLayout.height);
        tempSvgStd.setAttribute('viewBox', `0 0 ${pageLayout.width} ${pageLayout.height}`);
        const svgPageGroupStd = document.createElementNS('http://www.w3.org/2000/svg', 'g'); // Group for page content (title + drawing)
        tempSvgStd.appendChild(svgPageGroupStd);

        // Add Main Title for Standard Layout - REMOVED
        // const mainTitleContentStd = "Assembly - Standard Layout";
        // console.log(`${LOG_PREFIX}     Adding Main Title: "${mainTitleContentStd}"`);
        // const mainTitleTextStd = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        // mainTitleTextStd.setAttribute('x', pageLayout.width / 2); // Center on page
        // mainTitleTextStd.setAttribute('y', pageLayout.marginTop + MAIN_TITLE_HEIGHT / 2); // Use calculated margin
        // mainTitleTextStd.setAttribute('font-size', MAIN_TITLE_FONT_SIZE); // Use constant
        // mainTitleTextStd.setAttribute('font-family', 'Arial, sans-serif');
        // mainTitleTextStd.setAttribute('text-anchor', 'middle');
        // mainTitleTextStd.setAttribute('dominant-baseline', 'middle');
        // mainTitleTextStd.setAttribute('fill', '#000000');
        // mainTitleTextStd.setAttribute('font-weight', 'bold');
        // mainTitleTextStd.textContent = mainTitleContentStd;
        // svgPageGroupStd.appendChild(mainTitleTextStd);

        // Render the standard layout into the printable area
        console.log(`${LOG_PREFIX}     Rendering standard layout into SVG printable area...`);
        const mainTitleContentStd = ""; // Pass empty title as it's removed
        const layoutId = "assembly_standard_layout";
        const standardLayoutViewData = {
          combinedViewBox: standardLayout.combinedViewBox,
          // Pass paths grouped by visibility for renderPaths logic
          visible: { paths: standardLayout.paths?.filter(p => p.visibility !== 'hidden') || [] },
          hidden: { paths: standardLayout.paths?.filter(p => p.visibility === 'hidden') || [] }
        };
        // Position the drawing within the printable area using calculated values
        const printableAreaPos = [pageLayout.printableX, pageLayout.printableY];
        const printableDimensions = { width: pageLayout.printableWidth, height: pageLayout.printableHeight };
        renderViewToPdfSvg(svgPageGroupStd, standardLayoutViewData, mainTitleContentStd, printableAreaPos, printableDimensions, layoutId);

        // Add SVG to PDF Page 1
        console.log(`${LOG_PREFIX}   Attempting to add Standard Layout SVG to PDF Page 1...`);
        await pdf.svg(tempSvgStd, { x: 0, y: 0, width: pageLayout.width, height: pageLayout.height });
        console.log(`${LOG_PREFIX}   Successfully added Standard Layout SVG.`);

        // --- Draw Title Block for Standard Layout Page ---
        console.log(`${LOG_PREFIX}   Calculating and drawing title block for Standard Layout page...`);
        const titleBlockLayoutStd = calculateTitleBlockLayout(
            pageLayout.width, pageLayout.height,
            pageLayout.marginLeft, pageLayout.marginTop, pageLayout.marginRight, pageLayout.marginBottom,
            pageLayout.orientation, PAPER_SIZES, DEFAULT_PAPER_SIZE // Assuming default paper size for assembly page
        );
        // TODO: Populate title block data more dynamically if needed
        const titleBlockDataStd = { project: "Assembly", partName: "Standard Layout", scale: "NTS" };
        drawTitleBlock(pdf, titleBlockLayoutStd, titleBlockDataStd);

        // --- Now Loop Through Parts for Subsequent Pages ---
        console.log(`${LOG_PREFIX}   Starting loop through parts for subsequent pages...`);
        // Proceed to the part processing logic below, but without re-initializing pdf

      }
      // --- Case 2: Standard Layout Only (Single Component) ---
      else if (hasStandard && !hasParts) {
        console.log(`${LOG_PREFIX} Exporting Standard Layout Only (Single Page)...`);
        pdfFilename = 'technical-drawing-standard.pdf';
        const standardLayout = projections.standardLayout;
        console.log(`${LOG_PREFIX}   Standard Layout Data:`, standardLayout);

        // Determine Page Layout
        const layoutVB = parseViewBox(standardLayout.combinedViewBox);
        if (!layoutVB || layoutVB.width <= 0 || layoutVB.height <= 0) {
          throw new Error("Invalid combinedViewBox in standard layout.");
        }
        const contentWidth = layoutVB.width * PDF_SCALE;
        const contentHeight = layoutVB.height * PDF_SCALE;
        const pageLayout = getStandardPageLayout(contentWidth, contentHeight); // Use helper
        console.log(`${LOG_PREFIX}   Page: size=${DEFAULT_PAPER_SIZE}, orientation=${pageLayout.orientation}, W=${pageLayout.width}mm, H=${pageLayout.height}mm`);
        console.log(`${LOG_PREFIX}   Printable Area: W=${pageLayout.printableWidth}mm, H=${pageLayout.printableHeight}mm`);

        // Initialize PDF
        console.log(`${LOG_PREFIX}   Initializing jsPDF: format='${DEFAULT_PAPER_SIZE}', orientation='${pageLayout.orientation}', unit='mm'`);
        pdf = new jsPDF({ orientation: pageLayout.orientation, unit: 'mm', format: DEFAULT_PAPER_SIZE });

        // Create Temporary SVG
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvg.setAttribute('width', pageLayout.width);
        tempSvg.setAttribute('height', pageLayout.height);
        tempSvg.setAttribute('viewBox', `0 0 ${pageLayout.width} ${pageLayout.height}`);
        const svgPageGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tempSvg.appendChild(svgPageGroup);

        // Add Main Title - REMOVED FOR SINGLE COMPONENT STANDARD LAYOUT
        // const mainTitleContent = "Standard Layout";
        // const mainTitleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        // mainTitleText.setAttribute('x', pageLayout.width / 2);
        // mainTitleText.setAttribute('y', pageLayout.marginTop + MAIN_TITLE_HEIGHT / 2); // Use calculated margin
        // mainTitleText.setAttribute('font-size', MAIN_TITLE_FONT_SIZE); // Use constant
        // mainTitleText.setAttribute('font-family', 'Arial, sans-serif');
        // mainTitleText.setAttribute('text-anchor', 'middle');
        // mainTitleText.setAttribute('dominant-baseline', 'middle');
        // mainTitleText.setAttribute('fill', '#000000');
        // mainTitleText.setAttribute('font-weight', 'bold');
        // mainTitleText.textContent = mainTitleContent;
        // svgPageGroup.appendChild(mainTitleText);

        // Render Layout
        const layoutId = "standard_layout";
        const mainTitleContent = ""; // Pass empty title as it's removed
        const standardLayoutViewData = {
          combinedViewBox: standardLayout.combinedViewBox,
          visible: { paths: standardLayout.paths?.filter(p => p.visibility !== 'hidden') || [] },
          hidden: { paths: standardLayout.paths?.filter(p => p.visibility === 'hidden') || [] }
        };
        // Position the drawing within the printable area using calculated values
        const printableAreaPos = [pageLayout.printableX, pageLayout.printableY];
        const printableDimensions = { width: pageLayout.printableWidth, height: pageLayout.printableHeight };
        renderViewToPdfSvg(svgPageGroup, standardLayoutViewData, mainTitleContent, printableAreaPos, printableDimensions, layoutId);

        // Add SVG to PDF
        await pdf.svg(tempSvg, { x: 0, y: 0, width: pageLayout.width, height: pageLayout.height });
        console.log(`${LOG_PREFIX}   Successfully added single page SVG element.`);

        // --- Draw Title Block for Single Standard Layout Page ---
        console.log(`${LOG_PREFIX}   Calculating and drawing title block for single Standard Layout page...`);
        const titleBlockLayoutSingle = calculateTitleBlockLayout(
            pageLayout.width, pageLayout.height,
            pageLayout.marginLeft, pageLayout.marginTop, pageLayout.marginRight, pageLayout.marginBottom,
            pageLayout.orientation, PAPER_SIZES, DEFAULT_PAPER_SIZE // Assuming default paper size
        );
        // TODO: Populate title block data more dynamically if needed
        const titleBlockDataSingle = { project: "Single Component", partName: "Standard Layout", scale: "NTS" };
        drawTitleBlock(pdf, titleBlockLayoutSingle, titleBlockDataSingle);

      }
      // --- Case 3: Part Views Only ---
      else if (!hasStandard && hasParts) {
        console.log(`${LOG_PREFIX} Exporting Part Views Only (Multi-Page)...`);
        pdfFilename = 'technical-drawing-parts.pdf';
        isMultiPage = true;
        console.log(`${LOG_PREFIX}   Parts Data:`, projections.parts);

        // Find the first valid part to determine initial page layout
        console.log(`${LOG_PREFIX}   Calculating layout for the first valid part to initialize PDF...`);
        // let firstValidPartIndex = -1; // Declaration moved up
        let initialPageLayout = null;

        for (const [index, part] of projections.parts.entries()) {
          // Use the helper function defined outside
          const partLayoutData = calculatePartLayout(part, VIEW_GAP); // Calculate content layout first
          if (partLayoutData) {
            const { combinedLayoutViewBox } = partLayoutData;
            const contentVB = parseViewBox(combinedLayoutViewBox);
            if (contentVB && contentVB.width > 0 && contentVB.height > 0) {
              const contentWidth = contentVB.width * PDF_SCALE;
              const contentHeight = contentVB.height * PDF_SCALE;
              // Use the helper function defined outside
              initialPageLayout = getStandardPageLayout(contentWidth, contentHeight);
              firstValidPartIndex = index;
              console.log(`${LOG_PREFIX}     First valid part found: ${part.name} (Index ${index})`);
              console.log(`${LOG_PREFIX}     Initial Page Layout: size=${DEFAULT_PAPER_SIZE}, orientation=${initialPageLayout.orientation}, W=${initialPageLayout.width}mm, H=${initialPageLayout.height}mm`);
              break; // Found the first valid part
            }
          }
        }

        if (!initialPageLayout) {
          throw new Error("No parts with valid views/dimensions found for PDF export.");
        }

        // Initialize PDF with the first part's layout
        console.log(`${LOG_PREFIX}   Initializing jsPDF for Multi-Part: format='${DEFAULT_PAPER_SIZE}', orientation='${initialPageLayout.orientation}', unit='mm'`);
        pdf = new jsPDF({ orientation: initialPageLayout.orientation, unit: 'mm', format: DEFAULT_PAPER_SIZE });
        // Proceed to the part processing logic below, using firstValidPartIndex
      }

      // --- Process Parts (Common logic for Case 1 and Case 3, using Standard Page Size) ---
      if (isMultiPage && hasParts) {
        // Use firstValidPartIndex determined earlier (now accessible)
        if (firstValidPartIndex === -1 && !hasStandard) { // Check if it wasn't set (only possible in parts-only mode)
           // This case should ideally be caught by the check throwing an error earlier,
           // but adding a safeguard here.
           console.warn(`${LOG_PREFIX} No valid parts found to process, skipping part loop.`);
        } else {
          // If hasStandard, firstValidPartIndex remains -1, but the loop should run.
          // If !hasStandard, firstValidPartIndex should be >= 0.
          for (const [index, part] of projections.parts.entries()) {
            console.log(`${LOG_PREFIX} Processing Part ${index + 1}/${projections.parts.length}: ${part.name}`);

            // 1. Calculate Part Content Layout (ViewBoxes, Offsets)
            // Use the helper function defined outside
            const partLayoutData = calculatePartLayout(part, VIEW_GAP);
            if (!partLayoutData) {
              console.warn(`${LOG_PREFIX} Skipping part ${part.name} (Index ${index}) due to layout calculation error or missing views.`);
              continue;
            }
            const { combinedLayoutViewBox, pathGroups, layoutOffsets } = partLayoutData;

            // 2. Determine Page Layout for this Part's Content
            const contentVB = parseViewBox(combinedLayoutViewBox);
            if (!contentVB || contentVB.width <= 0 || contentVB.height <= 0) {
                console.warn(`${LOG_PREFIX} Skipping part ${part.name} (Index ${index}) due to invalid combined viewBox: ${combinedLayoutViewBox}`);
                continue;
            }
            const contentWidth = contentVB.width * PDF_SCALE;
            const contentHeight = contentVB.height * PDF_SCALE;
            // Use the helper function defined outside
            const pageLayout = getStandardPageLayout(contentWidth, contentHeight);
            console.log(`${LOG_PREFIX}   Part Page Layout: size=${DEFAULT_PAPER_SIZE}, orientation=${pageLayout.orientation}, W=${pageLayout.width}mm, H=${pageLayout.height}mm`);
            console.log(`${LOG_PREFIX}   Printable Area: W=${pageLayout.printableWidth}mm, H=${pageLayout.printableHeight}mm`);

            // 3. Add New Page if Necessary
            // Add page if not the very first part processed OR if in assembly mode (where page 1 was standard layout)
            const isFirstPartProcessed = (index === firstValidPartIndex);
            if (!isFirstPartProcessed || (hasStandard && hasParts)) {
              console.log(`${LOG_PREFIX}   Adding Page ${pdf.internal.getNumberOfPages() + 1} to PDF: format='${DEFAULT_PAPER_SIZE}', orientation='${pageLayout.orientation}'`);
              pdf.addPage(DEFAULT_PAPER_SIZE, pageLayout.orientation);
            } else {
              console.log(`${LOG_PREFIX}   Processing first part page (Index ${index}). PDF already initialized/page exists.`);
              // Ensure the current page matches the required layout (jsPDF might handle this, but good to be aware)
              // pdf.setPage(1); // Or the correct page number if assembly
              // We might need to adjust jsPDF page format if the first part needs a different orientation than calculated initially.
              // For simplicity, assume jsPDF handles orientation changes on addPage correctly.
            }

            // 4. Create Temporary SVG for this page
            console.log(`${LOG_PREFIX}     Creating temporary SVG container for part ${part.name} (${pageLayout.width}x${pageLayout.height}mm)...`);
            const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            tempSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            tempSvg.setAttribute('width', pageLayout.width);
            tempSvg.setAttribute('height', pageLayout.height);
            tempSvg.setAttribute('viewBox', `0 0 ${pageLayout.width} ${pageLayout.height}`);
            const svgPageGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            tempSvg.appendChild(svgPageGroup);

            // 5. Add Part Name Title - REMOVED FOR ASSEMBLY PART PAGES
            // console.log(`${LOG_PREFIX}       Adding Main Title: "${part.name}"`);
            // const mainTitleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            // mainTitleText.setAttribute('x', pageLayout.width / 2);
            // mainTitleText.setAttribute('y', pageLayout.marginTop + MAIN_TITLE_HEIGHT / 2); // Use calculated margin
            // mainTitleText.setAttribute('font-size', MAIN_TITLE_FONT_SIZE); // Use constant
            // mainTitleText.setAttribute('font-family', 'Arial, sans-serif');
            // mainTitleText.setAttribute('text-anchor', 'middle');
            // mainTitleText.setAttribute('dominant-baseline', 'middle');
            // mainTitleText.setAttribute('fill', '#000000');
            // mainTitleText.setAttribute('font-weight', 'bold');
            // mainTitleText.textContent = part.name;
            // svgPageGroup.appendChild(mainTitleText);

            // 6. Render the Part Layout into Printable Area
            console.log(`${LOG_PREFIX}       Rendering combined layout for part ${part.name} into SVG printable area...`);
            const partTitle = ""; // Pass empty title as it's removed
            const partLayoutId = `${part.name.replace(/\s+/g, '_')}_layout_${index}`; // Ensure unique ID
            const partViewData = {
              combinedViewBox: combinedLayoutViewBox,
              frontPaths: pathGroups.frontPaths,
              topPaths: pathGroups.topPaths,
              rightPaths: pathGroups.rightPaths,
            };
            // Position the drawing within the printable area using calculated values
            const printableAreaPos = [pageLayout.printableX, pageLayout.printableY];
            const printableDimensions = { width: pageLayout.printableWidth, height: pageLayout.printableHeight };

            renderViewToPdfSvg(svgPageGroup, partViewData, partTitle, printableAreaPos, printableDimensions, partLayoutId, true, layoutOffsets);

            // 7. Add SVG element to the *current* PDF page
            const currentPageNum = pdf.internal.getNumberOfPages();
            console.log(`${LOG_PREFIX}     Attempting to add SVG element for page ${currentPageNum} (${part.name}) to PDF...`);
            // Ensure we're adding to the correct page (might be redundant if addPage sets context)
            pdf.setPage(currentPageNum);
            await pdf.svg(tempSvg, { x: 0, y: 0, width: pageLayout.width, height: pageLayout.height });
            console.log(`${LOG_PREFIX}     Finished adding SVG for page ${currentPageNum}`);

            // --- Draw Title Block for Part Page ---
            console.log(`${LOG_PREFIX}       Calculating and drawing title block for part ${part.name}...`);
            // Ensure we use the pageLayout calculated *for this specific part*
            const titleBlockLayoutPart = calculateTitleBlockLayout(
                pageLayout.width, pageLayout.height,
                pageLayout.marginLeft, pageLayout.marginTop, pageLayout.marginRight, pageLayout.marginBottom,
                pageLayout.orientation, PAPER_SIZES, DEFAULT_PAPER_SIZE // Assuming default paper size for all part pages
            );
            // TODO: Populate title block data more dynamically (e.g., get scale if available)
            const titleBlockDataPart = { project: "Multi-Part", partName: part.name || `Part ${index + 1}`, scale: "NTS" };
            drawTitleBlock(pdf, titleBlockLayoutPart, titleBlockDataPart);


          } // End for...of loop
          console.log(`${LOG_PREFIX}   Finished processing all parts.`);
        } // End else (valid parts found)
      } // End if (isMultiPage && hasParts)

      // --- Save the PDF ---
      if (pdf) {
        console.log(`${LOG_PREFIX} Saving PDF as "${pdfFilename}"...`);
        pdf.save(pdfFilename);
        console.log(`${LOG_PREFIX} PDF Export Successful: ${pdfFilename}`);
      } else {
         console.warn(`${LOG_PREFIX} PDF object was not initialized (likely no valid standard layout or parts found). No export occurred.`);
         alert("Could not generate PDF: No valid views found.");
      }

    } catch (error) {
      console.error(`${LOG_PREFIX} Error during PDF generation:`, error);
      alert(`Failed to export PDF: ${error.message}. See console for details.`);
    }

  }, [projections, activeMeasurements, renderViewToPdfSvg]); // Dependencies

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
