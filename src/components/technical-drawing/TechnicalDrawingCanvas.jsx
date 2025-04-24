import React, { useEffect, useRef, useState, useCallback } from 'react';
import ProjectionView from './ProjectionView.jsx';
import PartView from './PartView.jsx';
import DrawingControls from './DrawingControls.jsx';
import { parseViewBox } from '../../utils/svgUtils.js'; // Import utility
import { useTechnicalDrawingPdfExport } from '../../hooks/useTechnicalDrawingPdfExport.js'; // Import PDF hook
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction.js'; // Import Interaction hook

// Main canvas component for technical drawings
export default function TechnicalDrawingCanvas({ projections, isMobile }) {
  if (!projections) return <div>Loading projections...</div>;

  const containerRef = useRef(null); // Ref for the main container div
  const viewContainerRef = useRef(null); // Ref for the zoomable/pannable content area
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(10); // Initial scale: 10 pixels per cm
  // State for active measurements, keyed by uniquePathId
  const [activeMeasurements, setActiveMeasurements] = useState({});

  // --- Use Hooks ---
  const { exportPdf } = useTechnicalDrawingPdfExport(projections, activeMeasurements);
  const {
    zoomLevel,
    panOffset,
    isDragging,
    interactionHandlers,
    resetInteraction,
    setZoomLevel, // Expose setters if needed by controls
    setPanOffset,
  } = useCanvasInteraction(containerRef);


  // Handler to update measurement text position (passed to MeasurementDisplay via children)
  const handleMeasurementUpdate = useCallback((pathId, newPosition) => {
    setActiveMeasurements(prev => ({
      ...prev,
      [pathId]: {
        ...prev[pathId],
        textPosition: newPosition,
      }
    }));
  }, []); // Add empty dependency array

  // Handle path click - toggle measurement display
  // Add partName and partIndex to receive context from PathElement
  const handlePathClick = useCallback((uniquePathId, path, partName, partIndex) => {
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

        // Determine the correct viewId for the measurement state
        let measurementViewId;
        // The viewId is implicitly passed via the uniquePathId structure
        // (e.g., PartName_front_visible_...) or explicitly for standard layout.
        // We need to extract the view part (e.g., PartName_front or standard_layout)
        const parts = uniquePathId.split('_');
        if (uniquePathId.startsWith('standard_')) {
            measurementViewId = "standard_layout";
            console.log(`[INFO] Clicked path ${uniquePathId} belongs to Standard Layout: ${measurementViewId}`);
        } else if (parts.length >= 4) { // Expecting at least PartName_viewName_visibility_type_id
            // Reconstruct the specific view ID (e.g., PartName_front)
            measurementViewId = parts.slice(0, parts.length - 3).join('_');
            console.log(`[INFO] Clicked path ${uniquePathId} belongs to Part View: ${measurementViewId}`);
        } else {
            // Fallback or unexpected format
            measurementViewId = uniquePathId; // Less ideal, use full ID
            console.warn(`[WARN] Could not reliably extract viewId from pathId: ${uniquePathId}. Using full ID.`);
        }


        newMeasurements[uniquePathId] = {
          pathId: uniquePathId, // This is the full, unique path segment ID
          type: path.geometry.type,
          textPosition: initialTextPosition,
          viewId: measurementViewId, // Store the determined view ID
        };
        console.log(`--- Added Measurement ---`);
        console.log(`  ID: ${uniquePathId}`);
        console.log(`  Type: ${path.geometry.type}`);
        console.log(`  Initial Text Pos:`, initialTextPosition);
        console.log(`  Stored View ID: ${measurementViewId}`); // Log the stored view ID
        console.log(`------------------------`);
      }

      return newMeasurements;
    });
  }, []); // Ensure correct syntax for useCallback with empty dependency array

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

  // Reset view function now also resets measurements
  const resetView = useCallback(() => {
    resetInteraction(); // Call reset from the interaction hook
    setActiveMeasurements({}); // Also reset measurements
  }, [resetInteraction]); // Dependency on hook's reset function

  // --- Layout Calculation ---
  const standardLayout = projections.standardLayout; // Check for the new combined layout
  const partsLayout = projections.parts;
  let standardLayoutData = null;
  let standardLayoutWidth = 0, standardLayoutHeight = 0;
  const initialOffsetX = 50; // Base offset for positioning content
  const initialOffsetY = 50;
  const layoutGap = 20; // Gap used for positioning parts below standard layout

  // Calculate dimensions for the combined standard layout if it exists
  if (standardLayout && standardLayout.combinedViewBox) {
    standardLayoutData = parseViewBox(standardLayout.combinedViewBox);
    if (standardLayoutData) {
      standardLayoutWidth = standardLayoutData.width * scale;
      standardLayoutHeight = standardLayoutData.height * scale;
      console.log("[INFO] Standard Layout Dimensions (scaled):", standardLayoutWidth, standardLayoutHeight);
      console.log("[INFO] Standard Layout ViewBox:", standardLayout.combinedViewBox);
    } else {
        console.warn("[WARN] Could not parse standardLayout viewBox:", standardLayout.combinedViewBox);
    }
  }

  // Position for the single standard layout view
  const standardLayoutPos = [initialOffsetX, initialOffsetY];

  // Calculate top position for the parts section, placed below the standard layout
  const partsTopPosition = initialOffsetY + (standardLayoutHeight > 0 ? standardLayoutHeight + layoutGap * 2 : 0);

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
      {...interactionHandlers} // Spread interaction handlers from the hook
    >
      {/* Controls Overlay */}
      <DrawingControls
        isMobile={isMobile}
        zoomLevel={zoomLevel}
        scale={scale}
        containerSize={containerSize}
        panOffset={panOffset}
        onZoomChange={setZoomLevel} // Pass setter from hook
        onPanChange={setPanOffset} // Pass setter from hook
        onScaleChange={setScale}
        onResetView={resetView} // Pass combined reset function
        onExportPDF={exportPdf} // Pass export function from hook
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
        {/* Combined Standard Layout View */}
        {standardLayout && standardLayoutData && (
          <ProjectionView
            // Pass the necessary parts of standardLayout to ProjectionView
            projection={{
                // ProjectionView expects visible/hidden structure, but we have combined paths.
                // We'll pass all paths and let ProjectionView handle rendering them.
                // We might need to adjust ProjectionView later if this causes issues.
                // For now, create a structure it might expect, using the combined data.
                visible: { paths: standardLayout.paths.filter(p => p.id.includes('_visible_') || p.id.includes('_circle')), viewBox: standardLayout.combinedViewBox }, // Approximate structure
                hidden: { paths: standardLayout.paths.filter(p => p.id.includes('_hidden_')), viewBox: standardLayout.combinedViewBox }, // Approximate structure
                combinedViewBox: standardLayout.combinedViewBox,
                // Pass all paths directly if ProjectionView is adapted to handle it
                allPaths: standardLayout.paths // Pass all paths for potential direct use
            }}
            title="Standard Views" // Single title for the combined layout
            position={standardLayoutPos}
            dimensions={{ width: standardLayoutWidth, height: standardLayoutHeight }}
            onPathClick={handlePathClick}
            viewId="standard_layout" // Single ID for the combined layout view
            activeMeasurements={activeMeasurements}
            onMeasurementUpdate={handleMeasurementUpdate}
          />
        )}

        {/* Part Projections - position below the standard layout */}
        {partsLayout && partsLayout.length > 0 && (
          <div style={{
            position: 'absolute', // Position relative to the zoom/pan container
            top: `${partsTopPosition}px`, // Use calculated top position
            left: `${initialOffsetX}px`,
            width: 'max-content' // Allow container to grow with parts
          }}>
            <h3 style={{ padding: '0 0 5px 0', margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
              {standardLayout ? 'Component Views' : 'Part Views'} {/* Adjust title based on context */}
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {partsLayout.map((part, index) => (
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
