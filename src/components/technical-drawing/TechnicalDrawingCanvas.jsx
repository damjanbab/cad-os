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
}) {
  // Removed loading check for projections
  // if (!projections) return <div>Loading projections...</div>;

  const containerRef = useRef(null); // Ref for the main container div
  const viewContainerRef = useRef(null); // Ref for the zoomable/pannable content area
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(10); // Initial scale: 10 pixels per cm
  // State for active measurements, keyed by uniquePathId (measurement group ID)
  const [activeMeasurements, setActiveMeasurements] = useState({});
  // State for interaction mode: 'measure' or 'snap'
  const [interactionMode, setInteractionMode] = useState('measure');
  // State for snap sub-type: 'point-to-point' or 'point-to-line'
  const [snapSubType, setSnapSubType] = useState('point-to-point'); // Default to point-to-point
  // State for the currently selected snap points (up to 2)
  const [snapPoints, setSnapPoints] = useState([]);

  // --- Use Hooks ---
  // Function for the interaction hook to get the current measurement state
  const getMeasurementState = useCallback(() => activeMeasurements, [activeMeasurements]);

  // Use the updated hook with viewboxes and activeMeasurements
  const { exportPdf } = useTechnicalDrawingPdfExport(viewboxes, activeMeasurements);
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
    // setInteractionSvgRef, // Not setting SVG ref directly here for now
    // Removed snapPoint from hook return value
  } = useCanvasInteraction(containerRef, getMeasurementState, interactionMode); // Pass state getter and interactionMode


  // Handler to update measurement text position (called by the hook via setOnMeasurementDrag)
  const handleMeasurementUpdate = useCallback((pathId, newPosition) => {
    setActiveMeasurements(prev => ({
      ...prev,
      [pathId]: {
        ...prev[pathId],
        textPosition: newPosition,
      }
    }));
  }, []); // Keep dependency array empty


  // --- Effect to set the measurement drag handler in the hook ---
  useEffect(() => {
    if (setOnMeasurementDrag) {
      setOnMeasurementDrag(handleMeasurementUpdate);
    }
    // Cleanup function if needed, though likely not for setting a ref callback
    // return () => { setOnMeasurementDrag(null); };
  }, [setOnMeasurementDrag, handleMeasurementUpdate]); // Re-run if setters or handler change


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


  // Handle path click - toggle measurement display or handle snap click
  // Add event and viewInstanceId to receive context from PathElement
  const handlePathClick = useCallback((event, uniquePathId, path, partName, partIndex, viewInstanceId) => {
    console.log(`[Canvas] handlePathClick triggered. Mode: ${interactionMode}, SubType: ${snapSubType}`);

    if (interactionMode === 'snap') {
      const svgElement = event.target.closest('svg');
      if (!svgElement) {
        console.warn("[Canvas] Could not find parent SVG for clicked path.");
        return;
      }

      // Use the original event's coordinates
      const screenX = event.clientX;
      const screenY = event.clientY;
      const svgCoords = getSvgCoordinates(screenX, screenY, svgElement);

      if (!svgCoords) {
        console.warn("[Canvas] Could not get SVG coordinates for click.");
        return;
      }

      console.log(`[Canvas] Click SVG Coords: { x: ${svgCoords.x.toFixed(2)}, y: ${svgCoords.y.toFixed(2)} }`);

      let closestPoint = null;
      let minDistance = SNAP_THRESHOLD;

      // Query all line elements within the clicked SVG view
      const lineElements = svgElement.querySelectorAll('path[data-geometry-type="line"][data-endpoints]');
      console.log(`[Canvas] Found ${lineElements.length} line elements in SVG view ${viewInstanceId} to check for snapping.`);

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

      // --- Point-to-Point Snap Logic ---
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
      // --- Point-to-Line Snap Logic ---
      else if (snapSubType === 'point-to-line') {
        setSnapPoints(currentSnapPoints => {
          // --- First Click: Select a Point ---
          if (currentSnapPoints.length === 0) {
            if (closestPoint) {
              console.log(`[Canvas P2L] Selected first point: ${closestPoint.type} at { x: ${closestPoint.coordinates.x.toFixed(2)}, y: ${closestPoint.coordinates.y.toFixed(2)} } in view ${viewInstanceId}`);
              // Add selectionRole for clarity
              return [{ ...closestPoint, selectionRole: 'point' }];
            } else {
              console.log("[Canvas P2L] First click did not snap to a point.");
              return []; // Reset if first click misses
            }
          }
          // --- Second Click: Select a Line ---
          else if (currentSnapPoints.length === 1) {
            const firstSelection = currentSnapPoints[0];
            // Ensure first selection was a point
            if (firstSelection.selectionRole !== 'point') {
                console.warn("[Canvas P2L] Invalid state: First selection was not a point. Resetting.");
                return [];
            }
            // Check if the clicked element is a line path in the same view
            if (path.geometry?.type === 'line' && viewInstanceId === firstSelection.viewInstanceId) {
              console.log(`[Canvas P2L] Selected second element: Line in view ${viewInstanceId}`);
              const lineSelection = {
                type: 'line', // Indicate this selection is a line
                geometry: path.geometry, // Store the line's geometry
                viewInstanceId: viewInstanceId,
                selectionRole: 'line' // Mark as line selection
              };
              // We have a point and a line, create measurement
              createPointToLineMeasurement(firstSelection, lineSelection);
              return []; // Reset after creating measurement
            } else if (viewInstanceId !== firstSelection.viewInstanceId) {
              console.warn("[Canvas P2L] Second click is in a different view. Resetting selection.");
              // If the second click *did* hit a point in the new view, start over with that point
              if (closestPoint && closestPoint.viewInstanceId === viewInstanceId) {
                 console.log(`[Canvas P2L] Starting new selection with point in view ${viewInstanceId}`);
                 return [{ ...closestPoint, selectionRole: 'point' }];
              }
              return []; // Otherwise, just reset
            } else {
              console.log("[Canvas P2L] Second click did not select a line in the same view.");
              // Keep the first point selected, maybe the user misclicked
              return currentSnapPoints;
            }
          }
          // --- Invalid State: More than one point selected ---
          else {
            console.warn("[Canvas P2L] Invalid state: More than one snap point selected. Resetting.");
             // If the click hit a point, start over with it
             if (closestPoint) {
                 return [{ ...closestPoint, selectionRole: 'point' }];
             }
             return []; // Otherwise, just reset
          }
        });
      }

      return; // Prevent measurement logic in snap mode
    }

    // --- Measurement Toggling Logic (only in 'measure' mode) ---
    // Clear any selected snap points when switching back to measure mode implicitly by clicking
    setSnapPoints([]);
    // Only allow measurements for lines and circles with valid geometry
    if (!path.geometry || (path.geometry.type !== 'line' && path.geometry.type !== 'circle')) {
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
        }

        // Determine the correct viewId for the measurement state
        let measurementViewId;
        // The viewId is implicitly passed via the uniquePathId structure
        // (e.g., PartName_front_visible_...) or explicitly for standard layout.
        // We need to extract the view part (e.g., PartName_front or standard_layout)
        const parts = uniquePathId.split('_');
        if (uniquePathId.startsWith('standard_')) {
            measurementViewId = "standard_layout";
            console.log(`[INFO] Clicked path ${uniquePathId} belongs to Standard Layout: ${measurementViewId}`);
        } else if (parts.length >= 4) { // Expecting at least PartName_viewName_visibility_type_id
            // Reconstruct the specific view ID (e.g., PartName_front)
            measurementViewId = parts.slice(0, parts.length - 3).join('_');
            console.log(`[INFO] Clicked path ${uniquePathId} belongs to Part View: ${measurementViewId}`);
        } else {
            // Fallback or unexpected format
            measurementViewId = uniquePathId; // Less ideal, use full ID
            console.warn(`[WARN] Could not reliably extract viewId from pathId: ${uniquePathId}. Using full ID.`);
        }


        newMeasurements[uniquePathId] = {
          pathId: uniquePathId, // This is the full, unique path segment ID
          type: path.geometry.type,
          textPosition: initialTextPosition,
          viewInstanceId: viewInstanceId, // Store the ID of the specific view instance
          geometry: scaledGeometry, // Store the SCALED geometry
          overrideValue: null, // Add overrideValue field
          creationTimestamp: Date.now(), // Add timestamp
        };
        console.log(`--- Added Measurement ---`);
        console.log(`  Path ID: ${uniquePathId}`);
        console.log(`  Type: ${path.geometry.type}`);
        console.log(`  Initial Text Pos:`, initialTextPosition);
        // console.log(`  Stored Logical View ID: ${measurementViewId}`); // Keep for debug if needed
        console.log(`  Stored View Instance ID: ${viewInstanceId}`); // Log the stored instance ID
        console.log(`------------------------`);
      }

      return newMeasurements;
    });
  }, [interactionMode, snapSubType, setActiveMeasurements, snapPoints, createMeasurementFromSnapPoints, createPointToLineMeasurement]); // Add snapSubType and new measurement function

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

  // --- Effect for Escape key to cancel snap ---
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && interactionMode === 'snap' && snapPoints.length > 0) {
        console.log("[Canvas] Escape pressed in snap mode. Clearing snap points.");
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
  }, [resetInteraction, setSnapSubType]); // Add setSnapSubType dependency

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
      } else {
        // This might happen if a measurement's viewInstanceId doesn't match a current view instance
        // Could be due to viewbox removal or other state inconsistencies. Log it.
        // console.warn(`[Canvas] Measurement ${m.pathId} has viewInstanceId ${m.viewInstanceId} which doesn't match any current view instance ID.`);
      }
    });
    console.log("[Canvas] Recalculated memoized measurementsByViewInstanceId:", grouped); // Debug log
    return grouped;
  }, [activeMeasurements, viewboxes]); // Dependencies: measurements state and viewboxes array structure (items)


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
              onPathClick={handlePathClick} // Pass down path click handler
              // Pass down measurement-related props
              measurementsByViewInstanceId={measurementsByViewInstanceId} // Pass the grouped measurements object
              onUpdateOverrideValue={handleUpdateOverrideValue} // Pass down the override update handler
              // Removed onMeasurementDragStart
              zoomLevel={zoomLevel} // Pass zoomLevel for potential use in MeasurementDisplay rendering
              snapPoints={snapPoints} // Pass down the array of snap points
              onRemove={onRemoveViewbox} // Pass down the remove handler
              // Pass down export settings and handler
              exportSettings={vb.exportSettings}
              onSettingsChange={onViewboxSettingsChange}
              // Pass down delete handler
              onDeleteMeasurement={handleDeleteMeasurement}
            />
          ))
        )}

        {/* REMOVED old rendering logic for standardLayout and partsLayout */}
      </div>

      {/* REMOVED Measurement SVG Overlay - Rendering moved into Viewbox/SvgView */}
    </div>
  );
}
