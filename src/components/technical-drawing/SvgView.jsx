import React, { useRef, memo } from 'react'; // Import useRef, memo

import PathElement from './PathElement.jsx'; // Reuse PathElement for rendering
import MeasurementDisplay from './MeasurementDisplay.jsx'; // Import MeasurementDisplay
import TextDisplay from './TextDisplay.jsx'; // Import TextDisplay for user-added text

// --- UI Styling Constants ---
const UI_VISIBLE_STROKE_COLOR = '#333333';
const UI_HIDDEN_STROKE_COLOR = '#888888';
const UI_VISIBLE_STROKE_WIDTH = 0.5;
const UI_HIDDEN_STROKE_WIDTH = 0.35;
const UI_HIDDEN_DASH_ARRAY = '4 2';
const UI_SNAP_POINT_STROKE_COLOR = '#ff00ff'; // Magenta
const UI_SNAP_POINT_STROKE_WIDTH = 2;
const UI_SNAP_POINT_RADIUS = 4;
const UI_MEASUREMENT_CENTER_FILL_COLOR = '#0000ff'; // Blue
const UI_MEASUREMENT_CENTER_RADIUS = 2; // Smaller than snap points

// Component to render the SVG content of a single view, including measurements - Memoized
function SvgViewComponent({
  viewInstanceData, // Renamed from viewItemData
  onPathClick, // For measure mode
  onSnapClick, // For snap mode
  onTextPlacementClick, // For text mode
  interactionMode, // Current mode
  // Receive measurement props
  measurements,
  // Receive user text props
  userTexts,
  onUserTextUpdate,
  onDeleteUserText,
  // Receive snap points array prop
  snapPoints,
  // onMeasurementUpdate, // REMOVED - Update is handled via hook callback
  // Removed onMeasurementDragStart
  // zoomLevel, // zoomLevel is not needed here anymore
   onUpdateOverrideValue, // Add prop for override update handler
   onDeleteMeasurement, // Add prop for delete handler
   onToggleManualPosition, // Add prop for manual position toggle handler
 }) {
   const { id: viewId, viewType, svgData } = viewInstanceData; // Use renamed prop
   const innerSvgRef = useRef(null); // Create ref for the inner SVG

  if (!svgData || !svgData.paths || !svgData.viewBox) {
    // Render placeholder if SVG data is missing
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '10px', border: '1px dashed #eee' }}>
        Generating {viewType}...
      </div>
    );
  }

  const { paths, viewBox } = svgData;

  // Basic styling for the SVG container to fill the cell
  const svgContainerStyle = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden', // Hide parts of SVG outside the viewBox if needed
    // Removed pointerEvents: 'none'
  };

  // Log received snapPoints prop
  console.log(`[SvgView ${viewId}] Received snapPoints:`, snapPoints);

  // Filter snap points that belong to this specific view instance
  const relevantSnapPoints = snapPoints.filter(sp => sp.viewInstanceId === viewId);

  // Log the filtered points for this view
  console.log(`[SvgView ${viewId}] Relevant snapPoints for rendering:`, relevantSnapPoints);

  // Click handler for the SVG element itself
  const handleSvgClick = (event) => {
    // If the click is on a child element that already handled it and stopped propagation 
    // (e.g., PathElement in measure/snap/customLine mode when clicking a path),
    // this handler might still run if the click was on the SVG background, or if PathElement allowed propagation (e.g., for deleteLine).

    if ((interactionMode === 'snap' || interactionMode === 'customLine' || interactionMode === 'deleteLine') && onSnapClick) {
      // For these modes, TechnicalDrawingCanvas.handleSnapClick is the main orchestrator.
      // It will determine if it's a click on a path, background, or a line to be deleted.
      // PathElement's onClick stops propagation for 'snap'/'customLine' when a path is clicked,
      // so this primarily catches background clicks for 'snap'/'customLine', 
      // or any click in 'deleteLine' mode (as PathElement allows propagation).
      console.log(`[SvgView ${viewId}] Click in '${interactionMode}' mode. Calling onSnapClick. Target: ${event.target.tagName}`);
      onSnapClick(event, viewId);
    } else if (interactionMode === 'text' && onTextPlacementClick) {
      // For text mode, this handles clicks on the SVG background for text placement.
      console.log(`[SvgView ${viewId}] Click in 'text' mode. Calling onTextPlacementClick. Target: ${event.target.tagName}`);
      onTextPlacementClick(event, viewId);
    } else {
      // This might occur if in 'measure' mode and clicking the SVG background (not a path),
      // or if a mode is unhandled by the above conditions, or if a required handler (onSnapClick/onTextPlacementClick) is missing.
      // Clicks on paths in 'measure' mode are handled by PathElement.handleClick and propagation is stopped.
      console.log(`[SvgView ${viewId}] Click in '${interactionMode}' mode. No specific action taken by SvgView.onClick. Target: ${event.target.tagName}`);
    }
  };

  return (
    // Add data attribute to the container div
    <div style={svgContainerStyle} data-view-instance-id={viewId}>
      <svg
        ref={innerSvgRef} // Assign ref to the SVG element
        width="100%"
        height="100%"
        viewBox={viewBox} // Use the viewBox from the generated data
        preserveAspectRatio="xMidYMid meet" // Scale SVG to fit, maintain aspect ratio
        style={{ display: 'block' }} // Prevent extra space below SVG
        onClick={handleSvgClick} // Add the SVG click handler
        data-view-instance-id={viewId} // Add data attribute for easier identification if needed
      >
        <g fill="none"> {/* Default fill to none */}
          {paths.map((path) => {
            const isHidden = path.id?.includes('_hidden');
            // Use defined constants for styling
            const stroke = isHidden ? UI_HIDDEN_STROKE_COLOR : UI_VISIBLE_STROKE_COLOR;
            const strokeWidth = isHidden ? UI_HIDDEN_STROKE_WIDTH : UI_VISIBLE_STROKE_WIDTH;
            const strokeDasharray = isHidden ? UI_HIDDEN_DASH_ARRAY : 'none';

            return (
              <PathElement
                key={path.id}
                path={path}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                onPathClick={onPathClick} // Pass the handler down (used in measure mode)
                onSnapClick={onSnapClick} // Pass the snap handler down
                interactionMode={interactionMode} // Pass the interaction mode down
                viewInstanceId={viewId} // Pass the unique ID of this SvgView instance
                // isActive={activeMeasurements && activeMeasurements[path.id]} // Keep commented for now
                // partName={partName} // Keep commented for now - partName is on viewItemData if needed
                // partIndex={partIndex} // Pass part context if needed
              />
            );
          })}
          {/* Render measurements and custom lines belonging to this view */}
          {measurements && measurements.map(measurement => {
            if (measurement.type === 'customLine' && measurement.geometry?.type === 'line' && measurement.geometry.endpoints) {
              const [p1, p2] = measurement.geometry.endpoints;
              return (
                <line
                  key={measurement.pathId}
                  x1={p1[0]}
                  y1={p1[1]}
                  x2={p2[0]}
                  y2={p2[1]}
                  stroke={UI_VISIBLE_STROKE_COLOR} // Use same as visible model lines for now
                  strokeWidth={UI_VISIBLE_STROKE_WIDTH}
                  className="custom-line-element" // Add class for potential specific targeting
                  style={{ vectorEffect: 'non-scaling-stroke' }} // Add non-scaling-stroke
                />
              );
            } else if (measurement.type !== 'customLine') { // Render MeasurementDisplay for non-customLine types
              return (
                <MeasurementDisplay
                  key={measurement.pathId}
                  measurementData={measurement}
                  innerSvgRef={innerSvgRef} // Pass the ref down
                  onUpdateOverrideValue={onUpdateOverrideValue} // Pass override handler down
                  onDeleteMeasurement={onDeleteMeasurement} // Pass delete handler down
                  onToggleManualPosition={onToggleManualPosition} // Pass toggle handler down
                />
              );
            }
            return null;
          })}
          {/* Render User-Added Text */}
          {userTexts && userTexts.map(textData => (
            <TextDisplay
              key={textData.id}
              textData={textData}
              onUpdateText={onUserTextUpdate}
              onDeleteText={onDeleteUserText}
              // zoomLevel={zoomLevel} // Pass if needed for TextDisplay scaling UI elements
            />
          ))}
          {/* Render center points for active circle/arc measurements (excluding custom lines) */}
          {measurements && measurements.map(measurement => {
            if (measurement.type !== 'customLine' && (measurement.type === 'circle' || measurement.type === 'arc' || measurement.type === 'radius') && measurement.geometry?.center) {
              return (
                <circle
                  key={`center-dot-${measurement.pathId}`}
                  cx={measurement.geometry.center[0]}
                  cy={measurement.geometry.center[1]}
                  r={UI_MEASUREMENT_CENTER_RADIUS}
                  fill={UI_MEASUREMENT_CENTER_FILL_COLOR}
                  stroke="none"
                  style={{ pointerEvents: 'none' }}
                />
              );
            }
            return null;
          })}
          {/* Render highlights for all relevant snap points */}
          {relevantSnapPoints.map((snapPoint, index) => (
            <circle
              key={`snap-highlight-${index}`}
              cx={snapPoint.coordinates.x}
              cy={snapPoint.coordinates.y}
              r={UI_SNAP_POINT_RADIUS} // Use constant
              fill="none"
              stroke={UI_SNAP_POINT_STROKE_COLOR} // Use constant
              strokeWidth={UI_SNAP_POINT_STROKE_WIDTH} // Use constant
              style={{ pointerEvents: 'none' }} // vector-effect not needed for UI SVG
            />
          ))}
        </g>
      </svg>
    </div>
  );
} // End of function SvgViewComponent

export default memo(SvgViewComponent); // Export the memoized component
