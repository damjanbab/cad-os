import React, { useState, useEffect, useMemo, useRef } from 'react'; // Import useState, useEffect, useMemo, useRef
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
  rotationAngle, // Add prop for rotation angle state
  onRotationAngleChange, // Add handler for rotation angle change
  includeHiddenLines, // Add prop for hidden lines state
  onHiddenLinesToggle, // Add handler for hidden lines toggle
  onAddViewToCell, // Add handler to trigger adding the view
  onSetupStandardViews, // Add handler for setting up standard assembly/part views
  // Interaction mode props
  interactionMode,
  onInteractionModeChange,
   // Snap sub-type props
   snapSubType,
   onSnapSubTypeChange,
   // State Export/Import Props
   onExportState,
   onImportState,
 }) {
 
   const fileInputRef = useRef(null); // Ref for the hidden file input
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

  const handleImportClick = () => {
    fileInputRef.current?.click(); // Trigger click on hidden input
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log("No file selected.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        try {
          // Basic check if it's JSON before passing up
          JSON.parse(content);
          onImportState(content); // Pass the raw string content up
        } catch (error) {
          console.error("Error reading or parsing file:", error);
          alert("Failed to import state: Invalid JSON file.");
        }
      } else {
        console.error("File content is not a string.");
        alert("Failed to import state: Could not read file content.");
      }
      // Reset the input value so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.onerror = (e) => {
      console.error("FileReader error:", e);
      alert("Failed to import state: Error reading file.");
       // Reset the input value
       if (fileInputRef.current) {
         fileInputRef.current.value = '';
       }
    };
    reader.readAsText(file);
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

      {/* Interaction Mode Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', marginTop: '5px' }}>
         <button
          title={`Switch to ${interactionMode === 'measure' ? 'Snap' : 'Measure'} Mode`}
          style={{
            width: '100%',
            padding: isMobile ? '5px 10px' : '2px 8px',
            cursor: 'pointer',
            fontSize: isMobile ? '14px' : 'inherit',
            backgroundColor: interactionMode === 'snap' ? '#ff9800' : '#bdbdbd', // Orange when snap is active
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            textAlign: 'center',
          }}
          onClick={() => onInteractionModeChange(interactionMode === 'measure' ? 'snap' : 'measure')}
        >
          {interactionMode === 'measure' ? 'Measure Mode' : 'Snap Mode'}
        </button>
      </div>

      {/* Snap Sub-Type Selection (Only visible in Snap mode) */}
      {interactionMode === 'snap' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: '5px', paddingLeft: '5px', borderLeft: '2px solid #ff9800' }}>
          <label style={{ fontSize: isMobile ? '11px' : '9px', marginBottom: '3px', color: '#555' }}>Snap Type:</label>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
            <input
              type="radio"
              id="snap-point-to-point"
              name="snapSubType"
              value="point-to-point"
              checked={snapSubType === 'point-to-point'}
              onChange={() => onSnapSubTypeChange('point-to-point')}
              style={{ marginRight: '4px', cursor: 'pointer' }}
            />
            <label htmlFor="snap-point-to-point" style={{ fontSize: isMobile ? '12px' : '10px', cursor: 'pointer' }}>
              Point-to-Point
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <input
              type="radio"
              id="snap-point-to-line"
              name="snapSubType"
              value="point-to-line"
              checked={snapSubType === 'point-to-line'}
              onChange={() => onSnapSubTypeChange('point-to-line')}
              style={{ marginRight: '4px', cursor: 'pointer' }}
            />
            <label htmlFor="snap-point-to-line" style={{ fontSize: isMobile ? '12px' : '10px', cursor: 'pointer' }}>
              Point-to-Line
            </label>
          </div>
        </div>
      )}

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

        {/* Rotation Angle Input */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
          <label htmlFor="rotationAngleInput" style={{ fontSize: isMobile ? '12px' : '10px', marginRight: '5px', minWidth: '35px' }}>
            Rotate:
          </label>
          <input
            type="number"
            id="rotationAngleInput"
            value={rotationAngle}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              // Clamp value between 0 and 359
              const clampedVal = isNaN(val) ? 0 : Math.max(0, Math.min(359, val));
              onRotationAngleChange(clampedVal);
            }}
            min="0"
            max="359"
            step="1"
            style={{
              padding: isMobile ? '4px 8px' : '2px 4px',
              fontSize: isMobile ? '13px' : '11px',
              width: '50px', // Adjust width as needed
              marginRight: '5px'
            }}
            title="Rotation Angle (0-359 degrees)"
          />
          <span style={{ fontSize: isMobile ? '12px' : '10px' }}>deg</span>
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

      {/* Setup Standard Views Button */}
      <button
        title="Setup Standard Views (Assembly & Parts)"
        style={{
          marginTop: '5px',
          padding: isMobile ? '5px 10px' : '2px 8px',
          cursor: 'pointer',
          fontSize: isMobile ? '14px' : 'inherit',
          backgroundColor: '#ffc107', // Amber background
          color: 'black',
          border: 'none',
          borderRadius: '3px'
        }}
        onClick={onSetupStandardViews} // Call the new handler
      >
         Setup Standard Views
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

      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        style={{ display: 'none' }}
      />

      {/* State Export/Import Buttons */}
      <div style={{ borderTop: '1px solid #ccc', marginTop: '10px', paddingTop: '10px', display: 'flex', gap: '5px' }}>
        <button
          title="Export current drawing state"
          style={{
            flex: 1, // Take half the space
            padding: isMobile ? '5px 10px' : '2px 8px',
            cursor: 'pointer',
            fontSize: isMobile ? '14px' : 'inherit',
            backgroundColor: '#607D8B', // Blue Grey
            color: 'white',
            border: 'none',
            borderRadius: '3px'
          }}
          onClick={onExportState} // Call the passed-in handler
        >
          Export State
        </button>
        <button
          title="Import drawing state from file"
          style={{
            flex: 1, // Take half the space
            padding: isMobile ? '5px 10px' : '2px 8px',
            cursor: 'pointer',
            fontSize: isMobile ? '14px' : 'inherit',
            backgroundColor: '#795548', // Brown
            color: 'white',
            border: 'none',
            borderRadius: '3px'
          }}
          onClick={handleImportClick} // Trigger hidden input
        >
          Import State
        </button>
      </div>

    </div>
  );
}
