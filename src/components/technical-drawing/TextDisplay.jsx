import React, { useState, useCallback, useRef, useEffect } from 'react';

// Using similar styling constants as MeasurementDisplay for consistency, as requested
const TEXT_COLOR = "#222222"; // Match MeasurementDisplay text color
// fontSize will come from textData.fontSize, default 2.2 (measurement size)
const FONT_FAMILY = "Arial, sans-serif"; // Match MeasurementDisplay font family

export default function TextDisplay({
  textData,
  // innerSvgRef, // May not be needed if not doing complex foreignObject transforms relative to SVG
  onUpdateText, // Handler to update text content, position, or other properties
  onDeleteText, // Handler to delete this text element
  // zoomLevel, // For scaling UI elements like input field, if needed
}) {
  const { id, content, position, fontSize, color, rotation, isManuallyPositioned = false } = textData;
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef(null);

  const effectiveFontSize = fontSize || 2.2; // Default to measurement size
  const effectiveColor = color || TEXT_COLOR;

  const handleDoubleClick = useCallback(() => {
    console.log(`[TextDisplay ${id}] Double clicked. Entering edit mode.`);
    setEditValue(content);
    setIsEditing(true);
  }, [content, id]);

  const handleInputChange = (e) => {
    setEditValue(e.target.value);
  };

  const handleInputBlur = () => {
    if (isEditing && onUpdateText) {
      console.log(`[TextDisplay ${id}] Input blurred. Updating content to: "${editValue}"`);
      onUpdateText(id, { content: editValue });
    }
    setIsEditing(false);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (isEditing && onUpdateText) {
        console.log(`[TextDisplay ${id}] Enter pressed. Updating content to: "${editValue}"`);
        onUpdateText(id, { content: editValue });
      }
      setIsEditing(false);
      e.preventDefault();
    } else if (e.key === 'Escape') {
      console.log(`[TextDisplay ${id}] Escape pressed. Cancelling edit.`);
      setIsEditing(false);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Estimate width/height for foreignObject based on font size and text length
  // These are rough estimates for the input box
  const inputWidthEstimate = (editValue.length || content.length) * effectiveFontSize * 0.7 + 15; // Add some padding
  const inputWidth = Math.max(60, inputWidthEstimate); // Min width
  const inputHeight = effectiveFontSize * 2; // Slightly larger than font size

  // Position input relative to the text's anchor point (position.x, position.y)
  // Assuming text-anchor="middle" and dominant-baseline="middle" for the SVG text
  const inputX = position.x - inputWidth / 2;
  const inputY = position.y - inputHeight / 2;

  return (
    <g 
      id={id} // ID for interaction hook to find this element for dragging
      className="text-display-group" 
      onDoubleClick={handleDoubleClick}
      style={{ cursor: isEditing ? 'default' : 'move' }} // Indicate draggable
      transform={`rotate(${rotation || 0} ${position.x} ${position.y})`} // Apply rotation around text position
    >
      {!isEditing ? (
        <text
          x={position.x}
          y={position.y}
          fontSize={effectiveFontSize}
          fill={effectiveColor}
          fontFamily={FONT_FAMILY}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none', vectorEffect: 'non-scaling-stroke', pointerEvents: 'auto' }}
          // The group itself will capture drag events via the interaction hook
        >
          {content}
        </text>
      ) : (
        // Render text transparently behind input to maintain visual while editing, if desired
        // Or hide it completely by not rendering the <text> element in edit mode
        <text
          x={position.x}
          y={position.y}
          fontSize={effectiveFontSize}
          fill={effectiveColor}
          opacity="0.3" // Make it faint
          fontFamily={FONT_FAMILY}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none', vectorEffect: 'non-scaling-stroke', pointerEvents: 'none' }}
        >
          {content}
        </text>
      )}

      {isEditing && (
        <foreignObject
          x={inputX}
          y={inputY}
          width={inputWidth}
          height={inputHeight}
          // If text is rotated, the foreignObject itself doesn't need to counter-rotate here
          // because its content (HTML input) is not affected by SVG transforms in the same way.
          // The group's rotation handles the overall orientation.
        >
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
                fontSize: `${effectiveFontSize * 0.85}px`, // UI input font size
                textAlign: 'center',
                boxSizing: 'border-box',
                fontFamily: 'Arial, sans-serif', // Standard input font
              }}
            />
          </div>
        </foreignObject>
      )}

      {/* Delete Button (X) - Appears when not editing */}
      {!isEditing && onDeleteText && (
        <text
          // Position relative to the text anchor, adjusted for rotation if text is long
          // For simplicity, placing it slightly to the right and above the anchor
          x={position.x + (content.length * effectiveFontSize * 0.3) + effectiveFontSize * 0.5}
          y={position.y - effectiveFontSize * 0.5}
          fontSize={effectiveFontSize * 1.1} // Slightly larger 'X'
          fill="red"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Arial, sans-serif"
          style={{ cursor: 'pointer', userSelect: 'none', vectorEffect: 'non-scaling-stroke' }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering double-click or drag
            onDeleteText(id);
          }}
        >
          X
        </text>
      )}
      {/* Manual Position Toggle Icon (Lock/Unlock) - Similar to MeasurementDisplay */}
      {!isEditing && onUpdateText && ( // Assuming onUpdateText can also handle isManuallyPositioned
           <text
             x={position.x + (content.length * effectiveFontSize * 0.3) + effectiveFontSize * 1.5} // Adjust position
             y={position.y - effectiveFontSize * 0.5} // Align with delete icon
             fontSize={effectiveFontSize * 1.1}
             fill={isManuallyPositioned ? "green" : "gray"}
             stroke="none"
             textAnchor="middle"
             dominantBaseline="middle"
             fontFamily="Arial, sans-serif"
             style={{ cursor: 'pointer', userSelect: 'none', vectorEffect: 'non-scaling-stroke' }}
             onClick={(e) => {
               e.stopPropagation();
               onUpdateText(id, { isManuallyPositioned: !isManuallyPositioned });
             }}
             title={isManuallyPositioned ? "Unlock Position (Use Auto PDF Placement)" : "Lock Position (Use Manual PDF Placement)"}
           >
             {isManuallyPositioned ? '🔒' : '🔓'}
           </text>
         )}
    </g>
  );
}
