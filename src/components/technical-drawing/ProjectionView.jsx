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
              .map(measurement => (
                <MeasurementDisplay
                  key={measurement.pathId}
                  measurementData={measurement}
                  svgRef={svgElementRef} // Pass the correct SVG ref
                  onUpdatePosition={onMeasurementUpdate} // Pass update handler
                />
              ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
