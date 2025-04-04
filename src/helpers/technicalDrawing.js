import { drawProjection } from "replicad";
import { exportableModel } from '../helperUtils.js';


/**
 * Creates orthographic projections for a model from standard views
 * @param {Object} model - The replicad model
 * @returns {Object} Object with standard orthographic views
 */
export function createOrthographicProjections(model) {
  // Extract main model (if it's a model with helpers)
  const mainModel = exportableModel(model);

  // Check if model has technical drawing models
  if (model && model.technicalDrawingModels) {
    // Extract components that should be drawn
    const partProjections = [];

    // Create an array to hold references to all centered models
    // This prevents garbage collection until we're done
    const centeredModels = [];

    // Process each technical drawing model
    Object.entries(model.technicalDrawingModels).forEach(([key, componentModel]) => {
      try {
        // Create a centered copy of this component for accurate projection
        const modelToCenter = exportableModel(componentModel);
        const center = modelToCenter.boundingBox.center;

        console.log(`Model ${key} original center:`, center);

        // Create centered model with a deep copy to ensure we have a complete new instance
        const centeredModel = modelToCenter.translate([-center[0], -center[1], -center[2]]);

        console.log(`Model ${key} new center:`, centeredModel.boundingBox.center);

        // Store reference to prevent garbage collection
        centeredModels.push(centeredModel);

        // Find the corresponding component data for the name
        const componentData = model.componentData.find(comp =>
          comp.id === key || comp.name.toLowerCase().includes(key.toLowerCase()));

        // Generate each view
        const frontView = drawProjection(centeredModel, "front");
        const topView = drawProjection(centeredModel, "top");
        const rightView = drawProjection(centeredModel, "right");

        console.log(`${key} front view bounds:`, frontView.visible.toSVGViewBox());
        console.log(`${key} top view bounds:`, topView.visible.toSVGViewBox());
        console.log(`${key} right view bounds:`, rightView.visible.toSVGViewBox());

        // Get all viewboxes for consistent scaling calculation
        const frontViewBox = parseViewBox(frontView.visible.toSVGViewBox());
        const topViewBox = parseViewBox(topView.visible.toSVGViewBox());
        const rightViewBox = parseViewBox(rightView.visible.toSVGViewBox());

        // Calculate a consistent scale factor based on the largest dimensions
        // This ensures all views have the same scale
        const maxWidth = Math.max(frontViewBox?.width || 0, topViewBox?.width || 0, rightViewBox?.width || 0);
        const maxHeight = Math.max(frontViewBox?.height || 0, topViewBox?.height || 0, rightViewBox?.height || 0);

        // Create normalized viewboxes with consistent scale
        // We'll keep these separately for use in the rendering
        if (frontViewBox) frontView.normalizedViewBox = createNormalizedViewBox(frontViewBox, maxWidth, maxHeight);
        if (topViewBox) topView.normalizedViewBox = createNormalizedViewBox(topViewBox, maxWidth, maxHeight);
        if (rightViewBox) rightView.normalizedViewBox = createNormalizedViewBox(rightViewBox, maxWidth, maxHeight);

        const componentViews = {
          front: frontView,
          top: topView,
          right: rightView
        };

        partProjections.push({
          name: componentData ? componentData.name : key,
          views: componentViews
        });
      } catch (err) {
        console.error(`Error processing model ${key}:`, err);
      }
    });

    console.log("All projections completed with", centeredModels.length, "centered models");

    return {
      parts: partProjections
    };
  }

  // For standard models, use the same technique
  // Hold references to all centered models until we're done
  const centeredModels = [];

  try {
    // Center the main model
    const mainToCenter = exportableModel(mainModel);
    const mainCenter = mainToCenter.boundingBox.center;

    console.log("Main model original center:", mainCenter);

    const centeredMainModel = mainToCenter.translate([-mainCenter[0], -mainCenter[1], -mainCenter[2]]);

    console.log("Main model new center:", centeredMainModel.boundingBox.center);

    centeredModels.push(centeredMainModel);

    // Create projections for standard views
    const frontView = drawProjection(centeredMainModel, "front");
    const topView = drawProjection(centeredMainModel, "top");
    const rightView = drawProjection(centeredMainModel, "right");

    console.log("Standard front view bounds:", frontView.visible.toSVGViewBox());
    console.log("Standard top view bounds:", topView.visible.toSVGViewBox());
    console.log("Standard right view bounds:", rightView.visible.toSVGViewBox());

    // Get all viewboxes for consistent scaling calculation
    const frontViewBox = parseViewBox(frontView.visible.toSVGViewBox());
    const topViewBox = parseViewBox(topView.visible.toSVGViewBox());
    const rightViewBox = parseViewBox(rightView.visible.toSVGViewBox());

    // Calculate a consistent scale factor based on the largest dimensions
    const maxWidth = Math.max(frontViewBox?.width || 0, topViewBox?.width || 0, rightViewBox?.width || 0);
    const maxHeight = Math.max(frontViewBox?.height || 0, topViewBox?.height || 0, rightViewBox?.height || 0);

    // Create normalized viewboxes with consistent scale
    if (frontViewBox) frontView.normalizedViewBox = createNormalizedViewBox(frontViewBox, maxWidth, maxHeight);
    if (topViewBox) topView.normalizedViewBox = createNormalizedViewBox(topViewBox, maxWidth, maxHeight);
    if (rightViewBox) rightView.normalizedViewBox = createNormalizedViewBox(rightViewBox, maxWidth, maxHeight);

    let partProjections = [];

    // If the model has separate components (like helperCuboid)
    if (model && model.main && Array.isArray(model.helperSpaces)) {
      // Center the main component
      const mainComp = model.main;
      const mainCompCenter = mainComp.boundingBox.center;

      console.log("Component main original center:", mainCompCenter);

      const centeredMain = mainComp.translate([-mainCompCenter[0], -mainCompCenter[1], -mainCompCenter[2]]);

      console.log("Component main new center:", centeredMain.boundingBox.center);

      centeredModels.push(centeredMain);

      // Generate views with consistent scaling
      const mainFrontView = drawProjection(centeredMain, "front");
      const mainTopView = drawProjection(centeredMain, "top");
      const mainRightView = drawProjection(centeredMain, "right");

      // Get all viewboxes for consistent scaling calculation
      const mFrontViewBox = parseViewBox(mainFrontView.visible.toSVGViewBox());
      const mTopViewBox = parseViewBox(mainTopView.visible.toSVGViewBox());
      const mRightViewBox = parseViewBox(mainRightView.visible.toSVGViewBox());

      // Calculate a consistent scale factor
      const mMaxWidth = Math.max(mFrontViewBox?.width || 0, mTopViewBox?.width || 0, mRightViewBox?.width || 0);
      const mMaxHeight = Math.max(mFrontViewBox?.height || 0, mTopViewBox?.height || 0, mRightViewBox?.height || 0);

      // Create normalized viewboxes with consistent scale
      if (mFrontViewBox) mainFrontView.normalizedViewBox = createNormalizedViewBox(mFrontViewBox, mMaxWidth, mMaxHeight);
      if (mTopViewBox) mainTopView.normalizedViewBox = createNormalizedViewBox(mTopViewBox, mMaxWidth, mMaxHeight);
      if (mRightViewBox) mainRightView.normalizedViewBox = createNormalizedViewBox(mRightViewBox, mMaxWidth, mMaxHeight);

      const mainPartViews = {
        front: mainFrontView,
        top: mainTopView,
        right: mainRightView
      };

      partProjections = [{
        name: "Main Component",
        views: mainPartViews
      }];

      // For helper spaces - also center each one and apply consistent scaling
      model.helperSpaces.forEach((helperSpace, index) => {
        const helperCenter = helperSpace.boundingBox.center;

        console.log(`Helper space ${index} original center:`, helperCenter);

        const centeredHelper = helperSpace.translate([-helperCenter[0], -helperCenter[1], -helperCenter[2]]);

        console.log(`Helper space ${index} new center:`, centeredHelper.boundingBox.center);

        centeredModels.push(centeredHelper);

        // Generate views with consistent scaling
        const helperFrontView = drawProjection(centeredHelper, "front");
        const helperTopView = drawProjection(centeredHelper, "top");
        const helperRightView = drawProjection(centeredHelper, "right");

        // Get all viewboxes for consistent scaling calculation
        const hFrontViewBox = parseViewBox(helperFrontView.visible.toSVGViewBox());
        const hTopViewBox = parseViewBox(helperTopView.visible.toSVGViewBox());
        const hRightViewBox = parseViewBox(helperRightView.visible.toSVGViewBox());

        // Calculate a consistent scale factor
        const hMaxWidth = Math.max(hFrontViewBox?.width || 0, hTopViewBox?.width || 0, hRightViewBox?.width || 0);
        const hMaxHeight = Math.max(hFrontViewBox?.height || 0, hTopViewBox?.height || 0, hRightViewBox?.height || 0);

        // Create normalized viewboxes
        if (hFrontViewBox) helperFrontView.normalizedViewBox = createNormalizedViewBox(hFrontViewBox, hMaxWidth, hMaxHeight);
        if (hTopViewBox) helperTopView.normalizedViewBox = createNormalizedViewBox(hTopViewBox, hMaxWidth, hMaxHeight);
        if (hRightViewBox) helperRightView.normalizedViewBox = createNormalizedViewBox(hRightViewBox, hMaxWidth, hMaxHeight);

        const helperPartViews = {
          front: helperFrontView,
          top: helperTopView,
          right: helperRightView
        };

        partProjections.push({
          name: `Helper Space ${index + 1}`,
          views: helperPartViews
        });
      });
    }

    console.log("All standard projections completed with", centeredModels.length, "centered models");

    return {
      standard: {
        frontView,
        topView,
        rightView
      },
      parts: partProjections
    };
  } catch (err) {
    console.error("Error in standard projections:", err);
    return {
      standard: {},
      parts: []
    };
  }
}

