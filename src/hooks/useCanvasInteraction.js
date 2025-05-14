import { useState, useCallback, useRef, useEffect } from 'react';

// Define endpoint grab threshold (in SVG coordinates) - Adjust as needed
const ENDPOINT_GRAB_THRESHOLD = 5;

// Helper to get SVG coordinates from screen coordinates using CTM
export const getSvgCoordinates = (screenX, screenY, svgElement) => { // Add export keyword
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

// Helper to calculate distance between two points
export const distance = (p1, p2) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

// Define snap threshold (in SVG coordinates)
export const SNAP_THRESHOLD = 5;

// Centralized hook for canvas interactions: panning, zooming, measurement/text/endpoint dragging
// Note: Snap logic is now handled in TechnicalDrawingCanvas onClick
export function useCanvasInteraction(
  containerRef,
  getMeasurementState,
  getUserTextState,
  getCustomLinesState, // Add getter for custom lines
  interactionMode
) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panStartOffset, setPanStartOffset] = useState({ x: 0, y: 0 });

  const [draggingMeasurementId, setDraggingMeasurementId] = useState(null);
  const [draggingUserTextId, setDraggingUserTextId] = useState(null);
  const [isDraggingEndpoint, setIsDraggingEndpoint] = useState(false); // New state for endpoint drag
  const [dragStartScreenPos, setDragStartScreenPos] = useState({ x: 0, y: 0 });
  const [dragStartSvgPos, setDragStartSvgPos] = useState({ x: 0, y: 0 });
  // Refs
  const svgRef = useRef(null); // Ref for the *specific* SVG being interacted with
  const onMeasurementDragRef = useRef(null);
  const onUserTextDragRef = useRef(null);
  const onEndpointInteractionStartRef = useRef(null); // New ref for endpoint start callback
  const onEndpointDragRef = useRef(null); // New ref for endpoint drag callback
  const onEndpointInteractionEndRef = useRef(null); // New ref for endpoint end callback
  // Ref to store the currently active listeners (wrappers)
  const activeListenersRef = useRef({ move: null, end: null, cancel: null, target: null, type: null, options: null });
  // Refs to store the latest interaction logic (updated via useEffect)
  const moveLogicRef = useRef(() => {});
  const endLogicRef = useRef(() => {});

  // --- Callback Setters ---
  const setOnMeasurementDrag = useCallback((handler) => { onMeasurementDragRef.current = handler; }, []);
  const setOnUserTextDrag = useCallback((handler) => { onUserTextDragRef.current = handler; }, []);
  const setOnEndpointInteractionStart = useCallback((handler) => { onEndpointInteractionStartRef.current = handler; }, []);
  const setOnEndpointDrag = useCallback((handler) => { onEndpointDragRef.current = handler; }, []);
  const setOnEndpointInteractionEnd = useCallback((handler) => { onEndpointInteractionEndRef.current = handler; }, []);

  // Setter for the relevant SVG element (used internally during interaction start)
  const setInteractionSvgRef = useCallback((ref) => {
    // console.log("[Interaction Hook] Setting interaction SVG ref:", ref); // Debug log
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
      // --- Panning/Measurement/User Text/Endpoint Drag Move Logic ---
      moveLogicRef.current = (e) => {
        // Ignore if in snap or text mode, or if no interaction is active
        if (interactionMode === 'snap' || interactionMode === 'text' || (!isPanning && !draggingMeasurementId && !draggingUserTextId && !isDraggingEndpoint)) {
            return;
        }

        const isTouchEvent = activeListenersRef.current.type === 'touch';
        const eventPos = isTouchEvent ? e.touches[0] : e;
        if (!eventPos) return;

        const targetSvg = svgRef.current;
        if (!targetSvg) {
            // console.warn("[Move Logic] No target SVG ref available."); // Debug
            return;
        }
        const invMatrix = targetSvg.getScreenCTM()?.inverse();
        if (!invMatrix) {
            // console.warn("[Move Logic] Could not get inverse CTM."); // Debug
            return;
        }

        const dxScreen = eventPos.clientX - dragStartScreenPos.x;
        const dyScreen = eventPos.clientY - dragStartScreenPos.y;
        const deltaX_svg = dxScreen * invMatrix.a + dyScreen * invMatrix.c;
        const deltaY_svg = dxScreen * invMatrix.b + dyScreen * invMatrix.d;

        const newPos = {
          x: dragStartSvgPos.x + deltaX_svg,
          y: dragStartSvgPos.y + deltaY_svg,
        };

        // --- Call appropriate drag handler ---
        if (draggingMeasurementId && onMeasurementDragRef.current) {
          if (isTouchEvent && e.cancelable) e.preventDefault();
          onMeasurementDragRef.current(draggingMeasurementId, newPos);
        } else if (draggingUserTextId && onUserTextDragRef.current) {
          if (isTouchEvent && e.cancelable) e.preventDefault();
          onUserTextDragRef.current(draggingUserTextId, newPos);
        } else if (isDraggingEndpoint && onEndpointDragRef.current) { // Handle endpoint drag
          if (isTouchEvent && e.cancelable) e.preventDefault();
          onEndpointDragRef.current(newPos);
        } else if (isPanning) {
          if (isTouchEvent && e.cancelable) e.preventDefault();
          const dx = eventPos.clientX - panStart.x;
          const dy = eventPos.clientY - panStart.y;
          setPanOffset({
            x: panStartOffset.x + dx,
            y: panStartOffset.y + dy
          });
        }
      };

      // --- Panning/Measurement/Text/Endpoint Drag End Logic ---
      endLogicRef.current = (e) => {
        // Ignore if in snap mode
        if (interactionMode === 'snap') return;

        const { move, end, cancel, target, type, options } = activeListenersRef.current;
        // --- Remove Listeners ---
        if (target && move && end) {
          const moveEvent = type === 'touch' ? 'touchmove' : 'mousemove';
          const endEvent = type === 'touch' ? 'touchend' : 'mouseup';
          const cancelEvent = 'touchcancel'; // Only for touch

          target.removeEventListener(moveEvent, move, options);
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

        // --- Update State & Call End Callbacks *after* removing listeners ---
        if (draggingMeasurementId) {
          setDraggingMeasurementId(null);
          // No specific end callback for measurements currently
        } else if (draggingUserTextId) {
          setDraggingUserTextId(null);
          // No specific end callback for user text currently
        } else if (isDraggingEndpoint) {
          setIsDraggingEndpoint(false);
          if (onEndpointInteractionEndRef.current) {
            onEndpointInteractionEndRef.current(); // Call endpoint end callback
          }
        } else if (isPanning) {
          setIsPanning(false);
        }

        // Clear the SVG ref after any drag operation ends
        if (svgRef.current) {
            // console.log("[Interaction Hook] Clearing interaction SVG ref on end."); // Debug log
            svgRef.current = null;
        }
      };
    }, [
      isPanning, draggingMeasurementId, draggingUserTextId, isDraggingEndpoint, // State dependencies for logic
      panStart, panStartOffset, dragStartScreenPos, dragStartSvgPos, // Other state
      onMeasurementDragRef, onUserTextDragRef, onEndpointDragRef, onEndpointInteractionEndRef, // Callback refs
      svgRef, containerRef, // Element refs
      setPanOffset, setDraggingMeasurementId, setDraggingUserTextId, setIsDraggingEndpoint, setIsPanning, // Setters
      interactionMode, // Mode dependency
      setDragStartScreenPos, setDragStartSvgPos // Other setters
    ]);


    // --- Combined Interaction Start Handler (Panning / Measurement / Text / Endpoint Drag) ---
    const handleInteractionStart = useCallback((e) => {
      // Only allow interactions (panning, item dragging) if in 'measure' mode (or adjust as needed).
      if (interactionMode !== 'measure') {
          // console.log(`[Interaction Start] Mode is '${interactionMode}', not 'measure'. Interaction ignored.`);
          return;
      }
      // Ensure no existing listeners are active (safety check)
      if (activeListenersRef.current.target) {
        console.warn("[Interaction Start] Start called while listeners were still active. Cleaning up.");
        endLogicRef.current(e); // Attempt cleanup
      }

      const isTouchEvent = e.type.startsWith('touch');
      if (isTouchEvent && e.touches.length > 1) return; // Ignore multi-touch for now

      const eventPos = isTouchEvent ? e.touches[0] : e;
      if (!eventPos) return;

      const targetElement = e.target;
      const containingSvg = targetElement.closest('svg');
      if (!containingSvg) {
          // console.log("[Interaction Start] Click did not originate within an SVG."); // Debug
          return; // Ignore clicks outside SVGs
      }
      setInteractionSvgRef(containingSvg); // Set the SVG ref for this interaction

      const measurementGroup = targetElement.closest('.measurement-group');
      const userTextGroup = targetElement.closest('.text-display-group');
      const controls = targetElement.closest('button, input[type="range"], .drawing-controls');

      if (controls) {
          // console.log("[Interaction Start] Click on controls ignored."); // Debug
          return; // Ignore clicks on controls
      }

      // --- Define Stable Wrapper Functions for Listeners ---
      const onMoveWrapper = (event) => moveLogicRef.current(event);
      const onEndWrapper = (event) => endLogicRef.current(event);
      const onCancelWrapper = (event) => endLogicRef.current(event); // End logic handles cancel

      let target = null; // Element to attach listeners to (window or container)
      let eventType = null; // 'touch' or 'mouse'
      let listenerOptions = null; // Options for addEventListener

      // --- Common Setup for Dragging Items (Measurement, Text, Endpoint) ---
      const setupItemDrag = (currentSvgPos) => {
        if (e.preventDefault) e.preventDefault(); // Prevent text selection, etc.
        setDragStartScreenPos({ x: eventPos.clientX, y: eventPos.clientY });
        setDragStartSvgPos(currentSvgPos);

        target = window; // Drag listeners on window to capture movement outside container
        eventType = isTouchEvent ? 'touch' : 'mouse';
        listenerOptions = isTouchEvent ? { passive: false } : undefined; // Need passive:false for preventDefault on touchmove

        window.addEventListener(eventType === 'touch' ? 'touchmove' : 'mousemove', onMoveWrapper, listenerOptions);
        window.addEventListener(eventType === 'touch' ? 'touchend' : 'mouseup', onEndWrapper);
        if (eventType === 'touch') {
          window.addEventListener('touchcancel', onCancelWrapper);
        }
      };

      // --- Check for Draggable Items First ---

      // 1. Measurement Drag Start
      if (measurementGroup && measurementGroup.id) {
        const measurementId = measurementGroup.id;
        const currentMeasurements = getMeasurementState ? getMeasurementState() : {};
        const currentMeasurement = currentMeasurements[measurementId];

        if (currentMeasurement && typeof currentMeasurement.textPosition?.x === 'number' && typeof currentMeasurement.textPosition?.y === 'number') {
          // console.log(`[Interaction Start] Starting measurement drag: ${measurementId}`); // Debug
          setDraggingMeasurementId(measurementId);
          setupItemDrag(currentMeasurement.textPosition);
        } else {
          console.warn(`[Interaction Start] Measurement ${measurementId} not found or invalid textPosition. Aborting drag.`);
          return;
        }
      }
      // 2. User Text Drag Start
      else if (userTextGroup && userTextGroup.id && getUserTextState) {
        const textId = userTextGroup.id;
        const currentUserTexts = getUserTextState ? getUserTextState() : {};
        const currentUserText = currentUserTexts[textId];

        if (currentUserText && typeof currentUserText.position?.x === 'number' && typeof currentUserText.position?.y === 'number') {
          // console.log(`[Interaction Start] Starting user text drag: ${textId}`); // Debug
          setDraggingUserTextId(textId);
          setupItemDrag(currentUserText.position);
        } else {
          console.warn(`[Interaction Start] User text ${textId} not found or invalid position. Aborting drag.`);
          return;
        }
      }
      // 3. Custom Line Endpoint Drag Start
      else if (getCustomLinesState && onEndpointInteractionStartRef.current && onEndpointDragRef.current) {
        const svgCoords = getSvgCoordinates(eventPos.clientX, eventPos.clientY, containingSvg);
        if (svgCoords) {
          const customLines = getCustomLinesState();
          const threshold = zoomLevel > 0 ? ENDPOINT_GRAB_THRESHOLD / zoomLevel : ENDPOINT_GRAB_THRESHOLD;
          let foundEndpoint = false;

          for (const line of customLines) {
            if (line.viewInstanceId !== containingSvg.getAttribute('data-view-instance-id')) continue; // Check if line is in the clicked SVG

            const [startX, startY] = line.geometry.endpoints[0];
            const [endX, endY] = line.geometry.endpoints[1];
            const startPoint = { x: startX, y: startY };
            const endPoint = { x: endX, y: endY };

            const distStart = distance(svgCoords, startPoint);
            const distEnd = distance(svgCoords, endPoint);

            if (distStart <= threshold) {
              // console.log(`[Interaction Start] Starting endpoint drag (start): ${line.pathId}`); // Debug
              onEndpointInteractionStartRef.current(line.pathId, 'start', startPoint);
              setIsDraggingEndpoint(true);
              setupItemDrag(startPoint);
              foundEndpoint = true;
              break; // Stop after finding the first endpoint
            } else if (distEnd <= threshold) {
              // console.log(`[Interaction Start] Starting endpoint drag (end): ${line.pathId}`); // Debug
              onEndpointInteractionStartRef.current(line.pathId, 'end', endPoint);
              setIsDraggingEndpoint(true);
              setupItemDrag(endPoint);
              foundEndpoint = true;
              break; // Stop after finding the first endpoint
            }
          }
          if (foundEndpoint) {
             // Item drag setup was called, listeners are attached, exit
          } else {
             // No endpoint found, proceed to check for panning
          }
        } else {
            console.warn("[Interaction Start] Could not get SVG coordinates for endpoint check.");
            // Proceed to check for panning
        }
      }

      // --- Panning Start (Only if no item drag was initiated) ---
      if (!draggingMeasurementId && !draggingUserTextId && !isDraggingEndpoint && ((!isTouchEvent && e.button === 0) || (isTouchEvent && e.touches.length === 1))) {
        // console.log("[Interaction Start] Starting panning."); // Debug
        if (isTouchEvent && e.preventDefault) e.preventDefault(); // Prevent scroll on touch pan

        setIsPanning(true);
        setPanStart({ x: eventPos.clientX, y: eventPos.clientY });
        setPanStartOffset({ ...panOffset });

        // Add listeners to the container for panning
        if (containerRef.current) {
          target = containerRef.current;
          eventType = isTouchEvent ? 'touch' : 'mouse';
          // Use capture phase for panning listeners on the container
          // Passive false for touchmove to allow preventDefault if needed (though panning itself might not need it)
          listenerOptions = { capture: true, passive: !isTouchEvent };

          target.addEventListener(eventType === 'touch' ? 'touchmove' : 'mousemove', onMoveWrapper, listenerOptions);
          target.addEventListener(eventType === 'touch' ? 'touchend' : 'mouseup', onEndWrapper, true); // Capture end/cancel
          if (eventType === 'touch') {
              target.addEventListener('touchcancel', onCancelWrapper, true);
          }
          // Add mouseleave only for mouse panning on the container
          if (eventType === 'mouse') {
              target.addEventListener('mouseleave', onEndWrapper, true);
          }
        }
      }

      // --- Store Active Listeners ---
      if (target) {
          activeListenersRef.current = {
              move: onMoveWrapper,
              end: onEndWrapper,
              cancel: eventType === 'touch' ? onCancelWrapper : null,
              target: target,
              type: eventType,
              options: listenerOptions
          };
      } else {
          // console.log("[Interaction Start] No interaction initiated (no item drag, no pan)."); // Debug
          // Clear SVG ref if no interaction started
          setInteractionSvgRef(null);
      }

    }, [
      panOffset, zoomLevel, // Need zoomLevel for threshold calculation
      containerRef,
      getMeasurementState, getUserTextState, getCustomLinesState, // Getters
      onEndpointInteractionStartRef, onEndpointDragRef, // Endpoint refs
      setDraggingMeasurementId, setDraggingUserTextId, setIsDraggingEndpoint, // State setters
      setDragStartScreenPos, setDragStartSvgPos,
      setIsPanning, setPanStart, setPanStartOffset,
      setInteractionSvgRef, // Include the setter function itself
      interactionMode
    ]);
  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      endLogicRef.current(); // Call the end logic to remove any active listeners
    };
  }, []); // Empty dependency array: runs only on unmount

  // Reset zoom, pan, and interaction states
  const resetInteraction = useCallback(() => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    // Ensure any lingering interactions are stopped and state is cleared
    if (activeListenersRef.current.target) {
        endLogicRef.current(); // This will also clear state flags like isPanning, etc.
    } else {
        // If no listeners were active, still ensure state flags are reset
        if (draggingMeasurementId) setDraggingMeasurementId(null);
        if (draggingUserTextId) setDraggingUserTextId(null);
        if (isDraggingEndpoint) setIsDraggingEndpoint(null);
        if (isPanning) setIsPanning(false);
    }
  }, [draggingMeasurementId, draggingUserTextId, isDraggingEndpoint, isPanning]); // Add isDraggingEndpoint
  // Handlers attached to the main container element
  const interactionHandlers = {
    onWheel: handleWheel, // Zoom
    onMouseDown: handleInteractionStart, // Pan/Drag Start (Mouse)
    onTouchStart: handleInteractionStart, // Pan/Drag Start (Touch)
  };

  return {
    zoomLevel,
    panOffset,
    isPanning, // Expose panning state if needed by parent
    // draggingMeasurementId, // Parent likely doesn't need these IDs directly
    // draggingUserTextId,
    // isDraggingEndpoint,
    interactionHandlers, // Handlers to spread onto the container
    resetInteraction, // Function to reset view/state
    setZoomLevel, // Allow parent control if needed
    setPanOffset, // Allow parent control if needed
    // Callback Setters
    setOnMeasurementDrag,
    setOnUserTextDrag,
    setOnEndpointInteractionStart,
    setOnEndpointDrag,
    setOnEndpointInteractionEnd,
    // setInteractionSvgRef, // Internal use mostly
  };
}
