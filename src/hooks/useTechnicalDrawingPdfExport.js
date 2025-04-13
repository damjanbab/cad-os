import { useCallback } from 'react';
import { jsPDF } from "jspdf";
import 'svg2pdf.js'; // Side-effect import
import { parseViewBox } from '../utils/svgUtils.js';
import { vec } from '../utils/geometryUtils.js'; // Although not directly used here, it was in the original file, keeping for potential future use or if renderMeasurementToSvg needs it implicitly.

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

  // --- PDF Rendering Helper (Using Direct Transforms) ---
  // Wrapped in useCallback to ensure stability if passed as dependency
  const renderViewToPdfSvg = useCallback((targetSvgGroup, viewData, viewTitle, position, dimensions, viewId) => {
    if (!viewData || !dimensions || !viewData.combinedViewBox) {
      console.warn(`Skipping render for view ${viewId || viewTitle} due to missing data.`);
      return;
    }
    const [x, y] = position;
    const { width: targetWidth, height: targetHeight } = dimensions; // Target area on PDF page (mm)

    const viewBoxData = parseViewBox(viewData.combinedViewBox);
    if (!viewBoxData || viewBoxData.width <= 0 || viewBoxData.height <= 0) {
      console.warn(`Skipping render for view ${viewId || viewTitle} due to invalid viewBox: ${viewData.combinedViewBox}`);
      return;
    }

    // Create a group for this whole view (title + content)
    const viewGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    viewGroup.setAttribute('transform', `translate(${x}, ${y})`);
    targetSvgGroup.appendChild(viewGroup);

    // --- Add View Title ---
    const viewTitleHeight = 5; // Height allocated for title (mm)
    const viewTitleFontSize = 3; // Font size (mm)
    const titleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleText.setAttribute('x', targetWidth / 2);
    titleText.setAttribute('y', viewTitleHeight / 2); // Center in title area
    titleText.setAttribute('font-size', viewTitleFontSize);
    titleText.setAttribute('font-family', 'Arial, sans-serif');
    titleText.setAttribute('text-anchor', 'middle');
    titleText.setAttribute('dominant-baseline', 'middle');
    titleText.setAttribute('fill', '#333333');
    titleText.textContent = viewTitle;
    viewGroup.appendChild(titleText);

    // --- Calculate Transformation ---
    const scaleX = targetWidth / viewBoxData.width;
    const scaleY = targetHeight / viewBoxData.height;
    const scale = Math.min(scaleX, scaleY); // Maintain aspect ratio

    // Calculate translation to center the scaled content
    const scaledContentWidth = viewBoxData.width * scale;
    const scaledContentHeight = viewBoxData.height * scale;
    const translateX = (targetWidth - scaledContentWidth) / 2 - viewBoxData.x * scale;
    const translateY = (targetHeight - scaledContentHeight) / 2 - viewBoxData.y * scale;

    // --- Create Content Group with Transform ---
    // This group holds the actual drawing paths and measurements
    const contentGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // Apply translation to position the content area below the title, then apply scaling and centering transform
    contentGroup.setAttribute('transform', `translate(0, ${viewTitleHeight}) translate(${translateX}, ${translateY}) scale(${scale})`);
    viewGroup.appendChild(contentGroup);

    // Add Border around the content area (positioned relative to viewGroup)
    const borderRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    borderRect.setAttribute('x', 0);
    borderRect.setAttribute('y', viewTitleHeight);
    borderRect.setAttribute('width', targetWidth);
    borderRect.setAttribute('height', targetHeight);
    borderRect.setAttribute('fill', 'none');
    borderRect.setAttribute('stroke', '#cccccc');
    borderRect.setAttribute('stroke-width', 0.2); // Use fixed stroke width in mm
    viewGroup.appendChild(borderRect);

    // --- Render Paths into Transformed Content Group ---
    // Adjust stroke width based on the calculated scale
    const strokeScale = scale > 0 ? 1 / scale : 1;

    // Hidden Paths
    (viewData.hidden?.paths || []).forEach(path => {
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', path.data);
      pathEl.setAttribute('stroke', '#777777');
      pathEl.setAttribute('stroke-width', 0.1); // Reduced thickness for PDF
      pathEl.setAttribute('stroke-linecap', 'round'); // Add linecap
      pathEl.setAttribute('stroke-linejoin', 'round'); // Add linejoin
      pathEl.setAttribute('stroke-dasharray', `${2 * strokeScale},${1 * strokeScale}`); // Keep scaling for dash pattern
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('vector-effect', 'non-scaling-stroke'); // Important for consistent stroke width on zoom
      contentGroup.appendChild(pathEl);
    });

    // Visible Paths
    (viewData.visible?.paths || []).forEach(path => {
      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', path.data);
      pathEl.setAttribute('stroke', '#000000');
      pathEl.setAttribute('stroke-width', 0.15); // Reduced thickness for PDF
      pathEl.setAttribute('stroke-linecap', 'round'); // Add linecap
      pathEl.setAttribute('stroke-linejoin', 'round'); // Add linejoin
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('vector-effect', 'non-scaling-stroke');
      contentGroup.appendChild(pathEl);
    });

    // --- Render Measurements into Transformed Content Group ---
    Object.values(activeMeasurements)
      .filter(m => m.viewId === viewId)
      .forEach(measurement => {
        // Find current geometry (lookup logic remains similar)
        const pathIdParts = measurement.pathId.split('_');
        const visibility = pathIdParts[pathIdParts.length - 3]; // visible or hidden
        const originalIdOrIndex = pathIdParts.slice(pathIdParts.length - 2).join('_'); // e.g., 0_0 or circle
        let currentPath = null;
        const pathsToCheck = visibility === 'visible' ? viewData.visible?.paths : viewData.hidden?.paths;

        if (pathsToCheck) {
           currentPath = pathsToCheck.find(p => {
              const pIdParts = `${p.id || ''}`.split('_');
              const pOriginalIdOrIndex = pIdParts.slice(pIdParts.length - 2).join('_');
              return pOriginalIdOrIndex === originalIdOrIndex || `${p.id}`.endsWith(`_${originalIdOrIndex}`);
           });
        }

        if (currentPath?.geometry) {
          const measurementSvgGroup = renderMeasurementToSvg(measurement, currentPath.geometry);
          // Measurements are rendered in the original coordinate system; the group transform handles scaling/positioning
          contentGroup.appendChild(measurementSvgGroup);
        } else {
           console.warn(`PDF Export (View: ${viewId}): Could not find geometry for measurement ${measurement.pathId}`);
        }
      });
  }, [activeMeasurements]); // Dependency: activeMeasurements


  // --- PDF Export Logic ---
  const exportPdf = useCallback(async () => {
    console.log("Starting PDF Export...");

    if (!projections || (!projections.standard && (!projections.parts || projections.parts.length === 0))) {
      console.error("No projection data available for PDF export.");
      alert("No drawing data found to export.");
      return;
    }

    // PDF Page Layout Constants (mm)
    const pdfScale = 1; // 1 SVG unit = 1 PDF unit (mm)
    const pageMargin = 10;
    const viewGap = 10;
    const mainTitleHeight = 8; // Space for main title (Part name or "Standard Views")
    const viewTitleHeight = 5; // Space for view name (Front, Top, Right) within its box
    const mainTitleFontSize = 4; // Font size (mm)
    const viewTitleFontSize = 3; // View name font size (mm)

    let pdf;
    let pdfFilename = 'technical-drawing.pdf';

    try {
      // --- Case 1: Standard Views (Single Part) ---
      if (projections.standard) {
        console.log("Exporting Standard Views (Single Page)...");
        pdfFilename = 'technical-drawing-standard.pdf';
        const standardViews = projections.standard;

        const frontView = standardViews.frontView;
        const topView = standardViews.topView;
        const rightView = standardViews.rightView;

        if (!frontView && !topView && !rightView) {
          throw new Error("Standard views data is missing.");
        }

        // Calculate layout for standard views
        let frontVB = frontView ? parseViewBox(frontView.combinedViewBox) : null;
        let topVB = topView ? parseViewBox(topView.combinedViewBox) : null;
        let rightVB = rightView ? parseViewBox(rightView.combinedViewBox) : null;

        let frontW = frontVB ? frontVB.width * pdfScale : 0;
        let frontH = frontVB ? frontVB.height * pdfScale : 0;
        let topW = topVB ? topVB.width * pdfScale : 0;
        let topH = topVB ? topVB.height * pdfScale : 0;
        let rightW = rightVB ? rightVB.width * pdfScale : 0;
        let rightH = rightVB ? rightVB.height * pdfScale : 0;

        const contentStartX = pageMargin;
        const contentStartY = pageMargin + mainTitleHeight;

        // Calculate positions including the view title height
        const frontPos = [contentStartX, contentStartY];
        const topPos = [contentStartX + (frontW - topW) / 2, contentStartY + frontH + viewTitleHeight + viewGap];
        const rightPos = [contentStartX + frontW + viewTitleHeight + viewGap, contentStartY + (frontH - rightH) / 2];

        // Calculate required page dimensions
        const pageContentWidth = Math.max(frontW, topW, rightPos[0] + rightW - contentStartX);
        const pageContentHeight = Math.max(frontH + viewTitleHeight, topPos[1] + topH + viewTitleHeight - contentStartY, rightH + viewTitleHeight + (frontH - rightH) / 2);
        const totalPageWidth = pageContentWidth + 2 * pageMargin;
        const totalPageHeight = pageContentHeight + mainTitleHeight + 2 * pageMargin;

        // Initialize PDF
        const orientation = totalPageWidth > totalPageHeight ? 'l' : 'p';
        pdf = new jsPDF({ orientation, unit: 'mm', format: [totalPageWidth, totalPageHeight] });

        // Create Temporary SVG for the page
        const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        tempSvg.setAttribute('width', totalPageWidth);
        tempSvg.setAttribute('height', totalPageHeight);
        tempSvg.setAttribute('viewBox', `0 0 ${totalPageWidth} ${totalPageHeight}`);
        const svgPageGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        tempSvg.appendChild(svgPageGroup);

        // Add Main Title
        const mainTitleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        mainTitleText.setAttribute('x', totalPageWidth / 2);
        mainTitleText.setAttribute('y', pageMargin + mainTitleHeight / 2);
        mainTitleText.setAttribute('font-size', mainTitleFontSize);
        mainTitleText.setAttribute('font-family', 'Arial, sans-serif');
        mainTitleText.setAttribute('text-anchor', 'middle');
        mainTitleText.setAttribute('dominant-baseline', 'middle');
        mainTitleText.setAttribute('fill', '#000000');
        mainTitleText.setAttribute('font-weight', 'bold');
        mainTitleText.textContent = "Standard Views"; // Or potentially a model name if available
        svgPageGroup.appendChild(mainTitleText);

        // Render views using the helper
        const stdFrontId = "standard_front";
        const stdTopId = "standard_top";
        const stdRightId = "standard_right";
        if (frontView && frontVB) renderViewToPdfSvg(svgPageGroup, frontView, "Front View", frontPos, { width: frontW, height: frontH }, stdFrontId);
        if (topView && topVB) renderViewToPdfSvg(svgPageGroup, topView, "Top View", topPos, { width: topW, height: topH }, stdTopId);
        if (rightView && rightVB) renderViewToPdfSvg(svgPageGroup, rightView, "Right View", rightPos, { width: rightW, height: rightH }, stdRightId);

        // Add SVG element to PDF (Reverted to await + element)
        console.log("Attempting to add single page SVG element to PDF:", tempSvg);
        try {
            await pdf.svg(tempSvg, { x: 0, y: 0, width: totalPageWidth, height: totalPageHeight });
            console.log("Successfully added single page SVG element.");
        } catch (svgError) {
            console.error("Error adding single page SVG element:", svgError);
            throw svgError; // Re-throw error to be caught by outer try-catch
        }

      }
      // --- Case 2: Part Views (Assembly) ---
      else if (projections.parts && projections.parts.length > 0) {
        console.log("Exporting Part Views (Multi-Page)...");
        pdfFilename = 'technical-drawing-parts.pdf';

        // Initialize PDF with first page's settings (calculate first page dimensions outside loop)
        let firstPartIndex = projections.parts.findIndex(part => part.views?.front || part.views?.top || part.views?.right);
        if (firstPartIndex === -1) {
            throw new Error("No parts with valid views found for PDF export.");
        }
        const firstPart = projections.parts[firstPartIndex];
        const fpFrontView = firstPart.views?.front;
        const fpTopView = firstPart.views?.top;
        const fpRightView = firstPart.views?.right;
        let fpFrontVB = fpFrontView ? parseViewBox(fpFrontView.combinedViewBox) : null;
        let fpTopVB = fpTopView ? parseViewBox(fpTopView.combinedViewBox) : null;
        let fpRightVB = fpRightView ? parseViewBox(fpRightView.combinedViewBox) : null;
        let fpFrontW = fpFrontVB ? fpFrontVB.width * pdfScale : 0;
        let fpFrontH = fpFrontVB ? fpFrontVB.height * pdfScale : 0;
        let fpTopW = fpTopVB ? fpTopVB.width * pdfScale : 0;
        let fpTopH = fpTopVB ? fpTopVB.height * pdfScale : 0;
        let fpRightW = fpRightVB ? fpRightVB.width * pdfScale : 0;
        let fpRightH = fpRightVB ? fpRightVB.height * pdfScale : 0;
        const fpContentStartX = pageMargin;
        const fpContentStartY = pageMargin + mainTitleHeight;
        const fpRightPosCalcX = fpContentStartX + fpFrontW + viewTitleHeight + viewGap; // Calculate X pos of right view relative to start
        const fpPageContentWidth = Math.max(fpFrontW, fpTopW, fpRightPosCalcX + fpRightW - fpContentStartX);
        const fpTopPosCalcY = fpContentStartY + fpFrontH + viewTitleHeight + viewGap; // Calculate Y pos of top view relative to start
        const fpPageContentHeight = Math.max(fpFrontH + viewTitleHeight, fpTopPosCalcY + fpTopH - fpContentStartY, fpRightH + viewTitleHeight + (fpFrontH - fpRightH) / 2);
        const fpTotalPageWidth = fpPageContentWidth + 2 * pageMargin;
        const fpTotalPageHeight = fpPageContentHeight + mainTitleHeight + 2 * pageMargin;
        const fpOrientation = fpTotalPageWidth > fpTotalPageHeight ? 'l' : 'p';
        const fpFormat = [fpTotalPageWidth, fpTotalPageHeight];

        pdf = new jsPDF({ orientation: fpOrientation, unit: 'mm', format: fpFormat });

        // Loop through parts asynchronously to generate and add pages
        for (const [index, part] of projections.parts.entries()) { // Use for...of for async/await
          // Skip check if firstPartIndex logic already handled initialization correctly
          // We need the index relative to the original array if parts were skipped
          const originalIndex = projections.parts.indexOf(part);

          console.log(`Processing Part ${originalIndex + 1}: ${part.name}`);

          const frontView = part.views?.front;
          const topView = part.views?.top;
          const rightView = part.views?.right;

          if (!frontView && !topView && !rightView) {
            console.warn(`Skipping part ${part.name} as it has no standard views.`);
            continue; // Skip this part using continue in for...of
          }

          // Calculate layout for this part's page
          let frontVB = frontView ? parseViewBox(frontView.combinedViewBox) : null;
          let topVB = topView ? parseViewBox(topView.combinedViewBox) : null;
          let rightVB = rightView ? parseViewBox(rightView.combinedViewBox) : null;

          let frontW = frontVB ? frontVB.width * pdfScale : 0;
          let frontH = frontVB ? frontVB.height * pdfScale : 0;
          let topW = topVB ? topVB.width * pdfScale : 0;
          let topH = topVB ? topVB.height * pdfScale : 0;
          let rightW = rightVB ? rightVB.width * pdfScale : 0;
          let rightH = rightVB ? rightVB.height * pdfScale : 0;

          const contentStartX = pageMargin;
          const contentStartY = pageMargin + mainTitleHeight;
          const frontPos = [contentStartX, contentStartY];
          const topPos = [contentStartX + (frontW - topW) / 2, contentStartY + frontH + viewTitleHeight + viewGap];
          const rightPos = [contentStartX + frontW + viewTitleHeight + viewGap, contentStartY + (frontH - rightH) / 2];

          const pageContentWidth = Math.max(frontW, topW, rightPos[0] + rightW - contentStartX);
          const pageContentHeight = Math.max(frontH + viewTitleHeight, topPos[1] + topH + viewTitleHeight - contentStartY, rightH + viewTitleHeight + (frontH - rightH) / 2);
          const totalPageWidth = pageContentWidth + 2 * pageMargin;
          const totalPageHeight = pageContentHeight + mainTitleHeight + 2 * pageMargin;

          const orientation = totalPageWidth > totalPageHeight ? 'l' : 'p';
          const format = [totalPageWidth, totalPageHeight];

          // Add new page if it's not the first part
          if (index > firstPartIndex) { // Use the found index of the first valid part
             console.log(`Adding Page ${index + 1} to PDF`);
             pdf.addPage(format, orientation);
          } else if (index === firstPartIndex && index > 0) {
             // This handles the case where initial parts were skipped,
             // ensuring the first *valid* part uses the pre-calculated format/orientation
             // but doesn't call addPage if it's truly the first page being added.
             console.log(`Processing first valid part (index ${index + 1}) for PDF`);
          }


          // Create Temporary SVG for this page
          const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          tempSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          tempSvg.setAttribute('width', totalPageWidth);
          tempSvg.setAttribute('height', totalPageHeight);
          tempSvg.setAttribute('viewBox', `0 0 ${totalPageWidth} ${totalPageHeight}`);
          const svgPageGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
          tempSvg.appendChild(svgPageGroup);

          // Add Part Name Title
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

          // Render views using the helper
          const partIdBase = part.name.replace(/\s+/g, '_');
          const frontId = `${partIdBase}_front`;
          const topId = `${partIdBase}_top`;
          const rightId = `${partIdBase}_right`;

          if (frontView && frontVB) renderViewToPdfSvg(svgPageGroup, frontView, "Front View", frontPos, { width: frontW, height: frontH }, frontId);
          if (topView && topVB) renderViewToPdfSvg(svgPageGroup, topView, "Top View", topPos, { width: topW, height: topH }, topId);
          if (rightView && rightVB) renderViewToPdfSvg(svgPageGroup, rightView, "Right View", rightPos, { width: rightW, height: rightH }, rightId);

          // Add SVG element to PDF page (with await)
          console.log(`Adding SVG element for page ${originalIndex + 1} (${part.name}) to PDF:`, tempSvg);
          await pdf.svg(tempSvg, { x: 0, y: 0, width: totalPageWidth, height: totalPageHeight });
          console.log(`Finished adding SVG for page ${originalIndex + 1}`);

        } // End for...of loop
      }

      // --- Save the PDF ---
      if (pdf) {
        pdf.save(pdfFilename);
        console.log("PDF Export Successful:", pdfFilename);
      } else {
         console.warn("PDF object not initialized (likely no valid parts/views found). No export occurred.");
         alert("Could not generate PDF: No valid views found.");
      }

    } catch (error) {
      console.error("Error during PDF generation:", error);
      alert(`Failed to export PDF: ${error.message}. See console for details.`);
    }

  }, [projections, activeMeasurements, renderViewToPdfSvg]); // Dependencies

  return { exportPdf };
}
