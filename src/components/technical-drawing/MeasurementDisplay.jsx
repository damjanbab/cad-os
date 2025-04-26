import React, { useState, useCallback } from 'react'; // Combined imports
import { vec } from '../../utils/geometryUtils.js'; // Import vector utils

// --- Measurement Display Component --- Handles its own dragging using CTM ---
export default function MeasurementDisplay({
  measurementData,
  innerSvgRef, // Receive ref to the parent SVG element
  onUpdatePosition, // Receive update handler
  // Removed onUpdatePosition - Handled by centralized hook
}) {
  const { pathId, type, geometry, textPosition } = measurementData; // Removed viewId (not used here)
  // Removed internal drag state and handlers - Logic moved to useCanvasInteraction hook


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

    // Calculate points for broken dimension line
    const textWidthEstimate = textContent.length * fontSize * 0.65; // Refined estimate
    const gapSize = textWidthEstimate + textOffset * 2; // Add padding
    const halfGap = gapSize / 2;

    // Project text position onto the dimension line direction (relative to the start of the dim line)
    const textProj = (textPosition.x - dimLineP1[0]) * arrowNormX + (textPosition.y - dimLineP1[1]) * arrowNormY;

    // Points for the two segments of the dimension line, clamped by arrow positions
    const breakStartPos = Math.max(arrowSize, textProj - halfGap);
    const breakEndPos = Math.min(arrowLen - arrowSize, textProj + halfGap);

    const dimLine1End = [
      dimLineP1[0] + arrowNormX * breakStartPos, 
      dimLineP1[1] + arrowNormY * breakStartPos
    ];
    
    const dimLine2Start = [
      dimLineP1[0] + arrowNormX * breakEndPos, 
      dimLineP1[1] + arrowNormY * breakEndPos
    ];

    // Determine if segments should be shown
    const showDimLine1 = breakStartPos > arrowSize + 1e-6; // Add tolerance
    const showDimLine2 = breakEndPos < arrowLen - arrowSize - 1e-6; // Add tolerance

    elements = (
      // Add pathId as the ID for the interaction hook to find
      <g id={pathId} className="measurement-group">
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
        
        {/* Dimension Line (broken) */}
        {showDimLine1 && (
          <line 
            x1={dimLineP1[0]} 
            y1={dimLineP1[1]} 
            x2={dimLine1End[0]} 
            y2={dimLine1End[1]} 
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />
        )}
        
        {showDimLine2 && (
          <line 
            x1={dimLine2Start[0]} 
            y1={dimLine2Start[1]} 
            x2={dimLineP2[0]} 
            y2={dimLineP2[1]} 
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            style={{ vectorEffect: 'non-scaling-stroke' }}
          />
        )}
        
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
            fillOpacity="0.8"
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
            style={{ userSelect: 'none', vectorEffect: 'non-scaling-stroke' }}
          >
            {textContent} // Display only
          </text>
        </g>
      </g>
    );

  } else if (type === 'circle' && geometry.center && geometry.diameter != null) {
    const [cx, cy] = geometry.center;
    const diameter = geometry.diameter;
    const radius = geometry.radius || diameter / 2;
    const textContent = `⌀${diameter.toFixed(2)}`;

    // Calculate text width estimate
    const textWidthEstimate = textContent.length * fontSize * 0.65;
    
    // Determine if this is a small circle where text doesn't fit well inside
    const isSmallCircle = radius * 2 < textWidthEstimate * 1.5;
    
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
            style={{ userSelect: 'none', vectorEffect: 'non-scaling-stroke' }}
          >
            {textContent} // Display only
            </text>
          </g>
        </g>
      );
    } else {
      // For larger circles, use the diameter line approach
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
      const breakStart = Math.max(startClamp, Math.min(endClamp, textProjDist - halfGap));
      const breakEnd = Math.max(startClamp, Math.min(endClamp, textProjDist + halfGap));

      const dimLine1End = [cx + cosA * breakStart, cy + sinA * breakStart];
      const dimLine2Start = [cx + cosA * breakEnd, cy + sinA * breakEnd];

      // Check if segments have valid length
      const showDimLine1 = vec.len(vec.sub(dimLine1End, dimLineP1)) > 1e-6;
      const showDimLine2 = vec.len(vec.sub(dimLineP2, dimLine2Start)) > 1e-6;

      elements = (
        // Add pathId as the ID for the interaction hook to find
        <g id={pathId} className="measurement-group">
          {/* Dimension Line (broken) */}
          {showDimLine1 && (
            <line 
              x1={dimLineP1[0]} 
              y1={dimLineP1[1]} 
              x2={dimLine1End[0]} 
              y2={dimLine1End[1]} 
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              style={{ vectorEffect: 'non-scaling-stroke' }}
            />
          )}
          
          {showDimLine2 && (
            <line 
              x1={dimLine2Start[0]} 
              y1={dimLine2Start[1]} 
              x2={dimLineP2[0]} 
              y2={dimLineP2[1]} 
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              style={{ vectorEffect: 'non-scaling-stroke' }}
            />
          )}
          
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
            style={{ userSelect: 'none', vectorEffect: 'non-scaling-stroke' }}
          >
            {textContent} // Display only
            </text>
          </g>
        </g>
      );
    }
    
  }

  return elements;
}
