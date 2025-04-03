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
        const maxWidth = Math.max(frontViewBox.width, topViewBox.width, rightViewBox.width);
        const maxHeight = Math.max(frontViewBox.height, topViewBox.height, rightViewBox.height);
        
        // Create normalized viewboxes with consistent scale
        // We'll keep these separately for use in the rendering
        frontView.normalizedViewBox = createNormalizedViewBox(frontViewBox, maxWidth, maxHeight);
        topView.normalizedViewBox = createNormalizedViewBox(topViewBox, maxWidth, maxHeight);
        rightView.normalizedViewBox = createNormalizedViewBox(rightViewBox, maxWidth, maxHeight);
        
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
    const maxWidth = Math.max(frontViewBox.width, topViewBox.width, rightViewBox.width);
    const maxHeight = Math.max(frontViewBox.height, topViewBox.height, rightViewBox.height);
    
    // Create normalized viewboxes with consistent scale
    frontView.normalizedViewBox = createNormalizedViewBox(frontViewBox, maxWidth, maxHeight);
    topView.normalizedViewBox = createNormalizedViewBox(topViewBox, maxWidth, maxHeight);
    rightView.normalizedViewBox = createNormalizedViewBox(rightViewBox, maxWidth, maxHeight);
    
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
      const mMaxWidth = Math.max(mFrontViewBox.width, mTopViewBox.width, mRightViewBox.width);
      const mMaxHeight = Math.max(mFrontViewBox.height, mTopViewBox.height, mRightViewBox.height);
      
      // Create normalized viewboxes with consistent scale
      mainFrontView.normalizedViewBox = createNormalizedViewBox(mFrontViewBox, mMaxWidth, mMaxHeight);
      mainTopView.normalizedViewBox = createNormalizedViewBox(mTopViewBox, mMaxWidth, mMaxHeight);
      mainRightView.normalizedViewBox = createNormalizedViewBox(mRightViewBox, mMaxWidth, mMaxHeight);
      
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
        const hMaxWidth = Math.max(hFrontViewBox.width, hTopViewBox.width, hRightViewBox.width);
        const hMaxHeight = Math.max(hFrontViewBox.height, hTopViewBox.height, hRightViewBox.height);
        
        // Create normalized viewboxes
        helperFrontView.normalizedViewBox = createNormalizedViewBox(hFrontViewBox, hMaxWidth, hMaxHeight);
        helperTopView.normalizedViewBox = createNormalizedViewBox(hTopViewBox, hMaxWidth, hMaxHeight);
        helperRightView.normalizedViewBox = createNormalizedViewBox(hRightViewBox, hMaxWidth, hMaxHeight);
        
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
  // Calculate center point of the current viewbox
  const centerX = viewBox.x + viewBox.width / 2;
  const centerY = viewBox.y + viewBox.height / 2;
  
  // Calculate new dimensions that maintain the aspect ratio
  // but ensure all views have the same scale
  const newWidth = maxWidth;
  const newHeight = maxHeight;
  
  // Calculate new top-left corner to keep the view centered
  const newX = centerX - newWidth / 2;
  const newY = centerY - newHeight / 2;
  
  return `${newX} ${newY} ${newWidth} ${newHeight}`;
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
        const normalizedVisiblePaths = normalizePaths(visiblePaths, 'visible');
        const normalizedHiddenPaths = normalizePaths(hiddenPaths, 'hidden');
        
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

/**
 * Normalize paths for rendering and add unique IDs
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
      // Handle circle as a single entity
      normalizedPaths.push({
        id: `${prefix}_${pathIndex}_circle`,
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
    
    // Convert the path to a series of absolute coordinates
    const segments = decomposePathToSegments(pathData);
    
    if (segments.length > 0) {
      // Create a separate path for each segment
      segments.forEach((segment, j) => {
        const id = `${prefix}_${pathIndex}_${j}`;
        normalizedPaths.push({
          id: id,
          data: segment.path,
          type: segment.type,
          geometry: {
            type: segment.type,
            length: segment.length,
            endpoints: segment.endpoints
          }
        });
      });
    } else {
      // Fallback for paths we couldn't decompose
      normalizedPaths.push({
        id: `${prefix}_${pathIndex}`,
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
 * Detect if a path represents a circle
 * @param {string} pathData - SVG path data string
 * @returns {Object|null} Circle information or null if not a circle
 */
function detectCircle(pathData) {
  // Pattern for detecting complete circles and arcs in SVG paths
  // This is a simplified approach that works for most common circle representations
  
  // Try to find "A" command with equal x and y radii (circular arc)
  const arcRegex = /[Mm][\s,]*([-\d.]+)[\s,]*([-\d.]+)[^A]* [Aa][\s,]*([-\d.]+)[\s,]*([-\d.]+)/;
  const arcMatch = pathData.match(arcRegex);
  
  if (arcMatch) {
    const startX = parseFloat(arcMatch[1]);
    const startY = parseFloat(arcMatch[2]);
    const rx = parseFloat(arcMatch[3]);
    const ry = parseFloat(arcMatch[4]);
    
    // If rx and ry are close enough, consider it a circle
    if (Math.abs(rx - ry) < 0.01 * Math.max(rx, ry)) {
      // For a complete circle, the center would be offset from the start point
      // This is a simplification that works for standard SVG circles
      
      // Get the rest of the path to see if it completes a circle
      // A full circle often has two arcs, or a single arc with a large arc flag
      const hasLargeArcFlag = pathData.includes('1,1') || pathData.includes('1, 1');
      const hasTwoArcs = (pathData.match(/[Aa]/g) || []).length >= 2;
      
      if (hasLargeArcFlag || hasTwoArcs) {
        // Calculate approximate center
        // For standard SVG circles created by apps, this usually works
        let cx = startX;
        let cy = startY - rx; // Adjust based on common circle representations
        
        return {
          center: [cx, cy],
          radius: rx
        };
      }
    }
  }
  
  return null;
}

/**
 * Decompose an SVG path into individual line segments
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
        
      // For curves, we don't decompose them into lines, but keep the full curve
      case 'C': case 'c': // Cubic Bézier
      case 'S': case 's': // Smooth cubic Bézier
      case 'Q': case 'q': // Quadratic Bézier
      case 'T': case 't': // Smooth quadratic Bézier
      case 'A': case 'a': // Arc
        // For curves, keep the original command
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
 * Get the endpoint of a curve command
 */
function getEndpointForCurve(command, params, currentX, currentY) {
  switch (command) {
    case 'C': // Cubic Bézier absolute
      return [params[4], params[5]];
    case 'c': // Cubic Bézier relative
      return [currentX + params[4], currentY + params[5]];
    case 'S': // Smooth cubic Bézier absolute
      return [params[2], params[3]];
    case 's': // Smooth cubic Bézier relative
      return [currentX + params[2], currentY + params[3]];
    case 'Q': // Quadratic Bézier absolute
      return [params[2], params[3]];
    case 'q': // Quadratic Bézier relative
      return [currentX + params[2], currentY + params[3]];
    case 'T': // Smooth quadratic Bézier absolute
      return [params[0], params[1]];
    case 't': // Smooth quadratic Bézier relative
      return [currentX + params[0], currentY + params[1]];
    case 'A': // Arc absolute
      return [params[5], params[6]];
    case 'a': // Arc relative
      return [currentX + params[5], currentY + params[6]];
    default:
      return [currentX, currentY];
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