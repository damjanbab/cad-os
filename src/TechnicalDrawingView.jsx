// TechnicalDrawingView.jsx with enhanced SVG path referencing
import React, { useEffect, useRef, useState } from 'react';

/**
 * Renders a single SVG path with additional reference data
 */
function ReferencePath({ path, stroke, strokeWidth, strokeDasharray }) {
  if (!path) return null;
  
  // If path is a normalized path object with all our reference data
  if (path && path.id) {
    // Determine what to use as the 'd' attribute
    let pathData;
    if (typeof path.data === 'string') {
      pathData = path.data;
    } else if (path.rawPath) {
      // Handle original array format from replicad
      if (Array.isArray(path.rawPath)) {
        // If it's just an array with one string, use that
        pathData = path.rawPath[0];
      } else {
        // Fallback
        pathData = String(path.rawPath);
      }
    } else {
      pathData = String(path.data || '');
    }
    
    return (
      <path
        key={path.id}
        id={path.id}
        d={pathData}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={strokeDasharray}
        data-type={path.geometry?.type || "unknown"}
        data-view={path.viewName}
        data-visibility={path.visibility}
        data-part={path.partName}
        data-index={path.index}
      />
    );
  }
  
  // Fallback for old path format (for backward compatibility)
  if (Array.isArray(path)) {
    return (
      <path
        d={path[0]}
        stroke={stroke}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={strokeDasharray}
      />
    );
  }
  
  // String format
  return (
    <path
      d={typeof path === 'string' ? path : String(path)}
      stroke={stroke}
      strokeWidth={strokeWidth}
      fill="none"
      strokeDasharray={strokeDasharray}
    />
  );
}

