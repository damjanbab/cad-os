import { drawProjection } from "replicad";
import * as makerjs from 'makerjs';
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
    
    // Process each technical drawing model
    Object.entries(model.technicalDrawingModels).forEach(([key, componentModel]) => {
      // Find the corresponding component data for the name
      const componentData = model.componentData.find(comp => 
        comp.id === key || comp.name.toLowerCase().includes(key.toLowerCase()));
      
      const componentViews = {
        front: drawProjection(componentModel, "front"),
        top: drawProjection(componentModel, "top"),
        right: drawProjection(componentModel, "right")
      };
      
      partProjections.push({
        name: componentData ? componentData.name : key,
        views: componentViews
      });
    });
    
    // Return only part projections for technical drawing components
    return {
      parts: partProjections
    };
  }
  
  // Standard behavior for simple models
  // Create projections for standard views
  const frontView = drawProjection(mainModel, "front");
  const topView = drawProjection(mainModel, "top");
  const rightView = drawProjection(mainModel, "right");
  
  // For models with multiple parts
  let partProjections = [];
  
  // If the model has separate components (like helperCuboid)
  if (model && model.main && Array.isArray(model.helperSpaces)) {
    const mainPartViews = {
      front: drawProjection(model.main, "front"),
      top: drawProjection(model.main, "top"),
      right: drawProjection(model.main, "right")
    };
    
    partProjections = [{
      name: "Main Component",
      views: mainPartViews
    }];
    
    // For helper spaces
    model.helperSpaces.forEach((helperSpace, index) => {
      const helperPartViews = {
        front: drawProjection(helperSpace, "front"),
        top: drawProjection(helperSpace, "top"),
        right: drawProjection(helperSpace, "right")
      };
      
      partProjections.push({
        name: `Helper Space ${index + 1}`,
        views: helperPartViews
      });
    });
  }
  
  return {
    standard: {
      frontView,
      topView,
      rightView
    },
    parts: partProjections
  };
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
      // Process each view to get SVG path data
      const visiblePaths = view.visible.toSVGPaths();
      const hiddenPaths = view.hidden.toSVGPaths();
      
      const visibleViewBox = view.visible.toSVGViewBox(2);
      const hiddenViewBox = view.hidden.toSVGViewBox(2);
      
      const combinedViewBox = combineViewBoxes(visibleViewBox, hiddenViewBox);
      
      // Normalize paths and add unique IDs to make them identifiable/clickable
      const normalizedVisiblePaths = normalizePaths(visiblePaths, 'visible');
      const normalizedHiddenPaths = normalizePaths(hiddenPaths, 'hidden');
      
      // Create MakerJS model with all paths
      const makerModel = createMakerJSModel(visiblePaths, hiddenPaths);
      
      processedViews[viewName] = {
        visible: {
          paths: normalizedVisiblePaths,
          viewBox: visibleViewBox
        },
        hidden: {
          paths: normalizedHiddenPaths,
          viewBox: hiddenViewBox
        },
        combinedViewBox,
        makerModel
      };
    }
  }
  
  // Process part views if available
  const processedParts = [];
  for (const part of projections.parts || []) {
    const views = {};
    
    for (const [viewName, view] of Object.entries(part.views)) {
      const viewVisiblePaths = view.visible.toSVGPaths();
      const viewHiddenPaths = view.hidden.toSVGPaths();
      
      // Add component and view name to ID prefix for better organization
      const idPrefix = `${part.name.replace(/\s+/g, '_')}_${viewName}`;
      
      // Normalize paths with unique IDs
      const normalizedVisiblePaths = normalizePaths(viewVisiblePaths, `${idPrefix}_visible`);
      const normalizedHiddenPaths = normalizePaths(viewHiddenPaths, `${idPrefix}_hidden`);
      
      // Create MakerJS model with all paths
      const makerModel = createMakerJSModel(viewVisiblePaths, viewHiddenPaths);
      
      views[viewName] = {
        visible: {
          paths: normalizedVisiblePaths,
          viewBox: view.visible.toSVGViewBox(2)
        },
        hidden: {
          paths: normalizedHiddenPaths,
          viewBox: view.hidden.toSVGViewBox(2)
        },
        combinedViewBox: combineViewBoxes(
          view.visible.toSVGViewBox(2), 
          view.hidden.toSVGViewBox(2)
        ),
        makerModel
      };
    }
    
    processedParts.push({
      name: part.name,
      views
    });
  }
  
  return {
    standard: Object.keys(processedViews).length > 0 ? processedViews : undefined,
    parts: processedParts
  };
}

/**
 * Normalize a single path
 * @param {String|Array|Object} path - Path to normalize
 * @param {String} prefix - ID prefix for the path
 * @param {Number} index - Index for unique ID generation
 * @returns {Object} Normalized path with id and data
 */
