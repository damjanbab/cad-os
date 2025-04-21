import { useCallback } from 'react';
import { jsPDF } from "jspdf";
import 'svg2pdf.js'; // Side-effect import
import { parseViewBox, combineViewBoxes } from '../utils/svgUtils.js'; // Added combineViewBoxes
import { vec } from '../utils/geometryUtils.js'; // Although not directly used here, it was in the original file, keeping for potential future use or if renderMeasurementToSvg needs it implicitly.

const LOG_PREFIX = "[PDF Export]";

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

  // --- PDF Rendering Helper (Modified to handle combined part layouts) ---
  // Wrapped in useCallback to ensure stability if passed as dependency
  const renderViewToPdfSvg = useCallback((targetSvgGroup, viewData, viewTitle, position, dimensions, viewId, isPartLayout = false, layoutOffsets = {}) => {
    const logPrefixRender = `${LOG_PREFIX} Render[${viewId || viewTitle}]`;
    console.log(`${logPrefixRender} Rendering ${isPartLayout ? 'Part Layout' : 'View'} at [${position}] target ${dimensions.width}x${dimensions.height}mm`);

    if (!viewData || !dimensions || !viewData.combinedViewBox) {
      console.warn(`${logPrefixRender} Skipping render due to missing data:`, { viewData, dimensions });
      return;
    }
    const [x, y] = position;
    const { width: targetWidth, height: targetHeight } = dimensions; // Target area on PDF page (mm)
    console.log(`${LOG_PREFIX}   View Target Area: x=${x}, y=${y}, width=${targetWidth}, height=${targetHeight}`);

    const combinedViewBoxData = parseViewBox(viewData.combinedViewBox);
    console.log(`${logPrefixRender}   Layout Combined ViewBox: ${viewData.combinedViewBox}`, combinedViewBoxData);
    if (!combinedViewBoxData || combinedViewBoxData.width <= 0 || combinedViewBoxData.height <= 0) {
      console.warn(`${logPrefixRender} Skipping render due to invalid combined viewBox: ${viewData.combinedViewBox}`);
      return;
    }

    // Create a group for this whole layout/view (title + content)
    const layoutGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    layoutGroup.setAttribute('transform', `translate(${x}, ${y})`);
    targetSvgGroup.appendChild(layoutGroup);

    // --- Add Title (Main title for the layout/view) ---
    const titleHeight = 5; // Use consistent height for the title area above the content
    const viewTitleFontSize = 3; // Font size (mm)
    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleText.setAttribute('x', targetWidth / 2);
    titleText.setAttribute('y', titleHeight / 2); // Center in title area - FIX: Use titleHeight
    titleText.setAttribute('font-size', viewTitleFontSize);
    titleText.setAttribute('font-family', 'Arial, sans-serif');
    titleText.setAttribute('text-anchor', 'middle');
    titleText.setAttribute('dominant-baseline', 'middle');
    titleText.setAttribute('fill', '#333333');
    titleText.textContent = viewTitle; // Use the passed title (e.g., "Part Name" or "Standard Layout")
    layoutGroup.appendChild(titleText);

    // --- Calculate Base Transformation (Scale & Center the Combined Layout) ---
    const scaleX = targetWidth / combinedViewBoxData.width;
    const scaleY = (combinedViewBoxData.height > 1e-6) ? targetHeight / combinedViewBoxData.height : 1;
    const scale = Math.min(scaleX, scaleY);
    console.log(`${logPrefixRender}   Calculated Base Scale: scaleX=${scaleX.toFixed(4)}, scaleY=${scaleY.toFixed(4)}, finalScale=${scale.toFixed(4)}`);

    const scaledContentWidth = combinedViewBoxData.width * scale;
    const scaledContentHeight = combinedViewBoxData.height * scale;
    const baseTranslateX = (targetWidth - scaledContentWidth) / 2 - combinedViewBoxData.x * scale;
    const baseTranslateY = (targetHeight - scaledContentHeight) / 2 - combinedViewBoxData.y * scale;
    console.log(`${logPrefixRender}   Calculated Base Translation: dX=${baseTranslateX.toFixed(2)}, dY=${baseTranslateY.toFixed(2)}`);
    console.log(`${logPrefixRender}   Scaled Layout Size: ${scaledContentWidth.toFixed(2)}x${scaledContentHeight.toFixed(2)}mm`);

    // --- Create Main Content Group with Base Transform ---
    // This group holds all view sub-groups (Front, Top, Right) or the combined paths
    const mainContentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const mainContentTransform = `translate(0, ${titleHeight}) translate(${baseTranslateX}, ${baseTranslateY}) scale(${scale})`; // FIX: Use titleHeight
    mainContentGroup.setAttribute('transform', mainContentTransform);
    console.log(`${logPrefixRender}   Applied Main Content Group Transform: ${mainContentTransform}`);
    layoutGroup.appendChild(mainContentGroup);

    // Add SINGLE Border around the entire content area
    const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    borderRect.setAttribute('x', 0);
    borderRect.setAttribute('y', titleHeight); // Position below title area
    borderRect.setAttribute('width', targetWidth);
    borderRect.setAttribute('height', targetHeight);
    borderRect.setAttribute('fill', 'none');
    borderRect.setAttribute('stroke', '#cccccc');
    borderRect.setAttribute('stroke-width', 0.2);
    layoutGroup.appendChild(borderRect); // Add border relative to the layoutGroup

    // --- Render Paths into Main Content Group (with nested transforms if part layout) ---
    const strokeScale = scale > 0 ? 1 / scale : 1; // For dash scaling
    console.log(`${logPrefixRender}   Stroke Scale Factor (for dashes): ${strokeScale.toFixed(3)}`);

    const renderPaths = (paths, targetGroup) => {
        if (!paths || !Array.isArray(paths)) return;
        paths.forEach(path => {
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', path.data);
            const isHidden = path.visibility === 'hidden'; // Check visibility flag added in calculatePartLayout
            pathEl.setAttribute('stroke', isHidden ? '#777777' : '#000000');
            pathEl.setAttribute('stroke-width', isHidden ? 0.1 : 0.15);
            pathEl.setAttribute('stroke-linecap', 'round');
            pathEl.setAttribute('stroke-linejoin', 'round');
            if (isHidden) {
                pathEl.setAttribute('stroke-dasharray', `${2 * strokeScale},${1 * strokeScale}`);
            }
            pathEl.setAttribute('fill', 'none');
            pathEl.setAttribute('vector-effect', 'non-scaling-stroke');
            targetGroup.appendChild(pathEl);
        });
    };

    if (isPartLayout) {
        console.log(`${logPrefixRender}   Rendering Part Layout Views with Offsets...`);
        // Front View (no additional offset relative to combined layout origin)
        const frontGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        // Apply offset needed to place front view correctly within the combined layout
        frontGroup.setAttribute('transform', `translate(${layoutOffsets.front.x}, ${layoutOffsets.front.y})`);
        mainContentGroup.appendChild(frontGroup);
        renderPaths(viewData.frontPaths, frontGroup);

        // Top View (with topOffset relative to combined layout origin)
        if (viewData.topPaths && layoutOffsets.top) {
            const topGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            topGroup.setAttribute('transform', `translate(${layoutOffsets.top.x}, ${layoutOffsets.top.y})`);
            mainContentGroup.appendChild(topGroup);
            renderPaths(viewData.topPaths, topGroup);
        }

        // Right View (with rightOffset relative to combined layout origin)
        if (viewData.rightPaths && layoutOffsets.right) {
            const rightGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            rightGroup.setAttribute('transform', `translate(${layoutOffsets.right.x}, ${layoutOffsets.right.y})`);
            mainContentGroup.appendChild(rightGroup);
            renderPaths(viewData.rightPaths, rightGroup);
        }
    } else {
        // Standard Layout: Render all paths directly into mainContentGroup
        console.log(`${logPrefixRender}   Rendering Standard Layout Paths...`);
        renderPaths(viewData.visible?.paths, mainContentGroup); // Assuming standard layout only has visible combined paths
        renderPaths(viewData.hidden?.paths, mainContentGroup); // Render hidden if they exist
    }


    // --- Render Measurements (Needs Adjustment for Part Layouts) ---
    // TODO: Measurements need to be associated with their original view (front/top/right)
    // and rendered within the correctly transformed nested group (frontGroup, topGroup, rightGroup).
    // This requires passing the original view context with measurements or adjusting the filtering.
    // For now, measurements might not render correctly for part layouts.
    Object.values(activeMeasurements)
      .filter(m => m.viewId === viewId || m.viewId?.startsWith(viewId)) // Basic filter, needs refinement
      .forEach(measurement => {
        // Determine which group (front, top, right) the measurement belongs to
        // This requires knowing the original path ID structure or adding view info to measurement
        // Placeholder: Render all into main group for now
        let targetMeasurementGroup = mainContentGroup;
        let associatedPath = null; // Find the path the measurement is attached to

        // Simplified path finding (needs improvement based on actual path IDs)
        const findPath = (paths) => paths?.find(p => measurement.pathId.startsWith(p.id));
        associatedPath = findPath(viewData.frontPaths) || findPath(viewData.topPaths) || findPath(viewData.rightPaths) || findPath(viewData.visible?.paths) || findPath(viewData.hidden?.paths);

        if (associatedPath?.geometry) {
          const measurementSvgGroup = renderMeasurementToSvg(measurement, associatedPath.geometry);
          // Append to the correct nested group if possible, otherwise main group
          // This logic needs refinement based on how path IDs relate to views
          targetMeasurementGroup.appendChild(measurementSvgGroup);
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

    // PDF Page Layout Constants (mm)
    console.log(`${LOG_PREFIX} Defining Page Layout Constants...`);
    const pdfScale = 1; // 1 SVG unit = 1 PDF unit (mm) - Assuming SVG units are mm
    const pageMargin = 10; // mm
    const viewGap = 10; // mm // Gap between views in combined layouts
    const mainTitleHeight = 8; // mm
    const viewTitleHeight = 5; // mm // Height allocated for individual view titles (now only used for main title)
    const mainTitleFontSize = 4; // mm
    const viewTitleFontSize = 3; // mm
    console.log(`${LOG_PREFIX}   Constants: pdfScale=${pdfScale}, pageMargin=${pageMargin}, viewGap=${viewGap}, mainTitleHeight=${mainTitleHeight}, viewTitleHeight=${viewTitleHeight}`);

    let pdf;
    let pdfFilename = 'technical-drawing.pdf';
    let isMultiPage = false; // Flag to track if we are generating multiple pages

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

        // --- Initialize PDF with Standard Layout Page ---
        console.log(`${LOG_PREFIX}   Calculating dimensions for Standard Layout page...`);
        const layoutVB = parseViewBox(standardLayout.combinedViewBox);
        if (!layoutVB || layoutVB.width <= 0 || layoutVB.height <= 0) {
            throw new Error("Invalid combinedViewBox in standard layout.");
        }
        const layoutWidth = layoutVB.width * pdfScale;
        const layoutHeight = layoutVB.height * pdfScale;
        const pageContentWidth = layoutWidth;
        const pageContentHeight = layoutHeight + viewTitleHeight; // Space for the single title
        const totalPageWidth = pageContentWidth + 2 * pageMargin;
        const totalPageHeight = pageContentHeight + mainTitleHeight + 2 * pageMargin;
        const orientation = totalPageWidth > totalPageHeight ? 'l' : 'p';
        const format = [totalPageWidth, totalPageHeight];
        console.log(`${LOG_PREFIX}   Initializing jsPDF for Assembly: orientation='${orientation}', unit='mm', format=[${format.map(d => d.toFixed(2))}]`);
        pdf = new jsPDF({ orientation, unit: 'mm', format });

        // --- Render Standard Layout on Page 1 ---
        console.log(`${LOG_PREFIX}   Creating temporary SVG for Standard Layout page...`);
        const tempSvgStd = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvgStd.setAttribute('width', totalPageWidth);
        tempSvgStd.setAttribute('height', totalPageHeight);
        tempSvgStd.setAttribute('viewBox', `0 0 ${totalPageWidth} ${totalPageHeight}`);
        const svgPageGroupStd = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tempSvgStd.appendChild(svgPageGroupStd);

        // Add Main Title for Standard Layout
        const mainTitleContentStd = "Assembly - Standard Layout";
        console.log(`${LOG_PREFIX}     Adding Main Title: "${mainTitleContentStd}"`);
        const mainTitleTextStd = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        mainTitleTextStd.setAttribute('x', totalPageWidth / 2);
        mainTitleTextStd.setAttribute('y', pageMargin + mainTitleHeight / 2);
        mainTitleTextStd.setAttribute('font-size', mainTitleFontSize);
        mainTitleTextStd.setAttribute('font-family', 'Arial, sans-serif');
        mainTitleTextStd.setAttribute('text-anchor', 'middle');
        mainTitleTextStd.setAttribute('dominant-baseline', 'middle');
        mainTitleTextStd.setAttribute('fill', '#000000');
        mainTitleTextStd.setAttribute('font-weight', 'bold');
        mainTitleTextStd.textContent = mainTitleContentStd;
        svgPageGroupStd.appendChild(mainTitleTextStd);

        // Render the standard layout
        console.log(`${LOG_PREFIX}     Rendering standard layout into SVG...`);
        const layoutId = "assembly_standard_layout";
        const standardLayoutViewData = {
          combinedViewBox: standardLayout.combinedViewBox,
          visible: { paths: standardLayout.paths || [] },
          hidden: { paths: [] }
        };
        const layoutPos = [pageMargin, pageMargin + mainTitleHeight];
        const layoutDimensions = { width: layoutWidth, height: layoutHeight };
        renderViewToPdfSvg(svgPageGroupStd, standardLayoutViewData, mainTitleContentStd, layoutPos, layoutDimensions, layoutId);

        // Add SVG to PDF Page 1
        console.log(`${LOG_PREFIX}   Attempting to add Standard Layout SVG to PDF Page 1...`);
        await pdf.svg(tempSvgStd, { x: 0, y: 0, width: totalPageWidth, height: totalPageHeight });
        console.log(`${LOG_PREFIX}   Successfully added Standard Layout SVG.`);

        // --- Now Loop Through Parts for Subsequent Pages ---
        console.log(`${LOG_PREFIX}   Starting loop through parts for subsequent pages...`);
        // Proceed to the part processing logic below, but without re-initializing pdf

      }
      // --- Case 2: Standard Layout Only (Single Component) ---
      else if (hasStandard && !hasParts) {
        console.log(`${LOG_PREFIX} Exporting Standard Layout Only (Single Page)...`);
        pdfFilename = 'technical-drawing-standard.pdf';
        const standardLayout = projections.standardLayout;
        // (Standard Layout Only logic remains the same as before)
        console.log(`${LOG_PREFIX}   Standard Layout Data:`, standardLayout);
        const layoutVB = parseViewBox(standardLayout.combinedViewBox);
        if (!layoutVB || layoutVB.width <= 0 || layoutVB.height <= 0) {
            throw new Error("Invalid combinedViewBox in standard layout.");
        }
        const layoutWidth = layoutVB.width * pdfScale;
        const layoutHeight = layoutVB.height * pdfScale;
        const pageContentWidth = layoutWidth;
        const pageContentHeight = layoutHeight + viewTitleHeight;
        const totalPageWidth = pageContentWidth + 2 * pageMargin;
        const totalPageHeight = pageContentHeight + mainTitleHeight + 2 * pageMargin;
        const orientation = totalPageWidth > totalPageHeight ? 'l' : 'p';
        const format = [totalPageWidth, totalPageHeight];
        console.log(`${LOG_PREFIX}   Initializing jsPDF: orientation='${orientation}', unit='mm', format=[${format.map(d => d.toFixed(2))}]`);
        pdf = new jsPDF({ orientation, unit: 'mm', format });
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvg.setAttribute('width', totalPageWidth);
        tempSvg.setAttribute('height', totalPageHeight);
        tempSvg.setAttribute('viewBox', `0 0 ${totalPageWidth} ${totalPageHeight}`);
        const svgPageGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tempSvg.appendChild(svgPageGroup);
        const mainTitleContent = "Standard Layout";
        const mainTitleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        mainTitleText.setAttribute('x', totalPageWidth / 2);
        mainTitleText.setAttribute('y', pageMargin + mainTitleHeight / 2);
        mainTitleText.setAttribute('font-size', mainTitleFontSize);
        mainTitleText.setAttribute('font-family', 'Arial, sans-serif');
        mainTitleText.setAttribute('text-anchor', 'middle');
        mainTitleText.setAttribute('dominant-baseline', 'middle');
        mainTitleText.setAttribute('fill', '#000000');
        mainTitleText.setAttribute('font-weight', 'bold');
        mainTitleText.textContent = mainTitleContent;
        svgPageGroup.appendChild(mainTitleText);
        const layoutId = "standard_layout";
        const standardLayoutViewData = {
          combinedViewBox: standardLayout.combinedViewBox,
          visible: { paths: standardLayout.paths || [] },
          hidden: { paths: [] }
        };
        const layoutPos = [pageMargin, pageMargin + mainTitleHeight];
        const layoutDimensions = { width: layoutWidth, height: layoutHeight };
        renderViewToPdfSvg(svgPageGroup, standardLayoutViewData, mainTitleContent, layoutPos, layoutDimensions, layoutId);
        await pdf.svg(tempSvg, { x: 0, y: 0, width: totalPageWidth, height: totalPageHeight });
        console.log(`${LOG_PREFIX}   Successfully added single page SVG element.`);
      }
      // --- Case 3: Part Views Only ---
      else if (!hasStandard && hasParts) {
        console.log(`${LOG_PREFIX} Exporting Part Views Only (Multi-Page)...`);
        pdfFilename = 'technical-drawing-parts.pdf';
        isMultiPage = true;
        console.log(`${LOG_PREFIX}   Parts Data:`, projections.parts);

        // Initialize PDF with first page's settings
        console.log(`${LOG_PREFIX}   Calculating dimensions for the first valid part to initialize PDF...`);
        let firstPartIndex = projections.parts.findIndex(part => part.views?.front || part.views?.top || part.views?.right);
        if (firstPartIndex === -1) {
            throw new Error("No parts with valid views found for PDF export.");
        }
        const firstPart = projections.parts[firstPartIndex];
        console.log(`${LOG_PREFIX}     First valid part found at index ${firstPartIndex}: ${firstPart.name}`);
        const firstPartData = calculatePartLayout(firstPart, pdfScale, pageMargin, mainTitleHeight, viewGap);
        if (!firstPartData) {
            throw new Error("Failed to calculate layout for initial part.");
        }
        const { totalPageWidth: fpTotalPageWidth, totalPageHeight: fpTotalPageHeight } = firstPartData;
        const fpOrientation = fpTotalPageWidth > fpTotalPageHeight ? 'l' : 'p';
        const fpFormat = [fpTotalPageWidth, fpTotalPageHeight];
        console.log(`${LOG_PREFIX}     First Page Calculated Size (WxH): ${fpTotalPageWidth.toFixed(2)}x${fpTotalPageHeight.toFixed(2)} mm`);
        console.log(`${LOG_PREFIX}   Initializing jsPDF for Multi-Part: orientation='${fpOrientation}', unit='mm', format=[${fpFormat.map(d => d.toFixed(2))}]`);
        pdf = new jsPDF({ orientation: fpOrientation, unit: 'mm', format: fpFormat });
        // Proceed to the part processing logic below
      }

      // --- Process Parts (Common logic for Case 1 and Case 3) ---
      if (isMultiPage && hasParts) {
        let firstPartIndex = projections.parts.findIndex(part => part.views?.front || part.views?.top || part.views?.right); // Recalculate just in case

        for (const [index, part] of projections.parts.entries()) {
          const originalIndex = projections.parts.indexOf(part); // Get original index

          console.log(`${LOG_PREFIX} Processing Part ${originalIndex + 1}/${projections.parts.length}: ${part.name}`);

          const partLayoutData = calculatePartLayout(part, pdfScale, pageMargin, mainTitleHeight, viewGap);

          if (!partLayoutData) {
            console.warn(`${LOG_PREFIX} Skipping part ${part.name} (Index ${originalIndex}) due to layout calculation error or missing views.`);
            continue;
          }

          const {
            totalPageWidth, totalPageHeight, combinedLayoutViewBox,
            pathGroups, // Changed from allPartPaths
            layoutOffsets, // Added offsets
            layoutWidth, layoutHeight
          } = partLayoutData;

          const orientation = totalPageWidth > totalPageHeight ? 'l' : 'p';
          const format = [totalPageWidth, totalPageHeight];

          // Add new page if needed (not the first part overall, or if we already added the standard layout page)
          const isFirstPartPage = (index === firstPartIndex);
          if (!isFirstPartPage || (hasStandard && hasParts)) { // Add page if not first part OR if assembly mode
             console.log(`${LOG_PREFIX}   Adding Page ${pdf.internal.getNumberOfPages() + 1} to PDF with format=[${format.map(d => d.toFixed(2))}], orientation='${orientation}'`);
             pdf.addPage(format, orientation);
          } else {
             console.log(`${LOG_PREFIX}   Processing first part page (original index ${originalIndex + 1}). PDF already initialized.`);
          }

          // Create Temporary SVG for this page
          console.log(`${LOG_PREFIX}     Creating temporary SVG container for part ${part.name} (${totalPageWidth.toFixed(2)}x${totalPageHeight.toFixed(2)})...`);
          const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          tempSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          tempSvg.setAttribute('width', totalPageWidth);
          tempSvg.setAttribute('height', totalPageHeight);
          tempSvg.setAttribute('viewBox', `0 0 ${totalPageWidth} ${totalPageHeight}`);
          const svgPageGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          tempSvg.appendChild(svgPageGroup);

          // Add Part Name Title
          console.log(`${LOG_PREFIX}       Adding Main Title: "${part.name}"`);
          const mainTitleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          mainTitleText.setAttribute('x', totalPageWidth / 2);
          mainTitleText.setAttribute('y', pageMargin + mainTitleHeight / 2);
          mainTitleText.setAttribute('font-size', mainTitleFontSize);
          mainTitleText.setAttribute('font-family', 'Arial, sans-serif');
          mainTitleText.setAttribute('text-anchor', 'middle');
          mainTitleText.setAttribute('dominant-baseline', 'middle');
          mainTitleText.setAttribute('fill', '#000000');
          mainTitleText.setAttribute('font-weight', 'bold');
          mainTitleText.textContent = part.name;
          svgPageGroup.appendChild(mainTitleText);

          // Render the combined layout for the part using a single call to the modified renderer
          console.log(`${LOG_PREFIX}       Rendering combined layout for part ${part.name} into SVG...`);
          const partLayoutId = `${part.name.replace(/\s+/g, '_')}_layout`; // Use simpler ID
          // Prepare viewData with grouped paths
          const partViewData = {
            combinedViewBox: combinedLayoutViewBox,
            frontPaths: pathGroups.frontPaths,
            topPaths: pathGroups.topPaths,
            rightPaths: pathGroups.rightPaths,
            // No longer need separate visible/hidden here as renderPaths handles it
          };
          const layoutPos = [pageMargin, pageMargin + mainTitleHeight];
          const layoutDimensions = { width: layoutWidth, height: layoutHeight };

          // Call renderViewToPdfSvg ONCE for the entire part layout, passing isPartLayout and offsets
          renderViewToPdfSvg(svgPageGroup, partViewData, part.name, layoutPos, layoutDimensions, partLayoutId, true, layoutOffsets);


          // Add SVG element to PDF page
          const currentPageNum = pdf.internal.getNumberOfPages();
          console.log(`${LOG_PREFIX}     Attempting to add SVG element for page ${currentPageNum} (${part.name}) to PDF...`);
          await pdf.svg(tempSvg, { x: 0, y: 0, width: totalPageWidth, height: totalPageHeight });
          console.log(`${LOG_PREFIX}     Finished adding SVG for page ${currentPageNum}`);

        } // End for...of loop
        console.log(`${LOG_PREFIX}   Finished processing all parts.`);
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


// --- Helper Function to Calculate Part Layout and Transform Paths ---
function calculatePartLayout(part, pdfScale, pageMargin, mainTitleHeight, viewGap) {
    console.log(`${LOG_PREFIX}     Calculating layout for part ${part.name}...`);
    const frontView = part.views?.front;
    const topView = part.views?.top;
    const rightView = part.views?.right;

    if (!frontView && !topView && !rightView) {
        console.warn(`${LOG_PREFIX} Part ${part.name} has no standard views.`);
        return null;
    }

    // --- 1. Get Data & ViewBoxes ---
    // Use normalizedViewBox if available, otherwise fallback to combinedViewBox or visible viewBox
    const getSafeViewBox = (view) => {
        if (!view) return { x: 0, y: 0, width: 0, height: 0 };
        const vbString = view.normalizedViewBox || view.combinedViewBox || view.visible?.viewBox || view.hidden?.viewBox;
        return parseViewBox(vbString || "0 0 0 0");
    };

    const frontVB = getSafeViewBox(frontView);
    const topVB = getSafeViewBox(topView);
    const rightVB = getSafeViewBox(rightView);
    console.log(`${LOG_PREFIX}       Part ViewBoxes (Original): Front=`, frontVB, `Top=`, topVB, `Right=`, rightVB);

    if (frontVB.width <= 0 && frontVB.height <= 0 && topVB.width <= 0 && topVB.height <= 0 && rightVB.width <= 0 && rightVB.height <= 0) {
        console.warn(`${LOG_PREFIX} Part ${part.name} has no valid view dimensions.`);
        return null;
    }

    // --- 2. Calculate Layout & Combined ViewBox (similar to standard layout logic) ---
    let layoutOriginX = frontVB.x; // Start with front view's origin
    let layoutOriginY = frontVB.y;
    let totalLayoutWidth = frontVB.width;
    let totalLayoutHeight = frontVB.height;
    let topOffset = { x: 0, y: 0 }; // Relative offset for top view paths
    let rightOffset = { x: 0, y: 0 }; // Relative offset for right view paths

    // Position Top View below Front View
    if (topVB.width > 0 || topVB.height > 0) {
      const topPosX = frontVB.x + (frontVB.width - topVB.width) / 2;
      const topPosY = frontVB.y + frontVB.height + viewGap;
      topOffset.x = topPosX - topVB.x; // Translation needed for top paths
      topOffset.y = topPosY - topVB.y;
      layoutOriginX = Math.min(layoutOriginX, topPosX); // Adjust overall layout origin
      layoutOriginY = Math.min(layoutOriginY, frontVB.y); // Top is below front
      totalLayoutWidth = Math.max(totalLayoutWidth, topVB.width + (topPosX - frontVB.x));
      totalLayoutHeight = (topPosY + topVB.height) - layoutOriginY;
    }

    // Position Right View to the right of Front View
    if (rightVB.width > 0 || rightVB.height > 0) {
      const rightPosX = frontVB.x + frontVB.width + viewGap;
      const rightPosY = frontVB.y + (frontVB.height - rightVB.height) / 2;
      rightOffset.x = rightPosX - rightVB.x; // Translation needed for right paths
      rightOffset.y = rightPosY - rightVB.y;
      layoutOriginX = Math.min(layoutOriginX, frontVB.x); // Right is beside front
      layoutOriginY = Math.min(layoutOriginY, rightPosY); // Adjust overall layout origin
      totalLayoutWidth = (rightPosX + rightVB.width) - layoutOriginX;
      totalLayoutHeight = Math.max(totalLayoutHeight, rightVB.height + (rightPosY - layoutOriginY));
    }

    const combinedLayoutViewBox = `${layoutOriginX} ${layoutOriginY} ${totalLayoutWidth} ${totalLayoutHeight}`;
    console.log(`[INFO]       Part Calculated Combined Layout ViewBox: ${combinedLayoutViewBox}`);
    console.log(`[INFO]       Part Top Offset for Transform: (${topOffset.x.toFixed(2)}, ${topOffset.y.toFixed(2)})`);
    console.log(`[INFO]       Part Top Offset for Render: (${topOffset.x.toFixed(2)}, ${topOffset.y.toFixed(2)})`); // Renamed log
    console.log(`[INFO]       Part Right Offset for Render: (${rightOffset.x.toFixed(2)}, ${rightOffset.y.toFixed(2)})`); // Renamed log

    // --- 3. Collect Original Paths (No Transformation Here) ---
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
        // Corrected order: hidden first, then visible
        addPaths(view.hidden?.paths, 'hidden');
        addPaths(view.visible?.paths, 'visible');
    };

    collectPaths(frontView, 'frontPaths');
    collectPaths(topView, 'topPaths');
    collectPaths(rightView, 'rightPaths');
    console.log(`[INFO]       Collected original paths for part ${part.name}: Front=${pathGroups.frontPaths.length}, Top=${pathGroups.topPaths.length}, Right=${pathGroups.rightPaths.length}`);


    // --- 4. Calculate Page Dimensions ---
    const layoutWidth = totalLayoutWidth * pdfScale;
    const layoutHeight = totalLayoutHeight * pdfScale;
    const pageContentWidth = layoutWidth;
    // No extra viewTitleHeight needed here as title is part of mainTitleHeight
    const pageContentHeight = layoutHeight;
    const finalTotalPageWidth = pageContentWidth + 2 * pageMargin;
    const finalTotalPageHeight = pageContentHeight + mainTitleHeight + 2 * pageMargin; // Add main title height
    console.log(`${LOG_PREFIX}     Part Page Size (WxH): ${finalTotalPageWidth.toFixed(2)}x${finalTotalPageHeight.toFixed(2)} mm`);

    // Return data needed for rendering, including offsets and original path groups
    return {
        totalPageWidth: finalTotalPageWidth,
        totalPageHeight: finalTotalPageHeight,
        combinedLayoutViewBox,
        pathGroups, // Contains original paths grouped by view
        layoutOffsets: { // Offsets needed for rendering placement
            front: { x: layoutOriginX - frontVB.x, y: layoutOriginY - frontVB.y }, // Offset to place front view relative to combined origin
            top: topOffset,
            right: rightOffset
        },
        layoutWidth,
        layoutHeight,
    };
}
