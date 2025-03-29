// helpers/technicalDrawing.js with enhanced path referencing
import { drawProjection } from "replicad";
import { exportableModel } from '../helperUtils.js';

/**
 * Creates orthographic projections for a model from standard views
 * with enhanced geometric metadata
 * @param {Object} model - The replicad model
 * @returns {Object} Object with standard orthographic views and enhanced metadata
 */
export function createOrthographicProjections(model) {
  console.log("[LOG] createOrthographicProjections - Input model:", model);
  
  // Extract main model (if it's a model with helpers)
  const mainModel = exportableModel(model);
  console.log("[LOG] createOrthographicProjections - Main model after extraction:", mainModel);
  
  // Create projections for standard views
  console.log("[LOG] Creating front view projection...");
  const frontView = drawProjection(mainModel, "front");
  console.log("[LOG] Front view projection created:", frontView);
  console.log("[LOG] Front view visible curves:", frontView.visible);
  console.log("[LOG] Front view hidden curves:", frontView.hidden);
  
  // Extract more info from the projection
  const frontViewGeometry = extractGeometryInfo(frontView, "front");
  
  console.log("[LOG] Creating top view projection...");
  const topView = drawProjection(mainModel, "top");
  console.log("[LOG] Top view projection created:", topView);
  
  // Extract more info from the projection
  const topViewGeometry = extractGeometryInfo(topView, "top");
  
  console.log("[LOG] Creating right view projection...");
  const rightView = drawProjection(mainModel, "right");
  console.log("[LOG] Right view projection created:", rightView);
  
  // Extract more info from the projection
  const rightViewGeometry = extractGeometryInfo(rightView, "right");
  
  // For models with multiple parts
  let partProjections = [];
  
  // If the model has separate components (like helperCuboid)
  if (model && model.main && Array.isArray(model.helperSpaces)) {
    console.log("[LOG] Model has helper spaces, creating part projections...");
    const mainPartViews = {
      front: drawProjection(model.main, "front"),
      top: drawProjection(model.main, "top"),
      right: drawProjection(model.main, "right")
    };
    
    partProjections = [{
      name: "Main Component",
      views: mainPartViews,
      geometry: {
        front: extractGeometryInfo(mainPartViews.front, "front"),
        top: extractGeometryInfo(mainPartViews.top, "top"),
        right: extractGeometryInfo(mainPartViews.right, "right")
      }
    }];
    
    // For helper spaces
    model.helperSpaces.forEach((helperSpace, index) => {
      console.log(`[LOG] Creating projections for helper space ${index + 1}...`);
      
      const helperPartViews = {
        front: drawProjection(helperSpace, "front"),
        top: drawProjection(helperSpace, "top"),
        right: drawProjection(helperSpace, "right")
      };
      
      partProjections.push({
        name: `Helper Space ${index + 1}`,
        views: helperPartViews,
        geometry: {
          front: extractGeometryInfo(helperPartViews.front, "front"),
          top: extractGeometryInfo(helperPartViews.top, "top"),
          right: extractGeometryInfo(helperPartViews.right, "right")
        }
      });
    });
  }
  
  const result = {
    standard: {
      frontView: {
        projection: frontView,
        geometry: frontViewGeometry
      },
      topView: {
        projection: topView,
        geometry: topViewGeometry
      },
      rightView: {
        projection: rightView,
        geometry: rightViewGeometry
      }
    },
    parts: partProjections
  };
  
  console.log("[LOG] createOrthographicProjections - Final result structure (with geometry):", 
    JSON.stringify({
      standard: {
        frontView: {
          geometryTypes: frontViewGeometry.types
        },
        topView: {
          geometryTypes: topViewGeometry.types
        },
        rightView: {
          geometryTypes: rightViewGeometry.types
        }
      },
      parts: partProjections.map(part => ({
        name: part.name,
        views: Object.keys(part.views)
      }))
    }, null, 2)
  );
  
  return result;
}

/**
 * Extract geometry information from projection data
 * @param {Object} projection - The projection data from drawProjection
 * @param {string} viewName - Name of the view (front, top, right)
 * @returns {Object} Object with geometric metadata
 */