/**
 * Creates a normalized viewbox with consistent scale
 * @param {Object} viewBox - Parsed viewbox object
 * @param {number} maxWidth - Maximum width to scale against
 * @param {number} maxHeight - Maximum height to scale against
 * @returns {string} New normalized viewbox string
 */
function createNormalizedViewBox(viewBox, maxWidth, maxHeight) {
  if (!viewBox || typeof viewBox.x !== 'number' || typeof viewBox.y !== 'number' || typeof viewBox.width !== 'number' || typeof viewBox.height !== 'number') {
      console.warn("Invalid viewBox provided to createNormalizedViewBox:", viewBox);
      return "0 0 100 100"; // Default fallback
  }
  // Calculate center point of the current viewbox
  const centerX = viewBox.x + viewBox.width / 2;
  const centerY = viewBox.y + viewBox.height / 2;

  // Use provided max dimensions or default if zero/invalid
  const baseWidth = maxWidth > 0 ? maxWidth : 100;
  const baseHeight = maxHeight > 0 ? maxHeight : 100;

  // Add 15% margin to each side (total 30% increase)
  const marginFactor = 1.3;
  const paddedWidth = baseWidth * marginFactor;
  const paddedHeight = baseHeight * marginFactor;

  // Calculate new top-left corner based on padded dimensions to keep the original content centered
  const newX = centerX - paddedWidth / 2;
  const newY = centerY - paddedHeight / 2;

  return `${newX} ${newY} ${paddedWidth} ${paddedHeight}`;
}

