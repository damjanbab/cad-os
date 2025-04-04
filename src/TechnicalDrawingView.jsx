import React, { useEffect, useRef, useState } from 'react';

/**
 * Helper function to parse SVG viewBox string
 */
function parseViewBox(viewBoxString) {
  if (!viewBoxString || typeof viewBoxString !== 'string') {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  const parts = viewBoxString.split(' ').map(parseFloat);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  // Ensure width and height are positive, fallback to 1 if zero or negative
  const width = parts[2] > 0 ? parts[2] : 1;
  const height = parts[3] > 0 ? parts[3] : 1;

  return { x: parts[0], y: parts[1], width: width, height: height };
}

/**
 * Renders a single SVG path
 */
// Removed isHighlighted prop
function PathElement({ path, stroke, strokeWidth, strokeDasharray, onClick, viewId }) {
  if (!path) return null;

  // Handle different path formats
  const pathData = path.data || (typeof path === 'string' ? path : String(path));

  // Generate a unique identifier for this specific path in this specific view
  const uniquePathId = `${viewId}_${path.id}`;

  // Use vector-effect to keep stroke width consistent regardless of SVG scaling
  return (
    <path
      id={uniquePathId}
      d={pathData}
      stroke={stroke} // Removed conditional highlighting stroke
      strokeWidth={strokeWidth}
      fill="none"
      strokeDasharray={strokeDasharray}
      style={{ vectorEffect: 'non-scaling-stroke', cursor: 'pointer' }}
      onClick={() => onClick && onClick(uniquePathId, path)} // Pass unique ID and path object
    />
  );
}

// --- Measurement Display Component ---
function MeasurementDisplay({ measurementData, svgRef, onUpdatePosition }) {
  const { pathId, type, geometry, textPosition, viewId } = measurementData;
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 }); // Screen coords
  const [dragStartTextPos, setDragStartTextPos] = useState({ x: 0, y: 0 }); // SVG coords

  const handleMouseDown = (e) => {
    // Use currentTarget to ensure we get the SVG element for coordinate transforms
    if (!svgRef?.current) return;
    e.stopPropagation(); // Prevent triggering pan
    setIsDragging(true);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setDragStartTextPos(textPosition); // Store initial SVG position
    // Add global listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !svgRef?.current) return;

    const dxScreen = e.clientX - dragStartPos.x;
    const dyScreen = e.clientY - dragStartPos.y;

    // Convert screen delta to SVG delta (approximately, ignoring rotation/skew)
    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const svgDeltaX = dxScreen / ctm.a;
    const svgDeltaY = dyScreen / ctm.d;

    const newTextPos = {
      x: dragStartTextPos.x + svgDeltaX,
      y: dragStartTextPos.y + svgDeltaY,
    };
    onUpdatePosition(pathId, newTextPos); // Update state in parent
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    // Remove global listeners
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  };

  // Touch handlers (similar logic)
  const handleTouchStart = (e) => {
     if (!svgRef?.current || e.touches.length !== 1) return;
     e.stopPropagation();
     const touch = e.touches[0];
     setIsDragging(true);
     setDragStartPos({ x: touch.clientX, y: touch.clientY });
     setDragStartTextPos(textPosition);
     window.addEventListener('touchmove', handleTouchMove, { passive: false });
     window.addEventListener('touchend', handleTouchEnd);
     window.addEventListener('touchcancel', handleTouchEnd);
  };

   const handleTouchMove = (e) => {
    if (!isDragging || !svgRef?.current || e.touches.length !== 1) return;
    e.preventDefault(); // Prevent scrolling while dragging measurement
    const touch = e.touches[0];
    const dxScreen = touch.clientX - dragStartPos.x;
    const dyScreen = touch.clientY - dragStartPos.y;

    const ctm = svgRef.current.getScreenCTM();
    if (!ctm) return;
    const svgDeltaX = dxScreen / ctm.a;
    const svgDeltaY = dyScreen / ctm.d;

    const newTextPos = {
      x: dragStartTextPos.x + svgDeltaX,
      y: dragStartTextPos.y + svgDeltaY,
    };
    onUpdatePosition(pathId, newTextPos);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('touchcancel', handleTouchEnd);
  };


  // --- Rendering Logic ---
  const strokeColor = "#000000"; // Black
  const strokeWidth = 0.3;
  const fontSize = 3; // Relative SVG units
  const arrowSize = 1.5; // Relative SVG units
  const textOffset = 1; // Offset text from dimension line

  let elements = null;

  if (type === 'line' && geometry.endpoints) {
    const [p1, p2] = geometry.endpoints;
    const length = geometry.length || 0;
    const textContent = length.toFixed(2);

    // Vector from p1 to p2
    const vx = p2[0] - p1[0];
    const vy = p2[1] - p1[1];

    // Midpoint
    const midX = (p1[0] + p2[0]) / 2;
    const midY = (p1[1] + p2[1]) / 2;

    // Normalized vector along the line
    const lineLen = Math.sqrt(vx * vx + vy * vy);
    const ux = lineLen > 1e-6 ? vx / lineLen : 1; // Unit vector along line
    const uy = lineLen > 1e-6 ? vy / lineLen : 0;
    const nx = -uy; // Normal vector (perpendicular)
    const ny = ux;

    // Vector from midpoint to text position
    const textOffsetX = textPosition.x - midX;
    const textOffsetY = textPosition.y - midY;

    // Project the text offset onto the normal vector to find the dimension line offset
    const offsetDist = textOffsetX * nx + textOffsetY * ny;
    // Use a minimum offset if text is too close to the line
    const actualOffsetDist = Math.abs(offsetDist) < textOffset ? Math.sign(offsetDist || 1) * textOffset : offsetDist;

    // Calculate dimension line points, parallel to original line, offset by actualOffsetDist
    const dimLineP1 = [p1[0] + nx * actualOffsetDist, p1[1] + ny * actualOffsetDist];
    const dimLineP2 = [p2[0] + nx * actualOffsetDist, p2[1] + ny * actualOffsetDist];

    // Extension lines: Start near the original points (p1, p2) and extend past the dimension line.
    const extensionGap = 1.0; // Small gap from the geometry
    const extensionOverhang = 1.5; // How much to extend past the dimension line

    // Start points (offset slightly from p1/p2 along the normal)
    const extLineP1Start = [p1[0] + nx * Math.sign(actualOffsetDist) * extensionGap, p1[1] + ny * Math.sign(actualOffsetDist) * extensionGap];
    const extLineP2Start = [p2[0] + nx * Math.sign(actualOffsetDist) * extensionGap, p2[1] + ny * Math.sign(actualOffsetDist) * extensionGap];

    // End points (extend past the dimension line along the normal)
    const extLineP1End = [dimLineP1[0] + nx * Math.sign(actualOffsetDist) * extensionOverhang, dimLineP1[1] + ny * Math.sign(actualOffsetDist) * extensionOverhang];
    const extLineP2End = [dimLineP2[0] + nx * Math.sign(actualOffsetDist) * extensionOverhang, dimLineP2[1] + ny * Math.sign(actualOffsetDist) * extensionOverhang];


    // Arrowheads - use the actual dimension line direction (ux, uy)
    const arrowVecX = dimLineP2[0] - dimLineP1[0];
    const arrowVecY = dimLineP2[1] - dimLineP1[1];
    const arrowLen = lineLen; // Length is the same as the original line
    const arrowNormX = ux; // Direction is the same as the original line
    const arrowNormY = uy;

    // Arrowheads point along the dimension line (parallel to original line)
    const arrow1 = `M ${dimLineP1[0]} ${dimLineP1[1]} l ${arrowNormX * arrowSize - arrowNormY * arrowSize / 2} ${arrowNormY * arrowSize + arrowNormX * arrowSize / 2} l ${arrowNormY * arrowSize} ${-arrowNormX * arrowSize} z`;
    const arrow2 = `M ${dimLineP2[0]} ${dimLineP2[1]} l ${-arrowNormX * arrowSize - arrowNormY * arrowSize / 2} ${-arrowNormY * arrowSize + arrowNormX * arrowSize / 2} l ${arrowNormY * arrowSize} ${-arrowNormX * arrowSize} z`;


    // Calculate points for broken dimension line
    const textWidthEstimate = textContent.length * fontSize * 0.6; // Rough estimate
    const gapSize = textWidthEstimate + textOffset * 2; // Add padding
    const halfGap = gapSize / 2;

    // Project text position onto the dimension line direction
    // Project text position onto the dimension line direction (relative to the start of the dim line)
    const textProj = (textPosition.x - dimLineP1[0]) * arrowNormX + (textPosition.y - dimLineP1[1]) * arrowNormY;

    // Points for the two segments of the dimension line, clamped by arrow positions
    const breakStartPos = Math.max(arrowSize, textProj - halfGap);
    const breakEndPos = Math.min(arrowLen - arrowSize, textProj + halfGap);

    const dimLine1End = [dimLineP1[0] + arrowNormX * breakStartPos, dimLineP1[1] + arrowNormY * breakStartPos];
    const dimLine2Start = [dimLineP1[0] + arrowNormX * breakEndPos, dimLineP1[1] + arrowNormY * breakEndPos];

    // Determine if segments should be shown
    const showDimLine1 = breakStartPos > arrowSize + 1e-6; // Add tolerance
    const showDimLine2 = breakEndPos < arrowLen - arrowSize - 1e-6; // Add tolerance


    elements = (
      <g stroke={strokeColor} strokeWidth={strokeWidth} fill="none"> {/* Set fill to none for the group */}
        {/* Extension Lines */}
        <line x1={extLineP1Start[0]} y1={extLineP1Start[1]} x2={extLineP1End[0]} y2={extLineP1End[1]} />
        <line x1={extLineP2Start[0]} y1={extLineP2Start[1]} x2={extLineP2End[0]} y2={extLineP2End[1]} />
        {/* Dimension Line (broken) */}
        {showDimLine1 && <line x1={dimLineP1[0]} y1={dimLineP1[1]} x2={dimLine1End[0]} y2={dimLine1End[1]} />}
        {showDimLine2 && <line x1={dimLine2Start[0]} y1={dimLine2Start[1]} x2={dimLineP2[0]} y2={dimLineP2[1]} />}
        {/* Arrowheads */}
        <path d={arrow1} stroke="none" fill={strokeColor}/>
        <path d={arrow2} stroke="none" fill={strokeColor}/>
        {/* Text */}
        <text
          x={textPosition.x}
          y={textPosition.y}
          fontSize={fontSize}
          fill={strokeColor}
          stroke="none"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ cursor: 'move', userSelect: 'none', vectorEffect: 'non-scaling-stroke' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {textContent}
        </text>
      </g>
    );

  } else if (type === 'circle' && geometry.center && geometry.diameter != null) {
    const [cx, cy] = geometry.center;
    const diameter = geometry.diameter;
    const radius = geometry.radius || diameter / 2;
    const textContent = `⌀${diameter.toFixed(2)}`;

    // Calculate line endpoints based on text position relative to center
    const textVecX = textPosition.x - cx;
    const textVecY = textPosition.y - cy;
    const distSqr = textVecX * textVecX + textVecY * textVecY; // Use squared distance

    // Determine the angle for the diameter line based on text position
    let angle;
    if (distSqr < 1e-9) { // If text is very close to center, default to horizontal
        angle = 0;
    } else {
        angle = Math.atan2(textVecY, textVecX);
    }

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Endpoints of the diameter line
    const dimLineP1 = [cx - cosA * radius, cy - sinA * radius];
    const dimLineP2 = [cx + cosA * radius, cy + sinA * radius];

    // Arrowheads (pointing inwards along the diameter line)
    const arrow1 = `M ${dimLineP1[0]} ${dimLineP1[1]} l ${cosA * arrowSize - sinA * arrowSize / 2} ${sinA * arrowSize + cosA * arrowSize / 2} l ${sinA * arrowSize} ${-cosA * arrowSize} z`;
    const arrow2 = `M ${dimLineP2[0]} ${dimLineP2[1]} l ${-cosA * arrowSize - sinA * arrowSize / 2} ${-sinA * arrowSize + cosA * arrowSize / 2} l ${sinA * arrowSize} ${-cosA * arrowSize} z`;


     // Calculate points for broken dimension line
    const textWidthEstimate = textContent.length * fontSize * 0.6; // Rough estimate
    const gapSize = textWidthEstimate + textOffset * 2; // Add padding
    const halfGap = gapSize / 2;

    // Project text position onto the dimension line direction (relative to center)
    const textProjDist = vec.dot([textVecX, textVecY], [cosA, sinA]);

    // Points for the two segments of the dimension line
    // Clamp the break points to be within the radius +/- arrow size
    const startClamp = -radius + arrowSize;
    const endClamp = radius - arrowSize;
    const breakStart = Math.max(startClamp, Math.min(endClamp, textProjDist - halfGap));
    const breakEnd = Math.max(startClamp, Math.min(endClamp, textProjDist + halfGap));

    const dimLine1End = [cx + cosA * breakStart, cy + sinA * breakStart];
    const dimLine2Start = [cx + cosA * breakEnd, cy + sinA * breakEnd];

    // Check if segments have valid length
    const showDimLine1 = vec.len(vec.sub(dimLine1End, dimLineP1)) > 1e-6;
    const showDimLine2 = vec.len(vec.sub(dimLineP2, dimLine2Start)) > 1e-6;


    elements = (
      <g stroke={strokeColor} strokeWidth={strokeWidth} fill="none"> {/* Set fill to none for the group */}
        {/* Dimension Line (broken) */}
        {showDimLine1 && <line x1={dimLineP1[0]} y1={dimLineP1[1]} x2={dimLine1End[0]} y2={dimLine1End[1]} />}
        {showDimLine2 && <line x1={dimLine2Start[0]} y1={dimLine2Start[1]} x2={dimLineP2[0]} y2={dimLineP2[1]} />}
        {/* Arrowheads */}
        <path d={arrow1} stroke="none" fill={strokeColor}/>
        <path d={arrow2} stroke="none" fill={strokeColor}/>
         {/* Text */}
         <text
          x={textPosition.x}
          y={textPosition.y}
          fontSize={fontSize}
          fill={strokeColor}
          stroke="none"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ cursor: 'move', userSelect: 'none', vectorEffect: 'non-scaling-stroke' }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {textContent}
        </text>
      </g>
    );
  }

  return elements;
}
// --- End Measurement Display Component ---


