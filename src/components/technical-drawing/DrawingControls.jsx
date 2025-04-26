import React, { useState, useEffect, useMemo } from 'react'; // Import useState, useEffect, useMemo
import { modelRegistry } from '../../models/index.js'; // Import modelRegistry

export default function DrawingControls({
  selectedModelName, // Add prop for the current model name
  isMobile,
  zoomLevel,
  scale,
  containerSize,
  panOffset,
  onZoomChange,
  onPanChange,
  onScaleChange,
  onResetView,
  onExportPDF, // Add prop for export handler
  onAddViewbox, // Add new prop for adding a viewbox
  selectedLayout, // Add prop for current layout
  onLayoutChange, // Add prop for handling layout change
  selectedViewToAdd, // Add prop for selected view type
  onViewSelectionChange, // Add handler for view type change
  includeHiddenLines, // Add prop for hidden lines state
  onHiddenLinesToggle, // Add handler for hidden lines toggle
  onAddViewToCell, // Add handler to trigger adding the view
}) {

  const availableLayouts = ['1x1', '1x2', '2x1', '2x2']; // Define available layouts

  // --- Dynamic View Options ---
  const availableViews = useMemo(() => {
    // Standard views are simple strings
    const standardViewOptions = ['Front', 'Right', 'Bottom', 'Top', 'Left', 'Back', 'Isometric'].map(v => ({ value: v, label: v }));

    const modelDefinition = modelRegistry[selectedModelName];
    let partViewOptions = []; // Now stores objects { value, label }

    // Check for the static flag and structure
    const hasPartsFlag = modelDefinition?.hasTechnicalDrawingParts;
    const structure = modelDefinition?.componentDataStructure;

    if (hasPartsFlag && Array.isArray(structure)) {
      structure.forEach(partInfo => {
        const partId = partInfo.id;
        const partName = partInfo.name || partId; // Use name, fallback to ID for display

        if (partId) { // Need the ID for the value
          standardViewOptions.forEach(stdView => {
            // Value uses ID, Label uses Name
            partViewOptions.push({
              value: `${partId} - ${stdView.value}`, // e.g., "SS001 - Top"
              label: `${partName} - ${stdView.label}` // e.g., "Side Stringer - Top"
            });
          });
        } else {
          console.warn("[WARN] Part info missing ID in componentDataStructure:", partInfo);
        }
      });
    }

    // Combine standard view objects and part view objects
    return [...standardViewOptions, ...partViewOptions];
  }, [selectedModelName]); // Recompute when model changes
  // --- End Dynamic View Options ---


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

      {/* Layout Selection */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
        <label htmlFor="layoutSelect" style={{ fontSize: isMobile ? '12px' : '10px', marginRight: '5px' }}>
          Layout:
        </label>
        <select
          id="layoutSelect"
          // value={selectedLayout} // Keep value prop removed - this fixed the issue
          defaultValue={selectedLayout} // Use defaultValue for initial render
          onChange={(e) => {
            // console.log(`[DEBUG] DrawingControls onChange (uncontrolled) - e.target.value: ${e.target.value}`); // Remove debug log
            onLayoutChange(e.target.value); // Call prop function directly
          }}
          style={{
            padding: isMobile ? '4px 8px' : '2px 4px',
            fontSize: isMobile ? '13px' : '11px',
            cursor: 'pointer',
            flexGrow: 1 // Allow select to take available space
          }}
          title="Select Viewbox Layout"
        >
          {availableLayouts.map(layout => (
            <option key={layout} value={layout}>{layout}</option>
          ))}
        </select>
      </div>

      {/* --- Add View Controls (Placeholder Section) --- */}
      <div style={{ borderTop: '1px solid #ccc', marginTop: '10px', paddingTop: '10px' }}>
        <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '5px', color: '#555' }}>Add View to Cell:</div>

        {/* View Type Selection */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
          <label htmlFor="viewTypeSelect" style={{ fontSize: isMobile ? '12px' : '10px', marginRight: '5px', minWidth: '35px' }}>
            View:
          </label>
          <select
            id="viewTypeSelect"
            // value={selectedViewToAdd} // Remove value prop
            defaultValue={selectedViewToAdd} // Use defaultValue
            onChange={(e) => onViewSelectionChange(e.target.value)}
            style={{
              padding: isMobile ? '4px 8px' : '2px 4px',
              fontSize: isMobile ? '13px' : '11px',
              cursor: 'pointer',
              flexGrow: 1
            }}
            title="Select View Type"
          >
            {/* Map over the array of {value, label} objects */}
            {availableViews.map(viewOption => (
              <option key={viewOption.value} value={viewOption.value}>
                {viewOption.label} {/* Display the user-friendly label */}
              </option>
            ))}
          </select>
        </div>

        {/* Hidden Lines Checkbox */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
          <input
            type="checkbox"
            id="hiddenLinesCheckbox"
            checked={includeHiddenLines}
            onChange={(e) => onHiddenLinesToggle(e.target.checked)}
            style={{ marginRight: '5px', cursor: 'pointer' }}
          />
          <label htmlFor="hiddenLinesCheckbox" style={{ fontSize: isMobile ? '12px' : '10px', cursor: 'pointer' }}>
            Include Hidden Lines
          </label>
        </div>

        {/* Add View Button (Placeholder Action) */}
        <button
          title={`Add ${selectedViewToAdd} view ${includeHiddenLines ? 'with' : 'without'} hidden lines`}
          style={{
            width: '100%',
            marginTop: '5px',
            padding: isMobile ? '5px 10px' : '2px 8px',
            cursor: 'pointer',
            fontSize: isMobile ? '14px' : 'inherit',
            backgroundColor: '#2196F3', // Blue background
            color: 'white',
            border: 'none',
            borderRadius: '3px'
          }}
          onClick={onAddViewToCell} // Call the placeholder handler for now
        >
          Add View
        </button>
      </div>
      {/* --- End Add View Controls --- */}


      {/* Add Viewbox Button */}
      <button
        title={`Add Viewbox with ${selectedLayout} layout`} // Dynamic title
        style={{
          marginTop: '5px',
          padding: isMobile ? '5px 10px' : '2px 8px',
          cursor: 'pointer',
          fontSize: isMobile ? '14px' : 'inherit',
          backgroundColor: '#4CAF50', // Green background
          color: 'white',
          border: 'none',
          borderRadius: '3px'
        }}
        onClick={onAddViewbox} // Call the passed-in handler
      >
        Add Viewbox
      </button>

      {/* Export Button */}
      <button
        title="Export as PDF"
        style={{
          marginTop: '5px',
          padding: isMobile ? '5px 10px' : '2px 8px',
          cursor: 'pointer',
          fontSize: isMobile ? '14px' : 'inherit'
        }}
        onClick={onExportPDF} // Call the passed-in handler
      >
        Export PDF
      </button>
    </div>
  );
}
