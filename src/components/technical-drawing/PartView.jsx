import React, { useRef } from 'react';
import PathElement from './PathElement.jsx';
import MeasurementDisplay from './MeasurementDisplay.jsx';
import { parseViewBox } from '../../utils/svgUtils.js'; // Import utility

// Component to render individual part views
export default function PartView({ part, index, scale, onPathClick, activeMeasurements, onMeasurementUpdate }) {
  if (!part || !part.views) return null;
  // Refs for each SVG within the part view
  const frontSvgRef = useRef(null);
  const topSvgRef = useRef(null);
  const rightSvgRef = useRef(null);

  const titleHeight = 20; // Height of the title bar in pixels for part views
  const layoutGap = 20; // Gap between views in pixels

  // Get the view data for each projection
  const frontView = part.views.front;
  const topView = part.views.top;
  const rightView = part.views.right;

  // Create unique view IDs for this part
  const partId = part.name.replace(/\s+/g, '_');
  const frontViewId = `${partId}_front`;
  const topViewId = `${partId}_top`;
  const rightViewId = `${partId}_right`;

  // Parse viewboxes and calculate dimensions
  let frontViewData, topViewData, rightViewData;
  let frontWidth = 0, frontHeight = 0;
  let topWidth = 0, topHeight = 0;
  let rightWidth = 0, rightHeight = 0;

  if (frontView) {
    frontViewData = parseViewBox(frontView.combinedViewBox);
    frontWidth = frontViewData ? frontViewData.width * scale : 0;
    frontHeight = frontViewData ? frontViewData.height * scale : 0;
  }

  if (topView) {
    topViewData = parseViewBox(topView.combinedViewBox);
    topWidth = topViewData ? topViewData.width * scale : 0;
    topHeight = topViewData ? topViewData.height * scale : 0;
  }

  if (rightView) {
    rightViewData = parseViewBox(rightView.combinedViewBox);
    rightWidth = rightViewData ? rightViewData.width * scale : 0;
    rightHeight = rightViewData ? rightViewData.height * scale : 0;
  }

  // Calculate the total width and height needed for this part
  const totalWidth = Math.max(frontWidth + rightWidth + layoutGap, topWidth);
  const totalHeight = frontHeight + topHeight + layoutGap;

  return (
    <div key={index} style={{
      margin: '10px',
      border: '1px solid #ccc',
      backgroundColor: 'white',
      display: 'inline-block',
      width: `${totalWidth + 20}px` // Add padding
    }}>
      <h4 style={{
        padding: '5px',
        margin: 0,
        backgroundColor: '#eee'
      }}>
        {part.name}
      </h4>
      <div style={{
        padding: '10px',
        position: 'relative',
        height: `${totalHeight + 20}px` // Add padding
      }}>
        {/* Front View */}
        {frontView && frontViewData && (
          <div style={{
            position: 'absolute',
            top: '0', // Keep positioning relative to the parent
            left: '0',
            width: `${frontWidth}px`,
            height: `${frontHeight}px`, // Use only content height
            // border: '1px solid #ddd', // Removed border
            // display: 'flex', // No longer needed
            // flexDirection: 'column' // No longer needed
          }}>
            {/* Removed Title Div */}
            <div style={{
              width: '100%',
              height: '100%', // Occupy the adjusted height
              position: 'relative'
            }}>
              <svg
                ref={frontSvgRef} // Assign ref
                viewBox={frontView.combinedViewBox}
                style={{ width: '100%', height: '100%' }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* IMPORTANT: Draw hidden lines FIRST (underneath) */}
                <g>
                  {(frontView.hidden?.paths || []).map((path, i) => (
                    <PathElement
                      key={`${frontViewId}_hidden_${path.id || i}`}
                      path={path}
                      stroke="#777777"
                      strokeWidth="0.3"
                      strokeDasharray="2,1"
                      onClick={onPathClick}
                      viewId={frontViewId}
                      partName={part.name} // Pass part name
                      partIndex={index}    // Pass part index
                    />
                  ))}
                </g>

                {/* Draw visible lines SECOND (on top) */}
                <g>
                  {(frontView.visible?.paths || []).map((path, i) => (
                    <PathElement
                      key={`${frontViewId}_visible_${path.id || i}`}
                      path={path}
                      stroke="#000000"
                      strokeWidth="0.5"
                      strokeDasharray={null}
                      onClick={onPathClick}
                      viewId={frontViewId}
                      partName={part.name} // Pass part name
                      partIndex={index}    // Pass part index
                    />
                  ))}
                </g>
                 {/* Render Measurements for this view */}
                <g>
                  {Object.values(activeMeasurements)
                    .filter(m => m.viewId === frontViewId)
                    .map(measurement => {
                      // Find the current path data using the pathId
                      const pathIdParts = measurement.pathId.split('_');
                      const visibility = pathIdParts[pathIdParts.length - 3];
                      const originalIdOrIndex = pathIdParts.slice(pathIdParts.length - 2).join('_');
                      let currentPath = null;
                      const pathsToCheck = visibility === 'visible' ? frontView?.visible?.paths : frontView?.hidden?.paths;

                      if (pathsToCheck) {
                        currentPath = pathsToCheck.find(p => {
                          const pIdParts = `${p.id || ''}`.split('_');
                          const pOriginalIdOrIndex = pIdParts.slice(pIdParts.length - 2).join('_');
                          return pOriginalIdOrIndex === originalIdOrIndex || `${p.id}` === originalIdOrIndex;
                        });
                        // Fallback logic (similar to ProjectionView)
                        if (!currentPath) {
                           const indexStr = pathIdParts[pathIdParts.length - 1];
                           const index = parseInt(indexStr, 10);
                           if (!isNaN(index) && index >= 0 && index < pathsToCheck.length && pathsToCheck[index]?.geometry?.type === measurement.type) {
                              currentPath = pathsToCheck[index];
                           }
                        }
                      }

                      if (!currentPath || !currentPath.geometry) {
                        console.warn(`PartView(Front): Could not find current geometry for measurement: ${measurement.pathId}`);
                        return null;
                      }

                      const currentMeasurementData = { ...measurement, geometry: currentPath.geometry };

                      return (
                        <MeasurementDisplay
                          key={measurement.pathId}
                          measurementData={currentMeasurementData} // Pass updated data
                          svgRef={frontSvgRef} // Pass correct ref
                          onUpdatePosition={onMeasurementUpdate}
                        />
                      );
                    })}
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* Top View - positioned below Front View */}
        {topView && topViewData && (
          <div style={{
            position: 'absolute',
            top: `${frontHeight + layoutGap}px`, // Adjusted top position (removed titleHeight)
            left: `${(frontWidth - topWidth) / 2}px`, // Center below front view
            width: `${topWidth}px`,
            height: `${topHeight}px`, // Use only content height
            // border: '1px solid #ddd', // Removed border
            // display: 'flex', // No longer needed
            // flexDirection: 'column' // No longer needed
          }}>
            {/* Removed Title Div */}
            <div style={{
              width: '100%',
              height: '100%', // Occupy the adjusted height
              position: 'relative'
            }}>
              <svg
                ref={topSvgRef} // Assign ref
                viewBox={topView.combinedViewBox}
                style={{ width: '100%', height: '100%' }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* IMPORTANT: Draw hidden lines FIRST (underneath) */}
                <g>
                  {(topView.hidden?.paths || []).map((path, i) => (
                    <PathElement
                      key={`${topViewId}_hidden_${path.id || i}`}
                      path={path}
                      stroke="#777777"
                      strokeWidth="0.3"
                      strokeDasharray="2,1"
                      onClick={onPathClick}
                      viewId={topViewId}
                      partName={part.name} // Pass part name
                      partIndex={index}    // Pass part index
                    />
                  ))}
                </g>

                {/* Draw visible lines SECOND (on top) */}
                <g>
                  {(topView.visible?.paths || []).map((path, i) => (
                    <PathElement
                      key={`${topViewId}_visible_${path.id || i}`}
                      path={path}
                      stroke="#000000"
                      strokeWidth="0.5"
                      strokeDasharray={null}
                      onClick={onPathClick}
                      viewId={topViewId}
                      partName={part.name} // Pass part name
                      partIndex={index}    // Pass part index
                    />
                  ))}
                </g>
                 {/* Render Measurements for this view */}
                 <g>
                  {Object.values(activeMeasurements)
                    .filter(m => m.viewId === topViewId)
                     .map(measurement => {
                      // Find the current path data using the pathId
                      const pathIdParts = measurement.pathId.split('_');
                      const visibility = pathIdParts[pathIdParts.length - 3];
                      const originalIdOrIndex = pathIdParts.slice(pathIdParts.length - 2).join('_');
                      let currentPath = null;
                      const pathsToCheck = visibility === 'visible' ? topView?.visible?.paths : topView?.hidden?.paths;

                      if (pathsToCheck) {
                         currentPath = pathsToCheck.find(p => {
                          const pIdParts = `${p.id || ''}`.split('_');
                          const pOriginalIdOrIndex = pIdParts.slice(pIdParts.length - 2).join('_');
                          return pOriginalIdOrIndex === originalIdOrIndex || `${p.id}` === originalIdOrIndex;
                        });
                        // Fallback logic
                        if (!currentPath) {
                           const indexStr = pathIdParts[pathIdParts.length - 1];
                           const index = parseInt(indexStr, 10);
                           if (!isNaN(index) && index >= 0 && index < pathsToCheck.length && pathsToCheck[index]?.geometry?.type === measurement.type) {
                              currentPath = pathsToCheck[index];
                           }
                        }
                      }

                      if (!currentPath || !currentPath.geometry) {
                        console.warn(`PartView(Top): Could not find current geometry for measurement: ${measurement.pathId}`);
                        return null;
                      }

                      const currentMeasurementData = { ...measurement, geometry: currentPath.geometry };

                      return (
                        <MeasurementDisplay
                          key={measurement.pathId}
                          measurementData={currentMeasurementData} // Pass updated data
                          svgRef={topSvgRef} // Pass correct ref
                          onUpdatePosition={onMeasurementUpdate}
                        />
                      );
                    })}
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* Right View - positioned to the right of Front View */}
        {rightView && rightViewData && (
          <div style={{
            position: 'absolute',
            top: `${(frontHeight - rightHeight) / 2}px`, // Center vertically relative to front view content height
            left: `${frontWidth + layoutGap}px`, // To the right of front view
            width: `${rightWidth}px`,
            height: `${rightHeight}px`, // Use only content height
            // border: '1px solid #ddd', // Removed border
            // display: 'flex', // No longer needed
            // flexDirection: 'column' // No longer needed
          }}>
            {/* Removed Title Div */}
            <div style={{
              width: '100%',
              height: '100%', // Occupy the adjusted height
              position: 'relative'
            }}>
              <svg
                ref={rightSvgRef} // Assign ref
                viewBox={rightView.combinedViewBox}
                style={{ width: '100%', height: '100%' }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* IMPORTANT: Draw hidden lines FIRST (underneath) */}
                <g>
                  {(rightView.hidden?.paths || []).map((path, i) => (
                    <PathElement
                      key={`${rightViewId}_hidden_${path.id || i}`}
                      path={path}
                      stroke="#777777"
                      strokeWidth="0.3"
                      strokeDasharray="2,1"
                      onClick={onPathClick}
                      viewId={rightViewId}
                      partName={part.name} // Pass part name
                      partIndex={index}    // Pass part index
                    />
                  ))}
                </g>

                {/* Draw visible lines SECOND (on top) */}
                <g>
                  {(rightView.visible?.paths || []).map((path, i) => (
                    <PathElement
                      key={`${rightViewId}_visible_${path.id || i}`}
                      path={path}
                      stroke="#000000"
                      strokeWidth="0.5"
                      strokeDasharray={null}
                      onClick={onPathClick}
                      viewId={rightViewId}
                      partName={part.name} // Pass part name
                      partIndex={index}    // Pass part index
                    />
                  ))}
                </g>
                 {/* Render Measurements for this view */}
                 <g>
                  {Object.values(activeMeasurements)
                    .filter(m => m.viewId === rightViewId)
                     .map(measurement => {
                      // Find the current path data using the pathId
                      const pathIdParts = measurement.pathId.split('_');
                      const visibility = pathIdParts[pathIdParts.length - 3];
                      const originalIdOrIndex = pathIdParts.slice(pathIdParts.length - 2).join('_');
                      let currentPath = null;
                      const pathsToCheck = visibility === 'visible' ? rightView?.visible?.paths : rightView?.hidden?.paths;

                      if (pathsToCheck) {
                         currentPath = pathsToCheck.find(p => {
                          const pIdParts = `${p.id || ''}`.split('_');
                          const pOriginalIdOrIndex = pIdParts.slice(pIdParts.length - 2).join('_');
                          return pOriginalIdOrIndex === originalIdOrIndex || `${p.id}` === originalIdOrIndex;
                        });
                        // Fallback logic
                        if (!currentPath) {
                           const indexStr = pathIdParts[pathIdParts.length - 1];
                           const index = parseInt(indexStr, 10);
                           if (!isNaN(index) && index >= 0 && index < pathsToCheck.length && pathsToCheck[index]?.geometry?.type === measurement.type) {
                              currentPath = pathsToCheck[index];
                           }
                        }
                      }

                      if (!currentPath || !currentPath.geometry) {
                        console.warn(`PartView(Right): Could not find current geometry for measurement: ${measurement.pathId}`);
                        return null;
                      }

                      const currentMeasurementData = { ...measurement, geometry: currentPath.geometry };

                      return (
                        <MeasurementDisplay
                          key={measurement.pathId}
                          measurementData={currentMeasurementData} // Pass updated data
                          svgRef={rightSvgRef} // Pass correct ref
                          onUpdatePosition={onMeasurementUpdate}
                        />
                      );
                    })}
                </g>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
