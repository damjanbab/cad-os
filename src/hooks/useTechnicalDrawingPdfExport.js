import { useCallback, useEffect, useState } from 'react'; // Added useEffect, useState
import { jsPDF } from "jspdf";
import 'svg2pdf.js'; // Side-effect import
// Import the font file - assuming Vite provides a URL/path
import DejaVuSansFont from '../../assets/fonts/DejaVuSans.ttf'; // Use DejaVu Sans
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
// const VIEW_GAP = 20; // Gap between grid cells for PDF (Changed from 5) -> Now per-viewbox setting
const PDF_SCALE = 1; // Default scale factor (can be overridden)

// --- PDF Styling Constants (mm unless specified) - These become DEFAULTS ---
const DEFAULT_PDF_VISIBLE_STROKE_COLOR = '#000000';
const DEFAULT_PDF_HIDDEN_STROKE_COLOR = '#777777';
const DEFAULT_PDF_MEASUREMENT_STROKE_COLOR = '#222222';
const DEFAULT_PDF_MEASUREMENT_FILL_COLOR = '#222222';
const DEFAULT_PDF_MEASUREMENT_FONT_FAMILY = 'Arial, sans-serif';
const DEFAULT_PDF_TITLE_BLOCK_FONT_FAMILY = 'helvetica';
const DEFAULT_PDF_TITLE_BLOCK_FONT_SIZE_LABEL = 11; // pt
const DEFAULT_PDF_TITLE_BLOCK_FONT_SIZE_VALUE = 10; // pt
const DEFAULT_PDF_TITLE_BLOCK_LINE_WEIGHT = 0.15; // mm
const DEFAULT_PDF_BORDER_LINE_WEIGHT = 0.2; // mm

// Base values (will be scaled) - These become DEFAULTS
const DEFAULT_PDF_BASE_VISIBLE_STROKE_WIDTH = 0.5; // mm
const DEFAULT_PDF_BASE_HIDDEN_STROKE_WIDTH = 0.35;  // mm
const DEFAULT_PDF_BASE_MEASUREMENT_STROKE_WIDTH = 0.08; // mm
const DEFAULT_PDF_BASE_MEASUREMENT_FONT_SIZE = 3.5; // mm
const DEFAULT_PDF_BASE_MEASUREMENT_ARROW_SIZE = 1.2; // mm
const DEFAULT_PDF_BASE_MEASUREMENT_TEXT_OFFSET = 1.2; // mm
const DEFAULT_PDF_BASE_MEASUREMENT_EXTENSION_GAP = 0.8; // mm
const DEFAULT_PDF_BASE_MEASUREMENT_EXTENSION_OVERHANG = 1.2; // mm
const DEFAULT_PDF_MEASUREMENT_INITIAL_OFFSET = 10; // mm - Initial offset from geometry edge (beyond gap)
const DEFAULT_PDF_MEASUREMENT_STACKING_OFFSET = 7; // mm - Offset between stacked measurements
const DEFAULT_PDF_HIDDEN_DASH_LENGTH = 2; // mm (base)
const DEFAULT_PDF_HIDDEN_DASH_GAP = 1; // mm (base)
const DEFAULT_MIN_MARGIN = 25; // Minimum margin from printable area edges (mm)
const DEFAULT_FIXED_GAP = 20; // Fixed visual gap between views on the PDF (mm)

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

const scaleCoord = (coord, scale) => {
  if (!coord || !Array.isArray(coord) || coord.length < 2) return [0, 0]; // Safety check
  return [coord[0] * scale, coord[1] * scale];
};


// --- Font Loading State ---
let isFontLoaded = false;
let fontLoadingPromise = null;

// Function to load and register the font with jsPDF
const loadPdfFont = async (pdfInstance) => {
  if (isFontLoaded) return true;
  if (fontLoadingPromise) return fontLoadingPromise;

  fontLoadingPromise = (async () => {
    try {
      console.log(`${LOG_PREFIX} Fetching font file from: ${DejaVuSansFont}`); // Use DejaVu variable
      const response = await fetch(DejaVuSansFont); // Use DejaVu variable
      if (!response.ok) {
        throw new Error(`Failed to fetch font: ${response.statusText}`);
      }
      const fontBlob = await response.blob();
      const reader = new FileReader();

      return new Promise((resolve, reject) => {
        reader.onloadend = () => {
          try {
            // Extract base64 data (remove the data URL prefix)
            const base64Font = reader.result.split(',')[1];
            if (!base64Font) {
              throw new Error("Failed to read font as base64.");
            }
            // Add font to jsPDF's virtual file system
            pdfInstance.addFileToVFS('DejaVuSans.ttf', base64Font); // Use DejaVu filename
            // Add font to jsPDF
            pdfInstance.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal'); // Use DejaVu name
            console.log(`${LOG_PREFIX} DejaVuSans font loaded and registered successfully.`); // Log DejaVu
            isFontLoaded = true;
            resolve(true);
          } catch (error) {
            console.error(`${LOG_PREFIX} Error processing font data:`, error);
            reject(error);
          }
        };
        reader.onerror = (error) => {
          console.error(`${LOG_PREFIX} Error reading font blob:`, error);
          reject(error);
        };
        reader.readAsDataURL(fontBlob); // Read as Data URL to get base64
      });
    } catch (error) {
      console.error(`${LOG_PREFIX} Error loading or registering font:`, error);
      return false; // Indicate failure
    } finally {
      fontLoadingPromise = null; // Reset promise regardless of outcome
    }
  })();

  return fontLoadingPromise;
};


