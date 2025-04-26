import { useState, useCallback, useRef, useEffect } from 'react';

// Helper to get SVG coordinates from screen coordinates using CTM
const getSvgCoordinates = (screenX, screenY, svgElement) => {
  // ... (keep existing helper function)
  if (!svgElement) {
    console.error("SVG element not provided for coordinate conversion.");
    return null;
  }
  try {
    const point = svgElement.createSVGPoint();
    point.x = screenX;
    point.y = screenY;
    const ctm = svgElement.getScreenCTM();
    if (!ctm) {
        console.error("Could not get CTM from SVG element.");
        return null;
    }
    const inverseCtm = ctm.inverse();
    if (!inverseCtm) {
        console.error("CTM is not invertible.");
        return null;
    }
    return point.matrixTransform(inverseCtm);
  } catch (error) {
    console.error("Error getting SVG coordinates:", error);
    return null;
  }
};

// Centralized hook for canvas interactions: panning, zooming, and measurement dragging
export function useCanvasInteraction(containerRef, getMeasurementState) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });

  const [draggingMeasurementId, setDraggingMeasurementId] = useState(null);
  const [dragStartScreenPos, setDragStartScreenPos] = useState({ x: 0, y: 0 });
  const [dragStartSvgPos, setDragStartSvgPos] = useState({ x: 0, y: 0 });

  // Refs
  const svgRef = useRef(null);
  const onMeasurementDragRef = useRef(null);
  // Ref to store the currently active listeners (wrappers)
  const activeListenersRef = useRef({ move: null, end: null, cancel: null, target: null, type: null, options: null });
  // Refs to store the latest interaction logic
  const moveLogicRef = useRef(() => {});
  const endLogicRef = useRef(() => {});

  // Setter for the parent's measurement update callback
  const setOnMeasurementDrag = useCallback((handler) => {
    onMeasurementDragRef.current = handler;
  }, []);

  // Setter for the relevant SVG element
  const setInteractionSvgRef = useCallback((ref) => {
    svgRef.current = ref;
  }, []);

  // --- Zoom Handler ---
  const handleWheel = useCallback((e) => {
    // ... (keep existing zoom logic)
    e.preventDefault();
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cursorXInContent = (x - panOffset.x) / zoomLevel;
    const cursorYInContent = (y - panOffset.y) / zoomLevel;
    const delta = -Math.sign(e.deltaY) * 0.1;
    const newZoom = Math.max(0.1, Math.min(10, zoomLevel + delta * zoomLevel));
    const newPanOffsetX = x - cursorXInContent * newZoom;
    const newPanOffsetY = y - cursorYInContent * newZoom;
    setZoomLevel(newZoom);
    setPanOffset({ x: newPanOffsetX, y: newPanOffsetY });
  }, [containerRef, panOffset, zoomLevel]);

  // --- Update Logic Refs ---
  // This effect updates the logic refs whenever state they depend on changes
  useEffect(() => {
    // --- Move Logic ---
    moveLogicRef.current = (e) => {
      const isTouchEvent = activeListenersRef.current.type === 'touch'; // Use stored type
      const eventPos = isTouchEvent ? e.touches[0] : e;
      if (!eventPos) return;

      // Measurement Drag Move
      if (draggingMeasurementId) {
        if (isTouchEvent && e.cancelable) e.preventDefault();
        const dxScreen = eventPos.clientX - dragStartScreenPos.x;
        const dyScreen = eventPos.clientY - dragStartScreenPos.y;
        const targetSvg = svgRef.current;
        if (!targetSvg) return;
        const invMatrix = targetSvg.getScreenCTM()?.inverse();
        if (!invMatrix) return;
        const deltaX_svg = dxScreen * invMatrix.a + dyScreen * invMatrix.c;
        const deltaY_svg = dxScreen * invMatrix.b + dyScreen * invMatrix.d;
        const newTextPos = {
          x: dragStartSvgPos.x + deltaX_svg,
          y: dragStartSvgPos.y + deltaY_svg,
        };
        if (onMeasurementDragRef.current) {
          onMeasurementDragRef.current(draggingMeasurementId, newTextPos);
        }
      }
      // Panning Move
      else if (isPanning) {
        if (isTouchEvent && e.cancelable) e.preventDefault();
        const dx = eventPos.clientX - panStart.x;
        const dy = eventPos.clientY - panStart.y;
        setPanOffset({
          x: panStartOffset.x + dx,
          y: panStartOffset.y + dy
        });
      }
    };

    // --- End Logic ---
    endLogicRef.current = (e) => {
      const { move, end, cancel, target, type, options } = activeListenersRef.current;

      if (target && move && end) {
        const moveEvent = type === 'touch' ? 'touchmove' : 'mousemove';
        const endEvent = type === 'touch' ? 'touchend' : 'mouseup';
        const cancelEvent = 'touchcancel'; // Only for touch

        target.removeEventListener(moveEvent, move, options); // Use stored options for removal
        target.removeEventListener(endEvent, end, options);
        if (type === 'touch' && cancel) {
            target.removeEventListener(cancelEvent, cancel, options);
        }
        // Also remove mouseleave for panning
        if (target === containerRef.current && type === 'mouse') {
            target.removeEventListener('mouseleave', end, options);
        }

        // Clear the stored listeners
        activeListenersRef.current = { move: null, end: null, cancel: null, target: null, type: null, options: null };
      }

      // Update state *after* removing listeners
      if (draggingMeasurementId) {
        setDraggingMeasurementId(null);
        if (svgRef.current) svgRef.current = null;
      } else if (isPanning) {
        setIsPanning(false);
      }
    };
  }, [
    isPanning, draggingMeasurementId, // State dependencies for logic
    panStart, panStartOffset, dragStartScreenPos, dragStartSvgPos, // Other state
    onMeasurementDragRef, svgRef, containerRef, // Refs
    setPanOffset, setDraggingMeasurementId, setIsPanning // Setters
  ]);


  // --- Combined Interaction Start Handler ---
  const handleInteractionStart = useCallback((e) => {
    // Ensure no existing listeners are active (safety check)
    if (activeListenersRef.current.target) {
      console.warn("Interaction start called while listeners were still active. Cleaning up.");
      endLogicRef.current(e); // Attempt cleanup
    }

    const isTouchEvent = e.type.startsWith('touch');
    if (isTouchEvent && e.touches.length > 1) return;

    const eventPos = isTouchEvent ? e.touches[0] : e;
    if (!eventPos) return;

    const targetElement = e.target;
    const containingSvg = targetElement.closest('svg');
    svgRef.current = containingSvg;

    const measurementGroup = targetElement.closest('.measurement-group');
    const controls = targetElement.closest('button, input[type="range"], .drawing-controls');

    if (controls) return;

    // --- Define Stable Wrapper Functions ---
    // These functions will be added/removed, their identity is stable
    const onMoveWrapper = (event) => moveLogicRef.current(event);
    const onEndWrapper = (event) => endLogicRef.current(event);
    const onCancelWrapper = (event) => endLogicRef.current(event); // End logic handles cancel too

    let target = null;
    let eventType = null;
    let listenerOptions = null;

    // --- Measurement Drag Start ---
    if (measurementGroup && measurementGroup.id && svgRef.current) {
      const measurementId = measurementGroup.id;
      const currentMeasurements = getMeasurementState ? getMeasurementState() : {};
      const currentMeasurement = currentMeasurements[measurementId];

      if (!currentMeasurement || typeof currentMeasurement.textPosition?.x !== 'number' || typeof currentMeasurement.textPosition?.y !== 'number') {
        console.warn(`[Interaction] Measurement ${measurementId} not found or invalid textPosition. Aborting drag start.`, currentMeasurement);
        return;
      }
      // Optional CTM check
      try {
          const ctmCheck = svgRef.current.getScreenCTM();
          if (!ctmCheck || !ctmCheck.inverse()) {
             console.error(`[Interaction] Drag Start Error: Invalid CTM for SVG:`, svgRef.current);
             return;
          }
      } catch (error) {
          console.error(`[Interaction] Drag Start Error: Exception getting/inverting CTM for SVG:`, svgRef.current, error);
          return;
      }

      if (e.preventDefault) e.preventDefault();

      setDraggingMeasurementId(measurementId);
      setDragStartScreenPos({ x: eventPos.clientX, y: eventPos.clientY });
      setDragStartSvgPos(currentMeasurement.textPosition);

      // Add listeners to window using wrappers
      target = window;
      eventType = isTouchEvent ? 'touch' : 'mouse';
      listenerOptions = isTouchEvent ? { passive: false } : undefined; // Passive false for touchmove preventDefault

      window.addEventListener(eventType === 'touch' ? 'touchmove' : 'mousemove', onMoveWrapper, listenerOptions);
      window.addEventListener(eventType === 'touch' ? 'touchend' : 'mouseup', onEndWrapper);
      if (eventType === 'touch') {
        window.addEventListener('touchcancel', onCancelWrapper);
      }
    }
    // --- Panning Start ---
    else if ((!isTouchEvent && e.button === 0) || (isTouchEvent && e.touches.length === 1)) {
      if (isTouchEvent && e.preventDefault) e.preventDefault();

      setIsPanning(true);
      setPanStart({ x: eventPos.clientX, y: eventPos.clientY });
      setPanStartOffset({ ...panOffset });

      // Add listeners to container using wrappers
      if (containerRef.current) {
        target = containerRef.current;
        eventType = isTouchEvent ? 'touch' : 'mouse';
        // Capture phase for panning, passive false for touchmove preventDefault
        listenerOptions = { capture: true, passive: !isTouchEvent };

        target.addEventListener(eventType === 'touch' ? 'touchmove' : 'mousemove', onMoveWrapper, listenerOptions);
        target.addEventListener(eventType === 'touch' ? 'touchend' : 'mouseup', onEndWrapper, true); // Capture true for end/cancel
        if (eventType === 'touch') {
            target.addEventListener('touchcancel', onCancelWrapper, true);
        }
        // Add mouseleave only for mouse panning
        if (eventType === 'mouse') {
            target.addEventListener('mouseleave', onEndWrapper, true);
        }
      }
    }

    // Store the active listeners
    if (target) {
        activeListenersRef.current = {
            move: onMoveWrapper,
            end: onEndWrapper,
            cancel: eventType === 'touch' ? onCancelWrapper : null,
            target: target,
            type: eventType,
            options: listenerOptions
        };
    }

  }, [
      panOffset, // Need current panOffset for panStartOffset
      containerRef,
      getMeasurementState,
      // No dependency on the logic refs or useCallback handlers here
      setDraggingMeasurementId, // State setters
      setDragStartScreenPos,
      setDragStartSvgPos,
      setIsPanning,
      setPanStart,
      setPanStartOffset,
      svgRef // Ref needed for CTM check
  ]);

  // Cleanup listeners on unmount
  useEffect(() => {
    // Return a cleanup function
    return () => {
      endLogicRef.current(); // Call the end logic to remove any active listeners
    };
  }, []); // Empty dependency array ensures this runs only on unmount

  // Reset zoom and pan
  const resetInteraction = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    // Ensure any lingering interactions are stopped
    if (activeListenersRef.current.target) {
        endLogicRef.current();
    } else {
        // Still update state if no listeners were active but state might be stuck
        if (draggingMeasurementId) setDraggingMeasurementId(null);
        if (isPanning) setIsPanning(false);
    }
  }, [draggingMeasurementId, isPanning]); // Depend on state to check if reset is needed

  // Handlers attached to the container element
  const interactionHandlers = {
    onWheel: handleWheel,
    onMouseDown: handleInteractionStart,
    onTouchStart: handleInteractionStart,
  };

  return {
    zoomLevel,
    panOffset,
    isPanning,
    draggingMeasurementId,
    interactionHandlers,
    resetInteraction,
    setZoomLevel,
    setPanOffset,
    setOnMeasurementDrag,
    setInteractionSvgRef,
  };
}