/**
 * Processes projections to be suitable for rendering as SVG
 * @param {Object} projections - The projections object from createOrthographicProjections
 * @returns {Object} Processed projections ready for SVG rendering
 */
export function processProjectionsForRendering(projections) {
  const processedViews = {};

  // Process standard views if they exist
  if (projections.standard) {
    for (const [viewName, view] of Object.entries(projections.standard)) {
      try {
        // Process each view to get SVG path data
        const visiblePaths = view.visible.toSVGPaths();
        const hiddenPaths = view.hidden.toSVGPaths();

        // Use either the normalized viewbox (for consistent scaling) or fall back to original
        const visibleViewBox = view.normalizedViewBox || view.visible.toSVGViewBox(5);
        const hiddenViewBox = view.normalizedViewBox || view.hidden.toSVGViewBox(5);

        // For combined viewbox, use the normalized one if available
        // This ensures all views share the same scale
        const combinedViewBox = view.normalizedViewBox || combineViewBoxes(visibleViewBox, hiddenViewBox);

        console.log(`Processed ${viewName} viewBox:`, combinedViewBox);

        // Normalize paths and add unique IDs to make them identifiable/clickable
        const normalizedVisiblePaths = normalizePaths(visiblePaths, `${viewName}_visible`);
        const normalizedHiddenPaths = normalizePaths(hiddenPaths, `${viewName}_hidden`);

        processedViews[viewName] = {
          visible: {
            paths: normalizedVisiblePaths,
            viewBox: visibleViewBox
          },
          hidden: {
            paths: normalizedHiddenPaths,
            viewBox: hiddenViewBox
          },
          combinedViewBox
        };
      } catch (err) {
        console.error(`Error processing view ${viewName}:`, err);
      }
    }
  }

  // Process part views if available
  const processedParts = [];
  for (const part of projections.parts || []) {
    try {
      const views = {};

      for (const [viewName, view] of Object.entries(part.views)) {
        const viewVisiblePaths = view.visible.toSVGPaths();
        const viewHiddenPaths = view.hidden.toSVGPaths();

        // Add component and view name to ID prefix for better organization
        const idPrefix = `${part.name.replace(/\s+/g, '_')}_${viewName}`;

        // Normalize paths with unique IDs
        const normalizedVisiblePaths = normalizePaths(viewVisiblePaths, `${idPrefix}_visible`);
        const normalizedHiddenPaths = normalizePaths(viewHiddenPaths, `${idPrefix}_hidden`);

        // Use the normalized viewbox if available for consistent scaling
        const visibleViewBox = view.normalizedViewBox || view.visible.toSVGViewBox(5);
        const hiddenViewBox = view.normalizedViewBox || view.hidden.toSVGViewBox(5);

        // Use normalized viewbox for combined view if available
        const combinedViewBox = view.normalizedViewBox || combineViewBoxes(visibleViewBox, hiddenViewBox);

        console.log(`Processed ${part.name} ${viewName} viewBox:`, combinedViewBox);

        views[viewName] = {
          visible: {
            paths: normalizedVisiblePaths,
            viewBox: visibleViewBox
          },
          hidden: {
            paths: normalizedHiddenPaths,
            viewBox: hiddenViewBox
          },
          combinedViewBox
        };
      }

      processedParts.push({
        name: part.name,
        views
      });
    } catch (err) {
      console.error(`Error processing part ${part.name}:`, err);
    }
  }

  return {
    standard: Object.keys(processedViews).length > 0 ? processedViews : undefined,
    parts: processedParts
  };
}

// Tolerance for floating point comparisons
const TOLERANCE = 1e-6;

/**
 * Check if two points are close within a tolerance
 */
function arePointsClose(p1, p2, tolerance = TOLERANCE) {
  if (!p1 || !p2) return false;
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2)) < tolerance;
}

/**
 * Check if three points are collinear within a tolerance
 * Uses the area of the triangle method.
 */
