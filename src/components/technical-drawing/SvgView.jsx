import React, { useRef, memo } from 'react'; // Import useRef, memo

import PathElement from './PathElement.jsx'; // Reuse PathElement for rendering
import MeasurementDisplay from './MeasurementDisplay.jsx'; // Import MeasurementDisplay

// --- UI Styling Constants ---
const UI_VISIBLE_STROKE_COLOR = '#333333';
const UI_HIDDEN_STROKE_COLOR = '#888888';
const UI_VISIBLE_STROKE_WIDTH = 0.5;
const UI_HIDDEN_STROKE_WIDTH = 0.35;
const UI_HIDDEN_DASH_ARRAY = '4 2';
const UI_SNAP_POINT_STROKE_COLOR = '#ff00ff'; // Magenta
const UI_SNAP_POINT_STROKE_WIDTH = 2;
const UI_SNAP_POINT_RADIUS = 4;

// Component to render the SVG content of a single view, including measurements - Memoized
function SvgViewComponent({
  viewInstanceData, // Renamed from viewItemData
  onPathClick,
  // Receive measurement props
  measurements,
  // Receive snap points array prop
  snapPoints,
  // onMeasurementUpdate, // REMOVED - Update is handled via hook callback
  // Removed onMeasurementDragStart
  // zoomLevel, // zoomLevel is not needed here anymore
  onUpdateOverrideValue, // Add prop for override update handler
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
                onPathClick={onPathClick} // Pass the handler down
                viewInstanceId={viewId} // Pass the unique ID of this SvgView instance
                // isActive={activeMeasurements && activeMeasurements[path.id]} // Keep commented for now
                // partName={partName} // Keep commented for now - partName is on viewItemData if needed
                // partIndex={partIndex} // Pass part context if needed
              />
            );
          })}
          {/* Render measurements belonging to this view */}
          {measurements && measurements.map(measurement => (
            <MeasurementDisplay
              key={measurement.pathId}
              measurementData={measurement}
              innerSvgRef={innerSvgRef} // Pass the ref down
              onUpdateOverrideValue={onUpdateOverrideValue} // Pass override handler down
              // Removed onDragStart
            />
          ))}
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