// --- Helper Function for Measurement SVG Rendering (for PDF) ---
// Note: geometry coordinates (endpoints, center) are UNscaled.
// The 'scale' parameter (viewScale) is applied internally here.
// targetDimensionLinePosition is the calculated absolute position (in mm) for the dimension line.
// Added 'settings' parameter to get styling values
const renderMeasurementToSvg = (measurementData, geometry, scale = 1, targetDimensionLinePosition = null, settings = {}) => {
  const { pathId, type } = measurementData; // Removed unscaledTextPos
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  // Get style values from settings, falling back to defaults
  const strokeWidth = settings.measurementStrokeWidth ?? DEFAULT_PDF_BASE_MEASUREMENT_STROKE_WIDTH;
  const fontSize = settings.measurementFontSize ?? DEFAULT_PDF_BASE_MEASUREMENT_FONT_SIZE;
  const arrowSize = settings.measurementArrowSize ?? DEFAULT_PDF_BASE_MEASUREMENT_ARROW_SIZE;
  const textOffset = settings.measurementTextOffset ?? DEFAULT_PDF_BASE_MEASUREMENT_TEXT_OFFSET;
  const extensionGap = settings.measurementExtensionGap ?? DEFAULT_PDF_BASE_MEASUREMENT_EXTENSION_GAP;
  const extensionOverhang = settings.measurementExtensionOverhang ?? DEFAULT_PDF_BASE_MEASUREMENT_EXTENSION_OVERHANG;
  const strokeColor = settings.measurementStrokeColor ?? DEFAULT_PDF_MEASUREMENT_STROKE_COLOR;
  const fillColor = settings.measurementFillColor ?? DEFAULT_PDF_MEASUREMENT_FILL_COLOR;
  const fontFamily = 'DejaVuSans'; // <<< CHANGE: Use the registered DejaVuSans font
  const createSvgElement = (tag, attributes) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const key in attributes) { el.setAttribute(key, attributes[key]); }
    return el;
  };

  // --- Determine Text Content (Check for Override) ---
  let textContent = '';
  if (measurementData.overrideValue !== null && measurementData.overrideValue !== '') {
    textContent = measurementData.overrideValue;
    console.log(`[PDF Export] Using override value for ${pathId}: "${textContent}"`);
  } else if (type === 'line' && geometry?.length != null) {
    textContent = parseFloat(geometry.length.toFixed(2)).toString();
  } else if (type === 'circle' && geometry?.diameter != null) {
    textContent = `⌀${parseFloat(geometry.diameter.toFixed(2)).toString()}`; // Revert back to Diameter symbol
  } else if (type === 'radius' && geometry?.radius != null) { // Handle radius type here
    textContent = `R${parseFloat(geometry.radius.toFixed(2)).toString()}`;
  }
  // Add a fallback if textContent is still empty
  if (textContent === '') {
      console.warn(`[PDF Export] Could not determine text content for measurement ${pathId}. Type: ${type}`);
      textContent = '?'; // Placeholder for missing value
  }

  // --- LINE MEASUREMENT RENDERING ---
  if (type === 'line' && geometry?.endpoints && targetDimensionLinePosition) {
    const [usp1, usp2] = geometry.endpoints; // Unscaled points relative to item origin
    const p1 = scaleCoord(usp1, scale); // Scaled points (now in mm relative to item origin) - Pass scale
    const p2 = scaleCoord(usp2, scale); // Pass scale
    // Use textContent determined above (could be override or calculated)

    const vx = p2[0] - p1[0]; const vy = p2[1] - p1[1]; // Vector in mm
    const lineLen = Math.sqrt(vx * vx + vy * vy); // Length on paper (mm)
    const ux = lineLen > 1e-6 ? vx / lineLen : 1; const uy = lineLen > 1e-6 ? vy / lineLen : 0; // Unit vector
    const nx = -uy; const ny = ux; // Normal vector

    // Determine orientation for positioning logic
    const isHorizontal = Math.abs(ux) > Math.abs(uy); // Primarily horizontal if |vx| > |vy|

    // Calculate dimension line points based on target position
    let dimLineP1, dimLineP2;
    let offsetSign = 1; // Assume offset is "positive" direction (e.g., above, right) initially
    if (isHorizontal) {
      // Horizontal measurement: targetDimensionLinePosition.y defines the line's y-coord
      dimLineP1 = [p1[0], targetDimensionLinePosition.y];
      dimLineP2 = [p2[0], targetDimensionLinePosition.y];
      // Determine if target is above or below the original line's midpoint
      const midY = (p1[1] + p2[1]) / 2;
      offsetSign = Math.sign(targetDimensionLinePosition.y - midY);
      if (offsetSign === 0) offsetSign = 1; // Default if perfectly aligned
    } else {
      // Vertical measurement: targetDimensionLinePosition.x defines the line's x-coord
      dimLineP1 = [targetDimensionLinePosition.x, p1[1]];
      dimLineP2 = [targetDimensionLinePosition.x, p2[1]];
      // Determine if target is left or right of the original line's midpoint
      const midX = (p1[0] + p2[0]) / 2;
      offsetSign = Math.sign(targetDimensionLinePosition.x - midX);
      if (offsetSign === 0) offsetSign = 1; // Default if perfectly aligned
    }

    // Calculate extension lines based on original points (p1, p2) and new dimension line (dimLineP1/2)
    // Start extension line slightly away from the geometry point (p1/p2)
    const extLineP1Start = [p1[0] + nx * offsetSign * extensionGap, p1[1] + ny * offsetSign * extensionGap];
    const extLineP2Start = [p2[0] + nx * offsetSign * extensionGap, p2[1] + ny * offsetSign * extensionGap];
    // End extension line slightly past the dimension line (dimLineP1/2)
    const extLineP1End = [dimLineP1[0] + nx * offsetSign * extensionOverhang, dimLineP1[1] + ny * offsetSign * extensionOverhang];
    const extLineP2End = [dimLineP2[0] + nx * offsetSign * extensionOverhang, dimLineP2[1] + ny * offsetSign * extensionOverhang];


    // Arrow heads (fixed size in mm) - use ux, uy from the original line direction
    const arrowNormX = ux; const arrowNormY = uy;
    const arrowHeadFactor = 0.35; // Shape factor for arrowhead
    const arrowTailFactor = 1 - arrowHeadFactor;
    // Arrow 1 points from dimLineP1 towards dimLineP2 direction (ux, uy)
    const arrow1 = `M ${dimLineP1[0]} ${dimLineP1[1]} l ${arrowNormX * arrowSize} ${arrowNormY * arrowSize} l ${-arrowNormY * arrowSize * arrowHeadFactor} ${arrowNormX * arrowSize * arrowHeadFactor} l ${-arrowNormX * arrowSize * arrowTailFactor} ${-arrowNormY * arrowSize * arrowTailFactor} z`;
    // Arrow 2 points from dimLineP2 towards dimLineP1 direction (-ux, -uy)
    const arrow2 = `M ${dimLineP2[0]} ${dimLineP2[1]} l ${-arrowNormX * arrowSize} ${-arrowNormY * arrowSize} l ${arrowNormY * arrowSize * arrowHeadFactor} ${-arrowNormX * arrowSize * arrowHeadFactor} l ${arrowNormX * arrowSize * arrowTailFactor} ${arrowNormY * arrowSize * arrowTailFactor} z`;

    // --- Calculate Dimension Line Midpoint (based on new dimLineP1/2) ---
    const dimMidX = (dimLineP1[0] + dimLineP2[0]) / 2;
    const dimMidY = (dimLineP1[1] + dimLineP2[1]) / 2;

    // --- Calculate Text Rotation ---
    let textRotation = 0;
    // Rotate text if the original line is more vertical than horizontal
    if (!isHorizontal) {
      textRotation = -90; // Rotate 90 degrees clockwise for vertical dimensions
    }

    // --- Calculate Final Text Position (relative to new dimension line midpoint) ---
    let finalX, finalY;
    // Always place text consistently relative to the dimension line
    if (isHorizontal) {
      // Place text ABOVE horizontal dimension lines
      finalX = dimMidX;
      finalY = dimMidY - textOffset; // Subtract offset for "above" in SVG Y-down coords
    } else {
      // Place text to the LEFT of vertical dimension lines
      finalX = dimMidX - textOffset; // Subtract offset for "left"
      finalY = dimMidY;
    }

    // Draw elements
    // Extension Lines
    group.appendChild(createSvgElement('line', { x1: extLineP1Start[0], y1: extLineP1Start[1], x2: extLineP1End[0], y2: extLineP1End[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    group.appendChild(createSvgElement('line', { x1: extLineP2Start[0], y1: extLineP2Start[1], x2: extLineP2End[0], y2: extLineP2End[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    // Dimension Line (Continuous)
    group.appendChild(createSvgElement('line', { x1: dimLineP1[0], y1: dimLineP1[1], x2: dimLineP2[0], y2: dimLineP2[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    // Arrow Heads
    group.appendChild(createSvgElement('path', { d: arrow1, fill: fillColor, stroke: 'none' }));
    group.appendChild(createSvgElement('path', { d: arrow2, fill: fillColor, stroke: 'none' }));

    // Draw Text (using calculated finalX, finalY)
    const textAttributes = {
      x: finalX,
      y: finalY,
      'font-size': fontSize, // Fixed mm size
      fill: fillColor,
      stroke: 'none',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle', // Changed from central to middle
      'font-family': fontFamily
    };
    if (textRotation !== 0) {
      // Rotate around the calculated text center point
      textAttributes.transform = `rotate(${textRotation} ${finalX} ${finalY})`;
    }
    const textEl = createSvgElement('text', textAttributes);
    textEl.textContent = textContent;
    group.appendChild(textEl);

  // --- CIRCLE MEASUREMENT RENDERING ---
  } else if (type === 'circle' && geometry?.center && geometry.diameter != null) {
    const [uscx, uscy] = geometry.center; // Unscaled center
    const cx = uscx * scale; // Scaled center (mm)
    const cy = uscy * scale; // Scaled center (mm)
    const radius = (geometry.radius || geometry.diameter / 2) * scale; // Scaled radius (mm)
    // Use textContent determined above

    // --- Calculate Leader Line and Text Position (Fixed Angle/Offset) ---
    const angle = -Math.PI / 4; // Fixed angle (e.g., 45 degrees down-right)
    const cosA = Math.cos(angle); const sinA = Math.sin(angle);
    const leaderStart = [cx + cosA * radius, cy + sinA * radius]; // Start on circumference
    // Place text a fixed offset away from the leader start point
    const textDist = radius + textOffset * 2; // Distance from center to text anchor
    const textX = cx + cosA * textDist;
    const textY = cy + sinA * textDist;
    const leaderEnd = [cx + cosA * (radius + textOffset * 0.5), cy + sinA * (radius + textOffset * 0.5)]; // End leader slightly before text

    // Draw Leader Line
    group.appendChild(createSvgElement('line', { x1: leaderStart[0], y1: leaderStart[1], x2: leaderEnd[0], y2: leaderEnd[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
    // Draw Text
    const textEl = createSvgElement('text', { x: textX, y: textY, 'font-size': fontSize, fill: fillColor, stroke: 'none', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': fontFamily });
    textEl.textContent = textContent;
    group.appendChild(textEl);

  // --- RADIUS MEASUREMENT RENDERING ---
  } else if (type === 'radius' && geometry?.radius != null && geometry?.center && geometry?.endpoints && measurementData.textPosition) {
    // Use textContent determined above

    // Scale geometry points
    const [usp1, usp2] = geometry.endpoints;
    const p1 = scaleCoord(usp1, scale);
    const p2 = scaleCoord(usp2, scale);
    const center = geometry.center ? scaleCoord(geometry.center, scale) : null; // Scale center if available
    const scaledRadius = geometry.radius * scale; // Scaled radius in mm
    const trueScaledRadius = scaledRadius / 10; // Use radius adjusted for 10x factor

    if (!center) {
      console.warn(`[PDF Export] Missing center point for radius measurement ${pathId}. Cannot draw leader line.`);
      // Fallback: Just draw text at its position
      const textX = measurementData.textPosition.x * scale;
      const textY = measurementData.textPosition.y * scale;
      const textEl = createSvgElement('text', { x: textX, y: textY, 'font-size': fontSize, fill: fillColor, stroke: 'none', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': fontFamily });
      textEl.textContent = textContent;
      group.appendChild(textEl);
    } else {
      // Vector from center towards the user's text position
      const userTextPos = scaleCoord([measurementData.textPosition.x, measurementData.textPosition.y], scale);
      const textVecX = userTextPos[0] - center[0];
      const textVecY = userTextPos[1] - center[1];
      const textVecLen = Math.sqrt(textVecX*textVecX + textVecY*textVecY);
      const textUx = textVecLen > 1e-9 ? textVecX / textVecLen : 1; // Default to horizontal if length is near zero
      const textUy = textVecLen > 1e-9 ? textVecY / textVecLen : 0;

      // Calculate the point on the circumference where the leader line should start
      const circumferencePointX = center[0] + textUx * trueScaledRadius;
      const circumferencePointY = center[1] + textUy * trueScaledRadius;
      const circumferencePoint = [circumferencePointX, circumferencePointY];

      // Calculate the point where the leader line ends (slightly before the text)
      const leaderEnd = [
          userTextPos[0] - textUx * textOffset, // Pull back slightly from text anchor
          userTextPos[1] - textUy * textOffset
      ];

      // Arrowhead at circumferencePoint, pointing inwards towards the center (-textUx, -textUy)
      const arrowNormX = textUx;
      const arrowNormY = textUy;
      const arrowHeadFactor = 0.35;
      const arrowTailFactor = 1 - arrowHeadFactor;
      // Arrow points outwards along the radial vector (arrowNormX, arrowNormY) from the circumference point
      const arrow = `M ${circumferencePoint[0]} ${circumferencePoint[1]}
                     l ${arrowNormX * arrowSize} ${arrowNormY * arrowSize}
                     l ${-arrowNormY * arrowSize * arrowHeadFactor} ${arrowNormX * arrowSize * arrowHeadFactor}
                     l ${-arrowNormX * arrowSize * arrowTailFactor} ${-arrowNormY * arrowSize * arrowTailFactor}
                     z`;

      // Draw NEW Leader Line (from circumference to near text)
      group.appendChild(createSvgElement('line', { x1: circumferencePoint[0], y1: circumferencePoint[1], x2: leaderEnd[0], y2: leaderEnd[1], stroke: strokeColor, 'stroke-width': strokeWidth, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));
      // Draw Arrowhead
      group.appendChild(createSvgElement('path', { d: arrow, fill: fillColor, stroke: 'none' }));
      // Draw Text
      const textEl = createSvgElement('text', {
        x: userTextPos[0], // Use scaled user text position
        y: userTextPos[1], // Use scaled user text position
        'font-size': fontSize,
        fill: fillColor,
        stroke: 'none',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'font-family': fontFamily
      });
      textEl.textContent = textContent;
      group.appendChild(textEl);
    }
  }

  // Only return group if it contains elements (i.e., rendering was successful)
  return group.childNodes.length > 0 ? group : null;
};

// --- Helper Function to Parse Scale Override String ---
// Parses "X:Y" or "X" into a numerical ratio (X/Y).
// Returns null if invalid, empty, or "0".
const parseScaleOverride = (overrideString) => {
  if (!overrideString || overrideString.trim() === '' || overrideString.trim() === '0') {
    return null; // Treat empty, "0", or whitespace as no override
  }

  const trimmed = overrideString.trim();

  // Check for "X:Y" format
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length === 2) {
      const x = parseFloat(parts[0]);
      const y = parseFloat(parts[1]);
      if (!isNaN(x) && !isNaN(y) && y > 1e-9) { // Avoid division by zero or near-zero
        return x / y;
      }
    }
  } else {
    // Check for single number "X" format (interpret as X:1)
    const x = parseFloat(trimmed);
    if (!isNaN(x)) {
      return x / 1; // Ratio is X/1
    }
  }

  console.warn(`${LOG_PREFIX} Invalid scale override format: "${overrideString}". Using auto-scale.`);
  return null; // Invalid format
};


// --- PDF Export Hook ---
export function useTechnicalDrawingPdfExport(viewboxes, activeMeasurements) {

  // --- PDF Export Logic ---
  const exportPdf = useCallback(async () => {
    console.log(`${LOG_PREFIX} Starting PDF Export...`);

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
        // Get settings for this viewbox, providing empty object as fallback
        const settings = viewbox.exportSettings || {};
        console.log(`${LOG_PREFIX} Processing Viewbox ${index + 1}/${viewboxes.length}: ID=${viewbox.id}, Layout=${viewbox.layout}, Settings:`, settings);

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
        // Use settings for paper size and gap
        const paperSizeKey = settings.paperSize || DEFAULT_PAPER_SIZE;
        const fixedGap = settings.viewGap ?? DEFAULT_FIXED_GAP;
        const estimatedGapWidth = (gridCols - 1) * fixedGap;
        const estimatedGapHeight = (gridRows - 1) * fixedGap;
        const estimatedTotalWidth = totalUnscaledViewsWidth + estimatedGapWidth;
        const estimatedTotalHeight = totalUnscaledViewsHeight + estimatedGapHeight;
        // Pass paperSizeKey to layout function
        const pageLayout = getStandardPageLayout(estimatedTotalWidth, estimatedTotalHeight, paperSizeKey);
        const printableDimensions = { width: pageLayout.printableWidth, height: pageLayout.printableHeight };
        const printableAreaPos = [pageLayout.printableX, pageLayout.printableY];
        console.log(`${LOG_PREFIX}   Page Layout: size=${paperSizeKey}, orientation=${pageLayout.orientation}, W=${pageLayout.width}mm, H=${pageLayout.height}mm`);
        console.log(`${LOG_PREFIX}   Printable Area: X=${printableAreaPos[0].toFixed(2)}, Y=${printableAreaPos[1].toFixed(2)}, W=${printableDimensions.width.toFixed(2)}, H=${printableDimensions.height.toFixed(2)}`);

        // --- 3. Calculate Available Space, View Scale, and Final Layout ---
        let availableWidth, availableHeight;
        let spaceForViewsWidth, spaceForViewsHeight;
        let viewScale;
        let finalScaledViewsWidth, finalScaledViewsHeight;
        let finalTotalLayoutWidth, finalTotalLayoutHeight;
        let originX, originY; // Top-left corner of the entire layout block

        // Use settings for gap and minMargin
        const currentFixedGap = settings.viewGap ?? DEFAULT_FIXED_GAP;
        const currentMinMargin = settings.minMargin ?? DEFAULT_MIN_MARGIN;
        const totalFixedGapWidth = Math.max(0, gridCols - 1) * currentFixedGap;
        const totalFixedGapHeight = Math.max(0, gridRows - 1) * currentFixedGap;
        console.log(`${LOG_PREFIX}   Total Fixed Gaps (using ${currentFixedGap}mm): W=${totalFixedGapWidth.toFixed(2)}, H=${totalFixedGapHeight.toFixed(2)}`);

        if (gridRows === 1) {
          console.log(`${LOG_PREFIX}   Calculating layout for single row (gridRows === 1)...`);
          // Pass paperSizeKey to title block layout
          const titleBlockLayout = calculateTitleBlockLayout(
            pageLayout.width, pageLayout.height,
            pageLayout.marginLeft, pageLayout.marginTop, pageLayout.marginRight, pageLayout.marginBottom,
            pageLayout.orientation, PAPER_SIZES, paperSizeKey
          );

          if (titleBlockLayout) {
            // Use currentMinMargin
            availableWidth = printableDimensions.width - currentMinMargin * 2;
            availableHeight = titleBlockLayout.outerBox.y - printableAreaPos[1] - currentMinMargin * 2;
            console.log(`${LOG_PREFIX}     Available Space (1 row): W=${availableWidth.toFixed(2)}, H=${availableHeight.toFixed(2)} (considering ${currentMinMargin}mm margins and title block at Y=${titleBlockLayout.outerBox.y.toFixed(2)})`);
          } else {
            console.warn(`${LOG_PREFIX}     Could not calculate title block layout for 1 row. Using full printable height minus margins.`);
            availableWidth = printableDimensions.width - currentMinMargin * 2;
            availableHeight = printableDimensions.height - currentMinMargin * 2;
          }
        } else {
          console.log(`${LOG_PREFIX}   Calculating general layout (gridRows !== 1)...`);
          // Use currentMinMargin
          availableWidth = printableDimensions.width - currentMinMargin * 2;
          availableHeight = printableDimensions.height - currentMinMargin * 2;
          console.log(`${LOG_PREFIX}     Available Space (General): W=${availableWidth.toFixed(2)}, H=${availableHeight.toFixed(2)} (considering ${currentMinMargin}mm margins)`);
        }

        // Calculate space purely for views (using totalFixedGapWidth/Height calculated with currentFixedGap)
        spaceForViewsWidth = Math.max(0, availableWidth - totalFixedGapWidth);
        spaceForViewsHeight = Math.max(0, availableHeight - totalFixedGapHeight);
        console.log(`${LOG_PREFIX}   Space For Scaled Views: W=${spaceForViewsWidth.toFixed(2)}, H=${spaceForViewsHeight.toFixed(2)}`);

        if (spaceForViewsWidth <= 1e-6 || spaceForViewsHeight <= 1e-6) {
          console.warn(`${LOG_PREFIX}   Skipping Viewbox ${viewbox.id} due to zero or negative space available for views after gaps/margins.`);
          continue;
        }

        // Calculate the single scale factor for the views
        // Check for custom scale override first
        const customScaleRatio = parseScaleOverride(settings.customScaleOverride);

        if (customScaleRatio !== null) {
          // Use override: Calculate viewScale based on the desired X:Y ratio
          // Remember: trueScaleRatio = viewScale / 10, so viewScale = trueScaleRatio * 10
          viewScale = customScaleRatio * 10;
          console.log(`${LOG_PREFIX}   Using Custom Scale Override: "${settings.customScaleOverride}" -> Ratio=${customScaleRatio.toFixed(4)}, Calculated View Scale: ${viewScale.toFixed(4)}`);
          // Optional: Add a check/warning if this scale makes content exceed available space
          const checkWidth = totalUnscaledViewsWidth * viewScale + totalFixedGapWidth;
          const checkHeight = totalUnscaledViewsHeight * viewScale + totalFixedGapHeight;
          if (checkWidth > availableWidth + 1e-6 || checkHeight > availableHeight + 1e-6) { // Add tolerance
            console.warn(`${LOG_PREFIX}   Warning: Custom scale override "${settings.customScaleOverride}" may cause content (W=${checkWidth.toFixed(2)}, H=${checkHeight.toFixed(2)}) to exceed available space (W=${availableWidth.toFixed(2)}, H=${availableHeight.toFixed(2)}).`);
          }
        } else {
          // No valid override, calculate automatically
          const scaleX = spaceForViewsWidth / totalUnscaledViewsWidth;
          const scaleY = spaceForViewsHeight / totalUnscaledViewsHeight;
          viewScale = Math.min(scaleX, scaleY);
          console.log(`${LOG_PREFIX}   Calculated Auto View Scale: ${viewScale.toFixed(4)} (based on available space W=${spaceForViewsWidth.toFixed(2)}, H=${spaceForViewsHeight.toFixed(2)})`);
        }


        if (viewScale <= 1e-6) {
           console.warn(`${LOG_PREFIX}   Skipping Viewbox ${viewbox.id} due to zero or negative final view scale (override or auto).`);
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
        const centeringOffsetX = (availableWidth - finalTotalLayoutWidth) / 2;
        const centeringOffsetY = (availableHeight - finalTotalLayoutHeight) / 2;
        // Apply centering offset AND user-defined offset from settings
        const userOffsetX = settings.offsetX ?? 0;
        const userOffsetY = settings.offsetY ?? 0;
        originX = printableAreaPos[0] + currentMinMargin + centeringOffsetX + userOffsetX;
        originY = printableAreaPos[1] + currentMinMargin + centeringOffsetY + userOffsetY; // This origin is relative to the available space top-left

        // Adjust originY if it was calculated relative to title block (1-row case)
        // Note: The availableHeight calculation for gridRows=1 already accounts for the title block position relative to printableAreaPos[1] and currentMinMargins.
        // So, the originY calculation using that availableHeight and its corresponding offsetY should place it correctly.

        console.log(`${LOG_PREFIX}   Final Layout Origin (Top-Left): X=${originX.toFixed(2)}, Y=${originY.toFixed(2)}`);


        // --- 4. Initialize PDF or Add Page ---
        if (isFirstPage) {
          pdf = new jsPDF({ orientation: pageLayout.orientation, unit: 'mm', format: paperSizeKey });
          console.log(`${LOG_PREFIX} Initializing PDF and attempting to load font...`);
          const fontLoaded = await loadPdfFont(pdf); // Load font on first page init
          if (!fontLoaded) {
            alert("Error loading required font for PDF export. Check console for details.");
            return; // Stop export if font fails
          }
          isFirstPage = false;
        } else {
          // Ensure font is loaded for subsequent pages too (should be quick if already loaded)
          if (!isFontLoaded) {
             console.log(`${LOG_PREFIX} Font not loaded for subsequent page, attempting load...`);
             const fontLoaded = await loadPdfFont(pdf);
             if (!fontLoaded) {
               alert("Error loading required font for PDF export. Check console for details.");
               return; // Stop export if font fails
             }
          }
          pdf.addPage(paperSizeKey, pageLayout.orientation);
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
        let currentX = originX; // Already includes user offset
        let currentY = originY; // Already includes user offset
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

              // Item's top-left position on the page (currentX/Y already include offsets)
              const itemPosX = currentX + alignOffsetX;
              const itemPosY = currentY + alignOffsetY;

              console.log(`${LOG_PREFIX}     Rendering Item ${item.id} in Cell[${rowIndex},${colIndex}] at page pos [${itemPosX.toFixed(2)}, ${itemPosY.toFixed(2)}] (Origin was [${originX.toFixed(2)}, ${originY.toFixed(2)}])`);

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

                // Use stroke widths, colors, and dash settings from viewbox settings
                const visibleStrokeWidth = settings.visibleStrokeWidth ?? DEFAULT_PDF_BASE_VISIBLE_STROKE_WIDTH;
                const hiddenStrokeWidth = settings.hiddenStrokeWidth ?? DEFAULT_PDF_BASE_HIDDEN_STROKE_WIDTH;
                const visibleColor = settings.visibleStrokeColor ?? DEFAULT_PDF_VISIBLE_STROKE_COLOR;
                const hiddenColor = settings.hiddenStrokeColor ?? DEFAULT_PDF_HIDDEN_STROKE_COLOR;
                const dashLength = settings.hiddenDashLength ?? DEFAULT_PDF_HIDDEN_DASH_LENGTH;
                const dashGap = settings.hiddenDashGap ?? DEFAULT_PDF_HIDDEN_DASH_GAP;
                const hiddenDashArray = `${dashLength},${dashGap}`;

                const isHidden = path.type === 'hidden' || path.id?.includes('_hidden');
                pathEl.setAttribute('stroke', isHidden ? hiddenColor : visibleColor);
                pathEl.setAttribute('stroke-width', isHidden ? hiddenStrokeWidth : visibleStrokeWidth);
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

              // --- Process and Render Measurements for this item ---
              console.log(`${LOG_PREFIX}       Processing measurements for item ${item.id}...`);
              const itemMeasurements = Object.values(activeMeasurements)
                .filter(m => m && m.viewInstanceId === item.id && m.geometry && m.creationTimestamp) // Ensure geometry and timestamp exist
                .sort((a, b) => a.creationTimestamp - b.creationTimestamp); // Sort by creation time

              // Check for bounding box within item.svgData
              if (itemMeasurements.length > 0 && item.svgData && item.svgData.geometryBoundingBox) {
                const bbox = item.svgData.geometryBoundingBox; // Access from item.svgData
                // Scale the bounding box to mm for calculations
                const scaledBBox = {
                  minX: bbox.minX * viewScale,
                  minY: bbox.minY * viewScale,
                  maxX: bbox.maxX * viewScale,
                  maxY: bbox.maxY * viewScale,
                };
                // console.log(`${LOG_PREFIX}         Item BBox (unscaled):`, bbox); // Less verbose logging
                // console.log(`${LOG_PREFIX}         Item BBox (scaled, mm):`, scaledBBox);

                // Group measurements by side and orientation
                const groups = {
                  horizontalTop: [], horizontalBottom: [],
                  verticalLeft: [], verticalRight: [],
                  circle: [], // Circles handled separately
                  radius: [], // Radius handled separately
                };
                const lineMeasurements = []; // Store line measurements for positioning

                itemMeasurements.forEach(m => {
                  if (m.type === 'circle') {
                    groups.circle.push(m);
                  } else if (m.type === 'radius') {
                    groups.radius.push(m);
                  } else if (m.type === 'line' && m.geometry.endpoints) {
                    lineMeasurements.push(m); // Add to list for later grouping
                  }
                });

                // Render Circle and Radius measurements first (no auto-positioning needed)
                [...groups.circle, ...groups.radius].forEach(measurement => {
                  const measurementSvgGroup = renderMeasurementToSvg(measurement, measurement.geometry, viewScale, null, settings); // Pass null for targetPosition
                  if (measurementSvgGroup) {
                    itemGroup.appendChild(measurementSvgGroup);
                  } else {
                    console.warn(`${LOG_PREFIX}           renderMeasurementToSvg returned null for ${measurement.pathId} (Type: ${measurement.type})`);
                  }
                });

                // Now group and position only the LINE measurements
                lineMeasurements.forEach(m => {
                    const [usp1, usp2] = m.geometry.endpoints;
                    const p1 = scaleCoord(usp1, viewScale); // Scaled points (mm)
                    const p2 = scaleCoord(usp2, viewScale);
                    const midX = (p1[0] + p2[0]) / 2;
                    const midY = (p1[1] + p2[1]) / 2;
                    const isHorizontal = Math.abs(p2[0] - p1[0]) > Math.abs(p2[1] - p1[1]);

                    if (isHorizontal) {
                      if (Math.abs(midY - scaledBBox.maxY) < Math.abs(midY - scaledBBox.minY)) {
                         groups.horizontalTop.push(m);
                      } else {
                         groups.horizontalBottom.push(m);
                      }
                    } else { // Vertical
                       if (Math.abs(midX - scaledBBox.maxX) < Math.abs(midX - scaledBBox.minX)) {
                         groups.verticalRight.push(m);
                       } else {
                         groups.verticalLeft.push(m);
                       }
                    }
                });


                console.log(`${LOG_PREFIX}         Grouped Line Measurements:`, {
                    horizontalTop: groups.horizontalTop.length, horizontalBottom: groups.horizontalBottom.length,
                    verticalLeft: groups.verticalLeft.length, verticalRight: groups.verticalRight.length
                });

                // Calculate target positions for LINE measurements
                const measurementTargetPositions = {};

                const measExtGap = settings.measurementExtensionGap ?? DEFAULT_PDF_BASE_MEASUREMENT_EXTENSION_GAP;
                const measInitialOffset = settings.measurementInitialOffset ?? DEFAULT_PDF_MEASUREMENT_INITIAL_OFFSET;
                const measStackingOffset = settings.measurementStackingOffset ?? DEFAULT_PDF_MEASUREMENT_STACKING_OFFSET;

                let currentOffset = measExtGap + measInitialOffset;
                groups.horizontalTop.forEach(m => {
                  const targetY = scaledBBox.maxY + currentOffset;
                  measurementTargetPositions[m.pathId] = { x: null, y: targetY };
                  currentOffset += measStackingOffset;
                });

                currentOffset = measExtGap + measInitialOffset;
                groups.horizontalBottom.forEach(m => {
                  const targetY = scaledBBox.minY - currentOffset;
                  measurementTargetPositions[m.pathId] = { x: null, y: targetY };
                  currentOffset += measStackingOffset;
                });

                currentOffset = measExtGap + measInitialOffset;
                groups.verticalLeft.forEach(m => {
                  const targetX = scaledBBox.minX - currentOffset;
                  measurementTargetPositions[m.pathId] = { x: targetX, y: null };
                  currentOffset += measStackingOffset;
                });

                currentOffset = measExtGap + measInitialOffset;
                groups.verticalRight.forEach(m => {
                  const targetX = scaledBBox.maxX + currentOffset;
                  measurementTargetPositions[m.pathId] = { x: targetX, y: null };
                  currentOffset += measStackingOffset;
                });

                // Render LINE measurements using calculated positions
                console.log(`${LOG_PREFIX}         Rendering ${lineMeasurements.length} line measurements with calculated positions...`);
                lineMeasurements.forEach(measurement => {
                  const targetPosition = measurementTargetPositions[measurement.pathId];
                  if (targetPosition) {
                     const measurementSvgGroup = renderMeasurementToSvg(measurement, measurement.geometry, viewScale, targetPosition, settings);
                     if (measurementSvgGroup) {
                       itemGroup.appendChild(measurementSvgGroup);
                     } else {
                       console.warn(`${LOG_PREFIX}           renderMeasurementToSvg returned null for line measurement ${measurement.pathId}`);
                     }
                  } else {
                      // This case should ideally not happen if grouping logic is correct
                      console.warn(`${LOG_PREFIX}           Skipping line measurement ${measurement.pathId} - Could not determine target position.`);
                  }
                });

              } else if (itemMeasurements.length > 0) {
                  console.warn(`${LOG_PREFIX}       Cannot process measurements for item ${item.id}: Missing item.svgData.geometryBoundingBox.`);
              }
            } // End if(storedItemData)

            // Advance currentX for the next item in the row (use currentFixedGap)
            currentX += scaledColWidths[colIndex] + (colIndex < gridCols - 1 ? currentFixedGap : 0);

          } // End loop columns
          // Advance currentY for the next row (use currentFixedGap)
          currentY += scaledRowHeights[rowIndex] + (rowIndex < gridRows - 1 ? currentFixedGap : 0);
        } // End loop rows


        // --- 7. Add Border around the printable area ---
        // --- 8. Add Border around the printable area --- (Use settings for color/width)
        const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        borderRect.setAttribute('x', printableAreaPos[0]);
        borderRect.setAttribute('y', printableAreaPos[1]);
        borderRect.setAttribute('width', printableDimensions.width);
        borderRect.setAttribute('height', printableDimensions.height);
        borderRect.setAttribute('fill', 'none');
        borderRect.setAttribute('stroke', settings.borderColor ?? DEFAULT_PDF_VISIBLE_STROKE_COLOR); // Use setting or default
        borderRect.setAttribute('stroke-width', settings.borderLineWidth ?? DEFAULT_PDF_BORDER_LINE_WEIGHT); // Use setting or default
        svgPageGroup.appendChild(borderRect); // Add border to the main page group

        // --- 9. Add SVG element to the current PDF page ---
        console.log(`${LOG_PREFIX}     Adding SVG element for page ${currentPageNum} (Viewbox ${viewbox.id}) to PDF...`);
        await pdf.svg(tempSvg, { x: 0, y: 0, width: pageLayout.width, height: pageLayout.height });
        console.log(`${LOG_PREFIX}     Finished adding SVG for page ${currentPageNum}`);

        // --- 10. Draw Title Block --- (Update scale formatting)
        console.log(`${LOG_PREFIX}       Calculating and drawing title block for viewbox ${viewbox.id}...`);
        // Pass paperSizeKey to title block layout calculation
        const titleBlockLayout = calculateTitleBlockLayout(
            pageLayout.width, pageLayout.height,
            pageLayout.marginLeft, pageLayout.marginTop, pageLayout.marginRight, pageLayout.marginBottom,
            pageLayout.orientation, PAPER_SIZES, paperSizeKey
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
        // Pass settings to title block drawing function
        // Ensure title block also uses a font that exists (Helvetica is standard)
        pdf.setFont('helvetica'); // Set font explicitly before drawing title block
        drawTitleBlock(pdf, titleBlockLayout, titleBlockData, settings);
        // Set font back to NotoSans if needed for other elements (though svg conversion handles measurement font)
        // pdf.setFont('NotoSans'); // Might not be necessary if only measurements use it via SVG

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
// Added paperSizeKey parameter
function calculateTitleBlockLayout(pageWidth, pageHeight, marginLeft, marginTop, marginRight, marginBottom, orientation, paperSizes, paperSizeKey) {
  const logPrefixTB = `${LOG_PREFIX} TitleBlockLayout`;
  // Use provided paperSizeKey or default
  const effectivePaperSizeKey = paperSizeKey || DEFAULT_PAPER_SIZE;
  const currentPaper = paperSizes[effectivePaperSizeKey] || paperSizes.a4;
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
// Added settings parameter
function drawTitleBlock(pdf, titleBlockLayout, data = {}, settings = {}) {
    if (!pdf || !titleBlockLayout) { console.warn(`${LOG_PREFIX} DrawTitleBlock: Missing pdf instance or layout data.`); return; }
    const logPrefixTB = `${LOG_PREFIX} DrawTitleBlock`; console.log(`${logPrefixTB} Drawing title block... Data:`, data, "Settings:", settings);
    const { outerBox, cells } = titleBlockLayout; // Font size handled below

    // Get styles from settings or defaults
    const titleBlockLineWeight = settings.titleBlockLineWeight ?? DEFAULT_PDF_TITLE_BLOCK_LINE_WEIGHT; // Example if added later
    const titleBlockFontFamily = settings.titleBlockFontFamily ?? DEFAULT_PDF_TITLE_BLOCK_FONT_FAMILY;
    const titleBlockFontSizeLabel = settings.titleBlockFontSizeLabel ?? DEFAULT_PDF_TITLE_BLOCK_FONT_SIZE_LABEL;
    const titleBlockFontSizeValue = settings.titleBlockFontSizeValue ?? DEFAULT_PDF_TITLE_BLOCK_FONT_SIZE_VALUE;

    const cellData = [
        [ { label: "Project:", value: data.project || "CAD-OS Demo" }, { label: "Part Name:", value: data.partName || "N/A" } ],
        [ { label: "Scale:", value: data.scale || "NTS" },        { label: "Material:", value: data.material || "Steel" } ], // Default scale NTS
        [ { label: "Drawn By:", value: data.drawnBy || "CAD-OS" },  { label: "Date:", value: data.date || new Date().toLocaleDateString() } ] // Changed default Drawn By
    ];
    pdf.saveGraphicsState();
    // Use line weight from settings/default (if added to settings later)
    pdf.setLineWidth(DEFAULT_PDF_TITLE_BLOCK_LINE_WEIGHT); // Using default for now
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
                // Use font sizes from settings/defaults
                const labelY = cell.textY - (titleBlockFontSizeLabel * 0.1); // Adjust baseline slightly up
                const valueY = cell.textY + (titleBlockFontSizeValue * 0.2); // Adjust baseline slightly down

                // Draw Label
                pdf.setFont(titleBlockFontFamily, 'bold');
                pdf.setFontSize(titleBlockFontSizeLabel); // Use setting/default (pt)
                pdf.text(labelText, cell.textX, labelY, { align: 'left', baseline: 'middle', maxWidth: cell.maxWidth });

                // Draw Value
                pdf.setFont(titleBlockFontFamily, 'normal');
                pdf.setFontSize(titleBlockFontSizeValue); // Use setting/default (pt)
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
