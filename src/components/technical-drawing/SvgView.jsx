import React, { useRef } from 'react'; // Import useRef
import PathElement from './PathElement.jsx'; // Reuse PathElement for rendering
import MeasurementDisplay from './MeasurementDisplay.jsx'; // Import MeasurementDisplay

// Component to render the SVG content of a single view, including measurements
export default function SvgView({
  viewItemData,
  onPathClick,
  // Receive measurement props
  measurements,
  // Receive snap points array prop
  snapPoints,
  // onMeasurementUpdate, // REMOVED - Update is handled via hook callback
  // Removed onMeasurementDragStart
  // zoomLevel, // zoomLevel is not needed here anymore
}) {
  const { id: viewId, viewType, svgData } = viewItemData;
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
        <g fill="none"> {/* Removed default stroke and strokeWidth */}
          {paths.map((path) => {
            const isHidden = path.id?.includes('_hidden');
            const stroke = isHidden ? '#888888' : '#333333';
            const strokeWidth = isHidden ? 0.35 : 0.5; // Slightly thinner for hidden lines
            const strokeDasharray = isHidden ? '4 2' : 'none';

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
              // onUpdatePosition={onMeasurementUpdate} // REMOVED - Update is handled via hook callback
              // Removed onDragStart
            />
          ))}
          {/* Render highlights for all relevant snap points */}
          {relevantSnapPoints.map((snapPoint, index) => (
            <circle
              key={`snap-highlight-${index}`}
              cx={snapPoint.coordinates.x}
              cy={snapPoint.coordinates.y}
              r="4" // Increased radius slightly
              // fill="#ff00ff" // DEBUG: Temporarily fill to check rendering
              fill="none" // Keep fill as none for final
              stroke="#ff00ff" // Magenta color for visibility
              strokeWidth="2" // Increased strokeWidth significantly
              style={{ pointerEvents: 'none', vectorEffect: 'non-scaling-stroke' }} // Ensure it doesn't interfere with clicks and scales correctly
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