function normalizePath(path, prefix, index = 0) {
  let pathData;
  
  // Extract path data string
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
  
  // Extract geometric data for potential metadata
  const pathGeometry = parsePathGeometry(pathData);
  
  return {
    id: `${prefix}_${index}`,
    data: pathData,
    type: pathGeometry.type, // Optional: store type for future filtering/interaction
    geometry: pathGeometry // Optional: store geometry info for future interactions
  };
}

/**
 * Parse a path to extract geometric data - useful for future interactions
 * @param {String} pathData - SVG path data
 * @returns {Object} Parsed path data with type and other properties
 */
function parsePathGeometry(pathData) {
  if (!pathData || typeof pathData !== 'string') {
    return { type: 'unknown', original: pathData };
  }
  
  // Check for a line
  const lineMatch = pathData.match(/M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+L\s+(-?[\d.]+)\s+(-?[\d.]+)/);
  if (lineMatch) {
    const [, x1, y1, x2, y2] = lineMatch.map(parseFloat);
    return { 
      type: 'line', 
      endpoints: [[x1, y1], [x2, y2]],
      length: Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1))
    };
  }
  
  // Check for a circle 
  const circleMatch = pathData.match(/M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+A\s+(-?[\d.]+)\s+(-?[\d.]+)/);
  if (circleMatch) {
    const [, cx, cy, rx, ry] = circleMatch.map(parseFloat);
    return { 
      type: 'circle', 
      center: [cx, cy], 
      radius: (Math.abs(rx) + Math.abs(ry)) / 2
    };
  }
  
  // Return unknown type if we can't parse it
  return { type: 'unknown' };
}

/**
 * Normalize paths for rendering and add unique IDs
 * @param {Array} paths - Array of path strings or arrays
 * @param {String} prefix - ID prefix for the paths
 * @returns {Array} Normalized paths with IDs
 */
function normalizePaths(paths, prefix = 'path') {
  if (!Array.isArray(paths)) return [];
  
  return paths.map((path, index) => normalizePath(path, prefix, index));
}

/**
 * Create a MakerJS model from visible and hidden paths
 * @param {Array} visiblePaths - Visible path data
 * @param {Array} hiddenPaths - Hidden path data
 * @returns {Object} MakerJS model
 */
function createMakerJSModel(visiblePaths, hiddenPaths) {
  const model = { models: {}, paths: {} };
  
  // Add paths to the model
  if (Array.isArray(visiblePaths)) {
    visiblePaths.forEach((path, index) => {
      convertPathToMakerJS(path, model, `visible_${index}`);
    });
  }
  
  if (Array.isArray(hiddenPaths)) {
    hiddenPaths.forEach((path, index) => {
      convertPathToMakerJS(path, model, `hidden_${index}`);
    });
  }
  
  return model;
}

/**
 * Convert a path to a MakerJS path
 * @param {String|Array} path - Path data
 * @param {Object} model - MakerJS model to add the path to
 * @param {String} id - ID for the path
 */
function convertPathToMakerJS(path, model, id) {
  let pathData;
  
  // Extract path data string
  if (typeof path === 'string') {
    pathData = path;
  } else if (Array.isArray(path)) {
    pathData = path.length > 0 ? String(path[0]) : '';
  } else if (path && typeof path === 'object' && path.d) {
    pathData = path.d;
  } else {
    pathData = String(path);
  }
  
  try {
    // Try to identify the path type and convert to MakerJS path
    if (pathData.startsWith('M') && pathData.includes('L') && !pathData.includes('A')) {
      // Likely a line
      const match = pathData.match(/M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+L\s+(-?[\d.]+)\s+(-?[\d.]+)/);
      if (match) {
        const [, x1, y1, x2, y2] = match.map(parseFloat);
        model.paths[id] = new makerjs.paths.Line([x1, y1], [x2, y2]);
        return;
      }
    } else if (pathData.includes('A')) {
      // Circle or arc
      const arcMatch = pathData.match(/M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+A\s+(-?[\d.]+)\s+(-?[\d.]+)/);
      if (arcMatch) {
        const [, centerX, centerY, radiusX, radiusY] = arcMatch.map(parseFloat);
        if (Math.abs(radiusX - radiusY) < 0.001) {
          model.paths[id] = new makerjs.paths.Circle([centerX, centerY], radiusX);
          return;
        }
      }
    }
  } catch (e) {
    console.error("Error converting path to MakerJS:", e);
  }
  
  // Fallback: store as SVG path
  model.paths[id] = { type: 'svgPath', d: pathData };
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
  const parseViewBox = (vb) => {
    if (!vb) return null;
    const parts = vb.split(' ').map(parseFloat);
    if (parts.length !== 4) return null;
    return {
      x: parts[0],
      y: parts[1],
      width: parts[2],
      height: parts[3]
    };
  };
  
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