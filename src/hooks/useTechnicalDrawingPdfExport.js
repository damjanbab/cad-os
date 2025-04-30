import { useCallback } from 'react';
import { jsPDF } from "jspdf";
import 'svg2pdf.js'; // Side-effect import
import { parseViewBox } from '../utils/svgUtils.js';
import { vec } from '../utils/geometryUtils.js'; // Keep for potential future use
// Import SVG path helpers including the new scalePathData
import { parsePathData, transformPathData, scalePathData, serializePathData } from '../utils/svgPathUtils.js';

const LOG_PREFIX = "[PDF Export]";

// Parses layout string "rowsxcols" into [rows, cols]
const parseLayout = (layoutString) => {
  if (!layoutString || !layoutString.includes('x')) {
    return [1, 1];
  }
  const [rows, cols] = layoutString.split('x').map(Number);
  return [isNaN(rows) ? 1 : rows, isNaN(cols) ? 1 : cols];
};

// --- Standard Paper Sizes (mm) ---
const PAPER_SIZES = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

// --- PDF Page Layout Constants (mm) ---
const DEFAULT_PAPER_SIZE = 'a4';
const MARGIN_LEFT_PORTRAIT = 20;
const MARGIN_TOP_LANDSCAPE = 20;
const MARGIN_OTHER = 10;
const VIEW_TITLE_HEIGHT = 5; // Not currently used for viewbox titles, but kept for potential use
const MAIN_TITLE_FONT_SIZE = 4; // Not currently used
const VIEW_TITLE_FONT_SIZE = 3; // Not currently used
const VIEW_GAP = 20; // Gap between grid cells for PDF (Changed from 5)
const PDF_SCALE = 1; // Default scale factor (can be overridden)

// --- PDF Styling Constants (mm unless specified) ---
const PDF_VISIBLE_STROKE_COLOR = '#000000';
const PDF_HIDDEN_STROKE_COLOR = '#777777';
const PDF_MEASUREMENT_STROKE_COLOR = '#222222';
const PDF_MEASUREMENT_FILL_COLOR = '#222222';
const PDF_MEASUREMENT_FONT_FAMILY = 'Arial, sans-serif';
const PDF_TITLE_BLOCK_FONT_FAMILY = 'helvetica';
const PDF_TITLE_BLOCK_FONT_SIZE_LABEL = 11; // pt
const PDF_TITLE_BLOCK_FONT_SIZE_VALUE = 10; // pt
const PDF_TITLE_BLOCK_LINE_WEIGHT = 0.15; // mm
const PDF_BORDER_LINE_WEIGHT = 0.2; // mm

// Base values (will be scaled)
const PDF_BASE_VISIBLE_STROKE_WIDTH = 0.5; // mm
const PDF_BASE_HIDDEN_STROKE_WIDTH = 0.35;  // mm
const PDF_BASE_MEASUREMENT_STROKE_WIDTH = 0.08; // mm
const PDF_BASE_MEASUREMENT_FONT_SIZE = 3.5; // mm
const PDF_BASE_MEASUREMENT_ARROW_SIZE = 1.2; // mm
const PDF_BASE_MEASUREMENT_TEXT_OFFSET = 1.2; // mm
const PDF_BASE_MEASUREMENT_EXTENSION_GAP = 0.8; // mm
const PDF_BASE_MEASUREMENT_EXTENSION_OVERHANG = 1.2; // mm
const PDF_HIDDEN_DASH_LENGTH = 2; // mm (base)
const PDF_HIDDEN_DASH_GAP = 1; // mm (base)
const MIN_MARGIN = 25; // Minimum margin from printable area edges (mm)
const FIXED_GAP = 20; // Fixed visual gap between views on the PDF (mm)

// --- Helper Function to Determine Optimal Page Layout ---
const getStandardPageLayout = (contentWidth, contentHeight, paperSizeKey = DEFAULT_PAPER_SIZE) => {
  // (Keep existing function)
  const paper = PAPER_SIZES[paperSizeKey] || PAPER_SIZES.a4;
  const portrait = { width: paper.width, height: paper.height };
  const landscape = { width: paper.height, height: paper.width };
  const pMarginLeft = MARGIN_LEFT_PORTRAIT;
  const pMarginTop = MARGIN_OTHER;
  const pMarginRight = MARGIN_OTHER;
  const pMarginBottom = MARGIN_OTHER;
  const pPrintableWidth = portrait.width - pMarginLeft - pMarginRight;
  const pPrintableHeight = portrait.height - pMarginTop - pMarginBottom;
  const lMarginLeft = MARGIN_OTHER;
  const lMarginTop = MARGIN_TOP_LANDSCAPE;
  const lMarginRight = MARGIN_OTHER;
  const lMarginBottom = MARGIN_OTHER;
  const lPrintableWidth = landscape.width - lMarginLeft - lMarginRight;
  const lPrintableHeight = landscape.height - lMarginTop - lMarginBottom;
  const scaleP = Math.min(pPrintableWidth / contentWidth, pPrintableHeight / contentHeight);
  const scaleL = Math.min(lPrintableWidth / contentWidth, lPrintableHeight / contentHeight);
  if (scaleL > scaleP) {
    return { orientation: 'l', width: landscape.width, height: landscape.height, marginLeft: lMarginLeft, marginTop: lMarginTop, marginRight: lMarginRight, marginBottom: lMarginBottom, printableX: lMarginLeft, printableY: lMarginTop, printableWidth: lPrintableWidth, printableHeight: lPrintableHeight };
  } else {
    return { orientation: 'p', width: portrait.width, height: portrait.height, marginLeft: pMarginLeft, marginTop: pMarginTop, marginRight: pMarginRight, marginBottom: pMarginBottom, printableX: pMarginLeft, printableY: pMarginTop, printableWidth: pPrintableWidth, printableHeight: pPrintableHeight };
  }
};


