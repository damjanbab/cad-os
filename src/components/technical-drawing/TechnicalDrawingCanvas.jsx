import React, { useEffect, useRef, useState, useCallback } from 'react';
import { jsPDF } from "jspdf"; // Import jsPDF
import 'svg2pdf.js'; // Revert to side-effect import
import ProjectionView from './ProjectionView.jsx';
import PartView from './PartView.jsx';
import DrawingControls from './DrawingControls.jsx';
import { parseViewBox } from '../../utils/svgUtils.js'; // Import utility
import { vec } from '../../utils/geometryUtils.js'; // Import vector utils for measurements

// --- Helper Function for Measurement SVG Rendering ---
// Replicates MeasurementDisplay logic but creates SVG elements directly
const renderMeasurementToSvg = (measurementData, geometry) => {
  const { pathId, type, textPosition } = measurementData;
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');

  // Styles (match MeasurementDisplay)
  const strokeColor = "#222222";
  const strokeWidth = 0.15;
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

    // Create SVG elements
    group.appendChild(createSvgElement('line', { x1: extLineP1Start[0], y1: extLineP1Start[1], x2: extLineP1End[0], y2: extLineP1End[1], stroke: strokeColor, 'stroke-width': strokeWidth }));
    group.appendChild(createSvgElement('line', { x1: extLineP2Start[0], y1: extLineP2Start[1], x2: extLineP2End[0], y2: extLineP2End[1], stroke: strokeColor, 'stroke-width': strokeWidth }));
    if (showDimLine1) group.appendChild(createSvgElement('line', { x1: dimLineP1[0], y1: dimLineP1[1], x2: dimLine1End[0], y2: dimLine1End[1], stroke: strokeColor, 'stroke-width': strokeWidth }));
    if (showDimLine2) group.appendChild(createSvgElement('line', { x1: dimLine2Start[0], y1: dimLine2Start[1], x2: dimLineP2[0], y2: dimLineP2[1], stroke: strokeColor, 'stroke-width': strokeWidth }));
    group.appendChild(createSvgElement('path', { d: arrow1, fill: strokeColor, stroke: 'none' }));
    group.appendChild(createSvgElement('path', { d: arrow2, fill: strokeColor, stroke: 'none' }));
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

    group.appendChild(createSvgElement('line', { x1: leaderStart[0], y1: leaderStart[1], x2: leaderEnd[0], y2: leaderEnd[1], stroke: strokeColor, 'stroke-width': strokeWidth }));
    const textEl = createSvgElement('text', { x: textPosition.x, y: textPosition.y, 'font-size': fontSize, fill: strokeColor, stroke: 'none', 'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'Arial, sans-serif' });
    textEl.textContent = textContent;
    group.appendChild(textEl);
  }

  return group;
};


// Main canvas component for technical drawings
export default function TechnicalDrawingCanvas({ projections, isMobile }) {
  if (!projections) return <div>Loading projections...</div>;

  const containerRef = useRef(null); // Ref for the main container div
  const viewContainerRef = useRef(null); // Ref for the zoomable/pannable content area
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(10); // Initial scale: 10 pixels per cm
  // State for active measurements, keyed by uniquePathId
  const [activeMeasurements, setActiveMeasurements] = useState({});

  // For tracking mouse position and dragging (for panning)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });


  // --- PDF Export Logic ---
  const handleExportPDF = useCallback(async () => {
    console.log("Starting PDF Export...");
    if (!projections) {
      console.error("Projections data not available for PDF export.");
      return;
    }

    // Use a fixed scale for PDF export for consistency (e.g., 1 unit = 1 mm)
    const pdfScale = 1; // 1 SVG unit = 1 PDF unit (mm by default in jsPDF)
    const pdfLayoutGap = 5; // Gap in PDF units (mm)
    const pdfInitialOffsetX = 10; // Margin in PDF units (mm)
    const pdfInitialOffsetY = 10; // Margin in PDF units (mm)
    const titleHeight = 5; // Title height in PDF units (mm)
    const titleFontSize = 3; // Title font size in PDF units (mm)
    const partTitleFontSize = 2.5; // Part title font size (mm)
    const partSpacing = 5; // Spacing between part views (mm)

    // Helper to create SVG elements
    const createSvgElement = (tag, attributes) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const key in attributes) {
        el.setAttribute(key, attributes[key]);
      }
      return el;
    };

    // --- Create Temporary SVG ---
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const svgContentGroup = createSvgElement('g'); // Group for all content
    tempSvg.appendChild(svgContentGroup);

    let overallWidth = 0;
    let overallHeight = 0;

    // --- Populate SVG with Standard Views ---
    const standardViews = projections.standard;
    let stdFrontViewData, stdTopViewData, stdRightViewData;
    let stdFrontWidth = 0, stdFrontHeight = 0;
    let stdTopWidth = 0, stdTopHeight = 0;
    let stdRightWidth = 0, stdRightHeight = 0;

    if (standardViews) {
      stdFrontViewData = standardViews.frontView ? parseViewBox(standardViews.frontView.combinedViewBox) : null;
      stdTopViewData = standardViews.topView ? parseViewBox(standardViews.topView.combinedViewBox) : null;
      stdRightViewData = standardViews.rightView ? parseViewBox(standardViews.rightView.combinedViewBox) : null;

      if (stdFrontViewData) { stdFrontWidth = stdFrontViewData.width * pdfScale; stdFrontHeight = stdFrontViewData.height * pdfScale; }
      if (stdTopViewData) { stdTopWidth = stdTopViewData.width * pdfScale; stdTopHeight = stdTopViewData.height * pdfScale; }
      if (stdRightViewData) { stdRightWidth = stdRightViewData.width * pdfScale; stdRightHeight = stdRightViewData.height * pdfScale; }
    }

    const stdFrontPos = [pdfInitialOffsetX, pdfInitialOffsetY];
    const stdTopPos = [pdfInitialOffsetX + (stdFrontWidth - stdTopWidth) / 2, pdfInitialOffsetY + stdFrontHeight + pdfLayoutGap];
    const stdRightPos = [pdfInitialOffsetX + stdFrontWidth + pdfLayoutGap, pdfInitialOffsetY + (stdFrontHeight - stdRightHeight) / 2];

    const renderViewToSvg = (viewData, title, position, dimensions, viewId, isPart = false) => {
      if (!viewData || !dimensions) return;
      const [x, y] = position;
      const { width, height } = dimensions;

      const viewGroup = createSvgElement('g', { transform: `translate(${x}, ${y})` });
      svgContentGroup.appendChild(viewGroup);

      // Add Title
      const titleText = createSvgElement('text', {
        x: width / 2,
        y: titleHeight / 2, // Center vertically in title area
        'font-size': isPart ? partTitleFontSize : titleFontSize,
        'font-family': 'Arial, sans-serif',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        fill: '#000000'
      });
      titleText.textContent = title;
      viewGroup.appendChild(titleText);

      // Add Border for the view content area
      viewGroup.appendChild(createSvgElement('rect', {
         x: 0, y: titleHeight, width: width, height: height,
         fill: 'none', stroke: '#aaaaaa', 'stroke-width': 0.2
      }));

      // Parse the viewbox to get the offset needed for centering
      const viewBoxData = parseViewBox(viewData.combinedViewBox);
      const offsetX = viewBoxData ? -viewBoxData.x * pdfScale : 0;
      const offsetY = viewBoxData ? -viewBoxData.y * pdfScale : 0;

      // Group for the actual drawing content, offset by title height AND viewbox offset
      const contentGroup = createSvgElement('g', {
        transform: `translate(0, ${titleHeight}) translate(${offsetX}, ${offsetY})`
      });
      viewGroup.appendChild(contentGroup);


      // Add Paths (Hidden first)
      (viewData.hidden?.paths || []).forEach(path => {
        contentGroup.appendChild(createSvgElement('path', {
          d: path.data,
          stroke: '#777777',
          'stroke-width': 0.3 / pdfScale, // Adjust stroke width based on PDF scale
          'stroke-dasharray': `${2 / pdfScale},${1 / pdfScale}`,
          fill: 'none',
          'vector-effect': 'non-scaling-stroke' // Keep this for potential PDF interpretation
        }));
      });

      // Add Paths (Visible)
      (viewData.visible?.paths || []).forEach(path => {
        contentGroup.appendChild(createSvgElement('path', {
          d: path.data,
          stroke: '#000000',
          'stroke-width': 0.5 / pdfScale, // Adjust stroke width
          fill: 'none',
          'vector-effect': 'non-scaling-stroke'
        }));
      });

      // Add Measurements
      Object.values(activeMeasurements)
        .filter(m => m.viewId === viewId)
        .forEach(measurement => {
          // Find current geometry (similar logic to ProjectionView)
          const pathIdParts = measurement.pathId.split('_');
          const visibility = pathIdParts[pathIdParts.length - 3];
          const originalIdOrIndex = pathIdParts.slice(pathIdParts.length - 2).join('_');
          let currentPath = null;
          const pathsToCheck = visibility === 'visible' ? viewData.visible?.paths : viewData.hidden?.paths;
          if (pathsToCheck) {
             currentPath = pathsToCheck.find(p => {
                const pIdParts = `${p.id || ''}`.split('_');
                const pOriginalIdOrIndex = pIdParts.slice(pIdParts.length - 2).join('_');
                return pOriginalIdOrIndex === originalIdOrIndex || `${p.id}` === originalIdOrIndex;
             });
             // Fallback logic omitted for brevity in PDF export, assuming IDs are reliable
          }

          if (currentPath?.geometry) {
            const measurementSvgGroup = renderMeasurementToSvg(measurement, currentPath.geometry);
            // Apply scaling to measurement group if needed, or adjust renderMeasurementToSvg
            // For now, assume renderMeasurementToSvg uses geometry units directly
            contentGroup.appendChild(measurementSvgGroup);
          } else {
             console.warn(`PDF Export: Could not find geometry for measurement ${measurement.pathId}`);
          }
        });

        // Update overall bounds
        overallWidth = Math.max(overallWidth, x + width);
        overallHeight = Math.max(overallHeight, y + height + titleHeight);
    };

    if (standardViews) {
      if (standardViews.frontView && stdFrontViewData) renderViewToSvg(standardViews.frontView, "Front View", stdFrontPos, { width: stdFrontWidth, height: stdFrontHeight }, standardFrontViewId);
      if (standardViews.topView && stdTopViewData) renderViewToSvg(standardViews.topView, "Top View", stdTopPos, { width: stdTopWidth, height: stdTopHeight }, standardTopViewId);
      if (standardViews.rightView && stdRightViewData) renderViewToSvg(standardViews.rightView, "Right View", stdRightPos, { width: stdRightWidth, height: stdRightHeight }, standardRightViewId);
    }

    // --- Populate SVG with Part Views ---
    let currentPartX = pdfInitialOffsetX;
    let currentPartY = pdfInitialOffsetY + (stdFrontHeight || 0) + (stdTopHeight ? stdTopHeight + pdfLayoutGap : 0) + pdfLayoutGap * 2;
    let maxPartRowHeight = 0;

    if (projections.parts && projections.parts.length > 0) {
       // Add "Component Views" Title
       const partsTitle = createSvgElement('text', {
         x: pdfInitialOffsetX,
         y: currentPartY - pdfLayoutGap / 2, // Position above the parts row
         'font-size': titleFontSize,
         'font-family': 'Arial, sans-serif',
         'text-anchor': 'start',
         'dominant-baseline': 'middle',
         fill: '#000000',
         'font-weight': 'bold'
       });
       partsTitle.textContent = "Component Views";
       svgContentGroup.appendChild(partsTitle);

      projections.parts.forEach((part, index) => {
        // Assume only front view for parts for simplicity, or adapt layout
        const partViewData = part.views?.front;
        if (!partViewData) return;

        const partViewBox = parseViewBox(partViewData.combinedViewBox);
        if (!partViewBox) return;

        const partWidth = partViewBox.width * pdfScale;
        const partHeight = partViewBox.height * pdfScale;
        const partId = `${part.name.replace(/\s+/g, '_')}_front`; // Construct viewId

        // Simple horizontal layout for parts
        const partPos = [currentPartX, currentPartY];
        renderViewToSvg(partViewData, part.name, partPos, { width: partWidth, height: partHeight }, partId, true);

        currentPartX += partWidth + partSpacing;
        maxPartRowHeight = Math.max(maxPartRowHeight, partHeight + titleHeight);
      });
       overallHeight = Math.max(overallHeight, currentPartY + maxPartRowHeight);
       overallWidth = Math.max(overallWidth, currentPartX - partSpacing); // Adjust width based on last part
    }

    // Add some padding to overall dimensions
    overallWidth += pdfInitialOffsetX;
    overallHeight += pdfInitialOffsetY;

    // Set SVG attributes
    tempSvg.setAttribute('width', overallWidth); // Width in mm
    tempSvg.setAttribute('height', overallHeight); // Height in mm
    tempSvg.setAttribute('viewBox', `0 0 ${overallWidth} ${overallHeight}`);

    // --- Generate PDF ---
    try {
      const pdf = new jsPDF({
        orientation: overallWidth > overallHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [overallWidth, overallHeight] // Use calculated size for PDF page
      });

      // Try using pdf.svg() method (jsPDF plugin pattern)
      await pdf.svg(tempSvg, {
        x: 0, // Position SVG at top-left of PDF page
        y: 0,
        width: overallWidth, // Use calculated SVG width
        height: overallHeight // Use calculated SVG height
      });

      pdf.save('technical-drawing.pdf');
      console.log("PDF Export Successful.");

    } catch (error) {
      console.error("Error during PDF generation:", error);
      alert("Failed to export PDF. See console for details.");
    }

  }, [projections, scale, activeMeasurements]); // Dependencies for the export logic


  // Handler to update measurement text position (passed to MeasurementDisplay via children)
  const handleMeasurementUpdate = (pathId, newPosition) => {
    setActiveMeasurements(prev => ({
      ...prev,
      [pathId]: {
        ...prev[pathId],
        textPosition: newPosition,
      }
    }));
  };

  // Handle path click - toggle measurement display
  const handlePathClick = (uniquePathId, path) => {
    // Only allow measurements for lines and circles with valid geometry
    if (!path.geometry || (path.geometry.type !== 'line' && path.geometry.type !== 'circle')) {
      console.log(`Clicked non-measurable path: ${uniquePathId}, Type: ${path.geometry?.type}`);
      return;
    }

    setActiveMeasurements(prevMeasurements => {
      const newMeasurements = { ...prevMeasurements };

      if (newMeasurements[uniquePathId]) {
        // Measurement exists, remove it
        delete newMeasurements[uniquePathId];
        console.log(`Removed Measurement: ${uniquePathId}`);
      } else {
        // Measurement doesn't exist, add it
        // Calculate initial text position based on geometry
        const initialTextPosition = { x: 0, y: 0 }; // Placeholder
        if (path.geometry.type === 'line' && path.geometry.endpoints) {
          const [x1, y1] = path.geometry.endpoints[0];
          const [x2, y2] = path.geometry.endpoints[1];
          initialTextPosition.x = (x1 + x2) / 2;
          initialTextPosition.y = (y1 + y2) / 2 - 5; // Offset slightly above midpoint
        } else if (path.geometry.type === 'circle' && path.geometry.center) {
          initialTextPosition.x = path.geometry.center[0];
          initialTextPosition.y = path.geometry.center[1]; // Place inside initially
        }

        // Extract viewId from uniquePathId (e.g., "standard_front_visible_0_0" -> "standard_front")
        // Find the last occurrence of _visible_ or _hidden_ and take the part before it
        let viewId = uniquePathId;
        const visibleIndex = uniquePathId.lastIndexOf('_visible_');
        const hiddenIndex = uniquePathId.lastIndexOf('_hidden_');

        if (visibleIndex !== -1) {
          viewId = uniquePathId.substring(0, visibleIndex);
        } else if (hiddenIndex !== -1) {
          viewId = uniquePathId.substring(0, hiddenIndex);
        }
        // If neither is found, it might be a circle ID like 'prefix_index_circle', keep the prefix part
        else if (uniquePathId.endsWith('_circle')) {
           const circleParts = uniquePathId.split('_');
           viewId = circleParts.slice(0, -2).join('_'); // Remove index and 'circle'
        }
        // Fallback: if the format is unexpected, use the full ID (less ideal)
        else {
            console.warn(`Could not reliably extract viewId from pathId: ${uniquePathId}`);
        }


        newMeasurements[uniquePathId] = {
          pathId: uniquePathId, // This is the full, unique path segment ID
          type: path.geometry.type,
          // geometry: path.geometry, // REMOVED: Geometry will be looked up dynamically
          textPosition: initialTextPosition,
          viewId: viewId,
        };
        console.log(`--- Added Measurement ---`);
        console.log(`  ID: ${uniquePathId}`);
        console.log(`  Type: ${path.geometry.type}`);
        // console.log(`  Geometry:`, path.geometry); // REMOVED
        console.log(`  Initial Text Pos:`, initialTextPosition);
        console.log(`  View ID: ${newMeasurements[uniquePathId].viewId}`);
        console.log(`------------------------`);
      }

      return newMeasurements;
    });
  };

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Mouse wheel zoom that zooms to cursor position
  const handleWheel = (e) => {
    e.preventDefault();
    if (!containerRef.current) return;

    // Get container bounds
    const rect = containerRef.current.getBoundingClientRect();

    // Calculate cursor position relative to the container
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Get cursor position relative to content (accounting for current pan/zoom)
    const cursorXInContent = (x - panOffset.x) / zoomLevel;
    const cursorYInContent = (y - panOffset.y) / zoomLevel;

    // Calculate zoom delta and new zoom level
    const delta = -Math.sign(e.deltaY) * 0.1;
    const newZoom = Math.max(0.1, Math.min(10, zoomLevel + delta * zoomLevel));

    // Calculate new pan offset to keep cursor point stationary
    const newPanOffsetX = x - cursorXInContent * newZoom;
    const newPanOffsetY = y - cursorYInContent * newZoom;

    // Update state
    setZoomLevel(newZoom);
    setPanOffset({ x: newPanOffsetX, y: newPanOffsetY });
  };

  // Mouse handlers for panning
  const handleMouseDown = (e) => {
    // Prevent pan if clicking on a measurement text (handled by MeasurementDisplay)
    if (e.target.closest('text[style*="cursor: move"]')) {
        return;
    }
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartOffset({ ...panOffset });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPanOffset({
      x: dragStartOffset.x + dx,
      y: dragStartOffset.y + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile panning
  const handleTouchStart = (e) => {
    // Prevent pan if touching a measurement text
    if (e.target.closest('text[style*="cursor: move"]')) {
        return;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setDragStartOffset({ ...panOffset });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.x;
    const dy = touch.clientY - dragStart.y;
    setPanOffset({
      x: dragStartOffset.x + dx,
      y: dragStartOffset.y + dy
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Reset zoom and pan
  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setActiveMeasurements({}); // Reset measurements
  };

  // --- Layout Calculation ---
  const standardViews = projections.standard;
  let frontViewData, topViewData, rightViewData;
  let frontWidth = 0, frontHeight = 0;
  let topWidth = 0, topHeight = 0;
  let rightWidth = 0, rightHeight = 0;
  const layoutGap = 20; // Gap between views in pixels

  // Create unique view IDs for standard views
  const standardFrontViewId = "standard_front";
  const standardTopViewId = "standard_top";
  const standardRightViewId = "standard_right";

  if (standardViews) {
    frontViewData = standardViews.frontView ? parseViewBox(standardViews.frontView.combinedViewBox) : null;
    topViewData = standardViews.topView ? parseViewBox(standardViews.topView.combinedViewBox) : null;
    rightViewData = standardViews.rightView ? parseViewBox(standardViews.rightView.combinedViewBox) : null;

    if (frontViewData) {
      frontWidth = frontViewData.width * scale;
      frontHeight = frontViewData.height * scale;
    }
    if (topViewData) {
      topWidth = topViewData.width * scale;
      topHeight = topViewData.height * scale;
    }
    if (rightViewData) {
      rightWidth = rightViewData.width * scale;
      rightHeight = rightViewData.height * scale;
    }
  }

  // Calculate positions according to standard engineering drawing layout
  const initialOffsetX = 50;
  const initialOffsetY = 50; // Start with front view at top

  const frontPos = [initialOffsetX, initialOffsetY]; // Front view at top
  const topPos = [initialOffsetX + (frontWidth - topWidth) / 2, initialOffsetY + frontHeight + layoutGap]; // Top view below front view
  const rightPos = [initialOffsetX + frontWidth + layoutGap, initialOffsetY + (frontHeight - rightHeight) / 2]; // Right view to the right of front

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#e0e0e0',
        overflow: 'hidden',
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none' // Prevent default touch actions like scrolling
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Controls Overlay */}
      <DrawingControls
        isMobile={isMobile}
        zoomLevel={zoomLevel}
        scale={scale}
        containerSize={containerSize}
        panOffset={panOffset}
        onZoomChange={setZoomLevel}
        onPanChange={setPanOffset}
        onScaleChange={setScale}
        onResetView={resetView}
        onExportPDF={handleExportPDF} // Pass the export handler
      />

      {/* Content Area with Pan/Zoom transform */}
      <div
        ref={viewContainerRef} // Add ref to the zoomable/pannable container
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%', // Should cover the whole area for panning
          height: '100%',
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Standard Projections */}
        {standardViews && (
          <>
            {/* Front View */}
            {standardViews.frontView && frontViewData && (
              <ProjectionView
                projection={standardViews.frontView}
                title="Front View"
                position={frontPos}
                dimensions={{ width: frontWidth, height: frontHeight }}
                onPathClick={handlePathClick}
                viewId={standardFrontViewId}
                activeMeasurements={activeMeasurements}
                onMeasurementUpdate={handleMeasurementUpdate}
              />
            )}

            {/* Top View */}
            {standardViews.topView && topViewData && (
              <ProjectionView
                projection={standardViews.topView}
                title="Top View"
                position={topPos}
                dimensions={{ width: topWidth, height: topHeight }}
                onPathClick={handlePathClick}
                viewId={standardTopViewId}
                activeMeasurements={activeMeasurements}
                onMeasurementUpdate={handleMeasurementUpdate}
              />
            )}

            {/* Right View */}
            {standardViews.rightView && rightViewData && (
              <ProjectionView
                projection={standardViews.rightView}
                title="Right View"
                position={rightPos}
                dimensions={{ width: rightWidth, height: rightHeight }}
                onPathClick={handlePathClick}
                viewId={standardRightViewId}
                activeMeasurements={activeMeasurements}
                onMeasurementUpdate={handleMeasurementUpdate}
              />
            )}
          </>
        )}

        {/* Part Projections - position below the standard views */}
        {projections.parts && projections.parts.length > 0 && (
          <div style={{
            position: 'absolute', // Position relative to the zoom/pan container
            // Calculate top based on standard view layout height
            top: `${initialOffsetY + frontHeight + (topViewData ? topHeight + layoutGap : 0) + layoutGap * 2}px`,
            left: `${initialOffsetX}px`,
            width: 'max-content' // Allow container to grow with parts
          }}>
            <h3 style={{ padding: '0 0 5px 0', margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
              Component Views
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {projections.parts.map((part, index) => (
                <PartView
                  key={index}
                  part={part}
                  index={index}
                  scale={scale}
                  onPathClick={handlePathClick}
                  activeMeasurements={activeMeasurements}
                  onMeasurementUpdate={handleMeasurementUpdate}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
