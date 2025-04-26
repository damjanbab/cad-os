import React, { useRef } from 'react'; // Import useRef
import PathElement from './PathElement.jsx'; // Reuse PathElement for rendering
import MeasurementDisplay from './MeasurementDisplay.jsx'; // Import MeasurementDisplay

// Component to render the SVG content of a single view, including measurements
export default function SvgView({
  viewItemData,
  onPathClick,
  // Receive measurement props
  measurements,
  onMeasurementUpdate, // Receive update handler again
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

  return (
    <div style={svgContainerStyle}>
      <svg
        ref={innerSvgRef} // Assign ref to the SVG element
        width="100%"
        height="100%"
        viewBox={viewBox} // Use the viewBox from the generated data
        preserveAspectRatio="xMidYMid meet" // Scale SVG to fit, maintain aspect ratio
        style={{ display: 'block' }} // Prevent extra space below SVG
      >
        <g stroke="#333" strokeWidth="0.5" fill="none"> {/* Default styling */}
          {paths.map((path) => (
            <PathElement
              key={path.id}
              path={path}
              onPathClick={onPathClick} // Pass the handler down
              viewInstanceId={viewId} // Pass the unique ID of this SvgView instance
              // isActive={activeMeasurements && activeMeasurements[path.id]} // Keep commented for now
              // partName={partName} // Keep commented for now - partName is on viewItemData if needed
              // partIndex={partIndex} // Pass part context if needed
            />
          ))}
          {/* Render measurements belonging to this view */}
          {measurements && measurements.map(measurement => (
            <MeasurementDisplay
              key={measurement.pathId}
              measurementData={measurement}
              innerSvgRef={innerSvgRef} // Pass the ref down
              onUpdatePosition={onMeasurementUpdate} // Pass update handler down
              // Removed onDragStart
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