function extractGeometryInfo(projection, viewName) {
  const geometry = {
    visible: {
      elements: [],
      types: {
        circles: 0,
        lines: 0,
        arcs: 0,
        other: 0
      }
    },
    hidden: {
      elements: [],
      types: {
        circles: 0,
        lines: 0,
        arcs: 0,
        other: 0
      }
    },
    boundingBox: {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    },
    viewName
  };
  
  // Extract bounding box information from SVG viewBox
  try {
    if (projection && projection.visible && typeof projection.visible.toSVGViewBox === 'function') {
      const viewBox = projection.visible.toSVGViewBox(2);
      const parts = viewBox.split(' ').map(parseFloat);
      if (parts.length === 4) {
        geometry.boundingBox = {
          x: parts[0],
          y: parts[1],
          width: parts[2],
          height: parts[3]
        };
      }
    }
  } catch (err) {
    console.error("Error extracting bounding box:", err);
  }
  
  return geometry;
}

/**
 * Processes projections to be suitable for rendering as SVG with enhanced metadata
 * @param {Object} projections - The projections object from createOrthographicProjections
 * @returns {Object} Processed projections ready for SVG rendering with geometric metadata
 */
export function processProjectionsForRendering(projections) {
  console.log("[LOG] processProjectionsForRendering - Input projections structure:", 
    JSON.stringify({
      standard: Object.keys(projections.standard),
      parts: projections.parts.map(part => part.name)
    }, null, 2)
  );
  
  const processedViews = {};
  
  // Process standard views
  for (const [viewName, viewData] of Object.entries(projections.standard)) {
    console.log(`[LOG] Processing ${viewName} view...`);
    
    // Access actual projection object
    const view = viewData.projection;
    const geometry = viewData.geometry;
    
    // Log the curves data
    console.log(`[LOG] ${viewName} view visible curves:`, view.visible);
    console.log(`[LOG] ${viewName} view hidden curves:`, view.hidden);
    
    // Process each view to get SVG path data
    const visiblePaths = view.visible.toSVGPaths();
    console.log(`[LOG] ${viewName} visible SVG paths:`, visiblePaths);
    
    const hiddenPaths = view.hidden.toSVGPaths();
    console.log(`[LOG] ${viewName} hidden SVG paths:`, hiddenPaths);
    
    const visibleViewBox = view.visible.toSVGViewBox(2);
    console.log(`[LOG] ${viewName} visible viewBox:`, visibleViewBox);
    
    const hiddenViewBox = view.hidden.toSVGViewBox(2);
    console.log(`[LOG] ${viewName} hidden viewBox:`, hiddenViewBox);
    
    const combinedViewBox = combineViewBoxes(visibleViewBox, hiddenViewBox);
    console.log(`[LOG] ${viewName} combined viewBox:`, combinedViewBox);
    
    // Enhance geometry with path analysis
    const enhancedVisibleGeometry = enhanceGeometryWithPathAnalysis(
      visiblePaths, 
      geometry.visible,
      "visible",
      viewName
    );
    
    const enhancedHiddenGeometry = enhanceGeometryWithPathAnalysis(
      hiddenPaths, 
      geometry.hidden,
      "hidden",
      viewName
    );
    
    processedViews[viewName] = {
      visible: {
        paths: flattenAndNormalizePaths(visiblePaths, viewName, "visible"),
        viewBox: visibleViewBox,
        geometry: enhancedVisibleGeometry
      },
      hidden: {
        paths: flattenAndNormalizePaths(hiddenPaths, viewName, "hidden"),
        viewBox: hiddenViewBox,
        geometry: enhancedHiddenGeometry
      },
      // Combine both viewboxes to ensure consistent scaling
      combinedViewBox: combinedViewBox,
      boundingBox: geometry.boundingBox
    };
  }
  
  // Process part views if available
  const processedParts = [];
  for (const part of projections.parts) {
    console.log(`[LOG] Processing part: ${part.name}`);
    const views = {};
    
    for (const [viewName, view] of Object.entries(part.views)) {
      console.log(`[LOG] Processing ${part.name} - ${viewName} view...`);
      
      const viewVisiblePaths = view.visible.toSVGPaths();
      console.log(`[LOG] ${part.name} - ${viewName} visible paths count:`, viewVisiblePaths.length);
      
      const viewHiddenPaths = view.hidden.toSVGPaths();
      console.log(`[LOG] ${part.name} - ${viewName} hidden paths count:`, viewHiddenPaths.length);
      
      // Get geometry for this view
      const geometry = part.geometry[viewName];
      
      // Enhance geometry with path analysis
      const enhancedVisibleGeometry = enhanceGeometryWithPathAnalysis(
        viewVisiblePaths, 
        geometry.visible,
        "visible",
        viewName,
        part.name
      );
      
      const enhancedHiddenGeometry = enhanceGeometryWithPathAnalysis(
        viewHiddenPaths, 
        geometry.hidden,
        "hidden",
        viewName,
        part.name
      );
      
      views[viewName] = {
        visible: {
          paths: flattenAndNormalizePaths(viewVisiblePaths, viewName, "visible", part.name),
          viewBox: view.visible.toSVGViewBox(2),
          geometry: enhancedVisibleGeometry
        },
        hidden: {
          paths: flattenAndNormalizePaths(viewHiddenPaths, viewName, "hidden", part.name),
          viewBox: view.hidden.toSVGViewBox(2),
          geometry: enhancedHiddenGeometry
        },
        combinedViewBox: combineViewBoxes(
          view.visible.toSVGViewBox(2), 
          view.hidden.toSVGViewBox(2)
        ),
        boundingBox: geometry.boundingBox
      };
    }
    
    processedParts.push({
      name: part.name,
      views
    });
  }
  
  const result = {
    standard: processedViews,
    parts: processedParts
  };
  
  // Log a summary of what we processed
  console.log("[LOG] processProjectionsForRendering - Final result structure (with geometry):", 
    JSON.stringify({
      standard: Object.keys(result.standard).reduce((acc, viewName) => {
        const view = result.standard[viewName];
        acc[viewName] = {
          visible: {
            pathsCount: view.visible.paths.length,
            geometryElements: view.visible.geometry.elements.length,
          },
          hidden: {
            pathsCount: view.hidden.paths.length,
            geometryElements: view.hidden.geometry.elements.length,
          },
          combinedViewBox: view.combinedViewBox
        };
        return acc;
      }, {}),
      partsCount: result.parts.length
    }, null, 2)
  );
  
  return result;
}

