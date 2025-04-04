import React from 'react';

export default function DrawingControls({
  isMobile,
  zoomLevel,
  scale,
  containerSize,
  panOffset,
  onZoomChange,
  onPanChange,
  onScaleChange,
  onResetView
}) {

  const handleZoom = (delta) => {
    const newZoom = Math.max(0.1, Math.min(10, zoomLevel + delta * zoomLevel));
    // Adjust pan to keep center focused
    const centerX = containerSize.width / 2;
    const centerY = containerSize.height / 2;
    const centerXInContent = (centerX - panOffset.x) / zoomLevel;
    const centerYInContent = (centerY - panOffset.y) / zoomLevel;
    const newPanOffsetX = centerX - centerXInContent * newZoom;
    const newPanOffsetY = centerY - centerYInContent * newZoom;
    onZoomChange(newZoom);
    onPanChange({ x: newPanOffsetX, y: newPanOffsetY });
  };

  return (
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
          onClick={() => handleZoom(-0.1)}
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
          onClick={() => handleZoom(0.1)}
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
          onClick={onResetView}
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
          onChange={(e) => onScaleChange(Number(e.target.value))}
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
  );
}