// Projection View Component
// Removed highlightedGroups prop
// Added activeMeasurements, onMeasurementUpdate props (svgRef is now local)
function ProjectionView({ projection, title, position, dimensions, scale, onPathClick, viewId, activeMeasurements, onMeasurementUpdate }) {
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
                // Removed isHighlighted prop
                onClick={onPathClick}
                viewId={viewId}
              />
            ))}
          </g>

          {/* Draw visible lines SECOND (on top) so they visually override hidden lines */}
          <g>
            {(projection.visible?.paths || []).map((path, i) => (
              // Removed React.Fragment and conditional center marker rendering
              <PathElement
                key={`${viewId}_visible_${path.id || i}`} // Use path.id if available
                path={path}
                stroke="#000000"
                strokeWidth="0.5"
                strokeDasharray={null}
                // Removed isHighlighted prop
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

// Component to render individual part views
// Removed highlightedGroups prop
// Added activeMeasurements, onMeasurementUpdate props (svgRef is now local)
function PartView({ part, index, scale, onPathClick, activeMeasurements, onMeasurementUpdate }) {
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
    frontWidth = frontViewData.width * scale;
    frontHeight = frontViewData.height * scale;
  }

  if (topView) {
    topViewData = parseViewBox(topView.combinedViewBox);
    topWidth = topViewData.width * scale;
    topHeight = topViewData.height * scale;
  }

  if (rightView) {
    rightViewData = parseViewBox(rightView.combinedViewBox);
    rightWidth = rightViewData.width * scale;
    rightHeight = rightViewData.height * scale;
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
        {frontView && (
          <div style={{
            position: 'absolute',
            top: '0',
            left: '0',
            width: `${frontWidth}px`,
            height: `${frontHeight + titleHeight}px`,
            border: '1px solid #ddd',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '3px',
              height: `${titleHeight}px`,
              borderBottom: '1px solid #ddd',
              fontSize: '10px',
              boxSizing: 'border-box',
              flexShrink: 0
            }}>
              Front
            </div>
            <div style={{
              width: '100%',
              flexGrow: 1,
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
                      // Removed isHighlighted prop
                      onClick={onPathClick}
                      viewId={frontViewId}
                    />
                  ))}
                </g>

                {/* Draw visible lines SECOND (on top) */}
                <g>
                  {(frontView.visible?.paths || []).map((path, i) => (
                    // Removed React.Fragment and conditional center marker rendering
                    <PathElement
                      key={`${frontViewId}_visible_${path.id || i}`}
                      path={path}
                      stroke="#000000"
                      strokeWidth="0.5"
                      strokeDasharray={null}
                      // Removed isHighlighted prop
                      onClick={onPathClick}
                      viewId={frontViewId}
                    />
                  ))}
                </g>
                 {/* Render Measurements for this view */}
                <g>
                  {Object.values(activeMeasurements)
                    .filter(m => m.viewId === frontViewId)
                    .map(measurement => (
                      <MeasurementDisplay
                        key={measurement.pathId}
                        measurementData={measurement}
                        svgRef={frontSvgRef} // Pass correct ref
                        onUpdatePosition={onMeasurementUpdate}
                      />
                    ))}
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* Top View - positioned below Front View */}
        {topView && (
          <div style={{
            position: 'absolute',
            top: `${frontHeight + titleHeight + layoutGap}px`,
            left: `${(frontWidth - topWidth) / 2}px`, // Center below front view
            width: `${topWidth}px`,
            height: `${topHeight + titleHeight}px`,
            border: '1px solid #ddd',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '3px',
              height: `${titleHeight}px`,
              borderBottom: '1px solid #ddd',
              fontSize: '10px',
              boxSizing: 'border-box',
              flexShrink: 0
            }}>
              Top
            </div>
            <div style={{
              width: '100%',
              flexGrow: 1,
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
                      // Removed isHighlighted prop
                      onClick={onPathClick}
                      viewId={topViewId}
                    />
                  ))}
                </g>

                {/* Draw visible lines SECOND (on top) */}
                <g>
                  {(topView.visible?.paths || []).map((path, i) => (
                    // Removed React.Fragment and conditional center marker rendering
                    <PathElement
                      key={`${topViewId}_visible_${path.id || i}`}
                      path={path}
                      stroke="#000000"
                      strokeWidth="0.5"
                      strokeDasharray={null}
                      // Removed isHighlighted prop
                      onClick={onPathClick}
                      viewId={topViewId}
                    />
                  ))}
                </g>
                 {/* Render Measurements for this view */}
                 <g>
                  {Object.values(activeMeasurements)
                    .filter(m => m.viewId === topViewId)
                    .map(measurement => (
                      <MeasurementDisplay
                        key={measurement.pathId}
                        measurementData={measurement}
                        svgRef={topSvgRef} // Pass correct ref
                        onUpdatePosition={onMeasurementUpdate}
                      />
                    ))}
                </g>
              </svg>
            </div>
          </div>
        )}

        {/* Right View - positioned to the right of Front View */}
        {rightView && (
          <div style={{
            position: 'absolute',
            top: `${(frontHeight - rightHeight) / 2}px`, // Center vertically relative to front view
            left: `${frontWidth + layoutGap}px`, // To the right of front view
            width: `${rightWidth}px`,
            height: `${rightHeight + titleHeight}px`,
            border: '1px solid #ddd',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '3px',
              height: `${titleHeight}px`,
              borderBottom: '1px solid #ddd',
              fontSize: '10px',
              boxSizing: 'border-box',
              flexShrink: 0
            }}>
              Right
            </div>
            <div style={{
              width: '100%',
              flexGrow: 1,
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
                      // Removed isHighlighted prop
                      onClick={onPathClick}
                      viewId={rightViewId}
                    />
                  ))}
                </g>

                {/* Draw visible lines SECOND (on top) */}
                <g>
                  {(rightView.visible?.paths || []).map((path, i) => (
                    // Removed React.Fragment and conditional center marker rendering
                    <PathElement
                      key={`${rightViewId}_visible_${path.id || i}`}
                      path={path}
                      stroke="#000000"
                      strokeWidth="0.5"
                      strokeDasharray={null}
                      // Removed isHighlighted prop
                      onClick={onPathClick}
                      viewId={rightViewId}
                    />
                  ))}
                </g>
                 {/* Render Measurements for this view */}
                 <g>
                  {Object.values(activeMeasurements)
                    .filter(m => m.viewId === rightViewId)
                    .map(measurement => (
                      <MeasurementDisplay
                        key={measurement.pathId}
                        measurementData={measurement}
                        svgRef={rightSvgRef} // Pass correct ref
                        onUpdatePosition={onMeasurementUpdate}
                      />
                    ))}
                </g>
              </svg>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper to parse SVG path data and extract actual separate path segments
function parseSVGPathData(pathData) {
  if (!pathData || typeof pathData !== 'string') {
    return null;
  }

  // Find all move commands (M or m) which start new subpaths
  const moveCommandRegex = /[Mm][\s,]*([-\d.]+)[\s,]*([-\d.]+)/g;
  const matches = [...pathData.matchAll(moveCommandRegex)];

  if (matches.length <= 1) {
    return null; // No subpaths or just one path
  }

  // Extract subpaths
  const subpaths = [];
  for (let i = 0; i < matches.length; i++) {
    const startIndex = matches[i].index;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index : pathData.length;
    subpaths.push(pathData.substring(startIndex, endIndex).trim());
  }

  return subpaths.length > 1 ? subpaths : null;
}

// --- Geometry Helper Functions ---
// Basic vector operations
const vec = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1]],
  scale: (a, s) => [a[0] * s, a[1] * s],
  len: (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1]),
  normalize: (a) => {
    const l = vec.len(a);
    return l > 1e-9 ? vec.scale(a, 1 / l) : [0, 0];
  },
  perp: (a) => [-a[1], a[0]], // Perpendicular vector (rotated 90 deg CCW)
  dot: (a, b) => a[0] * b[0] + a[1] * b[1],
};

