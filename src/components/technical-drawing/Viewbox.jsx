import React, { memo } from 'react'; // Import memo
import SvgView from './SvgView.jsx'; // Import the new SvgView component

// Parses layout string "rowsxcols" into [rows, cols]
const parseLayout = (layoutString) => {
  if (!layoutString || !layoutString.includes('x')) {
    return [1, 1]; // Default to 1x1 if invalid
  }
  const [rows, cols] = layoutString.split('x').map(Number);
  return [isNaN(rows) ? 1 : rows, isNaN(cols) ? 1 : cols];
};

// Basic placeholder for a Viewbox - Defined as function for memoization
function ViewboxComponent({
  viewboxData,
  selectedTarget,
  onCellSelection,
  onTitleBlockChange, // Add prop for handling title block updates
  onPathClick, // Add prop for path click handler
  // Receive measurement props
  measurementsByViewInstanceId, // Renamed prop: object keyed by view instance ID
  // onMeasurementUpdate, // REMOVED - Update is handled via hook callback
  // Removed onMeasurementDragStart
  zoomLevel,
  snapPoints, // Renamed prop
  onRemove, // Add prop for remove handler
  onUpdateOverrideValue, // Add prop for override update handler
  // Export settings props
  exportSettings,
  onSettingsChange,
  // Add delete handler prop
  onDeleteMeasurement,
}) {
  const { id: viewboxId, layout, titleBlock, items } = viewboxData; // Rename id to viewboxId for clarity
  const [gridRows, gridCols] = parseLayout(layout);

  // Log received snapPoints prop
  console.log(`[Viewbox ${viewboxId}] Received snapPoints:`, snapPoints);

  // Handler for input changes in the title block
  const handleInputChange = (fieldName, value) => {
    if (onTitleBlockChange) {
      onTitleBlockChange(viewboxId, fieldName, value);
    }
  };

  // --- New Styles for Layout with Settings Panel ---
  const mainViewboxStyle = {
    display: 'flex', // Use flexbox to arrange content and settings side-by-side
    border: '1px solid #ccc',
    backgroundColor: 'white',
    padding: '10px',
    marginBottom: '20px',
    position: 'relative', // Keep for remove button
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    minHeight: '250px', // Ensure minimum height for content + settings
  };

  const contentAreaStyle = {
    flexGrow: 1, // Allow content area to take available space
    display: 'flex',
    flexDirection: 'column',
    minWidth: '300px', // Minimum width for the drawing area
    minHeight: '200px', // Minimum height for drawing area
  };

  const settingsFormStyle = {
    width: '280px', // Slightly wider width for the settings panel
    marginLeft: '15px', // Space between content and settings
    paddingLeft: '15px',
    borderLeft: '1px solid #eee',
    overflowY: 'auto', // Allow scrolling if settings exceed height
    fontSize: '11px',
    maxHeight: '400px', // Limit height and allow scroll
    display: 'flex',
    flexDirection: 'column',
    gap: '8px', // Add gap between setting rows
  };

  const settingRowStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between', // Align label left, input right
  };

  const settingLabelStyle = {
    marginRight: '10px',
    whiteSpace: 'nowrap', // Prevent label wrapping
  };

  const settingInputStyle = {
    width: '100px', // Fixed width for most inputs
    fontSize: '11px',
    padding: '2px 4px',
    border: '1px solid #ccc',
    borderRadius: '3px',
  };
  // --- End New Styles ---


  // Placeholder for title block rendering (keep existing style)
  const titleBlockStyle = {
    borderTop: '1px solid #eee',
    marginTop: 'auto', // Push title block to the bottom
    paddingTop: '5px',
    fontSize: '10px',
    color: '#555',
  };

  console.log(`[INFO] Rendering Viewbox: ${viewboxId}, Layout: ${layout} (${gridRows}x${gridCols}), Items: ${items.length}`); // Fix: Use viewboxId here

  // Styling for the grid container
  const gridContainerStyle = {
    flexGrow: 1,
    display: 'grid',
    gridTemplateRows: `repeat(${gridRows}, 1fr)`,
    gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
    gap: '5px', // Gap between grid cells
    border: '1px dashed #ccc', // Keep a faint border for the grid area
    padding: '5px',
    marginBottom: '5px',
    minHeight: '100px', // Ensure grid area has some minimum height
  };

  // Styling for individual grid cells (placeholders)
  const gridCellStyle = {
    border: '1px solid #eee',
    backgroundColor: '#f9f9f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    color: '#aaa',
    cursor: 'pointer', // Indicate cells are clickable
    transition: 'border-color 0.2s ease-in-out', // Smooth transition for selection highlight
  };

  // Style for the remove button
  const removeButtonStyle = {
    position: 'absolute',
    top: '5px',
    right: '5px',
    background: 'rgba(255, 0, 0, 0.7)',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    fontSize: '12px',
    lineHeight: '18px', // Adjust for vertical centering
    textAlign: 'center',
    cursor: 'pointer',
    fontWeight: 'bold',
    zIndex: 1, // Ensure it's above other content
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
    transition: 'background 0.2s ease',
  };

  const removeButtonHoverStyle = {
    background: 'rgba(200, 0, 0, 0.9)',
  };

  // State for hover effect on remove button
  const [isHoveringRemove, setIsHoveringRemove] = React.useState(false);

  // Helper function for handling number input changes
  const handleNumberChange = (key, value) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onSettingsChange(viewboxId, key, num);
    } else if (value === '') {
      // Allow clearing the input, maybe default to 0 or handle upstream
      onSettingsChange(viewboxId, key, 0); // Default to 0 if cleared
    }
  };

  // Helper function for handling color input changes
  const handleColorChange = (key, value) => {
    onSettingsChange(viewboxId, key, value);
  };

  // Helper function for handling text/select input changes
  const handleTextChange = (key, value) => {
    onSettingsChange(viewboxId, key, value);
  };


  return (
    // Use the new main style with flex display
    <div style={mainViewboxStyle} data-viewbox-id={viewboxId}>
      {/* Remove Button (stays positioned relative to mainViewboxStyle) */}
      {onRemove && (
        <button
          style={{
            ...removeButtonStyle,
            ...(isHoveringRemove ? removeButtonHoverStyle : {}),
          }}
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering cell selection
            onRemove(viewboxId);
          }}
          onMouseEnter={() => setIsHoveringRemove(true)}
          onMouseLeave={() => setIsHoveringRemove(false)}
          title="Remove Viewbox" // Tooltip for accessibility
        >
          X
        </button>
      )}

      {/* Content Area (Grid + Title Block) */}
      <div style={contentAreaStyle}>
        {/* Grid Layout Area */}
        <div style={gridContainerStyle}>
          {/* Render grid cells, placing items if they exist */}
        {Array.from({ length: gridRows * gridCols }).map((_, cellIndex) => { // Use cellIndex
          const item = items && items[cellIndex]; // Get item for this cell index

          // Determine if this cell is the selected target
          const isSelected = selectedTarget &&
                             selectedTarget.viewboxId === viewboxId &&
                             selectedTarget.cellIndex === cellIndex;

          // Apply selected style conditionally
          const currentCellStyle = {
            ...gridCellStyle,
            borderColor: isSelected ? '#2196F3' : '#eee', // Highlight border if selected
            borderWidth: isSelected ? '2px' : '1px',
            // Optional: slightly different background for selected cell
            // backgroundColor: isSelected ? '#e3f2fd' : '#f9f9f9',
          };

          return (
            <div
              key={cellIndex}
              style={currentCellStyle}
              // Restore cell selection onClick with refined logic
              onClick={(event) => {
                // Select the cell ONLY if the click target does NOT have an SVG ancestor
                if (!event.target.closest('svg')) {
                  onCellSelection(viewboxId, cellIndex);
                }
                // Otherwise, the click was inside the SVG, let its handlers manage it.
              }}
            >
              {item ? (
                // If item exists, render the SvgView component
                <SvgView
                  viewInstanceData={item} // Pass renamed prop
                  onPathClick={onPathClick}
                  // Get the correct measurements for this specific view instance
                  measurements={measurementsByViewInstanceId[item.id] || []}
                  // onMeasurementUpdate={onMeasurementUpdate} // REMOVED - Update is handled via hook callback
                  // Removed onMeasurementDragStart
                  zoomLevel={zoomLevel} // Pass zoomLevel for potential use in MeasurementDisplay
                  snapPoints={snapPoints} // Pass snapPoints array down to SvgView
                  onUpdateOverrideValue={onUpdateOverrideValue} // Pass override handler down
                  onDeleteMeasurement={onDeleteMeasurement} // Pass delete handler down
                />
              ) : (
                // If no item, display empty cell placeholder
                `Cell ${cellIndex + 1} (Empty)` // Use cellIndex
              )}
            </div>
          );
        })}
      </div>

      {/* Title Block - Updated with Correct Fields */}
      <div style={titleBlockStyle}>
        {/* Row 1: Project, Part Name */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span style={{ display: 'flex', alignItems: 'center', flexBasis: '50%', marginRight: '5px' }}>
            <label htmlFor={`project-${viewboxId}`} style={{ marginRight: '3px', whiteSpace: 'nowrap' }}>Project:</label>
            <input
              type="text"
              id={`project-${viewboxId}`}
              value={titleBlock.project || ''}
              onChange={(e) => handleInputChange('project', e.target.value)}
              style={{ fontSize: '10px', padding: '1px 3px', border: '1px solid #ccc', width: '100%' }}
            />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', flexBasis: '50%' }}>
            <label htmlFor={`partName-${viewboxId}`} style={{ marginRight: '3px', whiteSpace: 'nowrap' }}>Part Name:</label>
            <input
              type="text"
              id={`partName-${viewboxId}`}
              value={titleBlock.partName || ''}
              onChange={(e) => handleInputChange('partName', e.target.value)}
              style={{ fontSize: '10px', padding: '1px 3px', border: '1px solid #ccc', width: '100%' }}
            />
          </span>
        </div>
        {/* Row 2: Scale, Material */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
           <span style={{ display: 'flex', alignItems: 'center', flexBasis: '50%', marginRight: '5px' }}>
             <label htmlFor={`scale-${viewboxId}`} style={{ marginRight: '3px' }}>Scale:</label>
             <input
               type="text"
               id={`scale-${viewboxId}`}
               value={titleBlock.scale || ''}
               onChange={(e) => handleInputChange('scale', e.target.value)}
               style={{ fontSize: '10px', padding: '1px 3px', border: '1px solid #ccc', width: '100%' }}
             />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', flexBasis: '50%' }}>
             <label htmlFor={`material-${viewboxId}`} style={{ marginRight: '3px' }}>Material:</label>
             <input
               type="text"
               id={`material-${viewboxId}`}
               value={titleBlock.material || ''}
               onChange={(e) => handleInputChange('material', e.target.value)}
               style={{ fontSize: '10px', padding: '1px 3px', border: '1px solid #ccc', width: '100%' }}
             />
          </span>
        </div>
        {/* Row 3: Drawn By, Date */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
           <span style={{ display: 'flex', alignItems: 'center', flexBasis: '50%', marginRight: '5px' }}>
             <label htmlFor={`drawnBy-${viewboxId}`} style={{ marginRight: '3px', whiteSpace: 'nowrap' }}>Drawn By:</label>
             <input
               type="text"
               id={`drawnBy-${viewboxId}`}
               value={titleBlock.drawnBy || ''}
               onChange={(e) => handleInputChange('drawnBy', e.target.value)}
               style={{ fontSize: '10px', padding: '1px 3px', border: '1px solid #ccc', width: '100%' }}
             />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', flexBasis: '50%' }}>
             <label htmlFor={`date-${viewboxId}`} style={{ marginRight: '3px' }}>Date:</label>
             <input
               type="text" // Keep as text for simplicity
               id={`date-${viewboxId}`}
               value={titleBlock.date || ''}
               onChange={(e) => handleInputChange('date', e.target.value)}
               style={{ fontSize: '10px', padding: '1px 3px', border: '1px solid #ccc', width: '100%' }}
             />
          </span>
        </div>
      </div> {/* End of the first (correct) Title Block div */}
    </div> {/* End of contentAreaStyle div */}

      {/* Settings Form Area - Should be sibling to contentAreaStyle */}
      {exportSettings && onSettingsChange && ( // Conditionally render if props are available
        <div style={settingsFormStyle}>
          <h4 style={{ marginTop: 0, marginBottom: '10px', textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Export Settings</h4>

          {/* --- Page Setup --- */}
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`paperSize-${viewboxId}`}>Paper Size:</label>
            <select
              id={`paperSize-${viewboxId}`}
              style={settingInputStyle}
              value={exportSettings.paperSize || 'a4'}
              onChange={(e) => handleTextChange('paperSize', e.target.value)}
            >
              <option value="a4">A4</option>
              <option value="letter">Letter</option>
            </select>
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`margin-${viewboxId}`}>Margin (mm):</label>
            <input
              id={`margin-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.5"
              min="0"
              value={exportSettings.margin ?? 10}
              onChange={(e) => handleNumberChange('margin', e.target.value)}
            />
          </div>

          {/* --- Layout & Scaling --- */}
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`viewGap-${viewboxId}`}>View Gap (mm):</label>
            <input
              id={`viewGap-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.5"
              min="0"
              value={exportSettings.viewGap ?? 20}
              onChange={(e) => handleNumberChange('viewGap', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`minMargin-${viewboxId}`}>Min Edge Margin (mm):</label>
            <input
              id={`minMargin-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.5"
              min="0"
              value={exportSettings.minMargin ?? 25}
              onChange={(e) => handleNumberChange('minMargin', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`offsetX-${viewboxId}`}>Offset X (mm):</label>
            <input
              id={`offsetX-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.1"
              value={exportSettings.offsetX ?? 0}
              onChange={(e) => handleNumberChange('offsetX', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`offsetY-${viewboxId}`}>Offset Y (mm):</label>
            <input
              id={`offsetY-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.1"
              value={exportSettings.offsetY ?? 0}
              onChange={(e) => handleNumberChange('offsetY', e.target.value)}
            />
          </div>

          {/* PDF Scale Override Input */}
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`customScaleOverride-${viewboxId}`}>PDF Scale Override:</label>
            <input
              id={`customScaleOverride-${viewboxId}`}
              style={settingInputStyle}
              type="text"
              placeholder="e.g., 1:10, 2:1, 0=auto"
              value={exportSettings.customScaleOverride || ''} // Use empty string if null/undefined
              onChange={(e) => handleTextChange('customScaleOverride', e.target.value)}
            />
          </div>

          {/* --- Styling --- */}
          <h5 style={{ marginTop: '10px', marginBottom: '5px', textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Styling</h5>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`visibleStrokeColor-${viewboxId}`}>Visible Line Color:</label>
            <input
              id={`visibleStrokeColor-${viewboxId}`}
              style={{ ...settingInputStyle, padding: '0 2px', height: '20px' }} // Adjust style for color input
              type="color"
              value={exportSettings.visibleStrokeColor || '#000000'}
              onChange={(e) => handleColorChange('visibleStrokeColor', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`visibleStrokeWidth-${viewboxId}`}>Visible Line Width (mm):</label>
            <input
              id={`visibleStrokeWidth-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.05"
              min="0"
              value={exportSettings.visibleStrokeWidth ?? 0.5}
              onChange={(e) => handleNumberChange('visibleStrokeWidth', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`hiddenStrokeColor-${viewboxId}`}>Hidden Line Color:</label>
            <input
              id={`hiddenStrokeColor-${viewboxId}`}
              style={{ ...settingInputStyle, padding: '0 2px', height: '20px' }}
              type="color"
              value={exportSettings.hiddenStrokeColor || '#777777'}
              onChange={(e) => handleColorChange('hiddenStrokeColor', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`hiddenStrokeWidth-${viewboxId}`}>Hidden Line Width (mm):</label>
            <input
              id={`hiddenStrokeWidth-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.05"
              min="0"
              value={exportSettings.hiddenStrokeWidth ?? 0.35}
              onChange={(e) => handleNumberChange('hiddenStrokeWidth', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`hiddenDashLength-${viewboxId}`}>Hidden Dash Length (mm):</label>
            <input
              id={`hiddenDashLength-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.1"
              min="0"
              value={exportSettings.hiddenDashLength ?? 2}
              onChange={(e) => handleNumberChange('hiddenDashLength', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`hiddenDashGap-${viewboxId}`}>Hidden Dash Gap (mm):</label>
            <input
              id={`hiddenDashGap-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.1"
              min="0"
              value={exportSettings.hiddenDashGap ?? 1}
              onChange={(e) => handleNumberChange('hiddenDashGap', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`borderColor-${viewboxId}`}>Border Color:</label>
            <input
              id={`borderColor-${viewboxId}`}
              style={{ ...settingInputStyle, padding: '0 2px', height: '20px' }}
              type="color"
              value={exportSettings.borderColor || '#000000'}
              onChange={(e) => handleColorChange('borderColor', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`borderLineWidth-${viewboxId}`}>Border Width (mm):</label>
            <input
              id={`borderLineWidth-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.05"
              min="0"
              value={exportSettings.borderLineWidth ?? 0.2}
              onChange={(e) => handleNumberChange('borderLineWidth', e.target.value)}
            />
          </div>

          {/* --- Measurement Styling --- */}
          <h5 style={{ marginTop: '10px', marginBottom: '5px', textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Measurements</h5>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`measurementStrokeColor-${viewboxId}`}>Meas. Line Color:</label>
            <input
              id={`measurementStrokeColor-${viewboxId}`}
              style={{ ...settingInputStyle, padding: '0 2px', height: '20px' }}
              type="color"
              value={exportSettings.measurementStrokeColor || '#222222'}
              onChange={(e) => handleColorChange('measurementStrokeColor', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`measurementFillColor-${viewboxId}`}>Meas. Text/Arrow Color:</label>
            <input
              id={`measurementFillColor-${viewboxId}`}
              style={{ ...settingInputStyle, padding: '0 2px', height: '20px' }}
              type="color"
              value={exportSettings.measurementFillColor || '#222222'}
              onChange={(e) => handleColorChange('measurementFillColor', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`measurementStrokeWidth-${viewboxId}`}>Meas. Line Width (mm):</label>
            <input
              id={`measurementStrokeWidth-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.01"
              min="0"
              value={exportSettings.measurementStrokeWidth ?? 0.08}
              onChange={(e) => handleNumberChange('measurementStrokeWidth', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`measurementFontSize-${viewboxId}`}>Meas. Font Size (mm):</label>
            <input
              id={`measurementFontSize-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.1"
              min="0"
              value={exportSettings.measurementFontSize ?? 3.5}
              onChange={(e) => handleNumberChange('measurementFontSize', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`measurementArrowSize-${viewboxId}`}>Meas. Arrow Size (mm):</label>
            <input
              id={`measurementArrowSize-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.1"
              min="0"
              value={exportSettings.measurementArrowSize ?? 1.2}
              onChange={(e) => handleNumberChange('measurementArrowSize', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`measurementTextOffset-${viewboxId}`}>Meas. Text Offset (mm):</label>
            <input
              id={`measurementTextOffset-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.1"
              min="0"
              value={exportSettings.measurementTextOffset ?? 1.2}
              onChange={(e) => handleNumberChange('measurementTextOffset', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`measurementExtensionGap-${viewboxId}`}>Meas. Ext. Gap (mm):</label>
            <input
              id={`measurementExtensionGap-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.1"
              min="0"
              value={exportSettings.measurementExtensionGap ?? 0.8}
              onChange={(e) => handleNumberChange('measurementExtensionGap', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`measurementExtensionOverhang-${viewboxId}`}>Meas. Ext. Overhang (mm):</label>
            <input
              id={`measurementExtensionOverhang-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.1"
              min="0"
              value={exportSettings.measurementExtensionOverhang ?? 1.2}
              onChange={(e) => handleNumberChange('measurementExtensionOverhang', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`measurementInitialOffset-${viewboxId}`}>Meas. Initial Offset (mm):</label>
            <input
              id={`measurementInitialOffset-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.5"
              min="0"
              value={exportSettings.measurementInitialOffset ?? 10}
              onChange={(e) => handleNumberChange('measurementInitialOffset', e.target.value)}
            />
          </div>
          <div style={settingRowStyle}>
            <label style={settingLabelStyle} htmlFor={`measurementStackingOffset-${viewboxId}`}>Meas. Stacking Offset (mm):</label>
            <input
              id={`measurementStackingOffset-${viewboxId}`}
              style={settingInputStyle}
              type="number"
              step="0.5"
              min="0"
              value={exportSettings.measurementStackingOffset ?? 7}
              onChange={(e) => handleNumberChange('measurementStackingOffset', e.target.value)}
            />
          </div>
          {/* Measurement Font Family could be added if needed */}

        </div>
      )}
    </div>
  );
} // End of function ViewboxComponent

export default memo(ViewboxComponent); // Export the memoized component
