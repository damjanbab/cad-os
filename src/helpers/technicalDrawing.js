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
        const normalizedVisiblePaths = normalizePaths(visiblePaths, `${viewName}_visible`); // Use original normalizePaths
        const normalizedHiddenPaths = normalizePaths(hiddenPaths, `${viewName}_hidden`); // Use original normalizePaths

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
        const normalizedVisiblePaths = normalizePaths(viewVisiblePaths, `${idPrefix}_visible`); // Use original normalizePaths
        const normalizedHiddenPaths = normalizePaths(viewHiddenPaths, `${idPrefix}_hidden`); // Use original normalizePaths

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

/**
 * Normalize paths for rendering and add unique IDs.
 * This version decomposes paths into segments but does NOT merge them.
 * @param {Array} paths - Array of path strings or arrays
 * @param {String} prefix - ID prefix for the paths
 * @returns {Array} Normalized paths with IDs
 */
function normalizePaths(paths, prefix = 'path') {
  if (!Array.isArray(paths)) return [];

  // This array will hold our processed paths
  const normalizedPaths = [];
  let pathIndex = 0;

  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];

    // Extract path data string
    let pathData;
    if (typeof path === 'string') {
      pathData = path;
    } else if (Array.isArray(path)) {
      if (path.every(item => typeof item === 'string')) {
        pathData = path.join(' ');
      } else if (path.length > 0) {
        pathData = String(path[0]);
      } else {
        pathData = '';
      }
    } else if (path && typeof path === 'object' && path.d) {
      pathData = path.d;
    } else {
      pathData = String(path);
    }

    // Skip empty paths
    if (!pathData.trim()) continue;

    // First, check if this is a circle
    const circleInfo = detectCircle(pathData);
    if (circleInfo) {
      const id = `${prefix}_${pathIndex}_circle`;
      // Handle circle as a single entity
      normalizedPaths.push({
        id: id,
        groupId: id, // Circles are their own group
        data: pathData,
        type: 'circle',
        geometry: {
          type: 'circle',
          center: circleInfo.center,
          radius: circleInfo.radius,
          diameter: circleInfo.radius * 2
        }
      });
      pathIndex++;
      continue;
    }

    // Convert the path to a series of absolute coordinates or keep curves/arcs
    const segments = decomposePathToSegments(pathData);
    const groupBaseId = `${prefix}_${pathIndex}`; // Group segments from the same original path

    if (segments.length > 0) {
      // Create a separate path object for each segment
      segments.forEach((segment, j) => {
        const segmentId = `${groupBaseId}_${j}`; // Unique ID for each segment
        normalizedPaths.push({
          id: segmentId,
          groupId: groupBaseId, // Use the original path's group ID
          data: segment.path,
          type: segment.type,
          geometry: {
            type: segment.type,
            length: segment.length,
            endpoints: segment.endpoints // [[startX, startY], [endX, endY]]
          }
        });
      });
    } else {
      // Fallback for paths we couldn't decompose (and wasn't a circle)
       const id = `${prefix}_${pathIndex}_unknown`;
       normalizedPaths.push({
         id: id,
         groupId: id, // Unknown paths are their own group
         data: pathData,
         type: 'unknown',
         geometry: { type: 'unknown' }
       });
    }

    pathIndex++;
  }

  return normalizedPaths;
}


/**
 * Detect if a path represents a circle using SVG arc parameters
 * @param {string} pathData - SVG path data string
 * @returns {Object|null} Circle information or null if not a full circle
 */