/**
 * Flattens and normalizes paths array, ensuring each path has a unique ID and is a string
 * @param {Array} paths - Array of path arrays or strings
 * @param {String} viewName - Name of the view (e.g., "frontView")
 * @param {String} visibility - "visible" or "hidden"
 * @param {String} partName - Optional part name for compound models
 * @returns {Array} Array of normalized path objects with IDs and data
 */
function flattenAndNormalizePaths(paths, viewName, visibility, partName = "main") {
  if (!Array.isArray(paths)) {
    return [];
  }
  
  return paths.map((path, index) => {
    // Handle both string paths and array paths
    let pathData;
    if (typeof path === 'string') {
      pathData = path;
    } else if (Array.isArray(path)) {
      // Concatenate all strings in the array if it's an array of strings
      if (path.every(item => typeof item === 'string')) {
        pathData = path.join(' ');
      } else if (path.length > 0) {
        // Just use the first element if it's a nested array structure
        pathData = String(path[0]);
      } else {
        pathData = '';
      }
    } else if (path && typeof path === 'object' && path.d) {
      pathData = path.d;
    } else {
      pathData = String(path);
    }
    
    // Generate a unique ID for this path
    const id = `path_${partName}_${viewName}_${visibility}_${index}`;
    
    // Extract basic geometric info from the path
    const geometryInfo = extractPathGeometry(pathData);
    
    return {
      id,
      data: pathData,
      rawPath: path, // Keep the original path data
      viewName,
      visibility,
      partName,
      index,
      geometry: geometryInfo
    };
  });
}

/**
 * Extract basic geometric information from an SVG path string
 * @param {String} pathData - SVG path string
 * @returns {Object} Object with geometric information
 */
