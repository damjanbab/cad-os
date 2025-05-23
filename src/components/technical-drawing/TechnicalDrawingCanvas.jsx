import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'; // Import useMemo
// import ProjectionView from './ProjectionView.jsx'; // No longer needed directly here
// import PartView from './PartView.jsx'; // No longer needed directly here

// import ProjectionView from './ProjectionView.jsx'; // No longer needed directly here
// import PartView from './PartView.jsx'; // No longer needed directly here
import Viewbox from './Viewbox.jsx'; // Import the new Viewbox component
import DrawingControls from './DrawingControls.jsx';
import { parseViewBox } from '../../utils/svgUtils.js'; // Import utility
// import { useTechnicalDrawingPdfExport } from '../../hooks/useTechnicalDrawingPdfExport.js'; // Import PDF hook - Temporarily remove old import
import { useTechnicalDrawingPdfExport } from '../../hooks/useTechnicalDrawingPdfExport.js'; // Re-import PDF hook
// Import hook AND helpers
import { useCanvasInteraction, getSvgCoordinates, distance, SNAP_THRESHOLD } from '../../hooks/useCanvasInteraction.js';
import MeasurementDisplay from './MeasurementDisplay.jsx'; // Import MeasurementDisplay
import TextDisplay from './TextDisplay.jsx'; // Import TextDisplay for user text

