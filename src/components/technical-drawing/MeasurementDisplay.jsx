import React, { useState, useCallback, useRef, useEffect } from 'react'; // Added useState, useRef, useEffect
import { vec } from '../../utils/geometryUtils.js'; // Import vector utils
import { distance } from '../../hooks/useCanvasInteraction.js'; // Import distance helper

// --- Measurement Display Component --- Renders measurement graphics ---
export default function MeasurementDisplay({
  measurementData,
  innerSvgRef, // Receive ref to the parent SVG element
  onUpdatePosition, // Receive update handler (for dragging text)
  onUpdateOverrideValue, // Receive override update handler
  onDeleteMeasurement, // Receive delete handler
}) {
  const { pathId, type, geometry, textPosition, overrideValue } = measurementData; // Added overrideValue
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null); // Ref for the input element


  // --- Rendering Logic --- (No event handlers needed here anymore)
  // --- Restore Original Styles ---
  const strokeColor = "#222222"; // Darker gray for better contrast
  const strokeWidth = 0.15; // Thinner lines for professional look
  const fontSize = 2.2; // Smaller text to fit better
  const arrowSize = 1.2; // Smaller arrows
  const textOffset = 1.2; // Offset text from dimension line
  // --- End Original Styles ---
  const extensionGap = 0.8; // Small gap from the geometry
  const extensionOverhang = 1.2; // How much to extend past the dimension line

  // --- Calculate Display Value ---
  let calculatedValue = '';
  if (type === 'line' && geometry?.length != null) {
    calculatedValue = parseFloat(geometry.length.toFixed(2)).toString();
  } else if (type === 'circle' && geometry?.diameter != null) {
    calculatedValue = `⌀${parseFloat(geometry.diameter.toFixed(2)).toString()}`; // Revert back to Diameter symbol
  } else if (type === 'radius' && geometry?.radius != null) { // Handle radius type
    calculatedValue = `R${parseFloat(geometry.radius.toFixed(2)).toString()}`;
  }
  // Use override if available and not empty, otherwise use calculated
  const displayValue = (overrideValue !== null && overrideValue !== '') ? overrideValue : calculatedValue;

  // --- Edit Mode Handlers ---
  const handleDoubleClick = useCallback(() => {
    console.log(`[MeasurementDisplay ${pathId}] Double clicked. Entering edit mode.`);
    setEditValue(displayValue); // Initialize input with current display value
    setIsEditing(true);
  }, [displayValue, pathId]);

  const handleInputChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleInputBlur = () => {
    if (isEditing && onUpdateOverrideValue) {
      console.log(`[MeasurementDisplay ${pathId}] Input blurred. Updating override to: "${editValue}"`);
      onUpdateOverrideValue(pathId, editValue);
    }
    setIsEditing(false);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (isEditing && onUpdateOverrideValue) {
        console.log(`[MeasurementDisplay ${pathId}] Enter pressed. Updating override to: "${editValue}"`);
        onUpdateOverrideValue(pathId, editValue);
      }
      setIsEditing(false);
      e.preventDefault(); // Prevent potential form submission if wrapped
    } else if (e.key === 'Escape') {
      console.log(`[MeasurementDisplay ${pathId}] Escape pressed. Cancelling edit.`);
      setIsEditing(false); // Cancel edit on Escape
    }
  };

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Select text for easy replacement
    }
  }, [isEditing]);


  let elements = null;

  if (type === 'line' && geometry.endpoints) {
    const [p1, p2] = geometry.endpoints;
    // Use displayValue calculated above
    const textContent = displayValue;

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
    // Start points (offset slightly from p1/p2 along the normal)
    const extLineP1Start = [
      p1[0] + nx * Math.sign(actualOffsetDist) * extensionGap, 
      p1[1] + ny * Math.sign(actualOffsetDist) * extensionGap
    ];
    const extLineP2Start = [
      p2[0] + nx * Math.sign(actualOffsetDist) * extensionGap, 
      p2[1] + ny * Math.sign(actualOffsetDist) * extensionGap
    ];

    // End points (extend past the dimension line along the normal)
    const extLineP1End = [
      dimLineP1[0] + nx * Math.sign(actualOffsetDist) * extensionOverhang, 
      dimLineP1[1] + ny * Math.sign(actualOffsetDist) * extensionOverhang
    ];
    const extLineP2End = [
      dimLineP2[0] + nx * Math.sign(actualOffsetDist) * extensionOverhang, 
      dimLineP2[1] + ny * Math.sign(actualOffsetDist) * extensionOverhang
    ];

    // Arrowheads - use the actual dimension line direction (ux, uy)
    const arrowVecX = dimLineP2[0] - dimLineP1[0];
    const arrowVecY = dimLineP2[1] - dimLineP1[1];
    const arrowLen = lineLen; // Length is the same as the original line
    const arrowNormX = ux; // Direction is the same as the original line
    const arrowNormY = uy;

    // Refined arrowheads with slightly more professional look
    const arrow1 = `M ${dimLineP1[0]} ${dimLineP1[1]} 
                    l ${arrowNormX * arrowSize} ${arrowNormY * arrowSize} 
                    l ${-arrowNormY * arrowSize * 0.35} ${arrowNormX * arrowSize * 0.35} 
                    l ${-arrowNormX * arrowSize * 0.65} ${-arrowNormY * arrowSize * 0.65} 
                    z`;
    
    const arrow2 = `M ${dimLineP2[0]} ${dimLineP2[1]} 
                    l ${-arrowNormX * arrowSize} ${-arrowNormY * arrowSize} 
                    l ${arrowNormY * arrowSize * 0.35} ${-arrowNormX * arrowSize * 0.35} 
                    l ${arrowNormX * arrowSize * 0.65} ${arrowNormY * arrowSize * 0.65} 
                    z`;

    // --- Calculate Text Position ---
    // Place text centered above the dimension line midpoint
    const textX = midX + nx * actualOffsetDist;
    const textY = midY + ny * actualOffsetDist;

    // --- Calculate Rotation for Vertical Lines ---
    let textRotation = 0;
    const angleRad = Math.atan2(vy, vx);
    const angleDeg = angleRad * (180 / Math.PI);
    // Check if the line is primarily vertical (angle between 45-135 or 225-315 degrees)
    if (Math.abs(angleDeg) > 45 && Math.abs(angleDeg) < 135) {
      textRotation = -90; // Rotate for readability from the right
    }

    // --- Calculate Input Position and Size ---
    // Estimate width/height needed for the input based on font size and text length
    const inputWidthEstimate = textContent.length * fontSize * 0.7 + 10;
    const inputWidth = Math.max(50, inputWidthEstimate); // Min width 50
    const inputHeight = fontSize * 1.8;
    // Position input relative to the calculated text position
    const inputX = textX - inputWidth / 2;
    const inputY = textY - inputHeight / 2;

    elements = (
      // Add pathId as the ID for the interaction hook to find
      // Add double-click handler to the group
      <g id={pathId} className="measurement-group" onDoubleClick={handleDoubleClick}>
        {/* Extension Lines */}
        <line
          x1={extLineP1Start[0]} 
          y1={extLineP1Start[1]} 
          x2={extLineP1End[0]} 
          y2={extLineP1End[1]} 
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          style={{ vectorEffect: 'non-scaling-stroke' }}
        />
        <line 
          x1={extLineP2Start[0]} 
          y1={extLineP2Start[1]} 
          x2={extLineP2End[0]} 
          y2={extLineP2End[1]} 
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          style={{ vectorEffect: 'non-scaling-stroke' }}
        />
        
        {/* Dimension Line (continuous) */}
        <line 
          x1={dimLineP1[0]} 
          y1={dimLineP1[1]} 
          x2={dimLineP2[0]} 
          y2={dimLineP2[1]} 
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          style={{ vectorEffect: 'non-scaling-stroke' }}
        />
        
        {/* Arrowheads */}
        <path 
          d={arrow1} 
          fill={strokeColor} 
          stroke="none" 
          style={{ vectorEffect: 'non-scaling-stroke' }}
        />
        <path 
          d={arrow2} 
          fill={strokeColor} 
          stroke="none" 
          style={{ vectorEffect: 'non-scaling-stroke' }}
        />
        
        {/* Text with slight background for better readability */}
        {/* Apply rotation transform here */}
        <g transform={`rotate(${textRotation} ${textX} ${textY})`}>
          <rect
            x={textX - (textContent.length * fontSize * 0.3)} // Use calculated textX
            y={textY - fontSize * 0.7} // Use calculated textY
            width={textContent.length * fontSize * 0.6}
            height={fontSize * 1.4}
            fill="white"
            fillOpacity="0.8"
            rx={fontSize * 0.2}
            ry={fontSize * 0.2}
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />
          <text
            x={textX} // Use calculated textX
            y={textY} // Use calculated textY
            fontSize={fontSize}
            fill={strokeColor} // Use restored color
            stroke="none"
            textAnchor="middle"
            dominantBaseline={textRotation !== 0 ? "central" : "middle"} // Adjust baseline for rotation
            fontFamily="Arial, sans-serif"
            // Removed inline style for cursor, pointerEvents
            // Removed onMouseDown/onTouchStart handlers
            style={{ userSelect: 'none', vectorEffect: 'non-scaling-stroke', pointerEvents: isEditing ? 'none' : 'auto' }} // Disable pointer events on text when editing
          >
            {textContent}
          </text>
        </g>

        {/* --- Input Field (rendered conditionally) --- */}
        {isEditing && (
          // Apply inverse rotation to the foreignObject container if text is rotated
          <foreignObject 
            x={inputX} 
            y={inputY} 
            width={inputWidth} 
            height={inputHeight} 
            transform={`rotate(${-textRotation} ${textX} ${textY})`} // Counter-rotate input
          >
            {/* Need xmlns for HTML inside SVG */}
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100%', height: '100%' }}>
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: '0 2px',
                  border: '1px solid #777',
                  borderRadius: '2px',
                  backgroundColor: '#fff',
                  fontSize: `${fontSize * 0.9}px`, // Slightly smaller than SVG text for fit
                  textAlign: 'center',
                  boxSizing: 'border-box', // Include padding/border in size
                  fontFamily: 'Arial, sans-serif',
                }}
              />
            </div>
          </foreignObject>
        )}

        {/* Delete Button (X) - Line */}
        {onDeleteMeasurement && !isEditing && (
          <text
            // Position relative to the text, considering rotation
            x={textX + (textContent.length * fontSize * 0.3) + 2} // Position to the right of the text/background
            y={textY} // Align vertically with text center
            fontSize={fontSize * 1.1} // Slightly larger 'X'
            fill="red"
            stroke="none"
            textAnchor="start"
            dominantBaseline="middle"
            fontFamily="Arial, sans-serif"
            style={{ cursor: 'pointer', userSelect: 'none', vectorEffect: 'non-scaling-stroke' }}
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering double-click or drag
              console.log(`[MeasurementDisplay ${pathId}] Delete clicked.`);
              onDeleteMeasurement(pathId);
            }}
            // Apply the same rotation as the text group
            transform={`rotate(${textRotation} ${textX} ${textY})`}
          >
            X
          </text>
        )}
      </g>
    );

  } else if (type === 'distance' && geometry.endpoints && geometry.endpoints.length === 2) {
    // NOTE: 'distance' type seems deprecated or unused based on handlePathClick logic.
    // If it needs editing, similar logic as 'line' should be applied.
    // For now, just display the calculated value without editing.
    const [p1, p2] = geometry.endpoints;
    const calculatedDistance = distance({ x: p1[0], y: p1[1] }, { x: p2[0], y: p2[1] });
    const textContent = parseFloat(calculatedDistance.toFixed(2)).toString(); // Use calculated, no override here

    // --- Reuse rendering logic similar to 'line' type ---
    const vx = p2[0] - p1[0];
    const vy = p2[1] - p1[1];
    const midX = (p1[0] + p2[0]) / 2;
    const midY = (p1[1] + p2[1]) / 2;
    const lineLen = Math.sqrt(vx * vx + vy * vy); // Use calculated length for line segment representation
    const ux = lineLen > 1e-6 ? vx / lineLen : 1;
    const uy = lineLen > 1e-6 ? vy / lineLen : 0;
    const nx = -uy;
    const ny = ux;
    const textOffsetX = textPosition.x - midX;
    const textOffsetY = textPosition.y - midY;
    const offsetDist = textOffsetX * nx + textOffsetY * ny;
    const actualOffsetDist = Math.abs(offsetDist) < textOffset ? Math.sign(offsetDist || 1) * textOffset : offsetDist;
    const dimLineP1 = [p1[0] + nx * actualOffsetDist, p1[1] + ny * actualOffsetDist];
    const dimLineP2 = [p2[0] + nx * actualOffsetDist, p2[1] + ny * actualOffsetDist];
    const extLineP1Start = [p1[0] + nx * Math.sign(actualOffsetDist) * extensionGap, p1[1] + ny * Math.sign(actualOffsetDist) * extensionGap];
    const extLineP2Start = [p2[0] + nx * Math.sign(actualOffsetDist) * extensionGap, p2[1] + ny * Math.sign(actualOffsetDist) * extensionGap];
    const extLineP1End = [dimLineP1[0] + nx * Math.sign(actualOffsetDist) * extensionOverhang, dimLineP1[1] + ny * Math.sign(actualOffsetDist) * extensionOverhang];
    const extLineP2End = [dimLineP2[0] + nx * Math.sign(actualOffsetDist) * extensionOverhang, dimLineP2[1] + ny * Math.sign(actualOffsetDist) * extensionOverhang];
    const arrowLen = lineLen;
    const arrowNormX = ux;
    const arrowNormY = uy;
    const arrow1 = `M ${dimLineP1[0]} ${dimLineP1[1]} l ${arrowNormX * arrowSize} ${arrowNormY * arrowSize} l ${-arrowNormY * arrowSize * 0.35} ${arrowNormX * arrowSize * 0.35} l ${-arrowNormX * arrowSize * 0.65} ${-arrowNormY * arrowSize * 0.65} z`;
    const arrow2 = `M ${dimLineP2[0]} ${dimLineP2[1]} l ${-arrowNormX * arrowSize} ${-arrowNormY * arrowSize} l ${arrowNormY * arrowSize * 0.35} ${-arrowNormX * arrowSize * 0.35} l ${arrowNormX * arrowSize * 0.65} ${arrowNormY * arrowSize * 0.65} z`;
    
    // --- Calculate Text Position ---
    const textX = midX + nx * actualOffsetDist;
    const textY = midY + ny * actualOffsetDist;

    // --- Calculate Rotation for Vertical Lines ---
    let textRotation = 0;
    const angleRad = Math.atan2(vy, vx);
    const angleDeg = angleRad * (180 / Math.PI);
    if (Math.abs(angleDeg) > 45 && Math.abs(angleDeg) < 135) {
      textRotation = -90;
    }

    elements = (
      <g id={pathId} className="measurement-group">
        {/* Extension Lines */}
        <line x1={extLineP1Start[0]} y1={extLineP1Start[1]} x2={extLineP1End[0]} y2={extLineP1End[1]} stroke={strokeColor} strokeWidth={strokeWidth} style={{ vectorEffect: 'non-scaling-stroke' }} />
        <line x1={extLineP2Start[0]} y1={extLineP2Start[1]} x2={extLineP2End[0]} y2={extLineP2End[1]} stroke={strokeColor} strokeWidth={strokeWidth} style={{ vectorEffect: 'non-scaling-stroke' }} />
        {/* Dimension Line (continuous) */}
        <line x1={dimLineP1[0]} y1={dimLineP1[1]} x2={dimLineP2[0]} y2={dimLineP2[1]} stroke={strokeColor} strokeWidth={strokeWidth} style={{ vectorEffect: 'non-scaling-stroke' }} />
        {/* Arrowheads */}
        <path d={arrow1} fill={strokeColor} stroke="none" style={{ vectorEffect: 'non-scaling-stroke' }} />
        <path d={arrow2} fill={strokeColor} stroke="none" style={{ vectorEffect: 'non-scaling-stroke' }} />
        {/* Text */}
        <g transform={`rotate(${textRotation} ${textX} ${textY})`}>
          <rect x={textX - (textContent.length * fontSize * 0.3)} y={textY - fontSize * 0.7} width={textContent.length * fontSize * 0.6} height={fontSize * 1.4} fill="white" fillOpacity="0.8" rx={fontSize * 0.2} ry={fontSize * 0.2} style={{ vectorEffect: 'non-scaling-stroke' }} />
          <text x={textX} y={textY} fontSize={fontSize} fill={strokeColor} stroke="none" textAnchor="middle" dominantBaseline={textRotation !== 0 ? "central" : "middle"} fontFamily="Arial, sans-serif" style={{ userSelect: 'none', vectorEffect: 'non-scaling-stroke' }}>
            {textContent} {/* Display calculated value */}
          </text>
        </g>
      </g>
    );

  } else if (type === 'circle' && geometry.center && geometry.diameter != null) {
    const [cx, cy] = geometry.center;
    // Use displayValue calculated above
    const textContent = displayValue;
    const diameter = geometry.diameter; // Keep original for calculations if needed
    const radius = geometry.radius || diameter / 2;

    // Calculate text width estimate for circle
    const textWidthEstimateCircle = textContent.length * fontSize * 0.65; // Use textContent (might be override)

    // Determine if this is a small circle where text doesn't fit well inside
    const isSmallCircle = radius * 2 < textWidthEstimateCircle * 1.5; // Use original radius for size check
    
    // Calculate line endpoints based on text position relative to center
    const textVecX = textPosition.x - cx;
    const textVecY = textPosition.y - cy;
    const distSqr = textVecX * textVecX + textVecY * textVecY;
    const textDistance = Math.sqrt(distSqr);

    // Determine angle for the leader/dimension line
    let angle;
    if (distSqr < 1e-9) {
        angle = 0; // Default to horizontal
    } else {
        angle = Math.atan2(textVecY, textVecX);
    }

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    // Different approaches based on circle size
    if (isSmallCircle) {
      // For small circles, use a leader line pointing to the circle
      // Normalize the text position to be outside the circle
      const minDistance = radius + textOffset * 3;
      let normalizedDistance = Math.max(textDistance, minDistance);
      
      // If text is very close to center but not properly outside, move it outside
      if (textDistance < minDistance) {
        // Set text position to be properly outside the circle
        normalizedDistance = minDistance;
      }
      
      // Leader line endpoints
      const leaderStart = [cx, cy]; // Start at center
      const leaderEnd = [
        cx + cosA * normalizedDistance * 0.9, // Stop short of text
        cy + sinA * normalizedDistance * 0.9
      ];
      
      // Text position should be outside the circle
      const adjustedTextPosition = {
        x: cx + cosA * normalizedDistance,
        y: cy + sinA * normalizedDistance
      };
      
      // Circle indicator: small crosshair at center for precision
      const crosshairSize = Math.min(radius * 0.5, 1.0);

      elements = (
        // Add pathId as the ID for the interaction hook to find
        <g id={pathId} className="measurement-group">
          {/* Center crosshair */}
          <line
            x1={cx - crosshairSize} 
            y1={cy} 
            x2={cx + crosshairSize} 
            y2={cy} 
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />
          <line 
            x1={cx} 
            y1={cy - crosshairSize} 
            x2={cx} 
            y2={cy + crosshairSize} 
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />
          
          {/* Leader line */}
          <line 
            x1={leaderStart[0]} 
            y1={leaderStart[1]} 
            x2={leaderEnd[0]} 
            y2={leaderEnd[1]} 
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />
          
          {/* Text with background */}
          <g transform={`translate(${adjustedTextPosition.x - textPosition.x}, ${adjustedTextPosition.y - textPosition.y})`}>
            <rect
              x={textPosition.x - (textContent.length * fontSize * 0.3)}
              y={textPosition.y - fontSize * 0.7}
              width={textContent.length * fontSize * 0.6}
              height={fontSize * 1.4}
              fill="white"
              fillOpacity="0.9"
              rx={fontSize * 0.2}
              ry={fontSize * 0.2}
              style={{ vectorEffect: 'non-scaling-stroke' }}
            />
            <text
              x={textPosition.x}
            y={textPosition.y}
            fontSize={fontSize}
            fill={strokeColor} // Use restored color
            stroke="none"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Arial, sans-serif"
            // Removed inline style for cursor, pointerEvents
            // Removed onMouseDown/onTouchStart handlers
            style={{ userSelect: 'none', vectorEffect: 'non-scaling-stroke', pointerEvents: isEditing ? 'none' : 'auto' }} // Disable pointer events on text when editing
          >
            {textContent}
            </text>
          </g>
          {/* --- Input Field (rendered conditionally) --- */}
          {isEditing && (
            <foreignObject x={adjustedTextPosition.x - inputWidth / 2} y={adjustedTextPosition.y - inputHeight / 2} width={inputWidth} height={inputHeight}>
              <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100%', height: '100%' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyDown={handleInputKeyDown}
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '0 2px',
                    border: '1px solid #777',
                    borderRadius: '2px',
                    backgroundColor: '#fff',
                    fontSize: `${fontSize * 0.9}px`,
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    fontFamily: 'Arial, sans-serif',
                  }}
                />
              </div>
            </foreignObject>
          )}

          {/* Delete Button (X) - Small Circle */}
          {onDeleteMeasurement && !isEditing && (
            <text
              // Position relative to the adjusted text position
              x={adjustedTextPosition.x + (textContent.length * fontSize * 0.3) + 2}
              y={adjustedTextPosition.y} // Align vertically
              fontSize={fontSize * 1.1}
              fill="red"
              stroke="none"
              textAnchor="start"
              dominantBaseline="middle"
              fontFamily="Arial, sans-serif"
              style={{ cursor: 'pointer', userSelect: 'none', vectorEffect: 'non-scaling-stroke' }}
              onClick={(e) => {
                e.stopPropagation();
                console.log(`[MeasurementDisplay ${pathId}] Delete clicked.`);
                onDeleteMeasurement(pathId);
              }}
              // No rotation needed here as text is not rotated relative to its group
            >
              X
            </text>
          )}
        </g>
      );
    } else {
      // For larger circles, use the diameter line approach
      // --- Calculate Input Position and Size (Circle Diameter) ---
      const inputWidthCircle = Math.max(50, textContent.length * fontSize * 0.7 + 10);
      const inputHeightCircle = fontSize * 1.8;
      // Position input relative to the text position (which is centered on the line)
      const inputXCircle = textPosition.x - inputWidthCircle / 2;
      const inputYCircle = textPosition.y - inputHeightCircle / 2;

      // Endpoints of the diameter line
      const dimLineP1 = [cx - cosA * radius, cy - sinA * radius];
      const dimLineP2 = [cx + cosA * radius, cy + sinA * radius];

      // Refined arrowheads for circle diameter
      const arrow1 = `M ${dimLineP1[0]} ${dimLineP1[1]} 
                      l ${cosA * arrowSize} ${sinA * arrowSize} 
                      l ${-sinA * arrowSize * 0.35} ${cosA * arrowSize * 0.35} 
                      l ${-cosA * arrowSize * 0.65} ${-sinA * arrowSize * 0.65} 
                      z`;
      
      const arrow2 = `M ${dimLineP2[0]} ${dimLineP2[1]} 
                      l ${-cosA * arrowSize} ${-sinA * arrowSize} 
                      l ${sinA * arrowSize * 0.35} ${-cosA * arrowSize * 0.35} 
                      l ${cosA * arrowSize * 0.65} ${sinA * arrowSize * 0.65} 
                      z`;

      // Calculate points for broken dimension line
      const gapSize = textWidthEstimate + textOffset * 2;
      const halfGap = gapSize / 2;

      // Project text position onto the dimension line direction
      const textProjDist = vec.dot([textVecX, textVecY], [cosA, sinA]);

      // Points for the two segments of the dimension line
      // Clamp the break points to be within the radius +/- arrow size
      const startClamp = -radius + arrowSize;
      const endClamp = radius - arrowSize;
      // No gap calculation needed for circle diameter line anymore

      elements = (
        // Add pathId as the ID for the interaction hook to find
        <g id={pathId} className="measurement-group" onDoubleClick={handleDoubleClick}> {/* Added double-click */}
          {/* Dimension Line (continuous) */}
          <line 
            x1={dimLineP1[0]} 
            y1={dimLineP1[1]} 
            x2={dimLineP2[0]} 
            y2={dimLineP2[1]} 
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />
          
          {/* Arrowheads */}
          <path 
            d={arrow1} 
            fill={strokeColor} 
            stroke="none" 
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />
          <path 
            d={arrow2} 
            fill={strokeColor} 
            stroke="none" 
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />
          
          {/* Text with slight background for better readability */}
          <g>
            <rect
              x={textPosition.x - (textContent.length * fontSize * 0.3)}
              y={textPosition.y - fontSize * 0.7}
              width={textContent.length * fontSize * 0.6}
              height={fontSize * 1.4}
              fill="white"
              fillOpacity="0.9"
              rx={fontSize * 0.2}
              ry={fontSize * 0.2}
              style={{ vectorEffect: 'non-scaling-stroke' }}
            />
            <text
              x={textPosition.x}
              y={textPosition.y}
              fontSize={fontSize}
              fill={strokeColor}
              stroke="none"
              textAnchor="middle"
              dominantBaseline="middle"
            fontFamily="Arial, sans-serif"
            // Removed inline style for cursor
            // Removed onMouseDown/onTouchStart handlers
            style={{ userSelect: 'none', vectorEffect: 'non-scaling-stroke', pointerEvents: isEditing ? 'none' : 'auto' }} // Disable pointer events on text when editing
          >
            {textContent}
            </text>
          </g>
          {/* --- Input Field (rendered conditionally - Circle Diameter) --- */}
          {isEditing && (
            <foreignObject x={inputXCircle} y={inputYCircle} width={inputWidthCircle} height={inputHeightCircle}>
              <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100%', height: '100%' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={editValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  onKeyDown={handleInputKeyDown}
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '0 2px',
                    border: '1px solid #777',
                    borderRadius: '2px',
                    backgroundColor: '#fff',
                    fontSize: `${fontSize * 0.9}px`,
                    textAlign: 'center',
                    boxSizing: 'border-box',
                    fontFamily: 'Arial, sans-serif',
                  }}
                />
              </div>
            </foreignObject>
          )}

          {/* Delete Button (X) - Large Circle */}
          {onDeleteMeasurement && !isEditing && (
            <text
              // Position relative to the text position
              x={textPosition.x + (textContent.length * fontSize * 0.3) + 2}
              y={textPosition.y} // Align vertically
              fontSize={fontSize * 1.1}
              fill="red"
              stroke="none"
              textAnchor="start"
              dominantBaseline="middle"
              fontFamily="Arial, sans-serif"
              style={{ cursor: 'pointer', userSelect: 'none', vectorEffect: 'non-scaling-stroke' }}
              onClick={(e) => {
                e.stopPropagation();
                console.log(`[MeasurementDisplay ${pathId}] Delete clicked.`);
                onDeleteMeasurement(pathId);
              }}
              // No rotation needed here as text is not rotated relative to its group
            >
              X
            </text>
          )}
        </g>
      );
    }

  } else if (type === 'radius' && geometry?.radius != null && textPosition) {
    // --- Radius Measurement ---
    // Use displayValue which already includes the 'R' prefix or the override
    const textContent = displayValue;

    // --- Calculate Input Position and Size (Radius) ---
    const inputWidthRadius = Math.max(50, textContent.length * fontSize * 0.7 + 10);
    const inputHeightRadius = fontSize * 1.8;
    const inputXRadius = textPosition.x - inputWidthRadius / 2;
    const inputYRadius = textPosition.y - inputHeightRadius / 2;

    elements = (
      <g id={pathId} className="measurement-group" onDoubleClick={handleDoubleClick}>
        {/* No leader lines for now, just text */}
        {/* Text with slight background */}
        <g>
          <rect
            x={textPosition.x - (textContent.length * fontSize * 0.3)}
            y={textPosition.y - fontSize * 0.7}
            width={textContent.length * fontSize * 0.6}
            height={fontSize * 1.4}
            fill="white"
            fillOpacity="0.9"
            rx={fontSize * 0.2}
            ry={fontSize * 0.2}
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />
          <text
            x={textPosition.x}
            y={textPosition.y}
            fontSize={fontSize}
            fill={strokeColor}
            stroke="none"
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="Arial, sans-serif"
            style={{ userSelect: 'none', vectorEffect: 'non-scaling-stroke', pointerEvents: isEditing ? 'none' : 'auto' }}
          >
            {textContent}
          </text>
        </g>

        {/* --- Input Field (rendered conditionally - Radius) --- */}
        {isEditing && (
          <foreignObject x={inputXRadius} y={inputYRadius} width={inputWidthRadius} height={inputHeightRadius}>
            <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: '100%', height: '100%' }}>
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                style={{
                  width: '100%',
                  height: '100%',
                  padding: '0 2px',
                  border: '1px solid #777',
                  borderRadius: '2px',
                  backgroundColor: '#fff',
                  fontSize: `${fontSize * 0.9}px`,
                  textAlign: 'center',
                  boxSizing: 'border-box',
                  fontFamily: 'Arial, sans-serif',
                }}
              />
            </div>
          </foreignObject>
        )}

        {/* Delete Button (X) - Radius */}
        {onDeleteMeasurement && !isEditing && (
          <text
            x={textPosition.x + (textContent.length * fontSize * 0.3) + 2}
            y={textPosition.y}
            fontSize={fontSize * 1.1}
            fill="red"
            stroke="none"
            textAnchor="start"
            dominantBaseline="middle"
            fontFamily="Arial, sans-serif"
            style={{ cursor: 'pointer', userSelect: 'none', vectorEffect: 'non-scaling-stroke' }}
            onClick={(e) => {
              e.stopPropagation();
              console.log(`[MeasurementDisplay ${pathId}] Delete clicked.`);
              onDeleteMeasurement(pathId);
            }}
          >
            X
          </text>
        )}
      </g>
    );
  }

  return elements;
}