function areCollinear(p1, p2, p3, tolerance = TOLERANCE) {
  if (!p1 || !p2 || !p3) return false;
  // Check for vertical line first to avoid division by zero or large slopes
  if (Math.abs(p1[0] - p2[0]) < tolerance && Math.abs(p2[0] - p3[0]) < tolerance) {
    return true;
  }
  // Check for horizontal line
  if (Math.abs(p1[1] - p2[1]) < tolerance && Math.abs(p2[1] - p3[1]) < tolerance) {
    return true;
  }
  // Calculate the area of the triangle formed by the three points
  // Using a robust method less prone to floating point issues with large coordinates
  const area = Math.abs((p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1]));
  // Normalize by the length of the base segment (p1 to p3) to get a relative tolerance
  const baseLengthSq = Math.pow(p3[0] - p1[0], 2) + Math.pow(p3[1] - p1[1], 2);
  // Avoid division by zero for coincident points
  if (baseLengthSq < tolerance * tolerance) return true;
  // Compare area relative to base length
  return area / Math.sqrt(baseLengthSq) < tolerance;
}


/**
 * Merge two adjacent and collinear line segments
 */
function mergeLineSegments(seg1, seg2) {
  // Determine the correct start and end points based on connection
  let startPoint, endPoint;
  if (arePointsClose(seg1.endpoints[1], seg2.endpoints[0])) {
    startPoint = seg1.endpoints[0];
    endPoint = seg2.endpoints[1];
  } else if (arePointsClose(seg1.endpoints[0], seg2.endpoints[1])) {
    startPoint = seg2.endpoints[0];
    endPoint = seg1.endpoints[1];
  } else if (arePointsClose(seg1.endpoints[0], seg2.endpoints[0])) {
    startPoint = seg1.endpoints[1];
    endPoint = seg2.endpoints[1];
  } else if (arePointsClose(seg1.endpoints[1], seg2.endpoints[1])) {
    startPoint = seg1.endpoints[0];
    endPoint = seg2.endpoints[0];
  } else {
    // Should not happen if arePointsClose check passed before calling merge
    console.warn("Cannot determine merge order for segments", seg1, seg2);
    return seg1; // Return one segment as fallback
  }

  const newLength = (seg1.length || 0) + (seg2.length || 0); // Handle potential undefined length
  const newPath = `M ${startPoint[0]} ${startPoint[1]} L ${endPoint[0]} ${endPoint[1]}`;

  return {
    type: 'line',
    path: newPath,
    length: newLength,
    endpoints: [startPoint, endPoint]
    // id and groupId will be assigned later
  };
}


/**
 * Normalize paths for rendering, merge collinear lines, and add unique IDs.
 * @param {Array} paths - Array of path strings or arrays
 * @param {String} prefix - ID prefix for the paths
 * @returns {Array} Normalized paths with IDs where groupId === id
 */
function normalizePaths(paths, prefix = 'path') {
  if (!Array.isArray(paths)) return [];

  const finalPaths = [];
  let pathIndex = 0; // Counter for original paths from replicad

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]; // Keep original loop variable name

    // Extract path data string
    let pathData;
    if (typeof path === 'string') {
      pathData = path;
    } else if (Array.isArray(path)) {
      // Handle potential nested arrays or objects within the array
      if (path.every(item => typeof item === 'string')) {
        pathData = path.join(' ');
      } else if (path.length > 0 && typeof path[0] === 'string') {
        pathData = path[0]; // Assume the first element is the path string if mixed types
      } else {
        pathData = ''; // Fallback for unexpected array content
      }
    } else if (path && typeof path === 'object' && typeof path.d === 'string') {
      pathData = path.d; // Handle object with 'd' property
    } else {
      // Attempt to stringify other types, though likely indicates an issue upstream
      pathData = String(path);
    }

    // Skip empty paths
    if (!pathData.trim()) continue;

    // Check for circles first
    const circleInfo = detectCircle(pathData);
    if (circleInfo) {
      const id = `${prefix}_${pathIndex}_circle`;
      finalPaths.push({
        id: id,
        groupId: id, // Use unique ID as group ID
        data: pathData,
        type: 'circle',
        geometry: {
          type: 'circle',
          center: circleInfo.center,
          radius: circleInfo.radius,
          diameter: circleInfo.radius * 2,
        },
      });
      pathIndex++; // Increment index for the next original path
      continue; // Move to the next original path
    }

    // Decompose the path into segments
    const initialSegments = decomposePathToSegments(pathData);
    const mergedSegments = [];

    if (initialSegments.length > 0) {
      let currentMergedSegment = initialSegments[0];

      for (let j = 1; j < initialSegments.length; j++) {
        const nextSegment = initialSegments[j];

        // Check if both are lines and can be merged
        // Ensure endpoints exist before checking closeness and collinearity
        if (currentMergedSegment.type === 'line' && nextSegment.type === 'line' &&
            currentMergedSegment.endpoints && nextSegment.endpoints &&
            (arePointsClose(currentMergedSegment.endpoints[1], nextSegment.endpoints[0]) || arePointsClose(currentMergedSegment.endpoints[0], nextSegment.endpoints[1]) || arePointsClose(currentMergedSegment.endpoints[0], nextSegment.endpoints[0]) || arePointsClose(currentMergedSegment.endpoints[1], nextSegment.endpoints[1])) && // Check adjacency (allow reversed segments)
            areCollinear(currentMergedSegment.endpoints[0], currentMergedSegment.endpoints[1], nextSegment.endpoints[0]) && // Check collinearity using 3 points
            areCollinear(currentMergedSegment.endpoints[0], currentMergedSegment.endpoints[1], nextSegment.endpoints[1])) // Check collinearity using the other endpoint
        {
          // Merge them
          currentMergedSegment = mergeLineSegments(currentMergedSegment, nextSegment);
        } else {
          // Cannot merge, push the current (potentially merged) segment and start new
          mergedSegments.push(currentMergedSegment);
          currentMergedSegment = nextSegment;
        }
      }
      // Push the last segment (which might be merged or the only segment)
      mergedSegments.push(currentMergedSegment);

      // Assign final IDs to the merged/processed segments
      mergedSegments.forEach((segment, j) => {
        // Ensure segment is valid before pushing
        if (segment && segment.path) {
            const finalId = `${prefix}_${pathIndex}_${j}`; // Unique ID for the final segment
            finalPaths.push({
              id: finalId,
              groupId: finalId, // Use unique ID as group ID
              data: segment.path,
              type: segment.type,
              geometry: {
                type: segment.type,
                length: segment.length,
                endpoints: segment.endpoints, // [[startX, startY], [endX, endY]]
              },
            });
        } else {
            console.warn("Skipping invalid segment during final ID assignment:", segment);
        }
      });
    } else {
      // Fallback for paths we couldn't decompose (and wasn't a circle)
      const id = `${prefix}_${pathIndex}_unknown`;
      finalPaths.push({
        id: id,
        groupId: id, // Use unique ID as group ID
        data: pathData,
        type: 'unknown',
        geometry: { type: 'unknown' },
      });
    }

    pathIndex++; // Increment index for the next original path
  }

  return finalPaths;
}