// Main canvas component for technical drawings - Updated for viewboxes
export default function TechnicalDrawingCanvas({
  selectedModelName, // Add prop to receive the model name
  viewboxes,
  isMobile,
  onAddViewbox,
  selectedLayout, // Add prop for receiving selected layout
  onLayoutChange, // Add prop for receiving layout change handler
  // Props for adding views
  selectedViewToAdd,
  onViewSelectionChange,
  rotationAngle, // Add prop for rotation angle state
  onRotationAngleChange, // Add handler for rotation angle change
  includeHiddenLines,
  onHiddenLinesToggle,
  onAddViewToCell,
  // Cell selection props
  selectedTarget,
  onCellSelection,
  // Title block editing prop
  onTitleBlockChange,
  // Settings update prop
  onViewboxSettingsChange,
  // Viewbox removal prop
  onRemoveViewbox,
  // Standard views setup prop
  onSetupStandardViews,
  // State Import/Export Props from Parent
  onViewboxesChange, // Handler to update parent's viewboxes state
  onModelNameChange, // Handler to update parent's model name state
}) {
  // Removed loading check for projections
  // if (!projections) return <div>Loading projections...</div>;

  const containerRef = useRef(null); // Ref for the main container div
  const viewContainerRef = useRef(null); // Ref for the zoomable/pannable content area
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(10); // Initial scale: 10 pixels per cm
  // State for active measurements, keyed by uniquePathId (measurement group ID)
  const [activeMeasurements, setActiveMeasurements] = useState({});
  const [userTexts, setUserTexts] = useState({}); // State for user-added text objects
  // State for tracking which custom line endpoint is being dragged
  const [draggingEndpointInfo, setDraggingEndpointInfo] = useState({ lineId: null, pointType: null }); // New state
  // State for interaction mode: 'measure', 'snap', 'customLine', or 'text'
  const [interactionMode, setInteractionMode] = useState('measure');
  // State for snap sub-type: 'point-to-point' or 'point-to-line'
  const [snapSubType, setSnapSubType] = useState('point-to-point'); // Default to point-to-point
  // State for the currently selected points (up to 2 for snap or customLine)
  const [snapPoints, setSnapPoints] = useState([]); // Renaming to selectedPoints might be clearer later

  // --- Helper function to calculate the square of the distance between two points ---
  const distSq = (p1, p2) => {
    return Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2);
  };

  // --- Helper function to calculate the distance from a point to a line segment ---
  const distanceToLineSegment = (p, v, w) => {
    // p: the point
    // v: start point of the line segment
    // w: end point of the line segment
    const l2 = distSq(v, w);
    if (l2 === 0) return Math.sqrt(distSq(p, v)); // v == w case
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t)); // Clamp t to the [0, 1] range
    const projection = {
      x: v.x + t * (w.x - v.x),
      y: v.y + t * (w.y - v.y)
    };
    return Math.sqrt(distSq(p, projection));
  };

  // --- Use Hooks ---
  // Function for the interaction hook to get the current measurement state
  const getMeasurementState = useCallback(() => activeMeasurements, [activeMeasurements]);
  // Function for the interaction hook to get the current user texts state
  const getUserTextState = useCallback(() => userTexts, [userTexts]);
  // Function for the interaction hook to get the current custom lines state
  const getCustomLinesState = useCallback(() => Object.values(activeMeasurements).filter(m => m.type === 'customLine'), [activeMeasurements]);

  // Use the updated hook with viewboxes, activeMeasurements and userTexts
  const { exportPdf } = useTechnicalDrawingPdfExport(viewboxes, activeMeasurements, userTexts);
  // const exportPdf = () => console.warn("PDF Export is temporarily disabled."); // Remove placeholder
  const {
    zoomLevel,
    panOffset,
    isPanning, // Renamed state from isDragging
    // draggingMeasurementId, // We don't need this state directly here
    interactionHandlers,
    resetInteraction,
    setZoomLevel,
    setPanOffset,
    // Hook setters for callbacks
    setOnMeasurementDrag,
    setOnUserTextDrag,
    // Destructure new endpoint setters
    setOnEndpointInteractionStart,
    setOnEndpointDrag,
    setOnEndpointInteractionEnd,
    // setInteractionSvgRef, // Internal use mostly
  } = useCanvasInteraction(
      containerRef,
      getMeasurementState,
      getUserTextState,
      getCustomLinesState, // Pass the new getter
      interactionMode
  );


  // Handler to update measurement text position (called by the hook via setOnMeasurementDrag)
  const handleMeasurementUpdate = useCallback((pathId, newPosition) => {
    setActiveMeasurements(prev => ({
      ...prev,
      [pathId]: {
        ...prev[pathId],
        textPosition: newPosition,
        isManuallyPositioned: true, // Dragging implies manual positioning
      }
    }));
  }, []);


  // --- Endpoint Drag Handlers ---
  const handleEndpointInteractionStart = useCallback((lineId, pointType, startPos) => {
    console.log(`[Canvas] Endpoint drag start: Line ${lineId}, Point ${pointType}`);
    setDraggingEndpointInfo({ lineId, pointType });
  }, []); // No dependencies needed

  const handleEndpointDrag = useCallback((newPos) => {
    setActiveMeasurements(prev => {
      const { lineId, pointType } = draggingEndpointInfo;
      if (!lineId || !pointType || !prev[lineId] || prev[lineId].type !== 'customLine') {
        // console.warn(`[Canvas Endpoint Drag] Invalid state:`, { lineId, pointType, measurement: prev[lineId] });
        return prev;
      }

      const updatedLine = JSON.parse(JSON.stringify(prev[lineId])); // Deep copy to avoid mutation issues
      const endpointIndex = pointType === 'start' ? 0 : 1;

      // Update the specific endpoint's coordinates
      updatedLine.geometry.endpoints[endpointIndex] = [newPos.x, newPos.y];

      // console.log(`[Canvas Endpoint Drag] Updating ${lineId} ${pointType} to:`, newPos); // Debug

      return { ...prev, [lineId]: updatedLine };
    });
  }, [draggingEndpointInfo]); // Depends on the dragging info state

  const handleEndpointInteractionEnd = useCallback(() => {
    console.log(`[Canvas] Endpoint drag end: Line ${draggingEndpointInfo.lineId}`);
    setDraggingEndpointInfo({ lineId: null, pointType: null }); // Reset state
  }, [draggingEndpointInfo.lineId]); // Dependency needed to log the correct ID on end


  // Handler to update user text (content, position, etc.)
  const handleUserTextUpdate = useCallback((textId, updates) => {
    setUserTexts(prev => {
      if (!prev[textId]) {
        console.warn(`[Canvas] Attempted to update non-existent user text ID: ${textId}`);
        return prev;
      }
      // If position is updated, mark as manually positioned
      const newIsManuallyPositioned = updates.position ? true : prev[textId].isManuallyPositioned;
      console.log(`[Canvas] Updating user text ${textId}:`, updates);
      return {
        ...prev,
        [textId]: {
          ...prev[textId],
          ...updates,
          isManuallyPositioned: newIsManuallyPositioned,
        }
      };
    });
  }, []);

  // Handler to delete a user text object
  const handleDeleteUserText = useCallback((textId) => {
    setUserTexts(prev => {
      const newTexts = { ...prev };
      if (newTexts[textId]) {
        console.log(`[Canvas] Deleting user text: ${textId}`);
        delete newTexts[textId];
      } else {
        console.warn(`[Canvas] Attempted to delete non-existent user text ID: ${textId}`);
      }
      return newTexts;
    });
  }, []);


  // --- Effect to set the interaction hook callbacks ---
  useEffect(() => {
    if (setOnMeasurementDrag) {
      setOnMeasurementDrag(handleMeasurementUpdate);
    }
    if (setOnUserTextDrag) {
      // Adapt the call: hook provides (id, newPosition), handleUserTextUpdate expects (id, { position: newPosition })
      setOnUserTextDrag((textId, newPosition) => {
        handleUserTextUpdate(textId, { position: newPosition });
      });
    }
    // Set endpoint drag handlers
    if (setOnEndpointInteractionStart) {
      setOnEndpointInteractionStart(handleEndpointInteractionStart);
    }
    if (setOnEndpointDrag) {
      setOnEndpointDrag(handleEndpointDrag);
    }
    if (setOnEndpointInteractionEnd) {
      setOnEndpointInteractionEnd(handleEndpointInteractionEnd);
    }
  }, [
      setOnMeasurementDrag, handleMeasurementUpdate,
      setOnUserTextDrag, handleUserTextUpdate,
      setOnEndpointInteractionStart, handleEndpointInteractionStart,
      setOnEndpointDrag, handleEndpointDrag,
      setOnEndpointInteractionEnd, handleEndpointInteractionEnd
  ]);


  // Function to create a distance measurement between two snapped points
  const createMeasurementFromSnapPoints = useCallback((point1, point2) => {
    if (!point1 || !point2 || point1.viewInstanceId !== point2.viewInstanceId) {
      console.warn("[Canvas] Cannot create measurement: Points are missing or in different views.");
      return;
    }

    const newMeasurementId = `snap-dist-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const p1Coords = point1.coordinates;
    const p2Coords = point2.coordinates;

    // Calculate the distance between the points (in original units, assumed cm)
    const rawMeasurementLength = distance(p1Coords, p2Coords);
    const measurementLength = rawMeasurementLength * 10; // Convert cm to mm for display

    // Calculate initial text position (midpoint)
    const initialTextPosition = {
      x: (p1Coords.x + p2Coords.x) / 2,
      y: (p1Coords.y + p2Coords.y) / 2 - 5, // Offset slightly above
    };

    const newMeasurement = {
      pathId: newMeasurementId, // Unique ID for this measurement
      type: 'line', // Use 'line' type so renderMeasurementToSvg handles it correctly
      textPosition: initialTextPosition,
      viewInstanceId: point1.viewInstanceId, // Both points are in the same view
      geometry: {
        type: 'line', // Store as a line for rendering purposes
        length: measurementLength, // Store the scaled length (mm)
        endpoints: [
          [p1Coords.x, p1Coords.y], // Endpoints remain in original SVG coordinates
          [p2Coords.x, p2Coords.y]
        ]
      },
      // Add the original snap point types if needed later
      // snapTypes: [point1.type, point2.type],
       overrideValue: null, // Add overrideValue field
       creationTimestamp: Date.now(), // Add timestamp
       isManuallyPositioned: false, // Default to automatic PDF placement
     };
 
     console.log(`--- Creating Snap Measurement ---`);
    console.log(`  ID: ${newMeasurementId}`);
    console.log(`  Point 1: { x: ${p1Coords.x.toFixed(2)}, y: ${p1Coords.y.toFixed(2)} }`);
    console.log(`  Point 2: { x: ${p2Coords.x.toFixed(2)}, y: ${p2Coords.y.toFixed(2)} }`);
    console.log(`  View ID: ${newMeasurement.viewInstanceId}`);
    console.log(`-----------------------------`);

    setActiveMeasurements(prev => ({
      ...prev,
      [newMeasurementId]: newMeasurement,
    }));

  }, [setActiveMeasurements]); // Dependency on the setter

  // Function to create a point-to-line distance measurement
  const createPointToLineMeasurement = useCallback((point, line) => {
    if (!point || !line || point.viewInstanceId !== line.viewInstanceId || line.geometry?.type !== 'line' || !line.geometry.endpoints || line.geometry.endpoints.length !== 2) {
      console.warn("[Canvas P2L] Cannot create measurement: Invalid point or line data, or different views.");
      return;
    }

    const pointCoords = point.coordinates; // { x, y }
    const lineEndpoints = line.geometry.endpoints; // [[x1, y1], [x2, y2]]
    const [lx1, ly1] = lineEndpoints[0];
    const [lx2, ly2] = lineEndpoints[1];

    let measurementLength = 0;
    let measurementEndpoints = []; // Endpoints for the visual measurement line
    let isHorizontalLine = false;
    let isVerticalLine = false;

    // Check if line is horizontal (allow for small floating point inaccuracies)
    if (Math.abs(ly1 - ly2) < 1e-6) {
      isHorizontalLine = true;
      const lineY = ly1; // or ly2
      measurementLength = Math.abs(pointCoords.y - lineY);
      // Measurement line is vertical, from point to the line's Y level
      measurementEndpoints = [
        [pointCoords.x, pointCoords.y],
        [pointCoords.x, lineY]
      ];
    }
    // Check if line is vertical (allow for small floating point inaccuracies)
    else if (Math.abs(lx1 - lx2) < 1e-6) {
      isVerticalLine = true;
      const lineX = lx1; // or lx2
      measurementLength = Math.abs(pointCoords.x - lineX);
      // Measurement line is horizontal, from point to the line's X level
      measurementEndpoints = [
        [pointCoords.x, pointCoords.y],
        [lineX, pointCoords.y]
      ];
    } else {
      console.warn("[Canvas P2L] Cannot create measurement: Line is not strictly horizontal or vertical.");
      // Optionally, could calculate closest point on the line segment here for non-orthogonal lines
      return;
    }

    // Scale the calculated length (raw SVG units, assumed cm) to mm for display
    const scaledMeasurementLength = measurementLength * 10;

    // Calculate initial text position (midpoint of the measurement line)
    const initialTextPosition = {
      x: (measurementEndpoints[0][0] + measurementEndpoints[1][0]) / 2,
      y: (measurementEndpoints[0][1] + measurementEndpoints[1][1]) / 2,
    };
    // Offset text slightly based on measurement line orientation
    if (isHorizontalLine) { // Measurement line is vertical
        initialTextPosition.x += 3; // Offset right
    } else { // Measurement line is horizontal
        initialTextPosition.y -= 3; // Offset up
    }


    const newMeasurementId = `snap-ptl-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const newMeasurement = {
      pathId: newMeasurementId,
      type: 'line', // Use 'line' type for rendering the measurement indicator
      textPosition: initialTextPosition,
      viewInstanceId: point.viewInstanceId,
      geometry: {
        type: 'line', // Represents the visual measurement line itself
        length: scaledMeasurementLength, // Store the calculated perpendicular distance (scaled to mm)
        endpoints: measurementEndpoints // Store the calculated endpoints for the visual line
      },
      snapDetails: { // Optional: Store details about the snap
        pointType: point.type,
        pointCoords: pointCoords,
        lineEndpoints: lineEndpoints,
        isVerticalDistance: isHorizontalLine, // True if measuring vertical distance to horizontal line
        isHorizontalDistance: isVerticalLine, // True if measuring horizontal distance to vertical line
      },
       overrideValue: null, // Add overrideValue field
       creationTimestamp: Date.now(), // Add timestamp
       isManuallyPositioned: false, // Default to automatic PDF placement
     };
 
     console.log(`--- Creating Point-to-Line Measurement ---`);
    console.log(`  ID: ${newMeasurementId}`);
    console.log(`  Point: { x: ${pointCoords.x.toFixed(2)}, y: ${pointCoords.y.toFixed(2)} } (Type: ${point.type})`);
    console.log(`  Line Endpoints: [${lx1.toFixed(2)}, ${ly1.toFixed(2)}] to [${lx2.toFixed(2)}, ${ly2.toFixed(2)}]`);
    console.log(`  Calculated Distance (mm): ${scaledMeasurementLength.toFixed(2)}`);
    console.log(`  Measurement Line Endpoints:`, measurementEndpoints.map(p => `[${p[0].toFixed(2)}, ${p[1].toFixed(2)}]`));
    console.log(`  View ID: ${newMeasurement.viewInstanceId}`);
    console.log(`----------------------------------------`);

    setActiveMeasurements(prev => ({
      ...prev,
      [newMeasurementId]: newMeasurement,
    }));

  }, [setActiveMeasurements]);

  // Log snapPoints state changes for debugging
  useEffect(() => {
    console.log("[Canvas] snapPoints state updated:", snapPoints);
  }, [snapPoints]);

  // --- Handler to toggle manual positioning for a measurement ---
  const handleToggleManualPosition = useCallback((measurementId) => {
    setActiveMeasurements(prev => {
      if (!prev[measurementId]) {
        console.warn(`[Canvas] Attempted to toggle manual position for non-existent measurement ID: ${measurementId}`);
        return prev;
      }
      const currentFlag = prev[measurementId].isManuallyPositioned ?? false;
      console.log(`[Canvas] Toggling manual position for ${measurementId} from ${currentFlag} to ${!currentFlag}`);
      return {
        ...prev,
        [measurementId]: {
          ...prev[measurementId],
          isManuallyPositioned: !currentFlag, // Toggle the flag
        }
      };
    });
  }, [setActiveMeasurements]);

  // --- Handler to update the override value for a measurement ---
  const handleUpdateOverrideValue = useCallback((measurementId, newValue) => {
    setActiveMeasurements(prev => {
      if (!prev[measurementId]) {
        console.warn(`[Canvas] Attempted to update override for non-existent measurement ID: ${measurementId}`);
        return prev;
      }
      console.log(`[Canvas] Updating override value for ${measurementId} to: "${newValue}"`);
      return {
        ...prev,
        [measurementId]: {
          ...prev[measurementId],
          overrideValue: newValue, // Update the override value
        }
      };
    });
  }, [setActiveMeasurements]); // Dependency on the state setter

  // --- Handler to delete a measurement ---
  const handleDeleteMeasurement = useCallback((measurementId) => {
    setActiveMeasurements(prev => {
      const newMeasurements = { ...prev };
      if (newMeasurements[measurementId]) {
        console.log(`[Canvas] Deleting measurement: ${measurementId}`);
        delete newMeasurements[measurementId];
      } else {
        console.warn(`[Canvas] Attempted to delete non-existent measurement ID: ${measurementId}`);
      }
      return newMeasurements;
    });
  }, [setActiveMeasurements]); // Dependency on the state setter


  // --- New Unified Snap Click Handler ---
  // This function is called directly by SvgView's onClick when in snap or customLine mode
  const handleSnapClick = useCallback((event, viewInstanceId) => {
    // If in text mode, this handler should not run. Text placement is separate.
    if (interactionMode === 'text') {
        console.log(`[Canvas] Click in text mode, ignoring snap/customLine logic.`);
        return;
    }
    // Also, if in measure mode and not specifically clicking a path (handled by handlePathClick), do nothing.
  // This check prevents snap logic from running unnecessarily when just trying to pan/drag in measure mode.
  if (interactionMode === 'measure' && !event.target.closest('path[data-geometry-type]')) {
      // console.log(`[Canvas] Click in measure mode (not on a path), ignoring snap/customLine/delete logic.`);
      return;
  }

  // --- Custom Line Deletion Logic ---
  if (interactionMode === 'deleteLine') {
    console.log(`[Canvas DeleteLine] Clicked in view ${viewInstanceId}`);
    const svgElementForDelete = event.target.closest('svg');
    if (!svgElementForDelete) {
      console.warn("[Canvas DeleteLine] Could not find parent SVG for delete click.");
      return;
    }
    const screenXForDelete = event.clientX;
    const screenYForDelete = event.clientY;
    const svgCoordsForDelete = getSvgCoordinates(screenXForDelete, screenYForDelete, svgElementForDelete);

    if (!svgCoordsForDelete) {
      console.warn("[Canvas DeleteLine] Could not get SVG coordinates for delete click.");
      return;
    }

    const currentCustomLines = getCustomLinesState();
    // Adjust threshold based on zoom level for consistent screen pixel tolerance
    const threshold = zoomLevel > 0 ? SNAP_THRESHOLD / zoomLevel : SNAP_THRESHOLD;
    let lineToDelete = null;

    for (const line of currentCustomLines) {
      if (line.viewInstanceId !== viewInstanceId) continue; // Only consider lines in the clicked view

      const p1 = { x: line.geometry.endpoints[0][0], y: line.geometry.endpoints[0][1] };
      const p2 = { x: line.geometry.endpoints[1][0], y: line.geometry.endpoints[1][1] };
      const dist = distanceToLineSegment(svgCoordsForDelete, p1, p2);

      if (dist < threshold) {
        lineToDelete = line;
        break; // Found a line to delete
      }
    }

    if (lineToDelete) {
      console.log(`[Canvas DeleteLine] Deleting line: ${lineToDelete.pathId}`);
      handleDeleteMeasurement(lineToDelete.pathId);
    } else {
      console.log(`[Canvas DeleteLine] No custom line found near click.`);
    }
    // Reset snap points if any were accidentally selected before switching to delete mode
    setSnapPoints([]);
    return; // IMPORTANT: Return early to prevent other interaction mode logic
  }
  // --- End Custom Line Deletion Logic ---

  console.log(`[Canvas] handleSnapClick triggered for view: ${viewInstanceId} in mode: ${interactionMode}`);

  const svgElement = event.target.closest('svg');
    if (!svgElement) {
      console.warn("[Canvas] Could not find parent SVG for snap click.");
      return;
    }

    // Use the original event's coordinates
    const screenX = event.clientX;
    const screenY = event.clientY;
    const svgCoords = getSvgCoordinates(screenX, screenY, svgElement);

    if (!svgCoords) {
      console.warn("[Canvas] Could not get SVG coordinates for snap click.");
      return;
    }

    console.log(`[Canvas] Snap Click SVG Coords: { x: ${svgCoords.x.toFixed(2)}, y: ${svgCoords.y.toFixed(2)} }`);

    let closestPoint = null;
    // Adjust threshold based on zoom level for consistent screen pixel tolerance
    const adjustedThreshold = zoomLevel > 0 ? SNAP_THRESHOLD / zoomLevel : SNAP_THRESHOLD;
    let minDistance = adjustedThreshold;

    // --- Find Closest Point (Lines & Centers) ---

    // Query all line elements within the clicked SVG view
    const lineElements = svgElement.querySelectorAll('path[data-geometry-type="line"][data-endpoints]');
    console.log(`[Canvas Snap] Found ${lineElements.length} line elements in SVG view ${viewInstanceId} to check for snapping.`);

    lineElements.forEach(line => {
      const endpointsAttr = line.getAttribute('data-endpoints');
      if (!endpointsAttr) return;

      try {
        const endpoints = JSON.parse(endpointsAttr);
        if (!Array.isArray(endpoints) || endpoints.length !== 2) return;

        const p1 = { x: endpoints[0][0], y: endpoints[0][1] };
        const p2 = { x: endpoints[1][0], y: endpoints[1][1] };
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

        // Check endpoint 1
        const dist1 = distance(svgCoords, p1);
        if (dist1 < minDistance) {
          minDistance = dist1;
          closestPoint = { type: 'endpoint', coordinates: p1, viewInstanceId };
        }

        // Check endpoint 2
        const dist2 = distance(svgCoords, p2);
        if (dist2 < minDistance) {
          minDistance = dist2;
          closestPoint = { type: 'endpoint', coordinates: p2, viewInstanceId };
        }

        // Check midpoint
        const distMid = distance(svgCoords, mid);
        if (distMid < minDistance) {
          minDistance = distMid;
          closestPoint = { type: 'midpoint', coordinates: mid, viewInstanceId };
        }
      } catch (error) {
        console.error("Error parsing endpoints data attribute:", error, endpointsAttr);
      }
    });

    // Check active measurement centers (circles/arcs) in the same view
    const currentMeasurements = getMeasurementState ? getMeasurementState() : {};
    Object.values(currentMeasurements).forEach(measurement => {
      const isValidCenter = Array.isArray(measurement.geometry?.center) &&
                            measurement.geometry.center.length === 2 &&
                            typeof measurement.geometry.center[0] === 'number' &&
                            typeof measurement.geometry.center[1] === 'number';

      if (measurement.viewInstanceId === viewInstanceId &&
          (measurement.type === 'circle' || measurement.type === 'arc' || measurement.type === 'radius') &&
          isValidCenter) {

        // Adjust center coordinates based on viewBox offset if necessary
        // For now, assume center coordinates are already in the correct SVG space
        // (This assumption holds if the worker generates paths relative to the center [0,0]
        // and the viewBox handles the overall positioning)
        const centerPoint = { x: measurement.geometry.center[0], y: measurement.geometry.center[1] };
        const distCenter = distance(svgCoords, centerPoint);

        if (distCenter < minDistance) {
          minDistance = distCenter;
          closestPoint = { type: 'center', coordinates: centerPoint, viewInstanceId };
          console.log(`[Canvas Snap] Found closer snap point: Measurement Center (${measurement.pathId})`);
        }
      }
    });

    // --- Update Snap State Based on Closest Point ---

    if (interactionMode === 'snap') {
      // Point-to-Point Snap Logic
      if (snapSubType === 'point-to-point') {
        if (closestPoint) {
          console.log(`[Canvas P2P] Snapped to ${closestPoint.type} at { x: ${closestPoint.coordinates.x.toFixed(2)}, y: ${closestPoint.coordinates.y.toFixed(2)} } in view ${viewInstanceId}`);
          setSnapPoints(currentSnapPoints => {
            if (currentSnapPoints.length === 1 && currentSnapPoints[0].viewInstanceId !== closestPoint.viewInstanceId) {
              console.warn("[Canvas P2P] Second snap point is in a different view. Resetting selection.");
              return [closestPoint];
            }
            const updatedPoints = [...currentSnapPoints, closestPoint];
            if (updatedPoints.length === 2) {
              createMeasurementFromSnapPoints(updatedPoints[0], updatedPoints[1]);
              return []; // Reset after creating measurement
            } else if (updatedPoints.length > 2) {
               console.warn("[Canvas P2P] More than two snap points detected, resetting.");
               return [closestPoint];
            } else {
              return updatedPoints; // Only one point selected
            }
          });
        } else {
          console.log("[Canvas P2P] No snap point found within threshold.");
          // setSnapPoints([]); // Optionally reset if click misses
        }
      }
      // Point-to-Line Snap Logic
      else if (snapSubType === 'point-to-line') {
        setSnapPoints(currentSnapPoints => {
          // First Click: Select a Point
          if (currentSnapPoints.length === 0) {
            if (closestPoint) {
              console.log(`[Canvas P2L] Selected first point: ${closestPoint.type} at { x: ${closestPoint.coordinates.x.toFixed(2)}, y: ${closestPoint.coordinates.y.toFixed(2)} } in view ${viewInstanceId}`);
              return [{ ...closestPoint, selectionRole: 'point' }];
            } else {
              console.log("[Canvas P2L] First click did not snap to a point.");
              return []; // Reset if first click misses
            }
          }
          // Second Click: Select a Line
          else if (currentSnapPoints.length === 1) {
            const firstSelection = currentSnapPoints[0];
            if (firstSelection.selectionRole !== 'point') {
                console.warn("[Canvas P2L] Invalid state: First selection was not a point. Resetting.");
                return [];
            }
            // Check if the clicked element is a line path in the same view
            const clickedElement = event.target;
            const clickedElementIsLine = clickedElement.tagName === 'path' &&
                                         clickedElement.getAttribute('data-geometry-type') === 'line' &&
                                         clickedElement.closest('svg')?.getAttribute('data-view-instance-id') === firstSelection.viewInstanceId;

            if (clickedElementIsLine) {
               const lineEndpointsAttr = clickedElement.getAttribute('data-endpoints');
               let lineGeometry = null;
               if (lineEndpointsAttr) {
                   try {
                       const parsedEndpoints = JSON.parse(lineEndpointsAttr);
                       if (Array.isArray(parsedEndpoints) && parsedEndpoints.length === 2) {
                           lineGeometry = { type: 'line', endpoints: parsedEndpoints };
                       }
                   } catch (e) { console.error("Error parsing line endpoints for P2L snap:", e); }
               }

               if (lineGeometry) {
                  console.log(`[Canvas P2L] Selected second element: Line in view ${viewInstanceId}`);
                  const lineSelection = {
                    type: 'line',
                    geometry: lineGeometry,
                    viewInstanceId: viewInstanceId,
                    selectionRole: 'line'
                  };
                  createPointToLineMeasurement(firstSelection, lineSelection);
                  return []; // Reset after creating measurement
               } else {
                   console.warn("[Canvas P2L] Could not get geometry for clicked line element.");
                   return currentSnapPoints; // Keep first point
               }
            } else if (viewInstanceId !== firstSelection.viewInstanceId) {
              console.warn("[Canvas P2L] Second click is in a different view. Resetting selection.");
              if (closestPoint && closestPoint.viewInstanceId === viewInstanceId) {
                 console.log(`[Canvas P2L] Starting new selection with point in view ${viewInstanceId}`);
                 return [{ ...closestPoint, selectionRole: 'point' }];
              }
              return [];
            } else {
              console.log("[Canvas P2L] Second click did not select a line in the same view.");
              return currentSnapPoints;
            }
          }
          // Invalid State
          else {
            console.warn("[Canvas P2L] Invalid state: More than one snap point selected. Resetting.");
             if (closestPoint) {
                 return [{ ...closestPoint, selectionRole: 'point' }];
             }
             return [];
          }
        });
      }
    } else if (interactionMode === 'customLine') {
      // Custom Line Drawing Logic
      // For custom lines, we don't strictly need to snap, just capture the click coordinates.
      // However, using `closestPoint` if available can provide a "snap-to-point" feel for precision.
      const pointToUse = closestPoint ? closestPoint : { type: 'freehand', coordinates: svgCoords, viewInstanceId };

      console.log(`[Canvas CustomLine] Clicked at { x: ${pointToUse.coordinates.x.toFixed(2)}, y: ${pointToUse.coordinates.y.toFixed(2)} } in view ${viewInstanceId}`);
      setSnapPoints(currentPoints => {
        if (currentPoints.length === 1 && currentPoints[0].viewInstanceId !== pointToUse.viewInstanceId) {
          console.warn("[Canvas CustomLine] Second point is in a different view. Resetting selection.");
          return [pointToUse];
        }
        const updatedPoints = [...currentPoints, pointToUse];
        if (updatedPoints.length === 2) {
          // Create a custom line instead of a measurement
          const newCustomLineId = `custom-line-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
          const p1Coords = updatedPoints[0].coordinates;
          const p2Coords = updatedPoints[1].coordinates;

          const newCustomLine = {
            pathId: newCustomLineId,
            type: 'customLine', // New type
            viewInstanceId: updatedPoints[0].viewInstanceId,
            geometry: {
              type: 'line', // Represented as a line
              endpoints: [
                [p1Coords.x, p1Coords.y],
                [p2Coords.x, p2Coords.y]
              ]
              // No length or textPosition needed for basic custom lines
            },
            creationTimestamp: Date.now(),
          };

          console.log(`--- Creating Custom Line ---`);
          console.log(`  ID: ${newCustomLineId}`);
          console.log(`  Point 1: { x: ${p1Coords.x.toFixed(2)}, y: ${p1Coords.y.toFixed(2)} }`);
          console.log(`  Point 2: { x: ${p2Coords.x.toFixed(2)}, y: ${p2Coords.y.toFixed(2)} }`);
          console.log(`  View ID: ${newCustomLine.viewInstanceId}`);
          console.log(`-----------------------------`);

          setActiveMeasurements(prev => ({
            ...prev,
            [newCustomLineId]: newCustomLine,
          }));
          return []; // Reset after creating line
        } else if (updatedPoints.length > 2) {
           console.warn("[Canvas CustomLine] More than two points detected, resetting.");
           return [pointToUse];
        } else {
          return updatedPoints; // Only one point selected
        }
      });
    } // Closes: else if (interactionMode === 'customLine')
  }, [interactionMode, snapSubType, zoomLevel, getMeasurementState, getCustomLinesState, setSnapPoints, createMeasurementFromSnapPoints, createPointToLineMeasurement, setActiveMeasurements, handleDeleteMeasurement]); // End of handleSnapClick useCallback

  // Handle path click - ONLY toggle measurement display
  const handlePathClick = useCallback((event, uniquePathId, path, partName, partIndex, viewInstanceId) => {
    // If in snap, customLine, text, or deleteLine mode, do nothing here (handled by other handlers)
    if (interactionMode === 'snap' || interactionMode === 'customLine' || interactionMode === 'text' || interactionMode === 'deleteLine') {
      return;
    }

    console.log(`[Canvas] handlePathClick triggered for measurement toggle. Path: ${uniquePathId}`);

    // --- Measurement Toggling Logic (only in 'measure' mode) ---
    // Clear any selected snap points when switching back to measure mode implicitly by clicking
    setSnapPoints([]);
    // Only allow measurements for lines, circles, and arcs with valid geometry
    if (!path.geometry || (path.geometry.type !== 'line' && path.geometry.type !== 'circle' && path.geometry.type !== 'arc')) {
      console.log(`[Canvas] Clicked non-measurable path in measure mode: ${uniquePathId}, Type: ${path.geometry?.type}`);
      return;
    }

    setActiveMeasurements(prevMeasurements => {
      const newMeasurements = { ...prevMeasurements };

      if (newMeasurements[uniquePathId]) {
        // Measurement exists, remove it
        delete newMeasurements[uniquePathId];
        console.log(`Removed Measurement: ${uniquePathId}`);
      } else {
        // Measurement doesn't exist, add it
        // Calculate initial text position based on geometry
        const initialTextPosition = { x: 0, y: 0 }; // Placeholder
        if (path.geometry.type === 'line' && path.geometry.endpoints) {
          const [x1, y1] = path.geometry.endpoints[0];
          const [x2, y2] = path.geometry.endpoints[1];
          initialTextPosition.x = (x1 + x2) / 2;
          initialTextPosition.y = (y1 + y2) / 2 - 5; // Offset slightly above midpoint
        } else if (path.geometry.type === 'circle' && path.geometry.center && path.geometry.diameter != null) {
          initialTextPosition.x = path.geometry.center[0];
          initialTextPosition.y = path.geometry.center[1]; // Place inside initially
        } else if (path.geometry.type === 'arc' && path.geometry.endpoints && path.geometry.endpoints.length === 2 && path.geometry.radiusX != null) {
          // Initial position for arc radius: midpoint of endpoints, offset slightly
          const [x1, y1] = path.geometry.endpoints[0];
          const [x2, y2] = path.geometry.endpoints[1];
          initialTextPosition.x = (x1 + x2) / 2;
          initialTextPosition.y = (y1 + y2) / 2 - 5; // Offset up slightly
          // TODO: Improve arc text positioning (e.g., along normal at midpoint)
        }

        // Scale the geometry values before storing
        const scaledGeometry = { ...path.geometry };
        if (scaledGeometry.type === 'line' && scaledGeometry.length != null) {
          scaledGeometry.length *= 10; // Scale length
        } else if (scaledGeometry.type === 'circle' && scaledGeometry.diameter != null) {
          scaledGeometry.diameter *= 10; // Scale diameter
          if (scaledGeometry.radius != null) {
            scaledGeometry.radius *= 10; // Scale radius if present
          }
        } else if (scaledGeometry.type === 'arc' && scaledGeometry.radiusX != null) {
          // Scale arc radii (using radiusX as the primary radius for now)
          scaledGeometry.radius = scaledGeometry.radiusX * 10; // Store scaled radiusX as 'radius'
          // We can keep original radiusX/Y if needed for other calculations, or remove them:
          // delete scaledGeometry.radiusX;
          // delete scaledGeometry.radiusY;
        }

        // Determine measurement type based on geometry for the state object
        const measurementType = path.geometry.type === 'arc' ? 'radius' : path.geometry.type;

        newMeasurements[uniquePathId] = {
          pathId: uniquePathId, // This is the full, unique path segment ID
          type: measurementType, // Use 'radius' for arcs, 'line'/'circle' otherwise
          textPosition: initialTextPosition,
          viewInstanceId: viewInstanceId, // Store the ID of the specific view instance
          geometry: scaledGeometry, // Store the SCALED geometry
           overrideValue: null, // Add overrideValue field
           creationTimestamp: Date.now(), // Add timestamp
           isManuallyPositioned: false, // Default to automatic PDF placement
         };
         console.log(`--- Added Measurement ---`);
         console.log(`  Path ID: ${uniquePathId}`);
        console.log(`  Type: ${path.geometry.type}`);
        console.log(`  Initial Text Pos:`, initialTextPosition);
        console.log(`  Stored View Instance ID: ${viewInstanceId}`); // Log the stored instance ID
        console.log(`------------------------`);
      }

      return newMeasurements;
     });
   }, [interactionMode, setActiveMeasurements]); // Removed snap-related dependencies
 

  // --- Effect for Escape key to cancel snap or custom line drawing ---
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && (interactionMode === 'snap' || interactionMode === 'customLine') && snapPoints.length > 0) {
        console.log(`[Canvas] Escape pressed in ${interactionMode} mode. Clearing points.`);
        setSnapPoints([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [interactionMode, snapPoints, setSnapPoints]); // Dependencies: mode, points array, setter

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

  // Reset view function now also resets measurements and snap points
  const resetView = useCallback(() => {
    resetInteraction(); // Call reset from the interaction hook
    setActiveMeasurements({}); // Also reset measurements
    setSnapPoints([]); // Reset snap points array
    setSnapSubType('point-to-point'); // Also reset snap sub-type
    setUserTexts({}); // Also reset user texts
    // setInteractionMode('measure'); // Optionally reset interaction mode to default
  }, [resetInteraction, setSnapSubType, setActiveMeasurements, setSnapPoints, setUserTexts]); // Removed setInteractionMode

  // --- Handler for placing text ---
  const handleTextPlacementClick = useCallback((event, viewInstanceId) => {
    if (interactionMode !== 'text') return;

    const svgElement = event.target.closest('svg');
    if (!svgElement) {
      console.warn("[Canvas Text] Could not find parent SVG for text placement click.");
      return;
    }

    const screenX = event.clientX;
    const screenY = event.clientY;
    const svgCoords = getSvgCoordinates(screenX, screenY, svgElement);

    if (!svgCoords) {
      console.warn("[Canvas Text] Could not get SVG coordinates for text placement.");
      return;
    }

    const textContent = window.prompt("Enter text:", "Sample Text");
    if (textContent === null || textContent.trim() === "") {
      console.log("[Canvas Text] Text input cancelled or empty.");
      return;
    }

    const newTextId = `user-text-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    const newTextObject = {
      id: newTextId,
      content: textContent,
      position: { x: svgCoords.x, y: svgCoords.y },
      viewInstanceId: viewInstanceId,
      fontSize: 2.2, // Default, matches measurements
      color: "#222222", // Default, matches measurements
      rotation: 0,
      isManuallyPositioned: true, // Placed by user implies manual
      creationTimestamp: Date.now(),
    };

    setUserTexts(prev => ({
      ...prev,
      [newTextId]: newTextObject,
    }));
    console.log(`[Canvas Text] Added new text object:`, newTextObject);

  }, [interactionMode, setUserTexts]);


  // --- Layout Calculation (REMOVED old logic based on projections) ---
  // const standardLayout = projections.standardLayout;
  // const partsLayout = projections.parts;
  // let standardLayoutData = null;
  // let standardLayoutWidth = 0, standardLayoutHeight = 0;
  const initialOffsetX = 50; // Base offset for positioning content (might be reused or removed later)
  const initialOffsetY = 50;
  // const layoutGap = 20; // Gap used for positioning parts below standard layout (REMOVED)

  // REMOVED calculation logic for standardLayout and partsLayout positions/dimensions

  // Check if viewboxes array is empty or null
  const hasViewboxes = viewboxes && viewboxes.length > 0;

  // --- Memoize Measurements per View Instance ID ---
  const measurementsByViewInstanceId = useMemo(() => {
    const grouped = {};
    const allMeasurements = Object.values(activeMeasurements);

    // Initialize with empty arrays for all known view instance IDs to ensure stable references
    viewboxes.forEach(vb => {
      vb.items.forEach(item => {
        if (item) { // Check if item exists (cell might be empty)
          grouped[item.id] = [];
        }
      });
    });

    // Populate with actual measurements
    allMeasurements.forEach(m => {
      if (m.viewInstanceId && grouped.hasOwnProperty(m.viewInstanceId)) { // Check if key exists
        grouped[m.viewInstanceId].push(m);
      }
    });
    // console.log("[Canvas] Recalculated memoized measurementsByViewInstanceId:", grouped);
    return grouped;
  }, [activeMeasurements, viewboxes]);


  // --- Memoize User Texts per View Instance ID ---
  const userTextsByViewInstanceId = useMemo(() => {
    const grouped = {};
    const allUserTexts = Object.values(userTexts);

    viewboxes.forEach(vb => {
      vb.items.forEach(item => {
        if (item) {
          grouped[item.id] = [];
        }
      });
    });

    allUserTexts.forEach(ut => {
      if (ut.viewInstanceId && grouped.hasOwnProperty(ut.viewInstanceId)) {
        grouped[ut.viewInstanceId].push(ut);
      }
    });
    // console.log("[Canvas] Recalculated memoized userTextsByViewInstanceId:", grouped);
    return grouped;
  }, [userTexts, viewboxes]);


  // --- State Export Function ---
  const exportDrawingState = useCallback(() => {
    console.log("[Canvas] Exporting drawing state...");
    try {
      const stateToSave = {
        version: 1, // Current format version
        selectedModelName: selectedModelName, // From props
        selectedLayout: selectedLayout, // From props
        viewboxes: viewboxes, // From props
        activeMeasurements: activeMeasurements, // From local state
        userTexts: userTexts, // Add userTexts to export
        viewState: {
          zoomLevel: zoomLevel, // From local state
          panOffset: panOffset, // From local state
          scale: scale, // From local state
        },
        interactionState: {
          interactionMode: interactionMode, // From local state
          snapSubType: snapSubType, // From local state
        }
      };

      const jsonString = JSON.stringify(stateToSave, null, 2); // Pretty print JSON
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Prompt user for filename
      const defaultTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultSafeModelName = selectedModelName?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'drawing';
      const suggestedFilename = `${defaultSafeModelName}_state_${defaultTimestamp}`;
      
      let userFilename = window.prompt("Enter filename for state export (e.g., my-project-state):", suggestedFilename);

      if (userFilename === null) { // User cancelled the prompt
        console.log("[Canvas] State export cancelled by user.");
        URL.revokeObjectURL(url); // Clean up the object URL
        return; // Exit the function
      }

      // Use user's filename or fallback to default if empty
      let finalFilename = userFilename.trim() !== '' ? userFilename : suggestedFilename;

      // Ensure filename ends with .json
      if (!finalFilename.toLowerCase().endsWith('.json')) {
        finalFilename += '.json';
      }
      
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log("[Canvas] State exported successfully.");

    } catch (error) {
      console.error("[Canvas] Error exporting drawing state:", error);
      alert("Failed to export drawing state. See console for details.");
    }
  }, [
    selectedModelName,
    selectedLayout,
    viewboxes,
    activeMeasurements,
    userTexts, // Add userTexts dependency
    zoomLevel,
    panOffset,
    scale,
    interactionMode,
    snapSubType
  ]); // Dependencies include all state being saved

  // --- State Import Function ---
  const importDrawingState = useCallback((jsonString) => {
    console.log("[Canvas] Importing drawing state...");
    try {
      const importedState = JSON.parse(jsonString);

      // --- Basic Validation ---
      if (!importedState || typeof importedState !== 'object') {
        throw new Error("Invalid file format: Not a JSON object.");
      }
      if (importedState.version !== 1) {
        // Handle potential future version differences here
        console.warn(`[Canvas] Importing state from version ${importedState.version}, current version is 1. Compatibility issues may arise.`);
        // For now, we'll try to proceed but could add migration logic later.
      }
      if (!importedState.viewboxes || !Array.isArray(importedState.viewboxes)) {
        throw new Error("Invalid state format: Missing or invalid 'viewboxes'.");
      }
      if (!importedState.activeMeasurements || typeof importedState.activeMeasurements !== 'object') {
        throw new Error("Invalid state format: Missing or invalid 'activeMeasurements'.");
      }
      // Add validation for userTexts (optional, can default to empty)
      if (importedState.userTexts && typeof importedState.userTexts !== 'object') {
        console.warn("[Canvas] Imported state has invalid 'userTexts' format. Ignoring.");
        importedState.userTexts = {}; // Default to empty if invalid
      } else if (!importedState.userTexts) {
        importedState.userTexts = {}; // Default to empty if missing
      }
      if (!importedState.viewState || typeof importedState.viewState !== 'object') {
        throw new Error("Invalid state format: Missing or invalid 'viewState'.");
      }
      // Optional: Validate interactionState
      if (!importedState.interactionState || typeof importedState.interactionState !== 'object') {
        console.warn("[Canvas] Imported state missing 'interactionState'. Using defaults.");
        // Allow import to continue, defaults will be used if missing
      }

      // --- Update State ---
      console.log("[Canvas] Applying imported state...");

      // 1. Update Parent-Managed State (via callbacks)
      if (onViewboxesChange) {
        console.log("  - Updating viewboxes via callback...");
        onViewboxesChange(importedState.viewboxes);
      } else {
        console.warn("[Canvas] onViewboxesChange handler not provided by parent. Cannot update viewboxes.");
      }
      if (onModelNameChange && importedState.selectedModelName) {
         console.log(`  - Updating model name to "${importedState.selectedModelName}" via callback...`);
         onModelNameChange(importedState.selectedModelName);
      } else if (!onModelNameChange) {
         console.warn("[Canvas] onModelNameChange handler not provided. Cannot update model name.");
      }
      if (onLayoutChange && importedState.selectedLayout) {
         console.log(`  - Updating layout to "${importedState.selectedLayout}" via callback...`);
         onLayoutChange(importedState.selectedLayout);
      } else if (!onLayoutChange) {
         console.warn("[Canvas] onLayoutChange handler not provided. Cannot update layout.");
      }


      // 2. Update Local State (using setters)
      console.log("  - Updating local canvas state...");
      setActiveMeasurements(importedState.activeMeasurements);
      setUserTexts(importedState.userTexts || {}); // Set userTexts, default to empty object if missing
      setZoomLevel(importedState.viewState.zoomLevel ?? 1); // Use default if missing
      setPanOffset(importedState.viewState.panOffset ?? { x: 0, y: 0 }); // Use default if missing
      setScale(importedState.viewState.scale ?? 10); // Use default if missing

      // Update interaction state if present, otherwise keep current or default
      if (importedState.interactionState) {
        setInteractionMode(importedState.interactionState.interactionMode ?? 'measure');
        setSnapSubType(importedState.interactionState.snapSubType ?? 'point-to-point');
      }

      // 3. Reset transient states
      setSnapPoints([]); // Clear any in-progress snap selections

      console.log("[Canvas] State imported successfully.");
      alert("Drawing state imported successfully!");

    } catch (error) {
      console.error("[Canvas] Error importing drawing state:", error);
      alert(`Failed to import drawing state: ${error.message}`);
    }
  }, [
    setActiveMeasurements,
    setZoomLevel,
    setPanOffset,
    setScale,
    setInteractionMode,
    setSnapSubType,
    setSnapPoints,
    setUserTexts, // Add setUserTexts dependency
    onViewboxesChange, // Include parent callbacks in dependencies
    onModelNameChange,
    onLayoutChange,
  ]);


  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#e0e0e0',
        overflow: 'hidden',
        cursor: isPanning ? 'grabbing' : 'grab', // Use isPanning state for cursor
        touchAction: 'none' // Prevent default touch actions like scrolling
      }}
      // Spread interaction handlers (onMouseDown, onTouchStart, onWheel) from the hook
      {...interactionHandlers}
    >
      {/* Controls Overlay - Wrap in div with class for interaction hook check */}
      {/* Position the wrapper div top-right */}
      <div className="drawing-controls" style={{ position: 'absolute', top: 0, right: 0, zIndex: 10, pointerEvents: 'auto' }}>
        <DrawingControls
        selectedModelName={selectedModelName} // Pass the model name down
        isMobile={isMobile}
        zoomLevel={zoomLevel}
        scale={scale}
        containerSize={containerSize}
        panOffset={panOffset}
        onZoomChange={setZoomLevel} // Pass setter from hook
        onPanChange={setPanOffset} // Pass setter from hook
        onScaleChange={setScale}
        onResetView={resetView} // Pass combined reset function
        onExportPDF={exportPdf} // Pass export function from hook
        onAddViewbox={onAddViewbox} // Pass the handler down to DrawingControls
        selectedLayout={selectedLayout} // Pass layout state down
        onLayoutChange={onLayoutChange} // Pass layout handler down
        // Pass view selection props down
        selectedViewToAdd={selectedViewToAdd}
        onViewSelectionChange={onViewSelectionChange}
        rotationAngle={rotationAngle} // Pass rotation angle state down
        onRotationAngleChange={onRotationAngleChange} // Pass rotation angle handler down
        includeHiddenLines={includeHiddenLines}
        onHiddenLinesToggle={onHiddenLinesToggle}
        onAddViewToCell={onAddViewToCell}
        // Pass interaction mode state and setter
        interactionMode={interactionMode}
        onInteractionModeChange={setInteractionMode}
        // Pass snap sub-type state and setter
        snapSubType={snapSubType}
         onSnapSubTypeChange={setSnapSubType}
         // Pass the standard views setup handler
         onSetupStandardViews={onSetupStandardViews}
         // Pass state export/import handlers
         onExportState={exportDrawingState}
         onImportState={importDrawingState}
        />
      </div>

      {/* Content Area with Pan/Zoom transform */}
      <div
        ref={viewContainerRef} // Add ref to the zoomable/pannable container
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%', // Should cover the whole area for panning
          height: '100%',
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Render based on new viewboxes state */}
        {!hasViewboxes ? (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#666',
            fontSize: '16px',
            textAlign: 'center'
          }}>
            No viewboxes created yet.<br />
            Use controls to add a viewbox.
          </div>
        ) : (
          // Map over viewboxes and render a Viewbox component for each
          viewboxes.map((vb, index) => (
            <Viewbox
              key={vb.id}
              viewboxData={vb}
              selectedTarget={selectedTarget} // Pass down selection state
              onCellSelection={onCellSelection} // Pass down selection handler
              onTitleBlockChange={onTitleBlockChange} // Pass down title block handler
              onPathClick={handlePathClick} // Pass down path click handler (for measure mode)
              onSnapClick={handleSnapClick} // Pass down the new snap click handler
              onTextPlacementClick={handleTextPlacementClick} // Pass down text placement handler
              interactionMode={interactionMode} // Pass down interaction mode
              // Pass down measurement-related props
              allMeasurementsByView={measurementsByViewInstanceId} // Pass the entire map
              onUpdateMeasurementOverride={handleUpdateOverrideValue}
              onDeleteMeasurement={handleDeleteMeasurement}
              onToggleMeasurementManualPosition={handleToggleManualPosition}
              // Pass down user text related props
              allUserTextsByView={userTextsByViewInstanceId} // Pass the entire map
              onUserTextUpdate={handleUserTextUpdate}
              onDeleteUserText={handleDeleteUserText}
              // Common props
              zoomLevel={zoomLevel}
              snapPoints={snapPoints}
              onRemove={onRemoveViewbox}
              exportSettings={vb.exportSettings}
              onSettingsChange={onViewboxSettingsChange}
            />
          ))
        )}

        {/* REMOVED old rendering logic for standardLayout and partsLayout */}
      </div>

      {/* REMOVED Measurement SVG Overlay - Rendering moved into Viewbox/SvgView */}
    </div>
  );
}
