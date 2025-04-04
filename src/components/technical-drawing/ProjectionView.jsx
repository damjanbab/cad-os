import React, { useRef } from 'react';
import PathElement from './PathElement.jsx';
import MeasurementDisplay from './MeasurementDisplay.jsx';

// Projection View Component
export default function ProjectionView({ projection, title, position, dimensions, onPathClick, viewId, activeMeasurements, onMeasurementUpdate }) {
  if (!projection) return null;
  const svgElementRef = useRef(null); // Ref for this specific SVG

  // Extract dimensions passed in pixels
  const { width, height } = dimensions;
  const [x, y] = position;

  const titleHeight = 25; // Height of the title bar in pixels

  return (
    <div style={{
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
      border: '1px solid #aaa',
      backgroundColor: '#f8f8f8',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '5px',
        height: `${titleHeight}px`,
        borderBottom: '1px solid #ddd',
        backgroundColor: '#eee',
        fontSize: '12px',
        fontWeight: 'bold',
        boxSizing: 'border-box'
      }}>
        {title}
      </div>

      <div style={{ width: '100%', height: `calc(100% - ${titleHeight}px)`, position: 'relative' }}>
        <svg
          ref={svgElementRef} // Assign ref here
          viewBox={projection.combinedViewBox}
          style={{ width: '100%', height: '100%' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* IMPORTANT: Draw hidden lines FIRST (underneath) */}
          <g>
            {(projection.hidden?.paths || []).map((path, i) => (
              <PathElement
                key={`${viewId}_hidden_${path.id || i}`} // Use path.id if available
                path={path}
                stroke="#777777"
                strokeWidth="0.3"
                strokeDasharray="2,1"
                onClick={onPathClick}
                viewId={viewId}
              />
            ))}
          </g>

          {/* Draw visible lines SECOND (on top) so they visually override hidden lines */}
          <g>
            {(projection.visible?.paths || []).map((path, i) => (
              <PathElement
                key={`${viewId}_visible_${path.id || i}`} // Use path.id if available
                path={path}
                stroke="#000000"
                strokeWidth="0.5"
                strokeDasharray={null}
                onClick={onPathClick}
                viewId={viewId}
              />
            ))}
          </g>

          {/* Render Measurements for this view */}
          <g>
            {Object.values(activeMeasurements)
              .filter(m => m.viewId === viewId) // Only show measurements for this specific view instance
              .map(measurement => {
                // Find the current path data using the pathId from the measurement state
                const pathIdParts = measurement.pathId.split('_');
                const visibility = pathIdParts[pathIdParts.length - 3]; // 'visible' or 'hidden'
                const originalIdOrIndex = pathIdParts.slice(pathIdParts.length - 2).join('_'); // e.g., "0_0" or "circle_1"

                let currentPath = null;
                const pathsToCheck = visibility === 'visible' ? projection.visible?.paths : projection.hidden?.paths;

                if (pathsToCheck) {
                  // Attempt to find by matching the end of the ID (originalId_index or type_index)
                  currentPath = pathsToCheck.find(p => {
                    const pIdParts = `${p.id || ''}`.split('_'); // Handle cases where id might be numeric
                    const pOriginalIdOrIndex = pIdParts.slice(pIdParts.length - 2).join('_');
                    // Check if the end part matches (e.g., "0_0" === "0_0" or "circle_1" === "circle_1")
                    // Or handle cases where the stored ID might just be the index if p.id wasn't set
                    return pOriginalIdOrIndex === originalIdOrIndex || `${p.id}` === originalIdOrIndex;
                  });

                  // Fallback if ID matching fails (e.g., if IDs weren't consistently set during generation)
                  // This assumes the index part of the uniquePathId corresponds to the array index
                  if (!currentPath) {
                     const indexStr = pathIdParts[pathIdParts.length - 1];
                     const index = parseInt(indexStr, 10);
                     if (!isNaN(index) && index >= 0 && index < pathsToCheck.length) {
                        // Basic check: does the type match?
                        if (pathsToCheck[index]?.geometry?.type === measurement.type) {
                           // console.warn(`Measurement ${measurement.pathId}: Falling back to index-based path lookup.`);
                           currentPath = pathsToCheck[index];
                        }
                     }
                  }
                }


                if (!currentPath || !currentPath.geometry) {
                  console.warn(`Could not find current geometry for measurement: ${measurement.pathId}`);
                  return null; // Don't render measurement if geometry is missing
                }

                // Construct the data prop with the *current* geometry
                const currentMeasurementData = {
                  ...measurement,
                  geometry: currentPath.geometry, // Use the fresh geometry
                };

                return (
                  <MeasurementDisplay
                    key={measurement.pathId}
                    measurementData={currentMeasurementData} // Pass data with updated geometry
                    svgRef={svgElementRef} // Pass the correct SVG ref
                    onUpdatePosition={onMeasurementUpdate} // Pass update handler
                  />
                );
              })}
          </g>
        </svg>
      </div>
    </div>
  );
}
