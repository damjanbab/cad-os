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

  // Reset view function now also resets measurements
  const resetView = useCallback(() => {
    resetInteraction(); // Call reset from the interaction hook
    setActiveMeasurements({}); // Also reset measurements
  }, [resetInteraction]); // Dependency on hook's reset function

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
