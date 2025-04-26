import React from 'react';
import SvgView from './SvgView.jsx'; // Import the new SvgView component

// Parses layout string "rowsxcols" into [rows, cols]
const parseLayout = (layoutString) => {
  if (!layoutString || !layoutString.includes('x')) {
    return [1, 1]; // Default to 1x1 if invalid
  }
  const [rows, cols] = layoutString.split('x').map(Number);
  return [isNaN(rows) ? 1 : rows, isNaN(cols) ? 1 : cols];
};

// Basic placeholder for a Viewbox
export default function Viewbox({
  viewboxData,
  selectedTarget,
  onCellSelection,
  onTitleBlockChange, // Add prop for handling title block updates
  onPathClick, // Add prop for path click handler
  // Receive measurement props
  measurements,
  // onMeasurementUpdate, // REMOVED - Update is handled via hook callback
  // Removed onMeasurementDragStart
  zoomLevel,
}) {
  const { id: viewboxId, layout, titleBlock, items } = viewboxData; // Rename id to viewboxId for clarity
  const [gridRows, gridCols] = parseLayout(layout);

  // Handler for input changes in the title block
  const handleInputChange = (fieldName, value) => {
    if (onTitleBlockChange) {
      onTitleBlockChange(viewboxId, fieldName, value);
    }
  };

  // Basic styling for the viewbox container
  const viewboxStyle = {
    border: '1px solid #ccc',
    backgroundColor: 'white',
    padding: '10px',
    marginBottom: '20px', // Add some space between viewboxes
    minWidth: '300px', // Ensure a minimum size
    minHeight: '200px',
    position: 'relative', // For potential absolute positioning of items inside later
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
  };

  // Placeholder for title block rendering
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

  return (
    <div style={viewboxStyle} data-viewbox-id={viewboxId}>
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
                  viewItemData={item}
                  onPathClick={onPathClick}
                  // Filter measurements based on the specific view instance ID
                  measurements={measurements.filter(m => m.viewInstanceId === item.id)}
                  // onMeasurementUpdate={onMeasurementUpdate} // REMOVED - Update is handled via hook callback
                  // Removed onMeasurementDragStart
                  zoomLevel={zoomLevel} // Pass zoomLevel for potential use in MeasurementDisplay
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
      </div>
    </div>
  );
}
