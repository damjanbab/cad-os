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
function PathElement({ path, stroke, strokeWidth, strokeDasharray }) {
  if (!path) return null;
  
  // Handle different path formats
  const pathData = path.data || (typeof path === 'string' ? path : String(path));
  
  // Use vector-effect to keep stroke width consistent regardless of SVG scaling
  return (
    <path
      id={path.id}
      d={pathData}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="none"
      strokeDasharray={strokeDasharray}
      style={{ vectorEffect: 'non-scaling-stroke' }}
    />
  );
}

// Projection View Component
function ProjectionView({ projection, title, position, dimensions, scale }) {
  if (!projection) return null;
  
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
          viewBox={projection.combinedViewBox} 
          style={{ width: '100%', height: '100%' }}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* IMPORTANT: Draw hidden lines FIRST (underneath) */}
          <g>
            {projection.hidden.paths.map((path, i) => (
              <PathElement
                key={path.id || `hidden-${i}`}
                path={path}
                stroke="#777777"
                strokeWidth="0.3"
                strokeDasharray="2,1"
              />
            ))}
          </g>
          
          {/* Draw visible lines SECOND (on top) so they visually override hidden lines */}
          <g>
            {projection.visible.paths.map((path, i) => (
              <PathElement
                key={path.id || `visible-${i}`}
                path={path}
                stroke="#000000"
                strokeWidth="0.5"
                strokeDasharray={null}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

// Component to render individual part views
function PartView({ part, index, scale }) {
  if (!part || !part.views) return null;
  
  const titleHeight = 20; // Height of the title bar in pixels for part views
  const layoutGap = 20; // Gap between views in pixels
  
  // Get the view data for each projection
  const frontView = part.views.front;
  const topView = part.views.top;
  const rightView = part.views.right;
  
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
                viewBox={frontView.combinedViewBox} 
                style={{ width: '100%', height: '100%' }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* IMPORTANT: Draw hidden lines FIRST (underneath) */}
                <g>
                  {frontView.hidden.paths.map((path, i) => (
                    <PathElement
                      key={path.id || `part-hidden-${i}`}
                      path={path}
                      stroke="#777777"
                      strokeWidth="0.3"
                      strokeDasharray="2,1"
                    />
                  ))}
                </g>
                
                {/* Draw visible lines SECOND (on top) */}
                <g>
                  {frontView.visible.paths.map((path, i) => (
                    <PathElement
                      key={path.id || `part-visible-${i}`}
                      path={path}
                      stroke="#000000"
                      strokeWidth="0.5"
                      strokeDasharray={null}
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
                viewBox={topView.combinedViewBox} 
                style={{ width: '100%', height: '100%' }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* IMPORTANT: Draw hidden lines FIRST (underneath) */}
                <g>
                  {topView.hidden.paths.map((path, i) => (
                    <PathElement
                      key={path.id || `part-hidden-${i}`}
                      path={path}
                      stroke="#777777"
                      strokeWidth="0.3"
                      strokeDasharray="2,1"
                    />
                  ))}
                </g>
                
                {/* Draw visible lines SECOND (on top) */}
                <g>
                  {topView.visible.paths.map((path, i) => (
                    <PathElement
                      key={path.id || `part-visible-${i}`}
                      path={path}
                      stroke="#000000"
                      strokeWidth="0.5"
                      strokeDasharray={null}
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
                viewBox={rightView.combinedViewBox} 
                style={{ width: '100%', height: '100%' }}
                preserveAspectRatio="xMidYMid meet"
              >
                {/* IMPORTANT: Draw hidden lines FIRST (underneath) */}
                <g>
                  {rightView.hidden.paths.map((path, i) => (
                    <PathElement
                      key={path.id || `part-hidden-${i}`}
                      path={path}
                      stroke="#777777"
                      strokeWidth="0.3"
                      strokeDasharray="2,1"
                    />
                  ))}
                </g>
                
                {/* Draw visible lines SECOND (on top) */}
                <g>
                  {rightView.visible.paths.map((path, i) => (
                    <PathElement
                      key={path.id || `part-visible-${i}`}
                      path={path}
                      stroke="#000000"
                      strokeWidth="0.5"
                      strokeDasharray={null}
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

export default function TechnicalDrawingView({ projections, isMobile }) {
  if (!projections) return <div>Loading projections...</div>;
  
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(10); // Initial scale: 10 pixels per cm
  
  // For tracking mouse position and dragging
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  
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
  };
  
  // --- Layout Calculation ---
  const standardViews = projections.standard;
  let frontViewData, topViewData, rightViewData;
  let frontWidth = 0, frontHeight = 0;
  let topWidth = 0, topHeight = 0;
  let rightWidth = 0, rightHeight = 0;
  const layoutGap = 20; // Gap between views in pixels
  
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
      }}>
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
                <PartView key={index} part={part} index={index} scale={scale} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}