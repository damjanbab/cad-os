import React, { useRef } from 'react';
import PathElement from './PathElement.jsx';
import MeasurementDisplay from './MeasurementDisplay.jsx';
import { parseViewBox } from '../../utils/svgUtils.js'; // Import utility

// Component to render individual part views (Front, Bottom, Left - Third Angle Projection)
export default function PartView({ part, index, scale, onPathClick, activeMeasurements, onMeasurementUpdate }) {
  if (!part || !part.views) return null;
  // Refs for each SVG within the part view
  const frontSvgRef = useRef(null);
  const bottomSvgRef = useRef(null); // Renamed from topSvgRef
  const leftSvgRef = useRef(null);   // Renamed from rightSvgRef

  const titleHeight = 20; // Height of the title bar in pixels for part views (currently unused)
  const layoutGap = 20; // Gap between views in pixels

  // Get the view data for each projection (expecting front, bottom, left)
  const frontView = part.views.front;
  const bottomView = part.views.bottom; // Changed from topView
  const leftView = part.views.left;     // Changed from rightView

  // Create unique view IDs for this part
  const partId = part.name.replace(/\s+/g, '_');
  const frontViewId = `${partId}_front`;
  const bottomViewId = `${partId}_bottom`; // Changed from topViewId
  const leftViewId = `${partId}_left`;   // Changed from rightViewId

  // Parse viewboxes and calculate dimensions
  let frontViewData, bottomViewData, leftViewData; // Renamed
  let frontWidth = 0, frontHeight = 0;
  let bottomWidth = 0, bottomHeight = 0; // Renamed
  let leftWidth = 0, leftHeight = 0;     // Renamed

  if (frontView) {
    frontViewData = parseViewBox(frontView.combinedViewBox);
    frontWidth = frontViewData ? frontViewData.width * scale : 0;
    frontHeight = frontViewData ? frontViewData.height * scale : 0;
  }

  if (bottomView) { // Changed from topView
    bottomViewData = parseViewBox(bottomView.combinedViewBox); // Changed from topViewData
    bottomWidth = bottomViewData ? bottomViewData.width * scale : 0; // Changed from topWidth
    bottomHeight = bottomViewData ? bottomViewData.height * scale : 0; // Changed from topHeight
  }

  if (leftView) { // Changed from rightView
    leftViewData = parseViewBox(leftView.combinedViewBox); // Changed from rightViewData
    leftWidth = leftViewData ? leftViewData.width * scale : 0; // Changed from rightWidth
    leftHeight = leftViewData ? leftViewData.height * scale : 0; // Changed from rightHeight
  }

  // Calculate the total width and height needed for this part (Third Angle Layout)
  // Width: Front view width + gap + Left view width (or Bottom view width if wider)
  // Height: Front view height + gap + Bottom view height
  const totalWidth = Math.max(frontWidth + leftWidth + layoutGap, bottomWidth); // Changed rightWidth to leftWidth, topWidth to bottomWidth
  const totalHeight = frontHeight + bottomHeight + layoutGap; // Changed topHeight to bottomHeight

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

        {/* Bottom View - positioned below Front View */}
        {bottomView && bottomViewData && ( // Changed from topView
          <div style={{
            position: 'absolute',
            top: `${frontHeight + layoutGap}px`, // Position below front view
            left: `${(frontWidth - bottomWidth) / 2}px`, // Center horizontally below front view
            width: `${bottomWidth}px`, // Use bottom view width
            height: `${bottomHeight}px`, // Use bottom view height
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
                ref={bottomSvgRef} // Assign ref (Changed from topSvgRef)
                viewBox={bottomView.combinedViewBox} // Changed from topView
                style={{ width: '100%', height: '100%' }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* IMPORTANT: Draw hidden lines FIRST (underneath) */}
                <g>
                  {(bottomView.hidden?.paths || []).map((path, i) => ( // Changed from topView
                    <PathElement
                      key={`${bottomViewId}_hidden_${path.id || i}`} // Changed from topViewId
                      path={path}
                      stroke="#777777"
                      strokeWidth="0.3"
                      strokeDasharray="2,1"
                      onClick={onPathClick}
                      viewId={bottomViewId} // Changed from topViewId
                      partName={part.name} // Pass part name
                      partIndex={index}    // Pass part index
                    />
                  ))}
                </g>

                {/* Draw visible lines SECOND (on top) */}
                <g>
                  {(bottomView.visible?.paths || []).map((path, i) => ( // Changed from topView
                    <PathElement
                      key={`${bottomViewId}_visible_${path.id || i}`} // Changed from topViewId
                      path={path}
                      stroke="#000000"
                      strokeWidth="0.5"
                      strokeDasharray={null}
                      onClick={onPathClick}
                      viewId={bottomViewId} // Changed from topViewId
                      partName={part.name} // Pass part name
                      partIndex={index}    // Pass part index
                    />
                  ))}
                </g>
                 {/* Render Measurements for this view */}
                 <g>
                  {Object.values(activeMeasurements)
                    .filter(m => m.viewId === bottomViewId) // Changed from topViewId
                     .map(measurement => {
                      // Find the current path data using the pathId
                      const pathIdParts = measurement.pathId.split('_');
                      const visibility = pathIdParts[pathIdParts.length - 3];
                      const originalIdOrIndex = pathIdParts.slice(pathIdParts.length - 2).join('_');
                      let currentPath = null;
                      const pathsToCheck = visibility === 'visible' ? bottomView?.visible?.paths : bottomView?.hidden?.paths; // Changed from topView

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
                        console.warn(`PartView(Bottom): Could not find current geometry for measurement: ${measurement.pathId}`); // Changed from Top
                        return null;
                      }

                      const currentMeasurementData = { ...measurement, geometry: currentPath.geometry };

                      return (
                        <MeasurementDisplay
                          key={measurement.pathId}
                          measurementData={currentMeasurementData} // Pass updated data
                          svgRef={bottomSvgRef} // Pass correct ref (Changed from topSvgRef)
                          onUpdatePosition={onMeasurementUpdate}
                        />
                      );
                    })}
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* Left View - positioned to the right of Front View (Third Angle Projection) */}
        {leftView && leftViewData && ( // Changed from rightView
          <div style={{
            position: 'absolute',
            top: `${(frontHeight - leftHeight) / 2}px`, // Center vertically relative to front view content height
            left: `${frontWidth + layoutGap}px`, // Position to the right of front view
            width: `${leftWidth}px`, // Use left view width
            height: `${leftHeight}px`, // Use left view height
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
                ref={leftSvgRef} // Assign ref (Changed from rightSvgRef)
                viewBox={leftView.combinedViewBox} // Changed from rightView
                style={{ width: '100%', height: '100%' }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* IMPORTANT: Draw hidden lines FIRST (underneath) */}
                <g>
                  {(leftView.hidden?.paths || []).map((path, i) => ( // Changed from rightView
                    <PathElement
                      key={`${leftViewId}_hidden_${path.id || i}`} // Changed from rightViewId
                      path={path}
                      stroke="#777777"
                      strokeWidth="0.3"
                      strokeDasharray="2,1"
                      onClick={onPathClick}
                      viewId={leftViewId} // Changed from rightViewId
                      partName={part.name} // Pass part name
                      partIndex={index}    // Pass part index
                    />
                  ))}
                </g>

                {/* Draw visible lines SECOND (on top) */}
                <g>
                  {(leftView.visible?.paths || []).map((path, i) => ( // Changed from rightView
                    <PathElement
                      key={`${leftViewId}_visible_${path.id || i}`} // Changed from rightViewId
                      path={path}
                      stroke="#000000"
                      strokeWidth="0.5"
                      strokeDasharray={null}
                      onClick={onPathClick}
                      viewId={leftViewId} // Changed from rightViewId
                      partName={part.name} // Pass part name
                      partIndex={index}    // Pass part index
                    />
                  ))}
                </g>
                 {/* Render Measurements for this view */}
                 <g>
                  {Object.values(activeMeasurements)
                    .filter(m => m.viewId === leftViewId) // Changed from rightViewId
                     .map(measurement => {
                      // Find the current path data using the pathId
                      const pathIdParts = measurement.pathId.split('_');
                      const visibility = pathIdParts[pathIdParts.length - 3];
                      const originalIdOrIndex = pathIdParts.slice(pathIdParts.length - 2).join('_');
                      let currentPath = null;
                      const pathsToCheck = visibility === 'visible' ? leftView?.visible?.paths : leftView?.hidden?.paths; // Changed from rightView

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
                        console.warn(`PartView(Left): Could not find current geometry for measurement: ${measurement.pathId}`); // Changed from Right
                        return null;
                      }

                      const currentMeasurementData = { ...measurement, geometry: currentPath.geometry };

                      return (
                        <MeasurementDisplay
                          key={measurement.pathId}
                          measurementData={currentMeasurementData} // Pass updated data
                          svgRef={leftSvgRef} // Pass correct ref (Changed from rightSvgRef)
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