function detectCircle(pathData) {
    // Use the accurate SVG arc calculation logic
    const arcRegex = /([Aa])\s*([-\d.]+)\s*,?\s*([-\d.]+)\s+([-\d.]+)\s+([01])\s*,?\s*([01])\s+([-\d.]+)\s*,?\s*([-\d.]+)/g;
    const moveRegex = /M\s*([-\d.]+)\s*,?\s*([-\d.]+)/i;

    const moveMatch = pathData.match(moveRegex);
    if (!moveMatch) return null;

    const startX = parseFloat(moveMatch[1]);
    const startY = parseFloat(moveMatch[2]);

    const arcs = [];
    let match;
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

    const firstRx = Math.abs(arcs[0].rx);
    const firstRy = Math.abs(arcs[0].ry);
    if (firstRx === 0 || Math.abs(firstRx - firstRy) > 0.01 * Math.max(firstRx, firstRy)) {
        return null;
    }
    if (!arcs.every(arc => Math.abs(Math.abs(arc.rx) - firstRx) < 1e-3 && Math.abs(Math.abs(arc.ry) - firstRy) < 1e-3)) {
        return null;
    }

    let currentX = startX;
    let currentY = startY;
    const allCommands = pathData.match(/([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/ig);
    if (!allCommands) return null;

    for (const cmdStr of allCommands) {
        const cmd = cmdStr[0];
        const params = cmdStr.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
        const endpoint = getEndpointForCommand(cmd, params, currentX, currentY);
        currentX = endpoint[0];
        currentY = endpoint[1];
    }

    const isClosed = Math.abs(currentX - startX) < 1e-3 && Math.abs(currentY - startY) < 1e-3;

    if (!isClosed && arcs.length < 2) {
        return null;
    }

    let firstArcData = null;
    currentX = startX;
    currentY = startY;
    for (const cmdStr of allCommands) {
        const cmd = cmdStr[0];
        const params = cmdStr.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
        if (cmd === 'A' || cmd === 'a') {
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
            break;
        }
        const endpoint = getEndpointForCommand(cmd, params, currentX, currentY);
        currentX = endpoint[0];
        currentY = endpoint[1];
    }

    if (!firstArcData) return null;

    const { rx, ry, xAxisRotationDeg, largeArcFlag, sweepFlag, endX: x2, endY: y2, startX: x1, startY: y1 } = firstArcData;

    const phi = xAxisRotationDeg * Math.PI / 180;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    const x1p = cosPhi * (x1 - x2) / 2 + sinPhi * (y1 - y2) / 2;
    const y1p = -sinPhi * (x1 - x2) / 2 + cosPhi * (y1 - y2) / 2;

    const rx_sq = rx * rx;
    const ry_sq = ry * ry;
    const x1p_sq = x1p * x1p;
    const y1p_sq = y1p * y1p;

    let radiiCheck = x1p_sq / rx_sq + y1p_sq / ry_sq;
    let correctedRx = rx;
    let correctedRy = ry;
    if (radiiCheck > 1) {
        correctedRx = Math.sqrt(radiiCheck) * rx;
        correctedRy = Math.sqrt(radiiCheck) * ry;
    }
    const correctedRx_sq = correctedRx * correctedRx;
    const correctedRy_sq = correctedRy * correctedRy;

    let sign = (largeArcFlag === sweepFlag) ? -1 : 1;
    let sq = Math.max(0, (correctedRx_sq * correctedRy_sq - correctedRx_sq * y1p_sq - correctedRy_sq * x1p_sq) / (correctedRx_sq * y1p_sq + correctedRy_sq * x1p_sq));
    let coef = sign * Math.sqrt(sq);
    const cxp = coef * (correctedRx * y1p / correctedRy);
    const cyp = coef * -(correctedRy * x1p / correctedRx);

    const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
    const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

    return {
        center: [cx, cy],
        radius: firstRx
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
  let startX = 0, startY = 0;
  let firstX = 0, firstY = 0;
  let isFirstCommand = true;

  // Regular expression to match SVG path commands with their parameters
  const commandsRegex = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g;
  let match;

  while ((match = commandsRegex.exec(pathData)) !== null) {
    const command = match[1];
    const params = match[2].trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

    switch (command) {
      case 'M': // Move to absolute
        if (params.length >= 2) {
          currentX = params[0];
          currentY = params[1];
          if (isFirstCommand) {
            firstX = currentX;
            firstY = currentY;
            isFirstCommand = false;
          }
          startX = currentX;
          startY = currentY;

          // Additional coordinates after the first pair are treated as "line to" commands
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
            firstX = currentX;
            firstY = currentY;
            isFirstCommand = false;
          }
          startX = currentX;
          startY = currentY;

          // Additional coordinates after the first pair are treated as "line to" commands
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
        if (currentX !== startX || currentY !== startY) {
          segments.push(createLineSegment(currentX, currentY, startX, startY));
          currentX = startX;
          currentY = startY;
        }
        break;

      // For curves and arcs, we don't decompose them into lines, but keep the full command
      case 'C': case 'c': // Cubic Bézier
      case 'S': case 's': // Smooth cubic Bézier
      case 'Q': case 'q': // Quadratic Bézier
      case 'T': case 't': // Smooth quadratic Bézier
      case 'A': case 'a': // Arc
        // Keep the original command as a single segment
        const fullCommand = match[0];

        // Update current position
        const endpoint = getEndpointForCurve(command, params, currentX, currentY);

        // Create a segment for this curve
        segments.push({
          type: 'curve',
          path: `M ${currentX} ${currentY} ${fullCommand}`,
          length: estimateCurveLength(command, params, currentX, currentY),
          endpoints: [[currentX, currentY], endpoint]
        });

        currentX = endpoint[0];
        currentY = endpoint[1];
        break;
    }
  }

  return segments;
}

/**
 * Create a line segment object
 */
function createLineSegment(x1, y1, x2, y2) {
  const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  return {
    type: 'line',
    path: `M ${x1} ${y1} L ${x2} ${y2}`,
    length: length,
    endpoints: [[x1, y1], [x2, y2]]
  };
}

/**
 * Estimate length of a curve
 */
function estimateCurveLength(command, params, currentX, currentY) {
  // For simplicity, this just returns the straight-line distance
  // A more accurate implementation would compute actual curve length
  const endpoint = getEndpointForCurve(command, params, currentX, currentY);
  return Math.sqrt(
    Math.pow(endpoint[0] - currentX, 2) +
    Math.pow(endpoint[1] - currentY, 2)
  );
}

/**
 * Get the endpoint of any SVG path command (Needed for detectCircle)
 */
function getEndpointForCommand(command, params, currentX, currentY) {
  // Use the existing getEndpointForCurve for curve/arc commands
  if ('CSQTAcsgta'.includes(command)) {
    return getEndpointForCurve(command, params, currentX, currentY);
  }

  // Handle other commands
  let x = currentX, y = currentY;
  const isRelative = command === command.toLowerCase();

  switch (command.toUpperCase()) {
    case 'M':
      x = params[params.length - 2];
      y = params[params.length - 1];
      if (isRelative) { x += currentX; y += currentY; }
      break;
    case 'L':
      x = params[params.length - 2];
      y = params[params.length - 1];
      if (isRelative) { x += currentX; y += currentY; }
      break;
    case 'H':
      x = params[params.length - 1];
      if (isRelative) { x += currentX; }
      y = currentY; // Y doesn't change
      break;
    case 'V':
      x = currentX; // X doesn't change
      y = params[params.length - 1];
      if (isRelative) { y += currentY; }
      break;
    case 'Z':
      // Endpoint is the start of the current subpath, but we don't track that here easily.
      // For simplicity, return current position, though Z closes the path.
      x = currentX;
      y = currentY;
      break;
  }
  return [x, y];
}


/**
 * Get the endpoint of a curve command (Needed for detectCircle)
 */
function getEndpointForCurve(command, params, currentX, currentY) {
  switch (command) {
    case 'C': return [params[4], params[5]];
    case 'c': return [currentX + params[4], currentY + params[5]];
    case 'S': return [params[2], params[3]];
    case 's': return [currentX + params[2], currentY + params[3]];
    case 'Q': return [params[2], params[3]];
    case 'q': return [currentX + params[2], currentY + params[3]];
    case 'T': return [params[0], params[1]];
    case 't': return [currentX + params[0], currentY + params[1]];
    case 'A': return [params[5], params[6]];
    case 'a': return [currentX + params[5], currentY + params[6]];
    default: return [currentX, currentY];
  }
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

  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
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

  const parts = viewBoxString.split(' ').map(parseFloat);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return null;
  }

  return {
    x: parts[0],
    y: parts[1],
    width: parts[2],
    height: parts[3]
  };
}