/**
 * Detect if a path represents a circle using SVG arc parameters
 * @param {string} pathData - SVG path data string
 * @returns {Object|null} Circle information or null if not a full circle
 */
function detectCircle(pathData) {
    // Use the accurate SVG arc calculation logic
    const arcRegex = /([Aa])\s*([-\d.eE+]+)\s*,?\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s+([01])\s*,?\s*([01])\s+([-\d.eE+]+)\s*,?\s*([-\d.eE+]+)/g;
    const moveRegex = /M\s*([-\d.eE+]+)\s*,?\s*([-\d.eE+]+)/i;


    const moveMatch = pathData.match(moveRegex);
    if (!moveMatch) return null;

    const startX = parseFloat(moveMatch[1]);
    const startY = parseFloat(moveMatch[2]);

    const arcs = [];
    let match;
    // Reset lastIndex before exec loop
    arcRegex.lastIndex = 0;
    while ((match = arcRegex.exec(pathData)) !== null) {
        arcs.push({
        rx: parseFloat(match[2]),
        ry: parseFloat(match[3]),
        xAxisRotation: parseFloat(match[4]),
        largeArcFlag: parseInt(match[5]),
        sweepFlag: parseInt(match[6]),
        endX: parseFloat(match[7]),
        endY: parseFloat(match[8]),
        isRelative: match[1] === 'a',
        });
    }

    if (arcs.length === 0) return null;

    // Check if rx and ry are equal (within tolerance) for all arcs
    const firstRx = Math.abs(arcs[0].rx);
    const firstRy = Math.abs(arcs[0].ry);
    if (firstRx < TOLERANCE || Math.abs(firstRx - firstRy) > TOLERANCE * Math.max(firstRx, firstRy)) {
        return null; // Not circular or rx/ry too different
    }
    if (!arcs.every(arc => Math.abs(Math.abs(arc.rx) - firstRx) < TOLERANCE && Math.abs(Math.abs(arc.ry) - firstRy) < TOLERANCE)) {
        return null; // Radii are not consistent across arcs
    }

    // Check if the path is closed and forms a full circle
    // This requires parsing the full path to find the final endpoint
    let currentX = startX;
    let currentY = startY;
    const allCommands = pathData.match(/([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/ig);
    if (!allCommands) return null;

    for (const cmdStr of allCommands) {
        const cmd = cmdStr[0];
        // Use regex to handle scientific notation and potential missing spaces/commas
        const params = (cmdStr.slice(1).match(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || []).map(Number);

        // Check if params extraction was successful
        if (params.some(isNaN)) {
             console.warn(`Could not parse parameters for command: ${cmdStr}`);
             continue; // Skip this command if params are invalid
        }

        const endpoint = getEndpointForCommand(cmd, params, currentX, currentY);
        currentX = endpoint[0];
        currentY = endpoint[1];
    }

    const isClosed = Math.abs(currentX - startX) < TOLERANCE && Math.abs(currentY - startY) < TOLERANCE;

    // A full circle usually consists of two arcs
    if (!isClosed || arcs.length < 2) {
        return null; // Not a closed path or not enough arcs for a typical full circle SVG representation
    }

    // Calculate center from the first arc (assuming it's a valid circular arc)
    let firstArcData = null;
    currentX = startX;
    currentY = startY;
    for (const cmdStr of allCommands) {
        const cmd = cmdStr[0];
        const params = (cmdStr.slice(1).match(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || []).map(Number);
         if (params.some(isNaN)) continue;

        if (cmd === 'A' || cmd === 'a') {
             // Ensure enough parameters for arc command
             if (params.length < 7) {
                 console.warn(`Invalid arc command parameters: ${cmdStr}`);
                 continue;
             }
            firstArcData = {
                rx: Math.abs(params[0]),
                ry: Math.abs(params[1]),
                xAxisRotationDeg: params[2],
                largeArcFlag: params[3],
                sweepFlag: params[4],
                endX: cmd === 'a' ? currentX + params[5] : params[5],
                endY: cmd === 'a' ? currentY + params[6] : params[6],
                startX: currentX,
                startY: currentY,
            };
            break; // Found the first arc
        }
        const endpoint = getEndpointForCommand(cmd, params, currentX, currentY);
        currentX = endpoint[0];
        currentY = endpoint[1];
    }

    if (!firstArcData) return null; // No valid arc command found

    // Use standard SVG arc to center calculation
    // https://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes
    const { rx, ry, xAxisRotationDeg, largeArcFlag, sweepFlag, endX: x2, endY: y2, startX: x1, startY: y1 } = firstArcData;

    const phi = xAxisRotationDeg * Math.PI / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    // Step 1: Compute (x1', y1')
    const x1p = cosPhi * (x1 - x2) / 2 + sinPhi * (y1 - y2) / 2;
    const y1p = -sinPhi * (x1 - x2) / 2 + cosPhi * (y1 - y2) / 2;

    const rx_sq = rx * rx;
    const ry_sq = ry * ry;
    const x1p_sq = x1p * x1p;
    const y1p_sq = y1p * y1p;

    // Ensure radii are large enough
    let radiiCheck = x1p_sq / rx_sq + y1p_sq / ry_sq;
    let correctedRx = rx;
    let correctedRy = ry;
    if (radiiCheck > 1) {
        const sqrtRadiiCheck = Math.sqrt(radiiCheck);
        correctedRx = sqrtRadiiCheck * rx;
        correctedRy = sqrtRadiiCheck * ry;
    }
    const correctedRx_sq = correctedRx * correctedRx;
    const correctedRy_sq = correctedRy * correctedRy;

    // Step 2: Compute (cx', cy')
    let sign = (largeArcFlag === sweepFlag) ? -1 : 1;
    let sq = Math.max(0, (correctedRx_sq * correctedRy_sq - correctedRx_sq * y1p_sq - correctedRy_sq * x1p_sq) / (correctedRx_sq * y1p_sq + correctedRy_sq * x1p_sq));
    let coef = sign * Math.sqrt(sq);
    const cxp = coef * (correctedRx * y1p / correctedRy);
    const cyp = coef * -(correctedRy * x1p / correctedRx);

    // Step 3: Compute (cx, cy) from (cx', cy')
    const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
    const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

    return {
        center: [cx, cy],
        radius: correctedRx // Use corrected radius
    };
}

/**
 * Decompose an SVG path into individual line segments or keep curves/arcs intact
 * @param {string} pathData - SVG path data string
 * @returns {Array} Array of segment objects with path data and measurements
 */
function decomposePathToSegments(pathData) {
  const segments = [];
  let currentX = 0, currentY = 0;
  let startX = 0, startY = 0; // Start of the current subpath
  let isFirstCommand = true;

  // Regular expression to match SVG path commands with their parameters, including scientific notation
  const commandsRegex = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  let match;

  while ((match = commandsRegex.exec(pathData)) !== null) {
    const command = match[1];
    // Use regex to handle scientific notation and potential missing spaces/commas
    const params = (match[2].match(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || []).map(Number);

    // Check if params extraction was successful
    if (params.some(isNaN)) {
         console.warn(`Could not parse parameters for command: ${match[0]}`);
         continue; // Skip this command if params are invalid
    }

    let pairs = [];

    switch (command) {
      case 'M': // Move to absolute
        if (params.length >= 2) {
          currentX = params[0];
          currentY = params[1];
          if (isFirstCommand) {
            isFirstCommand = false;
          }
          startX = currentX; // Update start of subpath
          startY = currentY;
          // Implicit LineTo for subsequent pairs
          for (let i = 2; i < params.length; i += 2) {
            if (i + 1 < params.length) {
              const x = params[i];
              const y = params[i + 1];
              segments.push(createLineSegment(currentX, currentY, x, y));
              currentX = x;
              currentY = y;
            }
          }
        }
        break;

      case 'm': // Move to relative
        if (params.length >= 2) {
          currentX += params[0];
          currentY += params[1];
           if (isFirstCommand) {
            isFirstCommand = false;
          }
          startX = currentX; // Update start of subpath
          startY = currentY;
          // Implicit LineTo for subsequent pairs
          for (let i = 2; i < params.length; i += 2) {
            if (i + 1 < params.length) {
              const x = currentX + params[i];
              const y = currentY + params[i + 1];
              segments.push(createLineSegment(currentX, currentY, x, y));
              currentX = x;
              currentY = y;
            }
          }
        }
        break;

      case 'L': // Line to absolute
        for (let i = 0; i < params.length; i += 2) {
          if (i + 1 < params.length) {
            const x = params[i];
            const y = params[i + 1];
            segments.push(createLineSegment(currentX, currentY, x, y));
            currentX = x;
            currentY = y;
          }
        }
        break;

      case 'l': // Line to relative
        for (let i = 0; i < params.length; i += 2) {
          if (i + 1 < params.length) {
            const x = currentX + params[i];
            const y = currentY + params[i + 1];
            segments.push(createLineSegment(currentX, currentY, x, y));
            currentX = x;
            currentY = y;
          }
        }
        break;

      case 'H': // Horizontal line absolute
        for (let i = 0; i < params.length; i++) {
          const x = params[i];
          segments.push(createLineSegment(currentX, currentY, x, currentY));
          currentX = x;
        }
        break;

      case 'h': // Horizontal line relative
        for (let i = 0; i < params.length; i++) {
          const x = currentX + params[i];
          segments.push(createLineSegment(currentX, currentY, x, currentY));
          currentX = x;
        }
        break;

      case 'V': // Vertical line absolute
        for (let i = 0; i < params.length; i++) {
          const y = params[i];
          segments.push(createLineSegment(currentX, currentY, currentX, y));
          currentY = y;
        }
        break;

      case 'v': // Vertical line relative
        for (let i = 0; i < params.length; i++) {
          const y = currentY + params[i];
          segments.push(createLineSegment(currentX, currentY, currentX, y));
          currentY = y;
        }
        break;

      case 'Z': // Close path
      case 'z':
        if (Math.abs(currentX - startX) > TOLERANCE || Math.abs(currentY - startY) > TOLERANCE) {
           segments.push(createLineSegment(currentX, currentY, startX, startY));
        }
        currentX = startX; // Move back to the start of the subpath
        currentY = startY;
        break;

      // Curves and Arcs - keep them as single segments
      case 'C': case 'c': // Cubic Bézier (6 params)
        pairs = params.length / 6;
        for(let i=0; i<pairs; ++i) {
            const p = params.slice(i*6, (i+1)*6);
            if (p.length === 6) {
                const endpoint = getEndpointForCurve(command, p, currentX, currentY);
                segments.push({ type: 'curve', path: `M ${currentX} ${currentY} ${command} ${p.join(' ')}`, length: estimateCurveLength(command, p, currentX, currentY), endpoints: [[currentX, currentY], endpoint] });
                currentX = endpoint[0]; currentY = endpoint[1];
            }
        }
        break;
      case 'S': case 's': // Smooth Cubic Bézier (4 params)
         pairs = params.length / 4;
         for(let i=0; i<pairs; ++i) {
            const p = params.slice(i*4, (i+1)*4);
             if (p.length === 4) {
                const endpoint = getEndpointForCurve(command, p, currentX, currentY);
                segments.push({ type: 'curve', path: `M ${currentX} ${currentY} ${command} ${p.join(' ')}`, length: estimateCurveLength(command, p, currentX, currentY), endpoints: [[currentX, currentY], endpoint] });
                currentX = endpoint[0]; currentY = endpoint[1];
            }
         }
        break;
      case 'Q': case 'q': // Quadratic Bézier (4 params)
         pairs = params.length / 4;
         for(let i=0; i<pairs; ++i) {
            const p = params.slice(i*4, (i+1)*4);
             if (p.length === 4) {
                const endpoint = getEndpointForCurve(command, p, currentX, currentY);
                segments.push({ type: 'curve', path: `M ${currentX} ${currentY} ${command} ${p.join(' ')}`, length: estimateCurveLength(command, p, currentX, currentY), endpoints: [[currentX, currentY], endpoint] });
                currentX = endpoint[0]; currentY = endpoint[1];
            }
         }
        break;
      case 'T': case 't': // Smooth Quadratic Bézier (2 params)
         pairs = params.length / 2;
         for(let i=0; i<pairs; ++i) {
            const p = params.slice(i*2, (i+1)*2);
             if (p.length === 2) {
                const endpoint = getEndpointForCurve(command, p, currentX, currentY);
                segments.push({ type: 'curve', path: `M ${currentX} ${currentY} ${command} ${p.join(' ')}`, length: estimateCurveLength(command, p, currentX, currentY), endpoints: [[currentX, currentY], endpoint] });
                currentX = endpoint[0]; currentY = endpoint[1];
            }
         }
        break;
      case 'A': case 'a': // Arc (7 params)
         pairs = params.length / 7;
         for(let i=0; i<pairs; ++i) {
            const p = params.slice(i*7, (i+1)*7);
             if (p.length === 7) {
                const endpoint = getEndpointForCurve(command, p, currentX, currentY);
                segments.push({ type: 'arc', path: `M ${currentX} ${currentY} ${command} ${p.join(' ')}`, length: estimateCurveLength(command, p, currentX, currentY), endpoints: [[currentX, currentY], endpoint] });
                currentX = endpoint[0]; currentY = endpoint[1];
            }
         }
        break;
    }
  }

  return segments;
}

/**
 * Create a line segment object
 */
function createLineSegment(x1, y1, x2, y2) {
  // Avoid creating zero-length segments
  if (Math.abs(x1 - x2) < TOLERANCE && Math.abs(y1 - y2) < TOLERANCE) {
    return null;
  }
  const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  return {
    type: 'line',
    path: `M ${x1} ${y1} L ${x2} ${y2}`,
    length: length,
    endpoints: [[x1, y1], [x2, y2]]
  };
}

/**
 * Estimate length of a curve/arc segment
 */
function estimateCurveLength(command, params, currentX, currentY) {
  // Simple straight-line distance for now
  const endpoint = getEndpointForCurve(command, params, currentX, currentY);
  return Math.sqrt(
    Math.pow(endpoint[0] - currentX, 2) +
    Math.pow(endpoint[1] - currentY, 2)
  );
  // TODO: Implement more accurate length estimation for curves/arcs if needed
}

/**
 * Get the endpoint of any SVG path command (Needed for detectCircle and segment decomposition)
 */
function getEndpointForCommand(command, params, currentX, currentY) {
  // Use the existing getEndpointForCurve for curve/arc commands
  if ('CSQTAcsgta'.includes(command)) {
    return getEndpointForCurve(command, params, currentX, currentY);
  }

  // Handle other commands
  let x = currentX, y = currentY;
  const isRelative = command === command.toLowerCase();
  const numParams = params.length;

  switch (command.toUpperCase()) {
    case 'M':
    case 'L':
      if (numParams >= 2) {
        x = params[numParams - 2];
        y = params[numParams - 1];
        if (isRelative) { x += currentX; y += currentY; }
      }
      break;
    case 'H':
      if (numParams >= 1) {
        x = params[numParams - 1];
        if (isRelative) { x += currentX; }
        y = currentY; // Y doesn't change
      }
      break;
    case 'V':
       if (numParams >= 1) {
        x = currentX; // X doesn't change
        y = params[numParams - 1];
        if (isRelative) { y += currentY; }
      }
      break;
    case 'Z':
      // Endpoint is the start of the current subpath, which we don't track here.
      // For simplicity in endpoint calculation, return current position.
      // The caller (decomposePathToSegments) handles Z correctly by adding a line to startX/startY.
      x = currentX;
      y = currentY;
      break;
  }
  return [x, y];
}


/**
 * Get the endpoint of a curve command (Needed for detectCircle and segment decomposition)
 */
function getEndpointForCurve(command, params, currentX, currentY) {
  const isRelative = command === command.toLowerCase();
  let x = currentX, y = currentY;
  const numParams = params.length;

  switch (command.toUpperCase()) {
    case 'C': // 6 params: x1 y1 x2 y2 x y
      if (numParams >= 6) {
        x = params[numParams - 2]; y = params[numParams - 1];
        if (isRelative) { x += currentX; y += currentY; }
      }
      break;
    case 'S': // 4 params: x2 y2 x y
    case 'Q': // 4 params: x1 y1 x y
       if (numParams >= 4) {
        x = params[numParams - 2]; y = params[numParams - 1];
        if (isRelative) { x += currentX; y += currentY; }
      }
      break;
    case 'T': // 2 params: x y
       if (numParams >= 2) {
        x = params[numParams - 2]; y = params[numParams - 1];
        if (isRelative) { x += currentX; y += currentY; }
      }
      break;
    case 'A': // 7 params: rx ry x-axis-rotation large-arc-flag sweep-flag x y
       if (numParams >= 7) {
        x = params[numParams - 2]; y = params[numParams - 1];
        if (isRelative) { x += currentX; y += currentY; }
      }
      break;
  }
  return [x, y];
}


/**
 * Helper function to combine two viewbox strings
 * @param {string} viewBox1 - First viewBox string
 * @param {string} viewBox2 - Second viewBox string
 * @returns {string} Combined viewBox string
 */
function combineViewBoxes(viewBox1, viewBox2) {
  // Default empty viewBox
  const defaultViewBox = "0 0 100 100";

  // Parse viewBox strings
  const box1 = parseViewBox(viewBox1) || parseViewBox(defaultViewBox);
  const box2 = parseViewBox(viewBox2) || parseViewBox(defaultViewBox);

  // If both boxes are empty/invalid, return a default
  if (!box1 && !box2) return defaultViewBox;
  if (!box1) return viewBox2 || defaultViewBox;
  if (!box2) return viewBox1 || defaultViewBox;

  // Find the combined bounds
  const minX = Math.min(box1.x, box2.x);
  const minY = Math.min(box1.y, box2.y);
  const maxX = Math.max(box1.x + box1.width, box2.x + box2.width);
  const maxY = Math.max(box1.y + box1.height, box2.y + box2.height);

  // Ensure width and height are non-negative
  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);


  return `${minX} ${minY} ${width} ${height}`;
}

/**
 * Parse viewBox string to get dimensions
 * @param {string} viewBoxString - SVG viewBox string
 * @returns {Object|null} Parsed viewBox object or null if invalid
 */
function parseViewBox(viewBoxString) {
  if (!viewBoxString || typeof viewBoxString !== 'string') {
    return null;
  }

  const parts = viewBoxString.split(/[\s,]+/).map(parseFloat); // Allow comma separation
  if (parts.length !== 4 || parts.some(isNaN)) {
     console.warn("Could not parse viewBox string:", viewBoxString);
    return null;
  }

  // Ensure width and height are non-negative
  const width = Math.max(0, parts[2]);
  const height = Math.max(0, parts[3]);


  return {
    x: parts[0],
    y: parts[1],
    width: width,
    height: height
  };
}