// --- Helper Function for Measurement SVG Rendering (for PDF) ---
// Note: geometry coordinates (endpoints, center, textPosition) are UNscaled.
// The 'scale' parameter (viewScale) is applied internally here.
const renderMeasurementToSvg = (measurementData, geometry, scale = 1) => {
  const { pathId, type, textPosition: unscaledTextPos } = measurementData;
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  // Calculate style values based on inverse scale
  const scaleFactor = scale > 1e-6 ? 1 / scale : 1; // For styles that need inverse scaling
  const strokeWidth = PDF_BASE_MEASUREMENT_STROKE_WIDTH * scaleFactor;
  const fontSize = PDF_BASE_MEASUREMENT_FONT_SIZE; // Font size in mm should remain constant on paper
  const arrowSize = PDF_BASE_MEASUREMENT_ARROW_SIZE; // Arrow size in mm should remain constant on paper
  const textOffset = PDF_BASE_MEASUREMENT_TEXT_OFFSET; // Text offset in mm should remain constant
  const extensionGap = PDF_BASE_MEASUREMENT_EXTENSION_GAP; // Extension gap in mm should remain constant
  const extensionOverhang = PDF_BASE_MEASUREMENT_EXTENSION_OVERHANG; // Extension overhang in mm should remain constant
  const strokeColor = PDF_MEASUREMENT_STROKE_COLOR;
  const fillColor = PDF_MEASUREMENT_FILL_COLOR;
  const fontFamily = PDF_MEASUREMENT_FONT_FAMILY;
  const createSvgElement = (tag, attributes) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const key in attributes) { el.setAttribute(key, attributes[key]); }
    return el;
  };

  // Apply scale to geometry coordinates
  const scaleCoord = (coord) => [coord[0] * scale, coord[1] * scale];
  const scaleValue = (val) => val * scale;

  // --- Determine Text Content (Check for Override) ---
  let textContent = '';
  if (measurementData.overrideValue !== null && measurementData.overrideValue !== '') {
    textContent = measurementData.overrideValue;
    console.log(`[PDF Export] Using override value for ${pathId}: "${textContent}"`);
  } else if (type === 'line' && geometry?.length != null) {
    textContent = parseFloat(geometry.length.toFixed(2)).toString();
  } else if (type === 'circle' && geometry?.diameter != null) {
    textContent = `⌀${parseFloat(geometry.diameter.toFixed(2)).toString()}`;
  }
  // Add a fallback if textContent is still empty
  if (textContent === '') {
      console.warn(`[PDF Export] Could not determine text content for measurement ${pathId}. Type: ${type}`);
      textContent = '?'; // Placeholder for missing value
  }

  if (type === 'line' && geometry?.endpoints && unscaledTextPos) {
    const [usp1, usp2] = geometry.endpoints; // Unscaled points
    const p1 = scaleCoord(usp1);
    const p2 = scaleCoord(usp2);
    const textPos = scaleCoord([unscaledTextPos.x, unscaledTextPos.y]);
    // Use textContent determined above (could be override or calculated)

    const vx = p2[0] - p1[0]; const vy = p2[1] - p1[1];
    const midX = (p1[0] + p2[0]) / 2; const midY = (p1[1] + p2[1]) / 2;
    const lineLen = Math.sqrt(vx * vx + vy * vy); // Length on paper
    const ux = lineLen > 1e-6 ? vx / lineLen : 1; const uy = lineLen > 1e-6 ? vy / lineLen : 0;
    const nx = -uy; const ny = ux;

    // Calculate offset direction based on scaled text position relative to scaled midpoint
    const textOffsetX = textPos[0] - midX; const textOffsetY = textPos[1] - midY;
    const offsetDist = textOffsetX * nx + textOffsetY * ny; // Projected distance
    // Use fixed textOffset (mm) for the actual offset distance
    const actualOffsetDist = Math.abs(offsetDist) < textOffset ? Math.sign(offsetDist || 1) * textOffset : offsetDist;

    // Calculate points using fixed offsets (mm) from the scaled line
    const dimLineP1 = [p1[0] + nx * actualOffsetDist, p1[1] + ny * actualOffsetDist];
    const dimLineP2 = [p2[0] + nx * actualOffsetDist, p2[1] + ny * actualOffsetDist];
    const extLineP1Start = [p1[0] + nx * Math.sign(actualOffsetDist) * extensionGap, p1[1] + ny * Math.sign(actualOffsetDist) * extensionGap];
    const extLineP2Start = [p2[0] + nx * Math.sign(actualOffsetDist) * extensionGap, p2[1] + ny * Math.sign(actualOffsetDist) * extensionGap];
    const extLineP1End = [dimLineP1[0] + nx * Math.sign(actualOffsetDist) * extensionOverhang, dimLineP1[1] + ny * Math.sign(actualOffsetDist) * extensionOverhang];
    const extLineP2End = [dimLineP2[0] + nx * Math.sign(actualOffsetDist) * extensionOverhang, dimLineP2[1] + ny * Math.sign(actualOffsetDist) * extensionOverhang];

    // Arrow heads (fixed size in mm)
    const arrowNormX = ux; const arrowNormY = uy;
    const arrowHeadFactor = 0.35;
    const arrowTailFactor = 1 - arrowHeadFactor;
    const arrow1 = `M ${dimLineP1[0]} ${dimLineP1[1]} l ${arrowNormX * arrowSize} ${arrowNormY * arrowSize} l ${-arrowNormY * arrowSize * arrowHeadFactor} ${arrowNormX * arrowSize * arrowHeadFactor} l ${-arrowNormX * arrowSize * arrowTailFactor} ${-arrowNormY * arrowSize * arrowTailFactor} z`;
    const arrow2 = `M ${dimLineP2[0]} ${dimLineP2[1]} l ${-arrowNormX * arrowSize} ${-arrowNormY * arrowSize} l ${arrowNormY * arrowSize * arrowHeadFactor} ${-arrowNormX * arrowSize * arrowHeadFactor} l ${arrowNormX * arrowSize * arrowTailFactor} ${arrowNormY * arrowSize * arrowTailFactor} z`;

    // Text breaking logic (using fixed sizes in mm)
    const textWidthEstimate = textContent.length * fontSize * 0.6; // Estimate based on fixed font size
    const gapSize = textWidthEstimate + textOffset * 1.5;
    const halfGap = gapSize / 2;
    // Project scaled text position onto the dimension line
    const textProj = (textPos[0] - dimLineP1[0]) * arrowNormX + (textPos[1] - dimLineP1[1]) * arrowNormY;
    const breakStartPos = Math.max(arrowSize, textProj - halfGap);
    const breakEndPos = Math.min(lineLen - arrowSize, textProj + halfGap);
    const dimLine1End = [dimLineP1[0] + arrowNormX * breakStartPos, dimLineP1[1] + arrowNormY * breakStartPos];
    const dimLine2Start = [dimLineP1[0] + arrowNormX * breakEndPos, dimLineP1[1] + arrowNormY * breakEndPos];
    const showDimLine1 = breakStartPos > arrowSize + 1e-6;
    const showDimLine2 = breakEndPos < lineLen - arrowSize - 1e-6;

    // Draw elements
    group.appendChild(createSvgElement('line', { x1: extLineP1Start[0], y1: extLineP1Start[1], x2: extLineP1End[0], y2: extLineP1End[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    group.appendChild(createSvgElement('line', { x1: extLineP2Start[0], y1: extLineP2Start[1], x2: extLineP2End[0], y2: extLineP2End[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    if (showDimLine1) group.appendChild(createSvgElement('line', { x1: dimLineP1[0], y1: dimLineP1[1], x2: dimLine1End[0], y2: dimLine1End[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    if (showDimLine2) group.appendChild(createSvgElement('line', { x1: dimLine2Start[0], y1: dimLine2Start[1], x2: dimLineP2[0], y2: dimLineP2[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    group.appendChild(createSvgElement('path', { d: arrow1, fill: fillColor, stroke: 'none' }));
    group.appendChild(createSvgElement('path', { d: arrow2, fill: fillColor, stroke: 'none' }));

    // Position text using fixed offset from dim line
    const textDrawX = dimLineP1[0] + arrowNormX * textProj + ny * textOffset; // Position along dim line + offset normal
    const textDrawY = dimLineP1[1] + arrowNormY * textProj - nx * textOffset;
    const textEl = createSvgElement('text', { x: textDrawX, y: textDrawY, 'font-size': fontSize, fill: fillColor, stroke: 'none', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': fontFamily });
    textEl.textContent = textContent; // Use determined textContent
    group.appendChild(textEl);

  } else if (type === 'circle' && geometry?.center && geometry.diameter != null && unscaledTextPos) {
    const [uscx, uscy] = geometry.center; // Unscaled center
    const cx = uscx * scale;
    const cy = uscy * scale;
    // const diameter = geometry.diameter; // Actual model diameter - No longer needed here
    const radius = (geometry.radius || geometry.diameter / 2) * scale; // Scaled radius for drawing
    // Use textContent determined above (could be override or calculated)
    const textPos = scaleCoord([unscaledTextPos.x, unscaledTextPos.y]); // Scaled text position

    // Calculate leader line based on scaled positions and fixed offset
    const textVecX = textPos[0] - cx; const textVecY = textPos[1] - cy;
    const distSqr = textVecX * textVecX + textVecY * textVecY;
    let angle = (distSqr < 1e-9) ? 0 : Math.atan2(textVecY, textVecX);
    const cosA = Math.cos(angle); const sinA = Math.sin(angle);
    const leaderStart = [cx + cosA * radius, cy + sinA * radius];
    // End leader line using fixed offset (mm)
    const leaderEnd = [textPos[0] - cosA * (textOffset * 0.5), textPos[1] - sinA * (textOffset * 0.5)];

    group.appendChild(createSvgElement('line', { x1: leaderStart[0], y1: leaderStart[1], x2: leaderEnd[0], y2: leaderEnd[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    const textEl = createSvgElement('text', { x: textPos[0], y: textPos[1], 'font-size': fontSize, fill: fillColor, stroke: 'none', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': fontFamily });
    textEl.textContent = textContent; // Use determined textContent
    group.appendChild(textEl);
  }
  // Only return group if textContent was successfully determined
  return textContent !== '?' ? group : null;
};


// --- PDF Export Hook ---
export function useTechnicalDrawingPdfExport(viewboxes, activeMeasurements) {

  // --- PDF Export Logic ---
  const exportPdf = useCallback(async () => {
    console.log(`${LOG_PREFIX} Starting PDF Export...`);
    console.log(`${LOG_PREFIX} Input Viewboxes:`, viewboxes);
    console.log(`${LOG_PREFIX} Input Measurements:`, activeMeasurements);

    if (!viewboxes || viewboxes.length === 0) {
      console.error(`${LOG_PREFIX} No viewboxes available for PDF export.`);
      alert("No viewboxes created yet to export.");
      return;
    }

    let pdf;
    let pdfFilename = 'technical-drawing-viewboxes.pdf';
    let isFirstPage = true;

    try {
      // --- Loop through each Viewbox ---
      for (const [index, viewbox] of viewboxes.entries()) {
        console.log(`${LOG_PREFIX} Processing Viewbox ${index + 1}/${viewboxes.length}: ID=${viewbox.id}, Layout=${viewbox.layout}`);

        const validItems = viewbox.items.filter(item => item && item.svgData && item.svgData.viewBox);
        if (validItems.length === 0) {
          console.warn(`${LOG_PREFIX}   Viewbox ${viewbox.id} has no items with valid data. Skipping.`);
          continue;
        }

        // --- 1. Calculate Grid and Unscaled View Dimensions ---
        const [gridRows, gridCols] = parseLayout(viewbox.layout);
        const colWidths = Array(gridCols).fill(0); // Max unscaled width per column
        const rowHeights = Array(gridRows).fill(0); // Max unscaled height per row
        const itemData = []; // Store { item, itemVB } for valid items

        // First pass: Find max unscaled width per column and max height per row
        for (let cellIndex = 0; cellIndex < gridRows * gridCols; cellIndex++) {
          const item = viewbox.items[cellIndex];
          if (!item || !item.svgData || !item.svgData.viewBox) {
            itemData[cellIndex] = null; // Mark cell as empty
            continue;
          }

          const itemVB = parseViewBox(item.svgData.viewBox);
          if (!itemVB || itemVB.width <= 0 || itemVB.height <= 0) {
            itemData[cellIndex] = null; // Mark cell as invalid
            continue;
          }

          itemData[cellIndex] = { item, itemVB }; // Store valid item data

          const colIndex = cellIndex % gridCols;
          const rowIndex = Math.floor(cellIndex / gridCols);
          colWidths[colIndex] = Math.max(colWidths[colIndex], itemVB.width);
          rowHeights[rowIndex] = Math.max(rowHeights[rowIndex], itemVB.height);
        }

        // Calculate total unscaled dimensions of *only* the views
        const totalUnscaledViewsWidth = colWidths.reduce((sum, w) => sum + w, 0);
        const totalUnscaledViewsHeight = rowHeights.reduce((sum, h) => sum + h, 0);

        console.log(`${LOG_PREFIX}   Grid Dimensions: ${gridRows}x${gridCols}`);
        console.log(`${LOG_PREFIX}   Max Unscaled Col Widths: [${colWidths.map(w => w.toFixed(2)).join(', ')}]`);
        console.log(`${LOG_PREFIX}   Max Unscaled Row Heights: [${rowHeights.map(h => h.toFixed(2)).join(', ')}]`);
        console.log(`${LOG_PREFIX}   Total Unscaled Views Size: W=${totalUnscaledViewsWidth.toFixed(2)}, H=${totalUnscaledViewsHeight.toFixed(2)}`);

        if (totalUnscaledViewsWidth <= 1e-6 || totalUnscaledViewsHeight <= 1e-6) {
            console.warn(`${LOG_PREFIX}   Skipping Viewbox ${viewbox.id} due to zero or negative combined view dimensions.`);
            continue;
        }

        // --- 2. Determine Page Layout ---
        // Use a rough estimate for page layout (views + estimated gaps) - actual fitting happens later
        const estimatedGapWidth = (gridCols - 1) * FIXED_GAP;
        const estimatedGapHeight = (gridRows - 1) * FIXED_GAP;
        const estimatedTotalWidth = totalUnscaledViewsWidth + estimatedGapWidth;
        const estimatedTotalHeight = totalUnscaledViewsHeight + estimatedGapHeight;
        const pageLayout = getStandardPageLayout(estimatedTotalWidth, estimatedTotalHeight);
        const printableDimensions = { width: pageLayout.printableWidth, height: pageLayout.printableHeight };
        const printableAreaPos = [pageLayout.printableX, pageLayout.printableY];
        console.log(`${LOG_PREFIX}   Page Layout: size=${DEFAULT_PAPER_SIZE}, orientation=${pageLayout.orientation}, W=${pageLayout.width}mm, H=${pageLayout.height}mm`);
        console.log(`${LOG_PREFIX}   Printable Area: X=${printableAreaPos[0].toFixed(2)}, Y=${printableAreaPos[1].toFixed(2)}, W=${printableDimensions.width.toFixed(2)}, H=${printableDimensions.height.toFixed(2)}`);

        // --- 3. Calculate Available Space, View Scale, and Final Layout ---
        let availableWidth, availableHeight;
        let spaceForViewsWidth, spaceForViewsHeight;
        let viewScale;
        let finalScaledViewsWidth, finalScaledViewsHeight;
        let finalTotalLayoutWidth, finalTotalLayoutHeight;
        let originX, originY; // Top-left corner of the entire layout block

        const totalFixedGapWidth = Math.max(0, gridCols - 1) * FIXED_GAP;
        const totalFixedGapHeight = Math.max(0, gridRows - 1) * FIXED_GAP;
        console.log(`${LOG_PREFIX}   Total Fixed Gaps: W=${totalFixedGapWidth.toFixed(2)}, H=${totalFixedGapHeight.toFixed(2)}`);

        if (gridRows === 1) {
          console.log(`${LOG_PREFIX}   Calculating layout for single row (gridRows === 1)...`);
          const titleBlockLayout = calculateTitleBlockLayout( // Need actual title block position
            pageLayout.width, pageLayout.height,
            pageLayout.marginLeft, pageLayout.marginTop, pageLayout.marginRight, pageLayout.marginBottom,
            pageLayout.orientation, PAPER_SIZES, DEFAULT_PAPER_SIZE
          );

          if (titleBlockLayout) {
            availableWidth = printableDimensions.width - MIN_MARGIN * 2;
            // Height available between top margin and margin above title block
            availableHeight = titleBlockLayout.outerBox.y - printableAreaPos[1] - MIN_MARGIN * 2;
            console.log(`${LOG_PREFIX}     Available Space (1 row): W=${availableWidth.toFixed(2)}, H=${availableHeight.toFixed(2)} (considering ${MIN_MARGIN}mm margins and title block at Y=${titleBlockLayout.outerBox.y.toFixed(2)})`);
          } else {
            console.warn(`${LOG_PREFIX}     Could not calculate title block layout for 1 row. Using full printable height minus margins.`);
            availableWidth = printableDimensions.width - MIN_MARGIN * 2;
            availableHeight = printableDimensions.height - MIN_MARGIN * 2;
          }
        } else {
          console.log(`${LOG_PREFIX}   Calculating general layout (gridRows !== 1)...`);
          availableWidth = printableDimensions.width - MIN_MARGIN * 2;
          availableHeight = printableDimensions.height - MIN_MARGIN * 2;
          console.log(`${LOG_PREFIX}     Available Space (General): W=${availableWidth.toFixed(2)}, H=${availableHeight.toFixed(2)} (considering ${MIN_MARGIN}mm margins)`);
        }

        // Calculate space purely for views
        spaceForViewsWidth = Math.max(0, availableWidth - totalFixedGapWidth);
        spaceForViewsHeight = Math.max(0, availableHeight - totalFixedGapHeight);
        console.log(`${LOG_PREFIX}   Space For Scaled Views: W=${spaceForViewsWidth.toFixed(2)}, H=${spaceForViewsHeight.toFixed(2)}`);

        if (spaceForViewsWidth <= 1e-6 || spaceForViewsHeight <= 1e-6) {
          console.warn(`${LOG_PREFIX}   Skipping Viewbox ${viewbox.id} due to zero or negative space available for views after gaps/margins.`);
          continue;
        }

        // Calculate the single scale factor for the views
        const scaleX = spaceForViewsWidth / totalUnscaledViewsWidth;
        const scaleY = spaceForViewsHeight / totalUnscaledViewsHeight;
        viewScale = Math.min(scaleX, scaleY);
        console.log(`${LOG_PREFIX}   Calculated View Scale: ${viewScale.toFixed(4)}`);

        if (viewScale <= 1e-6) {
           console.warn(`${LOG_PREFIX}   Skipping Viewbox ${viewbox.id} due to zero or negative view scale.`);
           continue;
        }

        // Calculate final dimensions of the scaled views and the total layout block
        finalScaledViewsWidth = totalUnscaledViewsWidth * viewScale;
        finalScaledViewsHeight = totalUnscaledViewsHeight * viewScale;
        finalTotalLayoutWidth = finalScaledViewsWidth + totalFixedGapWidth;
        finalTotalLayoutHeight = finalScaledViewsHeight + totalFixedGapHeight;
        console.log(`${LOG_PREFIX}   Final Scaled Views Size: W=${finalScaledViewsWidth.toFixed(2)}, H=${finalScaledViewsHeight.toFixed(2)}`);
        console.log(`${LOG_PREFIX}   Final Total Layout Size (Views + Gaps): W=${finalTotalLayoutWidth.toFixed(2)}, H=${finalTotalLayoutHeight.toFixed(2)}`);

        // Calculate translation to center the final layout block within the available space
        const offsetX = (availableWidth - finalTotalLayoutWidth) / 2;
        const offsetY = (availableHeight - finalTotalLayoutHeight) / 2;
        originX = printableAreaPos[0] + MIN_MARGIN + offsetX;
        originY = printableAreaPos[1] + MIN_MARGIN + offsetY; // This origin is relative to the available space top-left

        // Adjust originY if it was calculated relative to title block (1-row case)
        // Note: The availableHeight calculation for gridRows=1 already accounts for the title block position relative to printableAreaPos[1] and MIN_MARGINs.
        // So, the originY calculation using that availableHeight and its corresponding offsetY should place it correctly.

        console.log(`${LOG_PREFIX}   Final Layout Origin (Top-Left): X=${originX.toFixed(2)}, Y=${originY.toFixed(2)}`);


        // --- 4. Initialize PDF or Add Page ---
        if (isFirstPage) {
          pdf = new jsPDF({ orientation: pageLayout.orientation, unit: 'mm', format: DEFAULT_PAPER_SIZE });
          isFirstPage = false;
        } else {
          pdf.addPage(DEFAULT_PAPER_SIZE, pageLayout.orientation);
        }
        const currentPageNum = pdf.internal.getNumberOfPages();
        pdf.setPage(currentPageNum);

        // --- 5. Create Temporary SVG for this page ---
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        tempSvg.setAttribute('width', pageLayout.width);
        tempSvg.setAttribute('height', pageLayout.height);
        tempSvg.setAttribute('viewBox', `0 0 ${pageLayout.width} ${pageLayout.height}`);
        const svgPageGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g'); // Group for all content on this page
        tempSvg.appendChild(svgPageGroup); // Add page group (used for border)

        // --- 6. Render Items with Manual Positioning and Internal Scaling ---
        console.log(`${LOG_PREFIX}   Starting item rendering loop...`);
        let currentX = originX;
        let currentY = originY;
        const scaledColWidths = colWidths.map(w => w * viewScale);
        const scaledRowHeights = rowHeights.map(h => h * viewScale);

        // Correct nested loops for rendering
        for (let rowIndex = 0; rowIndex < gridRows; rowIndex++) {
          currentX = originX; // Reset X for each new row
          for (let colIndex = 0; colIndex < gridCols; colIndex++) {
            const cellIndex = rowIndex * gridCols + colIndex;
            const storedItemData = itemData[cellIndex];

            if (storedItemData) {
              const { item, itemVB } = storedItemData;
              const itemScaledWidth = itemVB.width * viewScale;
              const itemScaledHeight = itemVB.height * viewScale;

              // Calculate alignment offset within the cell (based on max scaled size for the row/col)
              const cellWidth = scaledColWidths[colIndex];
              const cellHeight = scaledRowHeights[rowIndex];
              const alignOffsetX = (cellWidth - itemScaledWidth) / 2;
              const alignOffsetY = (cellHeight - itemScaledHeight) / 2;

              // Item's top-left position on the page
              const itemPosX = currentX + alignOffsetX;
              const itemPosY = currentY + alignOffsetY;

              console.log(`${LOG_PREFIX}     Rendering Item ${item.id} in Cell[${rowIndex},${colIndex}] at page pos [${itemPosX.toFixed(2)}, ${itemPosY.toFixed(2)}]`);

              // Create item group: Translate item's internal origin (itemVB.x, itemVB.y) *after scaling* to its calculated page position (itemPosX, itemPosY)
              const itemGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              // Translation accounts for moving the scaled item's top-left (which corresponds to itemVB.x * viewScale, itemVB.y * viewScale) to itemPosX, itemPosY
              const itemTranslate = `translate(${itemPosX - itemVB.x * viewScale}, ${itemPosY - itemVB.y * viewScale})`;
              itemGroup.setAttribute('transform', itemTranslate);
              svgPageGroup.appendChild(itemGroup); // Add directly to page group, scaling happens inside render functions

              // Separate paths into hidden and visible
              const hiddenPathObjects = [];
              const visiblePathObjects = [];
              item.svgData.paths.forEach(path => {
                const isHidden = path.type === 'hidden' || path.id?.includes('_hidden');
                if (isHidden) {
                  hiddenPathObjects.push(path);
                } else {
                  visiblePathObjects.push(path);
                }
              });

              // --- Render Paths for the current item ---
              const renderAndAppendPath = (path, targetGroup) => {
                const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');

                // Apply viewScale to path data directly
                try {
                    const parsedData = parsePathData(path.data);
                    // Scale the parsed data in place using the new function
                    scalePathData(parsedData, viewScale);
                    // Serialize the scaled data
                    pathEl.setAttribute('d', serializePathData(parsedData));
                } catch (e) {
                    console.error(`${LOG_PREFIX} Error processing path data for item ${item.id}, path ${path.id}:`, e);
                    console.error("Original path data:", path.data);
                    return; // Skip this path if data is invalid
                }


                // Use BASE stroke widths and vector-effect for constant width
                const effectiveVisibleStrokeWidth = PDF_BASE_VISIBLE_STROKE_WIDTH;
                const effectiveHiddenStrokeWidth = PDF_BASE_HIDDEN_STROKE_WIDTH;
                const hiddenDashArray = `${PDF_HIDDEN_DASH_LENGTH},${PDF_HIDDEN_DASH_GAP}`;

                const isHidden = path.type === 'hidden' || path.id?.includes('_hidden');
                pathEl.setAttribute('stroke', isHidden ? PDF_HIDDEN_STROKE_COLOR : PDF_VISIBLE_STROKE_COLOR);
                // Set stroke width to BASE value
                pathEl.setAttribute('stroke-width', isHidden ? effectiveHiddenStrokeWidth : effectiveVisibleStrokeWidth);
                pathEl.setAttribute('stroke-linecap', 'round'); // Keep round style
                pathEl.setAttribute('stroke-linejoin', 'round'); // Keep round style
                if (isHidden) {
                  pathEl.setAttribute('stroke-dasharray', hiddenDashArray);
                }
                pathEl.setAttribute('fill', 'none'); // Paths should not be filled
                // Add back vector-effect to prevent stroke scaling by PDF renderer
                pathEl.setAttribute('vector-effect', 'non-scaling-stroke');

                targetGroup.appendChild(pathEl);
              };

              // Render hidden paths first
              console.log(`${LOG_PREFIX}       Rendering ${hiddenPathObjects.length} hidden paths...`);
              hiddenPathObjects.forEach(path => renderAndAppendPath(path, itemGroup));

              // Render visible paths second
              console.log(`${LOG_PREFIX}       Rendering ${visiblePathObjects.length} visible paths...`);
              visiblePathObjects.forEach(path => renderAndAppendPath(path, itemGroup));

              // --- Render ALL Measurements associated with this item ---
              console.log(`${LOG_PREFIX}       Rendering measurements for item ${item.id}...`);
              Object.values(activeMeasurements).forEach(measurement => {
                // Check if the measurement belongs to the current view instance
                if (measurement && measurement.viewInstanceId === item.id && measurement.geometry) {
                  console.log(`${LOG_PREFIX}         Rendering measurement ${measurement.pathId} (Type: ${measurement.type}) in item ${item.id} using viewScale ${viewScale.toFixed(4)}`);
                  // Use the measurement's own geometry, pass viewScale for internal scaling
                  const measurementSvgGroup = renderMeasurementToSvg(measurement, measurement.geometry, viewScale); // Pass viewScale
                  if (measurementSvgGroup) {
                    itemGroup.appendChild(measurementSvgGroup); // Append measurement group to the item's group
                  } else {
                    console.warn(`${LOG_PREFIX}         renderMeasurementToSvg returned null for ${measurement.pathId}`);
                  }
                }
              });
            } // End if(storedItemData)

            // Advance currentX for the next item in the row
            currentX += scaledColWidths[colIndex] + (colIndex < gridCols - 1 ? FIXED_GAP : 0);

          } // End loop columns
          // Advance currentY for the next row
          currentY += scaledRowHeights[rowIndex] + (rowIndex < gridRows - 1 ? FIXED_GAP : 0);
        } // End loop rows


        // --- 7. Add Border around the printable area --- (This section was correct)
        // --- 8. Add Border around the printable area --- (Keep this)
        const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        borderRect.setAttribute('x', printableAreaPos[0]);
        borderRect.setAttribute('y', printableAreaPos[1]);
        borderRect.setAttribute('width', printableDimensions.width);
        borderRect.setAttribute('height', printableDimensions.height);
        borderRect.setAttribute('fill', 'none');
        borderRect.setAttribute('stroke', PDF_VISIBLE_STROKE_COLOR); // Use constant
        borderRect.setAttribute('stroke-width', PDF_BORDER_LINE_WEIGHT); // Use constant
        svgPageGroup.appendChild(borderRect); // Add border to the main page group

        // --- 9. Add SVG element to the current PDF page --- (Keep this)
        console.log(`${LOG_PREFIX}     Adding SVG element for page ${currentPageNum} (Viewbox ${viewbox.id}) to PDF...`);
        await pdf.svg(tempSvg, { x: 0, y: 0, width: pageLayout.width, height: pageLayout.height });
        console.log(`${LOG_PREFIX}     Finished adding SVG for page ${currentPageNum}`);

        // --- 10. Draw Title Block --- (Update scale formatting)
        console.log(`${LOG_PREFIX}       Calculating and drawing title block for viewbox ${viewbox.id}...`);
        const titleBlockLayout = calculateTitleBlockLayout(
            pageLayout.width, pageLayout.height,
            pageLayout.marginLeft, pageLayout.marginTop, pageLayout.marginRight, pageLayout.marginBottom,
            pageLayout.orientation, PAPER_SIZES, DEFAULT_PAPER_SIZE
        );

        // Calculate the true scale ratio: Drawing Size (mm) / Real Size (mm)
        // viewScale = Drawing Size (mm) / Real Size (cm)
        // trueScaleRatio = viewScale / 10
        const trueScaleRatio = viewScale / 10; // Use viewScale calculated earlier
        let scaleString = "NTS"; // Default if calculation fails

        if (trueScaleRatio > 1e-6) { // Avoid division by zero or tiny scales
            if (Math.abs(trueScaleRatio - 1) < 1e-6) {
                scaleString = "1 : 1"; // Exactly 1:1
            } else if (trueScaleRatio < 1) {
                // Reduction scale (e.g., 1 : 8.5 becomes 1 : 9)
                const reductionFactor = 1 / trueScaleRatio;
                let integerY = Math.round(reductionFactor); // Round Y to nearest integer
                integerY = Math.max(1, integerY); // Ensure Y is at least 1
                scaleString = `1 : ${integerY}`; // Format as 1 : Integer
            } else {
                // Enlargement scale (e.g., 2.3 : 1 becomes 2 : 1)
                const enlargementFactor = trueScaleRatio;
                let integerX = Math.round(enlargementFactor); // Round X to nearest integer
                integerX = Math.max(1, integerX); // Ensure X is at least 1
                scaleString = `${integerX} : 1`; // Format as Integer : 1
            }
        }
        console.log(`${LOG_PREFIX}       Calculated True Scale Ratio: ${trueScaleRatio.toFixed(4)}, Formatted String for Title Block: ${scaleString}`);

        // Add calculated scale to title block data
        const titleBlockData = {
            ...viewbox.titleBlock, // Existing data
            scale: scaleString // Use the correctly calculated and formatted scale string
        };
        drawTitleBlock(pdf, titleBlockLayout, titleBlockData);

      } // End for...of viewboxes loop

      // --- Save the PDF ---
      if (pdf) {
        console.log(`${LOG_PREFIX} Saving PDF as "${pdfFilename}"...`);
        pdf.save(pdfFilename);
        console.log(`${LOG_PREFIX} PDF Export Successful: ${pdfFilename}`);
      } else {
         console.warn(`${LOG_PREFIX} PDF object was not initialized (likely no valid viewboxes to export). No export occurred.`);
         alert("Could not generate PDF: No valid viewboxes found.");
      }

    } catch (error) {
      console.error(`${LOG_PREFIX} Error during PDF generation:`, error);
      alert(`Failed to export PDF: ${error.message}. See console for details.`);
    }

  }, [viewboxes, activeMeasurements]); // Dependencies

  return { exportPdf };
}


// --- Helper Function to Calculate Title Block Geometry ---
function calculateTitleBlockLayout(pageWidth, pageHeight, marginLeft, marginTop, marginRight, marginBottom, orientation, paperSizes, paperSizeKey = DEFAULT_PAPER_SIZE) {
  // (Keep existing function)
  const logPrefixTB = `${LOG_PREFIX} TitleBlockLayout`;
  const currentPaper = paperSizes[paperSizeKey] || paperSizes.a4;
  const portraitWidth = Math.min(currentPaper.width, currentPaper.height);
  const portraitHeight = Math.max(currentPaper.width, currentPaper.height);
  const pMarginLeft = MARGIN_LEFT_PORTRAIT;
  const pMarginRight = MARGIN_OTHER;
  const pPrintableWidth = portraitWidth - pMarginLeft - pMarginRight;
  const titleBlockWidth = pPrintableWidth / 2;
  // const baseHeight = portraitHeight * 0.25; // No longer used for height
  const titleBlockHeight = 35; // Fixed height as requested
  console.log(`${logPrefixTB} Base Calc (Portrait ${portraitWidth}x${portraitHeight}): PrintableW=${pPrintableWidth.toFixed(2)}, TB W=${titleBlockWidth.toFixed(2)}, TB H=${titleBlockHeight.toFixed(2)}`);
  const numRows = 3; const numCols = 2; const colRatio = [1, 2];
  const totalRatio = colRatio.reduce((a, b) => a + b, 0);
  const titleBlockFontSize = 2.5; const titleBlockLineHeightFactor = 1.2; const textPadding = 0.5;
  const titleBlockX = pageWidth - marginRight - titleBlockWidth;
  const titleBlockY = pageHeight - marginBottom - titleBlockHeight;
  console.log(`${logPrefixTB} Final Position (Current Page ${pageWidth}x${pageHeight}, Orientation: ${orientation}): Margins(R/B)=${marginRight}/${marginBottom}, TB X=${titleBlockX.toFixed(2)}, TB Y=${titleBlockY.toFixed(2)}`);
  if (titleBlockWidth <= 1e-6 || titleBlockHeight <= 1e-6 || titleBlockX < -1e-6 || titleBlockY < -1e-6) {
      console.error(`${logPrefixTB} Calculated invalid title block dimensions or position.`, { titleBlockX, titleBlockY, titleBlockWidth, titleBlockHeight, pageWidth, pageHeight, marginRight, marginBottom });
      return null;
  }
  const outerBox = { x: titleBlockX, y: titleBlockY, width: titleBlockWidth, height: titleBlockHeight };
  const rowHeight = titleBlockHeight / numRows;
  const cells = [];
  for (let r = 0; r < numRows; r++) {
    const rowCells = []; const cellY = titleBlockY + r * rowHeight; let currentX = titleBlockX;
    for (let c = 0; c < numCols; c++) {
        const cellWidth = titleBlockWidth * (colRatio[c] / totalRatio);
        rowCells.push({ x: currentX, y: cellY, width: cellWidth, height: rowHeight, textX: currentX + textPadding, textY: cellY + rowHeight / 2, maxWidth: cellWidth - 2 * textPadding });
        currentX += cellWidth;
    }
    cells.push(rowCells);
  }
  console.log(`${logPrefixTB} Calculated Layout:`, { outerBox, cells });
  return { outerBox, cells, fontSize: titleBlockFontSize, lineHeight: titleBlockFontSize * titleBlockLineHeightFactor };
}


// --- Helper Function to Draw Title Block using jsPDF ---
function drawTitleBlock(pdf, titleBlockLayout, data = {}) {
    // (Keep existing function)
    if (!pdf || !titleBlockLayout) { console.warn(`${LOG_PREFIX} DrawTitleBlock: Missing pdf instance or layout data.`); return; }
    const logPrefixTB = `${LOG_PREFIX} DrawTitleBlock`; console.log(`${logPrefixTB} Drawing title block... Data:`, data);
    const { outerBox, cells } = titleBlockLayout; // Font size handled below
    const cellData = [
        [ { label: "Project:", value: data.project || "CAD-OS Demo" }, { label: "Part Name:", value: data.partName || "N/A" } ],
        [ { label: "Scale:", value: data.scale || "NTS" },        { label: "Material:", value: data.material || "Steel" } ], // Default scale NTS
        [ { label: "Drawn By:", value: data.drawnBy || "CAD-OS" },  { label: "Date:", value: data.date || new Date().toLocaleDateString() } ] // Changed default Drawn By
    ];
    pdf.saveGraphicsState();
    pdf.setLineWidth(PDF_TITLE_BLOCK_LINE_WEIGHT); // Use constant
    pdf.setDrawColor(0);
    pdf.setTextColor(0);

    // Draw outer box and internal lines
    pdf.rect(outerBox.x, outerBox.y, outerBox.width, outerBox.height, 'S'); // Stroke only
    let currentX = outerBox.x;
    for (let c = 0; c < cells[0].length - 1; c++) { // Vertical lines
        currentX += cells[0][c].width;
        pdf.line(currentX, outerBox.y, currentX, outerBox.y + outerBox.height);
    }
    let currentY = outerBox.y;
    for (let r = 0; r < cells.length - 1; r++) { currentY += cells[r][0].height; pdf.line(outerBox.x, currentY, outerBox.x + outerBox.width, currentY); }
    for (let r = 0; r < cells.length - 1; r++) { // Horizontal lines
        currentY += cells[r][0].height;
        pdf.line(outerBox.x, currentY, outerBox.x + outerBox.width, currentY);
    }

    // Draw text content
    for (let r = 0; r < cells.length; r++) {
        for (let c = 0; c < cells[r].length; c++) {
            const cell = cells[r][c];
            const content = cellData[r]?.[c];
            if (content) {
                const labelText = content.label || '';
                const valueText = content.value || '';
                // Adjust Y position slightly for better vertical centering within the cell height
                const labelY = cell.textY - (PDF_TITLE_BLOCK_FONT_SIZE_LABEL * 0.1); // Adjust baseline slightly up
                const valueY = cell.textY + (PDF_TITLE_BLOCK_FONT_SIZE_VALUE * 0.2); // Adjust baseline slightly down

                // Draw Label
                pdf.setFont(PDF_TITLE_BLOCK_FONT_FAMILY, 'bold');
                pdf.setFontSize(PDF_TITLE_BLOCK_FONT_SIZE_LABEL); // Use constant (pt)
                pdf.text(labelText, cell.textX, labelY, { align: 'left', baseline: 'middle', maxWidth: cell.maxWidth });

                // Draw Value
                pdf.setFont(PDF_TITLE_BLOCK_FONT_FAMILY, 'normal');
                pdf.setFontSize(PDF_TITLE_BLOCK_FONT_SIZE_VALUE); // Use constant (pt)
                pdf.text(valueText, cell.textX, valueY, { align: 'left', baseline: 'middle', maxWidth: cell.maxWidth });
            } else {
                console.warn(`${logPrefixTB} Missing data for cell [${r}][${c}]`);
            }
        }
    }
    pdf.restoreGraphicsState();
    console.log(`${logPrefixTB} Finished drawing title block.`);
}


// --- Helper Function to Calculate Part *Content* Layout (ViewBoxes, Offsets) ---
// This function is NOT used by the main viewbox export logic anymore, but kept for potential future use
function calculatePartLayout(part, viewGap) {
    // (Keep existing function)
    const logPrefixPart = `${LOG_PREFIX} PartLayout[${part.name}]`; console.log(`${logPrefixPart} Calculating content layout...`);
    const frontView = part.views?.front; const topView = part.views?.top; const rightView = part.views?.right;
    if (!frontView && !topView && !rightView) { console.warn(`${logPrefixPart} Part has no standard views.`); return null; }
    const getSafeViewBox = (view) => { if (!view) return { x: 0, y: 0, width: 0, height: 0 }; const vbString = view.normalizedViewBox || view.combinedViewBox || view.visible?.viewBox || view.hidden?.viewBox; return parseViewBox(vbString || "0 0 0 0"); };
    const frontVB = getSafeViewBox(frontView); const topVB = getSafeViewBox(topView); const rightVB = getSafeViewBox(rightView);
    console.log(`${logPrefixPart}   ViewBoxes (Original Content): Front=`, frontVB, `Top=`, topVB, `Right=`, rightVB);
    const hasFront = frontVB.width > 1e-6 || frontVB.height > 1e-6; const hasTop = topVB.width > 1e-6 || topVB.height > 1e-6; const hasRight = rightVB.width > 1e-6 || rightVB.height > 1e-6;
    if (!hasFront && !hasTop && !hasRight) { console.warn(`${logPrefixPart} Part has no valid view dimensions.`); return null; }
    let combinedMinX = 0; let combinedMinY = 0; let combinedMaxX = hasFront ? frontVB.width : 0; let combinedMaxY = hasFront ? frontVB.height : 0;
    let topLayoutPos = { x: 0, y: 0 }; let rightLayoutPos = { x: 0, y: 0 };
    if (hasTop) { topLayoutPos.x = hasFront ? (frontVB.width - topVB.width) / 2 : 0; topLayoutPos.y = hasFront ? frontVB.height + viewGap : 0; combinedMinX = Math.min(combinedMinX, topLayoutPos.x); combinedMaxX = Math.max(combinedMaxX, topLayoutPos.x + topVB.width); combinedMaxY = Math.max(combinedMaxY, topLayoutPos.y + topVB.height); }
    if (hasRight) { rightLayoutPos.x = hasFront ? frontVB.width + viewGap : (hasTop ? Math.max(topLayoutPos.x + topVB.width + viewGap, viewGap) : 0); rightLayoutPos.y = hasFront ? (frontVB.height - rightVB.height) / 2 : (hasTop ? Math.max(topLayoutPos.y, 0) : 0); combinedMinX = Math.min(combinedMinX, rightLayoutPos.x); combinedMinY = Math.min(combinedMinY, rightLayoutPos.y); combinedMaxX = Math.max(combinedMaxX, rightLayoutPos.x + rightVB.width); combinedMaxY = Math.max(combinedMaxY, rightLayoutPos.y + rightVB.height); }
    const combinedContentWidth = combinedMaxX - combinedMinX; const combinedContentHeight = combinedMaxY - combinedMinY;
    const combinedLayoutViewBox = `${combinedMinX} ${combinedMinY} ${combinedContentWidth} ${combinedContentHeight}`; console.log(`${logPrefixPart}   Calculated Combined Content ViewBox: ${combinedLayoutViewBox}`);
    const layoutOffsets = { front: { x: -frontVB.x, y: -frontVB.y }, top: { x: topLayoutPos.x - topVB.x, y: topLayoutPos.y - topVB.y }, right: { x: rightLayoutPos.x - rightVB.x, y: rightLayoutPos.y - rightVB.y } };
    console.log(`${logPrefixPart}   Calculated Render Offsets: Front=(${layoutOffsets.front.x.toFixed(2)}, ${layoutOffsets.front.y.toFixed(2)}), Top=(${layoutOffsets.top.x.toFixed(2)}, ${layoutOffsets.top.y.toFixed(2)}), Right=(${layoutOffsets.right.x.toFixed(2)}, ${layoutOffsets.right.y.toFixed(2)})`);
    const pathGroups = { frontPaths: [], topPaths: [], rightPaths: [] };
    const collectPaths = (view, groupName) => { if (!view) return; const addPaths = (paths, visibility) => { if (!paths || !Array.isArray(paths)) return; paths.forEach(pathObj => { if (pathObj && typeof pathObj.data === 'string') { pathGroups[groupName].push({ ...pathObj, visibility }); } }); }; addPaths(view.hidden?.paths, 'hidden'); addPaths(view.visible?.paths, 'visible'); };
    collectPaths(frontView, 'frontPaths'); collectPaths(topView, 'topPaths'); collectPaths(rightView, 'rightPaths');
    console.log(`${logPrefixPart}   Collected original paths: Front=${pathGroups.frontPaths.length}, Top=${pathGroups.topPaths.length}, Right=${pathGroups.rightPaths.length}`);
    return { combinedLayoutViewBox, pathGroups, layoutOffsets };
}