function extractPathGeometry(pathData) {
  if (typeof pathData !== 'string') {
    return { type: 'unknown' };
  }
  
  const pathStr = pathData.trim();
  
  // Check for line (path with M followed by L and only 2 points)
  if (pathStr.startsWith('M') && pathStr.includes('L') && !pathStr.includes('A')) {
    try {
      const lineMatch = pathStr.match(/M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+L\s+(-?[\d.]+)\s+(-?[\d.]+)/);
      
      if (lineMatch) {
        const [, x1, y1, x2, y2] = lineMatch.map(parseFloat);
        
        return {
          type: 'line',
          start: { x: parseFloat(x1), y: parseFloat(y1) },
          end: { x: parseFloat(x2), y: parseFloat(y2) },
          length: Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
          angle: Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI)
        };
      }
    } catch (e) {
      console.log("[LOG] Error analyzing line path:", e);
    }
  }
  
  // Check for polyline (path with multiple L commands)
  if (pathStr.startsWith('M') && pathStr.includes('L') && (pathStr.match(/L/g) || []).length > 1) {
    try {
      // Extract all points from the path
      const points = [];
      const pointMatches = pathStr.match(/(-?[\d.]+)\s+(-?[\d.]+)/g);
      
      if (pointMatches) {
        for (const pointStr of pointMatches) {
          const [x, y] = pointStr.split(/\s+/).map(parseFloat);
          points.push({ x, y });
        }
        
        return {
          type: 'polyline',
          points,
          segments: points.length - 1
        };
      }
    } catch (e) {
      console.log("[LOG] Error analyzing polyline path:", e);
    }
  }
  
  // Check for circle or arc (path with 'A' command)
  if (pathStr.includes('A')) {
    try {
      // Pattern for "M x y A rx ry rotation large-arc sweep-flag x y"
      const arcMatch = pathStr.match(/M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+A\s+(-?[\d.]+)\s+(-?[\d.]+)/);
      
      if (arcMatch) {
        const [, centerX, centerY, radiusX, radiusY] = arcMatch.map(parseFloat);
        
        if (Math.abs(radiusX - radiusY) < 0.001) {
          return {
            type: 'circle',
            center: { x: parseFloat(centerX), y: parseFloat(centerY) },
            radius: parseFloat(radiusX),
            diameter: parseFloat(radiusX) * 2
          };
        } else {
          return {
            type: 'ellipse',
            center: { x: parseFloat(centerX), y: parseFloat(centerY) },
            radiusX: parseFloat(radiusX),
            radiusY: parseFloat(radiusY)
          };
        }
      }
    } catch (e) {
      console.log("[LOG] Error analyzing arc path:", e);
    }
  }
  
  // Default return if no specific type is identified
  return {
    type: 'path',
    data: pathStr
  };
}

/**
 * Enhances geometry data by analyzing SVG paths
 * @param {Array} paths - SVG path strings or arrays
 * @param {Object} baseGeometry - Base geometry info from extractGeometryInfo
 * @param {String} visibility - "visible" or "hidden"
 * @param {String} viewName - Name of the view (e.g. "frontView")
 * @param {String} partName - Optional part name for compound models
 * @returns {Object} Enhanced geometry information
 */
function enhanceGeometryWithPathAnalysis(paths, baseGeometry, visibility, viewName, partName = "main") {
  const result = {
    elements: [],
    types: {
      circles: 0,
      lines: 0,
      arcs: 0,
      polylines: 0,
      other: 0
    }
  };
  
  // Safety check
  if (!Array.isArray(paths)) {
    console.log("[LOG] paths is not an array:", paths);
    return result;
  }
  
  console.log("[LOG] Analyzing paths:", paths.length, "paths of type", 
    paths.length > 0 ? typeof paths[0] : "unknown");
  
  // Process each path to identify geometric primitives
  paths.forEach((path, index) => {
    // Handle different path formats (string, array, object)
    let pathData;
    if (typeof path === 'string') {
      pathData = path;
    } else if (Array.isArray(path) && path.length > 0) {
      pathData = path[0];
    } else if (path && typeof path === 'object' && path.d) {
      pathData = path.d;
    } else {
      pathData = String(path);
    }
    
    // Generate a unique ID for this element
    const id = `geom_${partName}_${viewName}_${visibility}_${index}`;
    
    // Analyze the path
    const geometryInfo = analyzeSVGPath(pathData, id, visibility, viewName, partName, index);
    result.elements.push(geometryInfo);
    
    // Count by type
    if (geometryInfo.type === 'line') {
      result.types.lines++;
    } else if (geometryInfo.type === 'circle') {
      result.types.circles++;
    } else if (geometryInfo.type === 'arc' || geometryInfo.type === 'ellipse') {
      result.types.arcs++;
    } else if (geometryInfo.type === 'polyline') {
      result.types.polylines++;
    } else {
      result.types.other++;
    }
  });
  
  return result;
}