// Convert screen coords to SVG coords
// NOTE: This still needs refinement to get the correct SVG target element's CTM
// when multiple SVGs are present (e.g., in PartView).
// Passing the viewContainerRef is a temporary approximation.
function screenToSVGCoords(svgElement, x, y) {
  if (!svgElement) return { x: 0, y: 0 };
  const pt = svgElement.createSVGPoint();
  pt.x = x;
  pt.y = y;
  // Need to get the CTM of the specific SVG view being interacted with,
  // not the outer container's SVG. This needs refinement.
  // For now, assume we get the correct CTM somehow.
  const ctm = svgElement.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  try {
      const svgP = pt.matrixTransform(ctm.inverse());
      return { x: svgP.x, y: svgP.y };
  } catch (e) {
      console.error("Error inverting CTM:", e);
      return { x: 0, y: 0 }; // Fallback on error
  }
}
// --- End Geometry Helper Functions ---


export default function TechnicalDrawingView({ projections, isMobile }) {
  if (!projections) return <div>Loading projections...</div>;

  const containerRef = useRef(null);
  // Ref for the main container div, used for pan/zoom calculations
  // We might need separate refs for each SVG view for accurate CTM in MeasurementDisplay
  const viewContainerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(10); // Initial scale: 10 pixels per cm
  // State for active measurements, keyed by uniquePathId
  const [activeMeasurements, setActiveMeasurements] = useState({});

  // For tracking mouse position and dragging (for panning)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

  // Handler to update measurement text position (passed to MeasurementDisplay)
  const handleMeasurementUpdate = (pathId, newPosition) => {
    setActiveMeasurements(prev => ({
      ...prev,
      [pathId]: {
        ...prev[pathId],
        textPosition: newPosition,
      }
    }));
  };

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
        // TODO: Calculate a better initial text position
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

        newMeasurements[uniquePathId] = {
          pathId: uniquePathId,
          type: path.geometry.type,
          geometry: path.geometry,
          textPosition: initialTextPosition,
          viewId: uniquePathId.split('_')[0] + '_' + uniquePathId.split('_')[1], // Extract viewId (e.g., standard_front)
        };
        console.log(`--- Added Measurement ---`);
        console.log(`  ID: ${uniquePathId}`);
        console.log(`  Type: ${path.geometry.type}`);
        console.log(`  Geometry:`, path.geometry);
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

  // Mouse wheel zoom that zooms to cursor position
  const handleWheel = (e) => {
    e.preventDefault();
    if (!containerRef.current) return;

    // Get container bounds
    const rect = containerRef.current.getBoundingClientRect();

    // Calculate cursor position relative to the container
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Get cursor position relative to content (accounting for current pan/zoom)
    const cursorXInContent = (x - panOffset.x) / zoomLevel;
    const cursorYInContent = (y - panOffset.y) / zoomLevel;

    // Calculate zoom delta and new zoom level
    const delta = -Math.sign(e.deltaY) * 0.1;
    const newZoom = Math.max(0.1, Math.min(10, zoomLevel + delta * zoomLevel));

    // Calculate new pan offset to keep cursor point stationary
    const newPanOffsetX = x - cursorXInContent * newZoom;
    const newPanOffsetY = y - cursorYInContent * newZoom;

    // Update state
    setZoomLevel(newZoom);
    setPanOffset({ x: newPanOffsetX, y: newPanOffsetY });
  };

  // Mouse handlers for panning
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartOffset({ ...panOffset });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPanOffset({
      x: dragStartOffset.x + dx,
      y: dragStartOffset.y + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile panning
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setDragStartOffset({ ...panOffset });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.x;
    const dy = touch.clientY - dragStart.y;
    setPanOffset({
      x: dragStartOffset.x + dx,
      y: dragStartOffset.y + dy
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Reset zoom and pan
  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setActiveMeasurements({}); // Reset measurements
  };

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
        touchAction: 'none'
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Controls Overlay */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '8px' : '10px',
        right: isMobile ? '8px' : '10px',
        zIndex: 100,
        backgroundColor: 'rgba(255,255,255,0.8)',
        padding: isMobile ? '8px' : '5px 10px',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '8px' : '5px'
      }}>
        {/* Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            title="Zoom Out"
            style={{
              margin: '0 2px',
              padding: isMobile ? '5px 10px' : '2px 6px',
              cursor: 'pointer',
              fontSize: isMobile ? '16px' : 'inherit'
            }}
            onClick={() => {
              const newZoom = Math.max(0.1, zoomLevel - 0.1 * zoomLevel);
              // Update zoom and pan
              setZoomLevel(newZoom);
              // Adjust pan to keep center focused
              const centerX = containerSize.width / 2;
              const centerY = containerSize.height / 2;
              const centerXInContent = (centerX - panOffset.x) / zoomLevel;
              const centerYInContent = (centerY - panOffset.y) / zoomLevel;
              const newPanOffsetX = centerX - centerXInContent * newZoom;
              const newPanOffsetY = centerY - centerYInContent * newZoom;
              setPanOffset({ x: newPanOffsetX, y: newPanOffsetY });
            }}
          >
            −
          </button>
          <span style={{
            margin: '0 5px',
            fontSize: isMobile ? '14px' : '12px',
            minWidth: '35px',
            textAlign: 'center'
          }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            title="Zoom In"
            style={{
              margin: '0 2px',
              padding: isMobile ? '5px 10px' : '2px 6px',
              cursor: 'pointer',
              fontSize: isMobile ? '16px' : 'inherit'
            }}
            onClick={() => {
              const newZoom = Math.min(10, zoomLevel + 0.1 * zoomLevel);
              // Update zoom and pan
              setZoomLevel(newZoom);
              // Adjust pan to keep center focused
              const centerX = containerSize.width / 2;
              const centerY = containerSize.height / 2;
              const centerXInContent = (centerX - panOffset.x) / zoomLevel;
              const centerYInContent = (centerY - panOffset.y) / zoomLevel;
              const newPanOffsetX = centerX - centerXInContent * newZoom;
              const newPanOffsetY = centerY - centerYInContent * newZoom;
              setPanOffset({ x: newPanOffsetX, y: newPanOffsetY });
            }}
          >
            +
          </button>
          <button
            title="Reset View"
            style={{
              margin: '0 0 0 10px',
              padding: isMobile ? '5px 10px' : '2px 8px',
              cursor: 'pointer',
              fontSize: isMobile ? '14px' : 'inherit'
            }}
            onClick={resetView}
          >
            Reset
          </button>
        </div>

        {/* Scale Control */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <label htmlFor="scaleSlider" style={{ fontSize: isMobile ? '12px' : '10px', marginRight: '5px' }}>
            Scale:
          </label>
          <input
            type="range"
            id="scaleSlider"
            min="1"
            max="100"
            step="1"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            style={{ cursor: 'pointer', width: '80px' }}
            title={`Scale: ${scale} px/cm`}
          />
          <span style={{
            margin: '0 5px',
            fontSize: isMobile ? '12px' : '10px',
            minWidth: '45px',
            textAlign: 'right'
          }}>
            {scale} px/cm
          </span>
        </div>
      </div>

      {/* Content Area with Pan/Zoom transform */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
        transformOrigin: '0 0',
      }}
      ref={viewContainerRef} // Add ref to the zoomable/pannable container
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
                scale={scale}
                // Removed highlightedGroups prop
                onPathClick={handlePathClick}
                viewId={standardFrontViewId}
                activeMeasurements={activeMeasurements} // Pass state
                svgRef={viewContainerRef} // Pass ref (needs refinement for specific SVG)
                onMeasurementUpdate={handleMeasurementUpdate} // Pass handler
              />
            )}

            {/* Top View - now positioned below Front View */}
            {standardViews.topView && topViewData && (
              <ProjectionView
                projection={standardViews.topView}
                title="Top View"
                position={topPos}
                dimensions={{ width: topWidth, height: topHeight }}
                scale={scale}
                // Removed highlightedGroups prop
                onPathClick={handlePathClick}
                viewId={standardTopViewId}
                activeMeasurements={activeMeasurements} // Pass state
                // Removed svgRef prop
                onMeasurementUpdate={handleMeasurementUpdate} // Pass handler
              />
            )}

            {/* Right View */}
            {standardViews.rightView && rightViewData && (
              <ProjectionView
                projection={standardViews.rightView}
                title="Right View"
                position={rightPos}
                dimensions={{ width: rightWidth, height: rightHeight }}
                scale={scale}
                // Removed highlightedGroups prop
                onPathClick={handlePathClick}
                viewId={standardRightViewId}
                activeMeasurements={activeMeasurements} // Pass state
                // Removed svgRef prop
                onMeasurementUpdate={handleMeasurementUpdate} // Pass handler
              />
            )}
          </>
        )}

        {/* Part Projections - position below the top view */}
        {projections.parts && projections.parts.length > 0 && (
          <div style={{
            position: 'absolute',
            top: `${initialOffsetY + frontHeight + topHeight + layoutGap * 3}px`,
            left: `${initialOffsetX}px`,
            width: 'max-content'
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
                  // Removed highlightedGroups prop
                  onPathClick={handlePathClick}
                  activeMeasurements={activeMeasurements} // Pass state
                  // Removed svgRef prop
                  onMeasurementUpdate={handleMeasurementUpdate} // Pass handler
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