// SVG Technical Drawing Projection component
function ProjectionView({ projection, title, position, dimensions, transform }) {
  if (!projection) return null;
  
  // Extract dimensions
  const { width, height } = dimensions;
  const [x, y] = position;
  
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
        borderBottom: '1px solid #ddd', 
        backgroundColor: '#eee', 
        fontSize: '12px', 
        fontWeight: 'bold' 
      }}>
        {title}
      </div>
      
      <div style={{ width: '100%', height: 'calc(100% - 30px)', position: 'relative' }}>
        <svg 
          viewBox={projection.combinedViewBox} 
          style={{ width: '100%', height: '100%' }}
          preserveAspectRatio="xMidYMid meet"
          data-view-title={title}
        >
          {/* Visible lines */}
          <g>
            {projection.visible.paths.map((path, i) => (
              <ReferencePath
                key={path.id || `visible-${i}`}
                path={path}
                stroke="#000000"
                strokeWidth="0.5"
                strokeDasharray={null}
              />
            ))}
          </g>
          
          {/* Hidden lines */}
          <g>
            {projection.hidden.paths.map((path, i) => (
              <ReferencePath
                key={path.id || `hidden-${i}`}
                path={path}
                stroke="#777777"
                strokeWidth="0.3"
                strokeDasharray="2,1"
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

// Component to render individual part views
function PartView({ part, index }) {
  if (!part || !part.views) return null;
  
  return (
    <div key={index} style={{ 
      margin: '10px', 
      border: '1px solid #ccc', 
      backgroundColor: 'white' 
    }}>
      <h4 style={{ 
        padding: '5px', 
        margin: 0, 
        backgroundColor: '#eee' 
      }}>
        {part.name}
      </h4>
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        padding: '10px' 
      }}>
        {Object.entries(part.views).map(([viewName, view], viewIndex) => (
          <div key={viewIndex} style={{ 
            margin: '5px', 
            width: '150px', 
            height: '150px', 
            border: '1px solid #ddd' 
          }}>
            <div style={{ 
              padding: '3px', 
              borderBottom: '1px solid #ddd', 
              fontSize: '10px' 
            }}>
              {viewName}
            </div>
            <div style={{ 
              width: '100%', 
              height: 'calc(100% - 20px)' 
            }}>
              <svg 
                viewBox={view.combinedViewBox} 
                style={{ width: '100%', height: '100%' }}
                preserveAspectRatio="xMidYMid meet"
                data-part-name={part.name}
                data-view-name={viewName}
              >
                {/* Visible lines */}
                <g>
                  {view.visible.paths.map((path, i) => (
                    <ReferencePath
                      key={path.id || `part-visible-${i}`}
                      path={path}
                      stroke="#000000"
                      strokeWidth="0.5"
                      strokeDasharray={null}
                    />
                  ))}
                </g>
                
                {/* Hidden lines */}
                <g>
                  {view.hidden.paths.map((path, i) => (
                    <ReferencePath
                      key={path.id || `part-hidden-${i}`}
                      path={path}
                      stroke="#777777"
                      strokeWidth="0.3"
                      strokeDasharray="2,1"
                    />
                  ))}
                </g>
              </svg>
            </div>
          </div>
        ))}
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
    const newZoom = Math.max(0.5, Math.min(5, zoomLevel + delta));
    
    // Calculate new pan offset to keep cursor point stationary
    const newPanOffsetX = x - cursorXInContent * newZoom;
    const newPanOffsetY = y - cursorYInContent * newZoom;
    
    // Update state
    setZoomLevel(newZoom);
    setPanOffset({ x: newPanOffsetX, y: newPanOffsetY });
  };
  
  // Mouse down handler to start dragging
  const handleMouseDown = (e) => {
    // Only handle left mouse button
    if (e.button !== 0) return;
    
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartOffset({ ...panOffset });
  };
  
  // Mouse move handler for panning
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    
    setPanOffset({
      x: dragStartOffset.x + dx,
      y: dragStartOffset.y + dy
    });
  };
  
  // Mouse up handler to end dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Touch event handlers
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
  
  // Calculate view layout dimensions
  const viewWidth = containerSize.width / 2;
  const viewHeight = containerSize.height / 2;
  
  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative', 
        backgroundColor: '#f0f0f0',
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
      {/* Zoom controls */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '8px' : '10px',
        right: isMobile ? '8px' : '10px',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.7)',
        padding: isMobile ? '8px' : '5px',
        borderRadius: '4px'
      }}>
        <button 
          style={{ 
            margin: '0 5px', 
            padding: isMobile ? '5px 12px' : '2px 8px', 
            cursor: 'pointer',
            fontSize: isMobile ? '16px' : 'inherit' 
          }}
          onClick={() => {
            const newZoom = Math.max(0.5, zoomLevel - 0.1);
            // Zoom toward center when using buttons
            const centerX = containerSize.width / 2;
            const centerY = containerSize.height / 2;
            const centerXInContent = (centerX - panOffset.x) / zoomLevel;
            const centerYInContent = (centerY - panOffset.y) / zoomLevel;
            const newPanOffsetX = centerX - centerXInContent * newZoom;
            const newPanOffsetY = centerY - centerYInContent * newZoom;
            
            setZoomLevel(newZoom);
            setPanOffset({ x: newPanOffsetX, y: newPanOffsetY });
          }}
        >
          −
        </button>
        <span style={{ 
          margin: '0 5px', 
          fontSize: isMobile ? '14px' : '12px' 
        }}>
          {Math.round(zoomLevel * 100)}%
        </span>
        <button 
          style={{ 
            margin: '0 5px', 
            padding: isMobile ? '5px 12px' : '2px 8px', 
            cursor: 'pointer',
            fontSize: isMobile ? '16px' : 'inherit'  
          }}
          onClick={() => {
            const newZoom = Math.min(5, zoomLevel + 0.1);
            // Zoom toward center when using buttons
            const centerX = containerSize.width / 2;
            const centerY = containerSize.height / 2;
            const centerXInContent = (centerX - panOffset.x) / zoomLevel;
            const centerYInContent = (centerY - panOffset.y) / zoomLevel;
            const newPanOffsetX = centerX - centerXInContent * newZoom;
            const newPanOffsetY = centerY - centerYInContent * newZoom;
            
            setZoomLevel(newZoom);
            setPanOffset({ x: newPanOffsetX, y: newPanOffsetY });
          }}
        >
          +
        </button>
        <button 
          style={{ 
            margin: '0 5px', 
            padding: isMobile ? '5px 12px' : '2px 8px', 
            cursor: 'pointer',
            fontSize: isMobile ? '14px' : 'inherit'  
          }}
          onClick={resetView}
        >
          Reset
        </button>
      </div>
      
      {projections.standard && (
        <div style={{ 
          position: 'relative', 
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '0 0',
          transition: 'none'
        }}>
          {/* Front View - Center position */}
          <ProjectionView 
            projection={projections.standard.frontView} 
            title="Front View"
            position={[viewWidth / 2, viewHeight / 2]}
            dimensions={{ width: viewWidth, height: viewHeight }}
          />
          
          {/* Top View - Above front view */}
          <ProjectionView 
            projection={projections.standard.topView} 
            title="Top View"
            position={[viewWidth / 2, 0]}
            dimensions={{ width: viewWidth, height: viewHeight / 2 }}
          />
          
          {/* Right View - Right of front view */}
          <ProjectionView 
            projection={projections.standard.rightView} 
            title="Right View"
            position={[viewWidth * 1.5, viewHeight / 2]}
            dimensions={{ width: viewWidth / 2, height: viewHeight }}
          />
        </div>
      )}
      
      {/* Render individual part projections if available */}
      {projections.parts && projections.parts.length > 0 && (
        <div style={{ 
          position: 'absolute', 
          top: viewHeight * 1.2, 
          left: 0, 
          width: '100%',
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '0 0',
          transition: 'none'
        }}>
          <h3 style={{ padding: '10px', margin: 0 }}>Component Views</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {projections.parts.map((part, index) => (
              <PartView key={index} part={part} index={index} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}