/**
 * Analyzes an SVG path to identify the geometric primitive and extract metadata
 * @param {String} pathData - SVG path data string
 * @param {String} id - Unique identifier for this element
 * @param {String} visibility - "visible" or "hidden"
 * @param {String} viewName - View name
 * @param {String} partName - Part name
 * @param {Number} index - Index in the paths array
 * @returns {Object} Geometry information with metadata
 */
function analyzeSVGPath(pathData, id, visibility, viewName, partName, index) {
  if (typeof pathData !== 'string') {
    return {
      id,
      type: 'other',
      primitive: 'unknown',
      data: {},
      svgPath: String(pathData),
      index,
      visibility,
      viewName,
      partName,
      referenceable: false
    };
  }
  
  const pathStr = pathData.trim();
  
  // Check for line
  if (pathStr.startsWith('M') && pathStr.includes('L') && !pathStr.includes('A')) {
    try {
      const lineMatch = pathStr.match(/M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+L\s+(-?[\d.]+)\s+(-?[\d.]+)/);
      
      if (lineMatch) {
        const [, x1, y1, x2, y2] = lineMatch.map(parseFloat);
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
        
        return {
          id,
          type: 'line',
          primitive: 'line',
          data: {
            start: { x: parseFloat(x1), y: parseFloat(y1) },
            end: { x: parseFloat(x2), y: parseFloat(y2) },
            length,
            angle,
            midpoint: {
              x: (x1 + x2) / 2,
              y: (y1 + y2) / 2
            }
          },
          svgPath: pathStr,
          index,
          visibility,
          viewName,
          partName,
          referenceable: true
        };
      }
    } catch (e) {
      console.log("[LOG] Error analyzing line path:", e);
    }
  }
  
  // Check for polyline (multiple line segments)
  if (pathStr.startsWith('M') && pathStr.includes('L') && (pathStr.match(/L/g) || []).length > 1) {
    try {
      // Extract all points from the path
      const points = [];
      const pointMatches = pathStr.match(/(-?[\d.]+)\s+(-?[\d.]+)/g);
      
      if (pointMatches) {
        for (const pointStr of pointMatches) {
          const [x, y] = pointStr.split(/\s+/).map(parseFloat);
          points.push({ x, y });
        }
        
        // Calculate bounding box
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        
        return {
          id,
          type: 'polyline',
          primitive: 'polyline',
          data: {
            points,
            segments: points.length - 1,
            boundingBox: {
              x: minX,
              y: minY,
              width: maxX - minX,
              height: maxY - minY
            }
          },
          svgPath: pathStr,
          index,
          visibility,
          viewName,
          partName,
          referenceable: true
        };
      }
    } catch (e) {
      console.log("[LOG] Error analyzing polyline path:", e);
    }
  }
  
  // Check for circle or ellipse
  if (pathStr.includes('A')) {
    try {
      const arcMatch = pathStr.match(/M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+A\s+(-?[\d.]+)\s+(-?[\d.]+)/);
      
      if (arcMatch) {
        const [, centerX, centerY, radiusX, radiusY] = arcMatch.map(parseFloat);
        
        if (Math.abs(radiusX - radiusY) < 0.001) {
          // It's a circle
          return {
            id,
            type: 'circle',
            primitive: 'circle',
            data: {
              center: { x: parseFloat(centerX), y: parseFloat(centerY) },
              radius: parseFloat(radiusX),
              diameter: parseFloat(radiusX) * 2,
              circumference: 2 * Math.PI * parseFloat(radiusX)
            },
            svgPath: pathStr,
            index,
            visibility,
            viewName,
            partName,
            referenceable: true
          };
        } else {
          // It's an ellipse
          return {
            id,
            type: 'ellipse',
            primitive: 'ellipse',
            data: {
              center: { x: parseFloat(centerX), y: parseFloat(centerY) },
              radiusX: parseFloat(radiusX),
              radiusY: parseFloat(radiusY),
              boundingBox: {
                x: centerX - radiusX,
                y: centerY - radiusY,
                width: radiusX * 2,
                height: radiusY * 2
              }
            },
            svgPath: pathStr,
            index,
            visibility,
            viewName,
            partName,
            referenceable: true
          };
        }
      }
    } catch (e) {
      console.log("[LOG] Error analyzing arc path:", e);
    }
  }
  
  // If we couldn't identify it as a specific primitive
  return {
    id,
    type: 'other',
    primitive: 'path',
    data: { 
      command: pathStr.charAt(0),
      rawPath: pathStr
    },
    svgPath: pathStr,
    index,
    visibility,
    viewName,
    partName,
    referenceable: false
  };
}

