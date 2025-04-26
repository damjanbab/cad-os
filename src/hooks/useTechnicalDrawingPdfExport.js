import { useCallback } from 'react';
import { jsPDF } from "jspdf";
import 'svg2pdf.js'; // Side-effect import
import { parseViewBox } from '../utils/svgUtils.js';
import { vec } from '../utils/geometryUtils.js'; // Keep for potential future use

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
const VIEW_GAP = 5; // Gap between grid cells for PDF
const PDF_SCALE = 1; // Default scale factor (can be overridden)

// --- SVG Path Transformation Helpers ---
// (Keep existing parsePathData, transformPathData, serializePathData)
function parsePathData(d) {
  if (!d || typeof d !== 'string') {
    console.error("Invalid input to parsePathData:", d);
    return [];
  }
  const commandRegex = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/ig;
  const commands = [];
  let match;
  while ((match = commandRegex.exec(d)) !== null) {
    const command = match[1];
    const paramString = match[2].trim();
    const paramRegex = /[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g;
    const values = (paramString.match(paramRegex) || []).map(Number);
    if (values.some(isNaN)) {
      console.warn(`Skipping command due to invalid parameters: ${match[0]}`);
      continue;
    }
    commands.push({ command, values });
  }
  return commands;
}
function transformPathData(pathDataArray, tx, ty) {
  pathDataArray.forEach(item => {
    const command = item.command;
    const values = item.values;
    if (command === command.toUpperCase() && command !== 'Z') {
      for (let i = 0; i < values.length; i++) {
        switch (command) {
          case 'M': case 'L': case 'T':
            values[i] += (i % 2 === 0) ? tx : ty; break;
          case 'H': values[i] += tx; break;
          case 'V': values[i] += ty; break;
          case 'C': values[i] += (i % 2 === 0) ? tx : ty; break;
          case 'S': case 'Q':
            values[i] += (i % 2 === 0) ? tx : ty; break;
          case 'A':
            if (i >= 5) { values[i] += (i % 2 !== 0) ? tx : ty; } break;
        }
      }
    }
  });
}
function serializePathData(pathDataArray) {
  return pathDataArray.map(item => {
    const paramsString = item.values.map(v => {
        if (Math.abs(v) > 1e6 || (Math.abs(v) < 1e-4 && v !== 0)) { return v.toExponential(4); }
        return parseFloat(v.toFixed(4));
    }).join(' ');
    return `${item.command}${paramsString}`;
  }).join('');
}
// --- End SVG Path Transformation Helpers ---


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
const renderMeasurementToSvg = (measurementData, geometry, scale = 1) => {
  // (Keep existing function, including scaling adjustments)
  const { pathId, type, textPosition } = measurementData;
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const baseStrokeWidth = 0.08;
  const baseFontSize = 2.2;
  const baseArrowSize = 1.2;
  const baseTextOffset = 1.2;
  const baseExtensionGap = 0.8;
  const baseExtensionOverhang = 1.2;
  const strokeColor = "#222222";
  const strokeWidth = scale > 1e-6 ? baseStrokeWidth / scale : baseStrokeWidth;
  const fontSize = scale > 1e-6 ? baseFontSize / scale : baseFontSize;
  const arrowSize = scale > 1e-6 ? baseArrowSize / scale : baseArrowSize;
  const textOffset = scale > 1e-6 ? baseTextOffset / scale : baseTextOffset;
  const extensionGap = scale > 1e-6 ? baseExtensionGap / scale : baseExtensionGap;
  const extensionOverhang = scale > 1e-6 ? baseExtensionOverhang / scale : baseExtensionOverhang;
  const createSvgElement = (tag, attributes) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const key in attributes) { el.setAttribute(key, attributes[key]); }
    return el;
  };
  if (type === 'line' && geometry?.endpoints) {
    const [p1, p2] = geometry.endpoints;
    const length = geometry.length || 0;
    const textContent = length.toFixed(2);
    const vx = p2[0] - p1[0]; const vy = p2[1] - p1[1];
    const midX = (p1[0] + p2[0]) / 2; const midY = (p1[1] + p2[1]) / 2;
    const lineLen = Math.sqrt(vx * vx + vy * vy);
    const ux = lineLen > 1e-6 ? vx / lineLen : 1; const uy = lineLen > 1e-6 ? vy / lineLen : 0;
    const nx = -uy; const ny = ux;
    const textPosX = textPosition.x; const textPosY = textPosition.y;
    const textOffsetX = textPosX - midX; const textOffsetY = textPosY - midY;
    const offsetDist = textOffsetX * nx + textOffsetY * ny;
    const actualOffsetDist = Math.abs(offsetDist) < textOffset ? Math.sign(offsetDist || 1) * textOffset : offsetDist;
    const dimLineP1 = [p1[0] + nx * actualOffsetDist, p1[1] + ny * actualOffsetDist];
    const dimLineP2 = [p2[0] + nx * actualOffsetDist, p2[1] + ny * actualOffsetDist];
    const extLineP1Start = [p1[0] + nx * Math.sign(actualOffsetDist) * extensionGap, p1[1] + ny * Math.sign(actualOffsetDist) * extensionGap];
    const extLineP2Start = [p2[0] + nx * Math.sign(actualOffsetDist) * extensionGap, p2[1] + ny * Math.sign(actualOffsetDist) * extensionGap];
    const extLineP1End = [dimLineP1[0] + nx * Math.sign(actualOffsetDist) * extensionOverhang, dimLineP1[1] + ny * Math.sign(actualOffsetDist) * extensionOverhang];
    const extLineP2End = [dimLineP2[0] + nx * Math.sign(actualOffsetDist) * extensionOverhang, dimLineP2[1] + ny * Math.sign(actualOffsetDist) * extensionOverhang];
    const arrowNormX = ux; const arrowNormY = uy;
    const arrow1 = `M ${dimLineP1[0]} ${dimLineP1[1]} l ${arrowNormX * arrowSize} ${arrowNormY * arrowSize} l ${-arrowNormY * arrowSize * 0.35} ${arrowNormX * arrowSize * 0.35} l ${-arrowNormX * arrowSize * 0.65} ${-arrowNormY * arrowSize * 0.65} z`;
    const arrow2 = `M ${dimLineP2[0]} ${dimLineP2[1]} l ${-arrowNormX * arrowSize} ${-arrowNormY * arrowSize} l ${arrowNormY * arrowSize * 0.35} ${-arrowNormX * arrowSize * 0.35} l ${arrowNormX * arrowSize * 0.65} ${arrowNormY * arrowSize * 0.65} z`;
    const textWidthEstimate = textContent.length * fontSize * 0.65;
    const gapSize = textWidthEstimate + textOffset * 2;
    const halfGap = gapSize / 2;
    const textProj = (textPosX - dimLineP1[0]) * arrowNormX + (textPosY - dimLineP1[1]) * arrowNormY;
    const breakStartPos = Math.max(arrowSize, textProj - halfGap);
    const breakEndPos = Math.min(lineLen - arrowSize, textProj + halfGap);
    const dimLine1End = [dimLineP1[0] + arrowNormX * breakStartPos, dimLineP1[1] + arrowNormY * breakStartPos];
    const dimLine2Start = [dimLineP1[0] + arrowNormX * breakEndPos, dimLineP1[1] + arrowNormY * breakEndPos];
    const showDimLine1 = breakStartPos > arrowSize + 1e-6;
    const showDimLine2 = breakEndPos < lineLen - arrowSize - 1e-6;
    group.appendChild(createSvgElement('line', { x1: extLineP1Start[0], y1: extLineP1Start[1], x2: extLineP1End[0], y2: extLineP1End[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    group.appendChild(createSvgElement('line', { x1: extLineP2Start[0], y1: extLineP2Start[1], x2: extLineP2End[0], y2: extLineP2End[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    if (showDimLine1) group.appendChild(createSvgElement('line', { x1: dimLineP1[0], y1: dimLineP1[1], x2: dimLine1End[0], y2: dimLine1End[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    if (showDimLine2) group.appendChild(createSvgElement('line', { x1: dimLine2Start[0], y1: dimLine2Start[1], x2: dimLineP2[0], y2: dimLineP2[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    group.appendChild(createSvgElement('path', { d: arrow1, fill: strokeColor, stroke: 'none' }));
    group.appendChild(createSvgElement('path', { d: arrow2, fill: strokeColor, stroke: 'none' }));
    const textEl = createSvgElement('text', { x: textPosX, y: textPosY, 'font-size': fontSize, fill: strokeColor, stroke: 'none', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'Arial, sans-serif' });
    textEl.textContent = textContent;
    group.appendChild(textEl);
  } else if (type === 'circle' && geometry?.center && geometry.diameter != null) {
    const [cx, cy] = geometry.center;
    const diameter = geometry.diameter;
    const radius = geometry.radius || diameter / 2;
    const textContent = `⌀${diameter.toFixed(2)}`;
    const textPosX = textPosition.x; const textPosY = textPosition.y;
    const textVecX = textPosX - cx; const textVecY = textPosY - cy;
    const distSqr = textVecX * textVecX + textVecY * textVecY;
    let angle = (distSqr < 1e-9) ? 0 : Math.atan2(textVecY, textVecX);
    const cosA = Math.cos(angle); const sinA = Math.sin(angle);
    const leaderStart = [cx + cosA * radius, cy + sinA * radius];
    const leaderEnd = [textPosX - cosA * textOffset, textPosY - sinA * textOffset];
    group.appendChild(createSvgElement('line', { x1: leaderStart[0], y1: leaderStart[1], x2: leaderEnd[0], y2: leaderEnd[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    const textEl = createSvgElement('text', { x: textPosX, y: textPosY, 'font-size': fontSize, fill: strokeColor, stroke: 'none', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'Arial, sans-serif' });
    textEl.textContent = textContent;
    group.appendChild(textEl);
  }
  return group;
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

        // --- 1. Calculate Accurate Unscaled Grid Layout & Combined Bounds ---
        const [gridRows, gridCols] = parseLayout(viewbox.layout);
        const colWidths = Array(gridCols).fill(0);
        const rowHeights = Array(gridRows).fill(0);
        const itemData = []; // Store { item, itemVB } for valid items

        // First pass: Find max width per column and max height per row
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

        // Calculate cumulative offsets for columns and rows including gaps
        const colOffsets = [0];
        for (let i = 0; i < gridCols - 1; i++) {
          colOffsets.push(colOffsets[i] + colWidths[i] + VIEW_GAP);
        }
        const rowOffsets = [0];
        for (let i = 0; i < gridRows - 1; i++) {
          rowOffsets.push(rowOffsets[i] + rowHeights[i] + VIEW_GAP);
        }

        // Calculate total unscaled dimensions based on max widths/heights and gaps
        const combinedUnscaledWidth = colOffsets[gridCols - 1] + colWidths[gridCols - 1];
        const combinedUnscaledHeight = rowOffsets[gridRows - 1] + rowHeights[gridRows - 1];
        // Assuming the layout starts at (0,0) in unscaled space
        const combinedUnscaledVB = { x: 0, y: 0, width: combinedUnscaledWidth, height: combinedUnscaledHeight };

        console.log(`${LOG_PREFIX}   Grid Dimensions: ${gridRows}x${gridCols}`);
        console.log(`${LOG_PREFIX}   Max Col Widths: [${colWidths.map(w => w.toFixed(2)).join(', ')}]`);
        console.log(`${LOG_PREFIX}   Max Row Heights: [${rowHeights.map(h => h.toFixed(2)).join(', ')}]`);
        console.log(`${LOG_PREFIX}   Calculated Combined Unscaled Bounds: W=${combinedUnscaledWidth.toFixed(2)}, H=${combinedUnscaledHeight.toFixed(2)}`);

        if (combinedUnscaledWidth <= 1e-6 || combinedUnscaledHeight <= 1e-6) {
            console.warn(`${LOG_PREFIX}   Skipping Viewbox ${viewbox.id} due to zero or negative combined dimensions.`);
            continue;
        }

        // --- 2. Determine Page Layout & Single Scale Factor ---
        const pageLayout = getStandardPageLayout(combinedUnscaledWidth, combinedUnscaledHeight);
        const printableDimensions = { width: pageLayout.printableWidth, height: pageLayout.printableHeight };
        const printableAreaPos = [pageLayout.printableX, pageLayout.printableY];

        // Calculate the single scale factor for the entire viewbox content
        const scaleX = printableDimensions.width / combinedUnscaledWidth;
        const scaleY = printableDimensions.height / combinedUnscaledHeight;
        const viewboxScale = Math.min(scaleX, scaleY); // Fit combined content

        console.log(`${LOG_PREFIX}   Page Layout: size=${DEFAULT_PAPER_SIZE}, orientation=${pageLayout.orientation}, W=${pageLayout.width}mm, H=${pageLayout.height}mm`);
        console.log(`${LOG_PREFIX}   Printable Area: W=${printableDimensions.width}mm, H=${printableDimensions.height}mm`);
        console.log(`${LOG_PREFIX}   Single Viewbox Scale: ${viewboxScale.toFixed(4)}`);

        // --- 3. Initialize PDF or Add Page ---
        if (isFirstPage) {
          pdf = new jsPDF({ orientation: pageLayout.orientation, unit: 'mm', format: DEFAULT_PAPER_SIZE });
          isFirstPage = false;
        } else {
          pdf.addPage(DEFAULT_PAPER_SIZE, pageLayout.orientation);
        }
        const currentPageNum = pdf.internal.getNumberOfPages();
        pdf.setPage(currentPageNum);

        // --- 4. Create Temporary SVG for this page ---
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        tempSvg.setAttribute('width', pageLayout.width);
        tempSvg.setAttribute('height', pageLayout.height);
        tempSvg.setAttribute('viewBox', `0 0 ${pageLayout.width} ${pageLayout.height}`);
        const svgPageGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g'); // Group for all content on this page
        tempSvg.appendChild(svgPageGroup);

        // --- 5. Calculate Translation for Centering Scaled Content ---
        const scaledContentWidth = combinedUnscaledWidth * viewboxScale;
        const scaledContentHeight = combinedUnscaledHeight * viewboxScale;
        // Center the entire scaled block within the printable area
        const viewboxTranslateX = printableAreaPos[0] + (printableDimensions.width - scaledContentWidth) / 2;
        const viewboxTranslateY = printableAreaPos[1] + (printableDimensions.height - scaledContentHeight) / 2;
        // combinedUnscaledVB.x and y are 0 based on current calculation

        console.log(`${LOG_PREFIX}   Scaled Content Size: ${scaledContentWidth.toFixed(2)}x${scaledContentHeight.toFixed(2)}mm`);
        console.log(`${LOG_PREFIX}   Overall Translation: dX=${viewboxTranslateX.toFixed(2)}, dY=${viewboxTranslateY.toFixed(2)}`);

        // --- 6. Create Main Content Group with Single Scale & Translation ---
        const viewboxContentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        // Apply the centering translation and the single scale factor
        viewboxContentGroup.setAttribute('transform', `translate(${viewboxTranslateX}, ${viewboxTranslateY}) scale(${viewboxScale})`);
        svgPageGroup.appendChild(viewboxContentGroup); // Add to page group

        // --- 7. Render Items into the Scaled Content Group ---
        const baseStrokeWidth = 0.15;
        const hiddenStrokeWidth = 0.1;
        // Calculate effective stroke widths based on the single viewboxScale
        const effectiveStrokeWidth = viewboxScale > 1e-6 ? baseStrokeWidth / viewboxScale : baseStrokeWidth;
        const effectiveHiddenStrokeWidth = viewboxScale > 1e-6 ? hiddenStrokeWidth / viewboxScale : hiddenStrokeWidth;
        const strokeScaleFactor = viewboxScale > 1e-6 ? 1 / viewboxScale : 1; // For dash array scaling

        console.log(`${LOG_PREFIX}   Effective Stroke Widths (Viewbox): Vis=${effectiveStrokeWidth.toFixed(4)}, Hid=${effectiveHiddenStrokeWidth.toFixed(4)}, DashScale=${strokeScaleFactor.toFixed(3)}`);

        // Second pass: Render items at their calculated positions
        for (let cellIndex = 0; cellIndex < gridRows * gridCols; cellIndex++) {
          const storedItemData = itemData[cellIndex];
          if (!storedItemData) continue; // Skip empty/invalid cells

          const { item, itemVB } = storedItemData;
          const colIndex = cellIndex % gridCols;
          const rowIndex = Math.floor(cellIndex / gridCols);

          // Calculate the top-left origin for this item's grid cell in the unscaled layout
          const itemOriginX = colOffsets[colIndex]; // Use calculated offset for the column
          const itemOriginY = rowOffsets[rowIndex]; // Use calculated offset for the row

          console.log(`${LOG_PREFIX}     Rendering Item ${item.id} in Cell[${rowIndex},${colIndex}] at unscaled origin [${itemOriginX.toFixed(2)}, ${itemOriginY.toFixed(2)}]`);

          // Create item group: Translate item's internal origin (itemVB.x, itemVB.y) to its calculated grid cell origin (itemOriginX, itemOriginY)
          // This position is relative to the start of the viewboxContentGroup (which is at 0,0 before scaling/translation)
          const itemGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          const itemTranslate = `translate(${itemOriginX - itemVB.x}, ${itemOriginY - itemVB.y})`; // Translate item's internal 0,0 to the cell's top-left
          itemGroup.setAttribute('transform', itemTranslate);
          viewboxContentGroup.appendChild(itemGroup); // Add to the main scaled group

          // Render item paths within its translated group
          item.svgData.paths.forEach(path => {
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('d', path.data);
            const isHidden = path.type === 'hidden' || path.id?.includes('_hidden');
            pathEl.setAttribute('stroke', isHidden ? '#777777' : '#000000');
            // Use effective stroke widths calculated from the single viewboxScale
            pathEl.setAttribute('stroke-width', isHidden ? effectiveHiddenStrokeWidth : effectiveStrokeWidth);
            pathEl.setAttribute('stroke-linecap', 'round');
            pathEl.setAttribute('stroke-linejoin', 'round');
            if (isHidden) {
              // Use strokeScaleFactor calculated from the single viewboxScale
              pathEl.setAttribute('stroke-dasharray', `${2 * strokeScaleFactor},${1 * strokeScaleFactor}`);
            }
            pathEl.setAttribute('fill', 'none');
            pathEl.setAttribute('vector-effect', 'non-scaling-stroke');
            itemGroup.appendChild(pathEl); // Add path to the item's translated group

            // --- Render Measurements Associated with this Path ---
            // Measurements need to be rendered using the single viewboxScale
            const measurement = activeMeasurements[path.id];
            if (measurement && measurement.viewInstanceId === item.id && path.geometry) {
               console.log(`${LOG_PREFIX}       Rendering measurement for path ${path.id} in item ${item.id} using scale ${viewboxScale.toFixed(4)}`);
               // Pass the single viewboxScale to the measurement renderer
               const measurementSvgGroup = renderMeasurementToSvg(measurement, path.geometry, viewboxScale);
               if (measurementSvgGroup) {
                   itemGroup.appendChild(measurementSvgGroup); // Append to the item's translated group
               } else {
                   console.warn(`${LOG_PREFIX}       renderMeasurementToSvg returned null for ${measurement.pathId}`);
               }
            }
          });
        } // End loop through cells for rendering

        // --- 8. Add Border around the printable area ---
        const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        borderRect.setAttribute('x', printableAreaPos[0]);
        borderRect.setAttribute('y', printableAreaPos[1]);
        borderRect.setAttribute('width', printableDimensions.width);
        borderRect.setAttribute('height', printableDimensions.height);
        borderRect.setAttribute('fill', 'none');
        borderRect.setAttribute('stroke', '#000000');
        borderRect.setAttribute('stroke-width', 0.2);
        svgPageGroup.appendChild(borderRect); // Add border to the main page group

        // --- 9. Add SVG element to the current PDF page ---
        console.log(`${LOG_PREFIX}     Adding SVG element for page ${currentPageNum} (Viewbox ${viewbox.id}) to PDF...`);
        await pdf.svg(tempSvg, { x: 0, y: 0, width: pageLayout.width, height: pageLayout.height });
        console.log(`${LOG_PREFIX}     Finished adding SVG for page ${currentPageNum}`);

        // --- 10. Draw Title Block ---
        console.log(`${LOG_PREFIX}       Calculating and drawing title block for viewbox ${viewbox.id}...`);
        const titleBlockLayout = calculateTitleBlockLayout(
            pageLayout.width, pageLayout.height,
            pageLayout.marginLeft, pageLayout.marginTop, pageLayout.marginRight, pageLayout.marginBottom,
            pageLayout.orientation, PAPER_SIZES, DEFAULT_PAPER_SIZE
        );
        // Add calculated scale to title block data
        const titleBlockData = {
            ...viewbox.titleBlock, // Existing data
            scale: `1 : ${(1 / viewboxScale).toFixed(1)}` // Display scale based on calculated viewboxScale
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
  const baseHeight = portraitHeight * 0.25;
  const titleBlockHeight = baseHeight * (2 / 3);
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
    const { outerBox, cells, fontSize } = titleBlockLayout;
    const cellData = [
        [ { label: "Project:", value: data.project || "CAD-OS Demo" }, { label: "Part Name:", value: data.partName || "N/A" } ],
        [ { label: "Scale:", value: data.scale || "1:1" },        { label: "Material:", value: data.material || "Steel" } ],
        [ { label: "Drawn By:", value: data.drawnBy || "Cline" },   { label: "Date:", value: data.date || new Date().toLocaleDateString() } ]
    ];
    const lineWeight = 0.15; pdf.saveGraphicsState(); pdf.setLineWidth(lineWeight); pdf.setDrawColor(0); pdf.setTextColor(0);
    pdf.rect(outerBox.x, outerBox.y, outerBox.width, outerBox.height, 'S');
    let currentX = outerBox.x;
    for (let c = 0; c < cells[0].length - 1; c++) { currentX += cells[0][c].width; pdf.line(currentX, outerBox.y, currentX, outerBox.y + outerBox.height); }
    let currentY = outerBox.y;
    for (let r = 0; r < cells.length - 1; r++) { currentY += cells[r][0].height; pdf.line(outerBox.x, currentY, outerBox.x + outerBox.width, currentY); }
    for (let r = 0; r < cells.length; r++) {
        for (let c = 0; c < cells[r].length; c++) {
            const cell = cells[r][c]; const content = cellData[r] && cellData[r][c];
            if (content) {
                const labelText = content.label || ''; const valueText = content.value || '';
                const labelFontSize = 11; const valueFontSize = 10;
                const adjustedLabelY = cell.textY - labelFontSize * 0.15; const adjustedValueY = cell.textY + valueFontSize * 0.35;
                pdf.setFont('helvetica', 'bold'); pdf.setFontSize(labelFontSize);
                pdf.text(labelText, cell.textX, adjustedLabelY, { align: 'left', baseline: 'middle', maxWidth: cell.maxWidth });
                pdf.setFont('helvetica', 'normal'); pdf.setFontSize(valueFontSize);
                pdf.text(valueText, cell.textX, adjustedValueY, { align: 'left', baseline: 'middle', maxWidth: cell.maxWidth });
            } else { console.warn(`${logPrefixTB} Missing data for cell [${r}][${c}]`); }
        }
    }
    pdf.restoreGraphicsState(); console.log(`${logPrefixTB} Finished drawing title block.`);
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

