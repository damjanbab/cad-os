import React, { useEffect, useRef, useState, useCallback } from 'react';
// import ProjectionView from './ProjectionView.jsx'; // No longer needed directly here
// import PartView from './PartView.jsx'; // No longer needed directly here
import Viewbox from './Viewbox.jsx'; // Import the new Viewbox component
import DrawingControls from './DrawingControls.jsx';
import { parseViewBox } from '../../utils/svgUtils.js'; // Import utility
// import { useTechnicalDrawingPdfExport } from '../../hooks/useTechnicalDrawingPdfExport.js'; // Import PDF hook - Temporarily remove old import
import { useTechnicalDrawingPdfExport } from '../../hooks/useTechnicalDrawingPdfExport.js'; // Re-import PDF hook
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction.js'; // Import Interaction hook
import MeasurementDisplay from './MeasurementDisplay.jsx'; // Import MeasurementDisplay

// Main canvas component for technical drawings - Updated for viewboxes
export default function TechnicalDrawingCanvas({
  selectedModelName, // Add prop to receive the model name
  viewboxes,
  isMobile,
  onAddViewbox,
  selectedLayout, // Add prop for receiving selected layout
  onLayoutChange, // Add prop for receiving layout change handler
  // Props for adding views
  selectedViewToAdd,
  onViewSelectionChange,
  includeHiddenLines,
  onHiddenLinesToggle,
  onAddViewToCell,
  // Cell selection props
  selectedTarget,
  onCellSelection,
  // Title block editing prop
  onTitleBlockChange,
}) {
  // Removed loading check for projections
  // if (!projections) return <div>Loading projections...</div>;

  const containerRef = useRef(null); // Ref for the main container div
  const viewContainerRef = useRef(null); // Ref for the zoomable/pannable content area
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(10); // Initial scale: 10 pixels per cm
  // State for active measurements, keyed by uniquePathId
  const [activeMeasurements, setActiveMeasurements] = useState({});
  // Removed draggingMeasurementInfo state

  // --- Use Hooks ---
  // Use the updated hook with viewboxes and activeMeasurements
  const { exportPdf } = useTechnicalDrawingPdfExport(viewboxes, activeMeasurements);
  // const exportPdf = () => console.warn("PDF Export is temporarily disabled."); // Remove placeholder
  const {
    zoomLevel,
    panOffset,
    isDragging,
    interactionHandlers,
    resetInteraction,
    setZoomLevel, // Expose setters if needed by controls
    setPanOffset,
  } = useCanvasInteraction(containerRef); // Hook manages pan/zoom only


  // Handler to update measurement text position (passed down)
  const handleMeasurementUpdate = useCallback((pathId, newPosition) => {
    setActiveMeasurements(prev => ({
      ...prev,
      [pathId]: {
        ...prev[pathId],
        textPosition: newPosition,
      }
    }));
  }, []); // Keep dependency array empty

  // Removed manual drag handlers - logic moved back to MeasurementDisplay


  // Handle path click - toggle measurement display
  // Add viewInstanceId to receive context from PathElement
  const handlePathClick = useCallback((uniquePathId, path, partName, partIndex, viewInstanceId) => {
    // Only allow measurements for lines and circles with valid geometry
    if (!path.geometry || (path.geometry.type !== 'line' && path.geometry.type !== 'circle')) {
      console.log(`[Canvas] Clicked non-measurable path: ${uniquePathId}, Type: ${path.geometry?.type}`);
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
          // viewId: measurementViewId, // Store the determined view ID - REMOVED, use viewInstanceId
          viewInstanceId: viewInstanceId, // Store the ID of the specific view instance
          geometry: path.geometry, // Store the geometry directly
        };
        console.log(`--- Added Measurement ---`);
        console.log(`  Path ID: ${uniquePathId}`);
        console.log(`  Type: ${path.geometry.type}`);
        console.log(`  Initial Text Pos:`, initialTextPosition);
        // console.log(`  Stored Logical View ID: ${measurementViewId}`); // Keep for debug if needed
        console.log(`  Stored View Instance ID: ${viewInstanceId}`); // Log the stored instance ID
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

  // --- Layout Calculation (REMOVED old logic based on projections) ---
  // const standardLayout = projections.standardLayout;
  // const partsLayout = projections.parts;
  // let standardLayoutData = null;
  // let standardLayoutWidth = 0, standardLayoutHeight = 0;
  const initialOffsetX = 50; // Base offset for positioning content (might be reused or removed later)
  const initialOffsetY = 50;
  // const layoutGap = 20; // Gap used for positioning parts below standard layout (REMOVED)

  // REMOVED calculation logic for standardLayout and partsLayout positions/dimensions

  // Check if viewboxes array is empty or null
  const hasViewboxes = viewboxes && viewboxes.length > 0;

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
        selectedModelName={selectedModelName} // Pass the model name down
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
        onAddViewbox={onAddViewbox} // Pass the handler down to DrawingControls
        selectedLayout={selectedLayout} // Pass layout state down
        onLayoutChange={onLayoutChange} // Pass layout handler down
        // Pass view selection props down
        selectedViewToAdd={selectedViewToAdd}
        onViewSelectionChange={onViewSelectionChange}
        includeHiddenLines={includeHiddenLines}
        onHiddenLinesToggle={onHiddenLinesToggle}
        onAddViewToCell={onAddViewToCell}
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
        {/* Render based on new viewboxes state */}
        {!hasViewboxes ? (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#666',
            fontSize: '16px',
            textAlign: 'center'
          }}>
            No viewboxes created yet.<br />
            Use controls to add a viewbox.
          </div>
        ) : (
          // Map over viewboxes and render a Viewbox component for each
          viewboxes.map((vb, index) => (
            <Viewbox
              key={vb.id}
              viewboxData={vb}
              selectedTarget={selectedTarget} // Pass down selection state
              onCellSelection={onCellSelection} // Pass down selection handler
              onTitleBlockChange={onTitleBlockChange} // Pass down title block handler
              onPathClick={handlePathClick} // Pass down path click handler
              // Pass down measurement-related props
              measurements={Object.values(activeMeasurements)} // Pass all active measurements
              onMeasurementUpdate={handleMeasurementUpdate} // Pass update handler down again
              // Removed onMeasurementDragStart
              zoomLevel={zoomLevel} // Pass zoomLevel for potential use in MeasurementDisplay rendering
            />
          ))
        )}

        {/* REMOVED old rendering logic for standardLayout and partsLayout */}
      </div>

      {/* REMOVED Measurement SVG Overlay - Rendering moved into Viewbox/SvgView */}
    </div>
  );
}