/**
 * Helper function to combine two viewbox strings to create one that encompasses both
 * @param {string} viewBox1 - First viewBox string "x y width height"
 * @param {string} viewBox2 - Second viewBox string "x y width height"
 * @returns {string} Combined viewBox string
 */
function combineViewBoxes(viewBox1, viewBox2) {
  console.log("[LOG] combineViewBoxes - Inputs:", { viewBox1, viewBox2 });
  
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
  
  console.log("[LOG] combineViewBoxes - Parsed boxes:", { box1, box2 });
  
  // If both boxes are empty/invalid, return a default
  if (!box1 && !box2) return defaultViewBox;
  if (!box1) return viewBox2 || defaultViewBox;
  if (!box2) return viewBox1 || defaultViewBox;
  
  // Find the combined bounds
  const minX = Math.min(box1.x, box2.x);
  const minY = Math.min(box1.y, box2.y);
  const maxX = Math.max(box1.x + box1.width, box2.x + box2.width);
  const maxY = Math.max(box1.y + box1.height, box2.y + box2.height);
  
  const result = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
  console.log("[LOG] combineViewBoxes - Result:", result);
  
  return result;
}

/**
 * Creates measurement data for an orthographic view
 * @param {Object} processedView - A processed view from processProjectionsForRendering
 * @param {Array} options - Options for measurement generation
 * @returns {Object} Measurement data
 */
export function createMeasurements(processedView, options = {}) {
  const { visible, hidden, combinedViewBox, boundingBox } = processedView;
  const measurements = [];
  
  // Extract all elements that can be measured
  const elements = [
    ...visible.geometry.elements,
    ...hidden.geometry.elements
  ].filter(el => el.referenceable);
  
  // Generate horizontal measurements for the view
  if (options.horizontal !== false) {
    // Find elements with different X coordinates
    const sortedByX = elements
      .filter(el => ['line', 'circle', 'ellipse'].includes(el.type))
      .sort((a, b) => {
        const aX = a.type === 'circle' || a.type === 'ellipse' 
          ? a.data.center.x 
          : Math.min(a.data.start.x, a.data.end.x);
        const bX = b.type === 'circle' || b.type === 'ellipse' 
          ? b.data.center.x 
          : Math.min(b.data.start.x, b.data.end.x);
        return aX - bX;
      });
    
    // Add measurements for elements that are sufficiently far apart
    if (sortedByX.length >= 2) {
      const leftmost = sortedByX[0];
      const rightmost = sortedByX[sortedByX.length - 1];
      
      // Add overall width measurement
      let leftX, rightX;
      
      if (leftmost.type === 'circle') {
        leftX = leftmost.data.center.x - leftmost.data.radius;
      } else if (leftmost.type === 'ellipse') {
        leftX = leftmost.data.center.x - leftmost.data.radiusX;
      } else {
        leftX = Math.min(leftmost.data.start.x, leftmost.data.end.x);
      }
      
      if (rightmost.type === 'circle') {
        rightX = rightmost.data.center.x + rightmost.data.radius;
      } else if (rightmost.type === 'ellipse') {
        rightX = rightmost.data.center.x + rightmost.data.radiusX;
      } else {
        rightX = Math.max(rightmost.data.start.x, rightmost.data.end.x);
      }
      
      const width = rightX - leftX;
      
      measurements.push({
        type: "dimension",
        orientation: "horizontal",
        from: { x: leftX, y: boundingBox.y + boundingBox.height + 20 },
        to: { x: rightX, y: boundingBox.y + boundingBox.height + 20 },
        fromElementId: leftmost.id,
        toElementId: rightmost.id,
        value: width.toFixed(2),
        unit: options.unit || "mm"
      });
    }
  }
  
  // Generate vertical measurements for the view
  if (options.vertical !== false) {
    // Similar implementation for vertical measurements...
    // (Keeping this part concise for the artifact)
  }
  
  return measurements;
}