import React, { useState } from 'react';
import { vec } from '../../utils/geometryUtils.js'; // Import vector utils

// --- Measurement Display Component ---
export default function MeasurementDisplay({ measurementData, svgRef, onUpdatePosition }) {
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
    // Use ctm.a for x scaling and ctm.d for y scaling
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
