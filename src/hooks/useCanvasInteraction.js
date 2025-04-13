import { useState, useCallback } from 'react';

export function useCanvasInteraction(containerRef) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

  // Mouse wheel zoom that zooms to cursor position
  const handleWheel = useCallback((e) => {
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
  }, [containerRef, panOffset, zoomLevel]); // Added dependencies

  // Mouse handlers for panning
  const handleMouseDown = useCallback((e) => {
    // Prevent pan if clicking on a measurement text (handled by MeasurementDisplay)
    // Or if clicking on a control button/slider
    if (e.target.closest('text[style*="cursor: move"]') || e.target.closest('button, input[type="range"]')) {
        return;
    }
    if (e.button !== 0) return; // Only allow left mouse button drag
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragStartOffset({ ...panOffset }); // Capture current offset at drag start
  }, [panOffset]); // Added dependency

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPanOffset({
      x: dragStartOffset.x + dx,
      y: dragStartOffset.y + dy
    });
  }, [isDragging, dragStart, dragStartOffset]); // Added dependencies

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
        setIsDragging(false);
    }
  }, [isDragging]); // Added dependency

  // Touch handlers for mobile panning
  const handleTouchStart = useCallback((e) => {
    // Prevent pan if touching a measurement text or controls
    if (e.target.closest('text[style*="cursor: move"]') || e.target.closest('button, input[type="range"]')) {
        return;
    }
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setDragStartOffset({ ...panOffset });
    }
  }, [panOffset]); // Added dependency

  const handleTouchMove = useCallback((e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.x;
    const dy = touch.clientY - dragStart.y;
    setPanOffset({
      x: dragStartOffset.x + dx,
      y: dragStartOffset.y + dy
    });
  }, [isDragging, dragStart, dragStartOffset]); // Added dependencies

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
        setIsDragging(false);
    }
  }, [isDragging]); // Added dependency

  // Reset zoom and pan
  const resetInteraction = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  }, []); // No dependencies needed

  // Combine handlers into an object for easy spreading
  const interactionHandlers = {
    onWheel: handleWheel,
    onMouseDown: handleMouseDown,
    onMouseMove: handleMouseMove,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseUp, // End drag if mouse leaves container
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchEnd, // End drag on cancel
  };

  return {
    zoomLevel,
    panOffset,
    isDragging,
    interactionHandlers,
    resetInteraction,
    // Expose setters if needed by controls (e.g., zoom buttons)
    setZoomLevel,
    setPanOffset,
  };
}
