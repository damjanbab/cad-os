import React, { useCallback, memo } from 'react'; // Import useCallback and memo here

/**
 * Renders a single SVG path - Memoized
 */
// Add interactionMode and onSnapClick to props
const PathElementComponent = ({
  path,
  stroke,
  strokeWidth,
  strokeDasharray,
  onPathClick, // For measure mode
  onSnapClick, // For snap mode
  interactionMode, // Current mode
  viewInstanceId,
  partName,
  partIndex
}) => {
  if (!path) return null;

  // Internal handler to call the correct prop based on mode and stop propagation
  const handleClick = useCallback((event) => {
    if (interactionMode === 'deleteLine') {
      // In deleteLine mode, we want SvgView's onClick to handle the deletion.
      // Do not stop propagation here, and do not call any local handlers from PathElement.
      // The event will bubble to SvgView, which calls TechnicalDrawingCanvas.handleSnapClick.
      console.log(`[PathElement ${path.id}] Clicked in deleteLine mode. Allowing event to bubble to SvgView.`);
      return; // Let SvgView handle it
    }

    // For other modes (measure, snap, customLine), stop propagation and handle locally.
    event.stopPropagation(); // Prevent click from bubbling to parent cell/SvgView for these modes.

    if ((interactionMode === 'snap' || interactionMode === 'customLine') && onSnapClick) {
      // In snap or customLine mode, call onSnapClick, passing the event and viewInstanceId
      // The main snap handler in TechnicalDrawingCanvas will use event.target
      // to identify the clicked path and its geometry if needed.
      console.log(`[PathElement ${path.id}] Clicked in ${interactionMode} mode. Calling onSnapClick.`);
      onSnapClick(event, viewInstanceId);
    } else if (interactionMode === 'measure' && onPathClick) {
      // In measure mode, call onPathClick as before
      console.log(`[PathElement ${path.id}] Clicked in measure mode. Calling onPathClick.`);
      onPathClick(event, path.id, path, partName, partIndex, viewInstanceId);
    } else {
      // This case should ideally not be reached if interactionMode is one of the handled ones.
      // If interactionMode is 'text', SvgView handles it, and PathElement shouldn't get a click for text placement.
      console.warn(`[PathElement ${path.id}] Clicked with unhandled mode ('${interactionMode}') or missing handler.`);
    }
  }, [interactionMode, onPathClick, onSnapClick, path, partName, partIndex, viewInstanceId]); // Add dependencies

  // Handle different path formats
  const pathData = path.data || (typeof path === 'string' ? path : String(path));

  // Use the already unique path.id generated by the processor
  const uniquePathId = path.id;
  // Ensure strokeWidth is a valid number, default to 1 if not
  const validStrokeWidth = typeof strokeWidth === 'number' && !isNaN(strokeWidth) ? strokeWidth : 1;
  const clickTargetStrokeWidth = Math.max(5, validStrokeWidth * 5); // Make click target wider, at least 5 units

  // Prepare data attributes for snapping
  const dataAttributes = {};
  if (path.geometry?.type) {
    dataAttributes['data-geometry-type'] = path.geometry.type;
    if (path.geometry.type === 'line' && path.geometry.endpoints) {
      // Stringify endpoints for the data attribute
      try {
        dataAttributes['data-endpoints'] = JSON.stringify(path.geometry.endpoints);
      } catch (e) {
        console.error("Failed to stringify endpoints for path:", uniquePathId, e);
      }
    }
  }

  // Use vector-effect to keep stroke width consistent regardless of SVG scaling
  const isCustomLine = path.type === 'customLine' && path.geometry?.type === 'line' && Array.isArray(path.geometry.endpoints) && path.geometry.endpoints.length === 2;
  const handleRadius = 2 / (strokeWidth > 0 ? Math.sqrt(strokeWidth) : 1); // Adjust handle size based on zoom/stroke, ensure strokeWidth > 0

  return (
    <g>
      {/* Visible Path */}
      <path
        d={pathData}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={strokeDasharray}
        style={{ vectorEffect: 'non-scaling-stroke', pointerEvents: 'none' }} // Disable pointer events on visible path
      />
      {/* Invisible Click Target Path */}
      <path
        id={uniquePathId} // ID is now on the click target
        d={pathData}
        stroke="transparent" // Invisible
        strokeWidth={clickTargetStrokeWidth} // Much wider for easier clicking
        fill="none"
        style={{ vectorEffect: 'non-scaling-stroke', cursor: 'pointer' }} // Cursor on the click target
        onClick={handleClick} // Click handler on the click target
        {...dataAttributes} // Spread the data attributes onto the element
      />
      {/* Endpoint Handles for Custom Lines */}
      {isCustomLine && (
        <>
          <circle
            cx={path.geometry.endpoints[0][0]}
            cy={path.geometry.endpoints[0][1]}
            r={handleRadius}
            fill="dodgerblue"
            stroke="white"
            strokeWidth={0.5 / (strokeWidth > 0 ? Math.sqrt(strokeWidth) : 1)} // Scale stroke too
            className="line-endpoint-handle line-endpoint-handle-start"
            style={{ pointerEvents: 'none' }} // Handles shouldn't block clicks on the line itself
          />
          <circle
            cx={path.geometry.endpoints[1][0]}
            cy={path.geometry.endpoints[1][1]}
            r={handleRadius}
            fill="dodgerblue"
            stroke="white"
            strokeWidth={0.5 / (strokeWidth > 0 ? Math.sqrt(strokeWidth) : 1)} // Scale stroke too
            className="line-endpoint-handle line-endpoint-handle-end"
            style={{ pointerEvents: 'none' }}
          />
        </>
      )}
    </g>
  );
};

export default memo(PathElementComponent); // Export the memoized component
