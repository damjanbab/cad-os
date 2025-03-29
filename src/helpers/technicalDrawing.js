// Enhanced technicalDrawing.js with geometry metadata
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
  
  // Process visible curves - for now, we're skipping this as it's not working well
  // We'll rely on SVG path analysis in enhanceGeometryWithPathAnalysis instead
  
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
 * Extract curves from projection's innerShape
 * @param {Object} innerShape - The innerShape from projection.visible or projection.hidden
 * @returns {Array} Array of curve objects
 */
function extractCurves(innerShape) {
  const curves = [];
  
  // This is a simplified version - in a real implementation, 
  // you would need to access the actual curve objects from innerShape
  // The exact approach depends on ReplicAD's internal structure
  
  // For now, we'll return empty array and will rely on SVG path analysis
  // in the processProjectionsForRendering function
  
  return curves;
}

/**
 * Analyze a curve to determine its geometric type
 * @param {Object} curve - A curve object from extractCurves
 * @returns {Object} Geometric information about the curve
 */
function analyzeGeometryType(curve) {
  // This is a placeholder - in a real implementation,
  // you would analyze the curve properties to determine if it's a line, circle, etc.
  
  return {
    type: "other", // Could be: "circle", "line", "arc", "other"
    data: {}, // Would contain type-specific properties (radius, center, etc.)
    curve
  };
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
      "visible"
    );
    
    const enhancedHiddenGeometry = enhanceGeometryWithPathAnalysis(
      hiddenPaths, 
      geometry.hidden,
      "hidden"
    );
    
    processedViews[viewName] = {
      visible: {
        paths: visiblePaths,
        viewBox: visibleViewBox,
        geometry: enhancedVisibleGeometry
      },
      hidden: {
        paths: hiddenPaths,
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
        "visible"
      );
      
      const enhancedHiddenGeometry = enhanceGeometryWithPathAnalysis(
        viewHiddenPaths, 
        geometry.hidden,
        "hidden"
      );
      
      views[viewName] = {
        visible: {
          paths: viewVisiblePaths,
          viewBox: view.visible.toSVGViewBox(2),
          geometry: enhancedVisibleGeometry
        },
        hidden: {
          paths: viewHiddenPaths,
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
 * Enhances geometry data by analyzing SVG paths
 * @param {Array} paths - SVG path strings
 * @param {Object} baseGeometry - Base geometry info from extractGeometryInfo
 * @param {String} visibility - "visible" or "hidden"
 * @returns {Object} Enhanced geometry information
 */
function enhanceGeometryWithPathAnalysis(paths, baseGeometry, visibility) {
  const result = {
    elements: [],
    types: {
      circles: 0,
      lines: 0,
      arcs: 0,
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
    const element = analyzeSVGPath(path, index, visibility);
    result.elements.push(element);
    
    // Ensure the type exists in our counts
    if (result.types[element.type] !== undefined) {
      result.types[element.type]++;
    } else {
      result.types.other++;
    }
  });
  
  return result;
}

/**
 * Analyzes an SVG path to identify the geometric primitive
 * @param {String|Array} path - SVG path string or array
 * @param {Number} index - Index of the path
 * @param {String} visibility - "visible" or "hidden"
 * @returns {Object} Geometry information
 */
function analyzeSVGPath(path, index, visibility) {
  // Ensure we're working with a string
  if (!path || typeof path !== 'string') {
    console.log("[LOG] Invalid path type:", typeof path, path);
    return {
      type: "other",
      primitive: "unknown",
      data: {},
      svgPath: String(path),
      index,
      visibility
    };
  }
  
  // Extract the first command from the path
  const pathStr = path.trim();
  const firstCommand = pathStr.charAt(0);
  
  // Check for circle or ellipse (path starting with 'M' and containing 'A')
  if (pathStr.includes('A') && pathStr.startsWith('M')) {
    // Extract circle center and radius
    try {
      // Pattern matching for "M x y A rx ry rotation large-arc sweep-flag x y"
      const circleMatch = pathStr.match(/M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+A\s+(-?[\d.]+)\s+(-?[\d.]+)/);
      
      if (circleMatch) {
        const [, centerX, centerY, radiusX, radiusY] = circleMatch.map(parseFloat);
        
        if (Math.abs(radiusX - radiusY) < 0.001) {
          // It's a circle
          return {
            type: "circles",
            primitive: "circle",
            data: {
              center: { x: parseFloat(centerX), y: parseFloat(centerY) },
              radius: parseFloat(radiusX)
            },
            svgPath: pathStr,
            index,
            visibility
          };
        } else {
          // It's an ellipse
          return {
            type: "arcs",
            primitive: "ellipse",
            data: {
              center: { x: parseFloat(centerX), y: parseFloat(centerY) },
              radiusX: parseFloat(radiusX),
              radiusY: parseFloat(radiusY)
            },
            svgPath: pathStr,
            index,
            visibility
          };
        }
      }
    } catch (e) {
      console.log("[LOG] Error analyzing circle path:", e);
    }
  }
  
  // Check for line (path with M followed by L and only 2 points)
  if (pathStr.startsWith('M') && pathStr.includes('L') && !pathStr.includes('A')) {
    try {
      const lineMatch = pathStr.match(/M\s+(-?[\d.]+)\s+(-?[\d.]+)\s+L\s+(-?[\d.]+)\s+(-?[\d.]+)/);
      
      if (lineMatch) {
        const [, x1, y1, x2, y2] = lineMatch.map(parseFloat);
        
        return {
          type: "lines",
          primitive: "line",
          data: {
            start: { x: parseFloat(x1), y: parseFloat(y1) },
            end: { x: parseFloat(x2), y: parseFloat(y2) },
            length: Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
          },
          svgPath: pathStr,
          index,
          visibility
        };
      }
    } catch (e) {
      console.log("[LOG] Error analyzing line path:", e);
    }
  }
  
  // If we couldn't identify it as a specific primitive
  return {
    type: "other",
    primitive: "path",
    data: { command: firstCommand },
    svgPath: pathStr,
    index,
    visibility
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
  ];
  
  // Generate horizontal measurements for the view
  if (options.horizontal !== false) {
    // Find elements with different X coordinates
    const sortedByX = elements
      .filter(el => el.type === "lines" || el.type === "circles")
      .sort((a, b) => {
        const aX = a.type === "circles" ? a.data.center.x : Math.min(a.data.start.x, a.data.end.x);
        const bX = b.type === "circles" ? b.data.center.x : Math.min(b.data.start.x, b.data.end.x);
        return aX - bX;
      });
    
    // Add measurements for elements that are sufficiently far apart
    if (sortedByX.length >= 2) {
      const leftmost = sortedByX[0];
      const rightmost = sortedByX[sortedByX.length - 1];
      
      // Add overall width measurement
      let leftX, rightX;
      
      if (leftmost.type === "circles") {
        leftX = leftmost.data.center.x - leftmost.data.radius;
      } else {
        leftX = Math.min(leftmost.data.start.x, leftmost.data.end.x);
      }
      
      if (rightmost.type === "circles") {
        rightX = rightmost.data.center.x + rightmost.data.radius;
      } else {
        rightX = Math.max(rightmost.data.start.x, rightmost.data.end.x);
      }
      
      const width = rightX - leftX;
      
      measurements.push({
        type: "dimension",
        orientation: "horizontal",
        from: { x: leftX, y: boundingBox.y + boundingBox.height + 20 },
        to: { x: rightX, y: boundingBox.y + boundingBox.height + 20 },
        value: width.toFixed(2),
        unit: options.unit || "mm"
      });
    }
  }
  
  // Generate vertical measurements for the view
  if (options.vertical !== false) {
    // Find elements with different Y coordinates
    const sortedByY = elements
      .filter(el => el.type === "lines" || el.type === "circles")
      .sort((a, b) => {
        const aY = a.type === "circles" ? a.data.center.y : Math.min(a.data.start.y, a.data.end.y);
        const bY = b.type === "circles" ? b.data.center.y : Math.min(b.data.start.y, b.data.end.y);
        return aY - bY;
      });
    
    // Add measurements for elements that are sufficiently far apart
    if (sortedByY.length >= 2) {
      const topmost = sortedByY[0];
      const bottommost = sortedByY[sortedByY.length - 1];
      
      // Add overall height measurement
      let topY, bottomY;
      
      if (topmost.type === "circles") {
        topY = topmost.data.center.y - topmost.data.radius;
      } else {
        topY = Math.min(topmost.data.start.y, topmost.data.end.y);
      }
      
      if (bottommost.type === "circles") {
        bottomY = bottommost.data.center.y + bottommost.data.radius;
      } else {
        bottomY = Math.max(bottommost.data.start.y, bottommost.data.end.y);
      }
      
      const height = bottomY - topY;
      
      measurements.push({
        type: "dimension",
        orientation: "vertical",
        from: { x: boundingBox.x + boundingBox.width + 20, y: topY },
        to: { x: boundingBox.x + boundingBox.width + 20, y: bottomY },
        value: height.toFixed(2),
        unit: options.unit || "mm"
      });
    }
  }
  
  // Add diameter measurements for circles
  if (options.diameters !== false) {
    const circles = elements.filter(el => el.type === "circles");
    
    circles.forEach(circle => {
      measurements.push({
        type: "diameter",
        center: circle.data.center,
        radius: circle.data.radius,
        value: (circle.data.radius * 2).toFixed(2),
        unit: options.unit || "mm"
      });
    });
  }
  
  return measurements;
}

/**
 * Renders measurements as SVG elements
 * @param {Array} measurements - Array of measurement objects from createMeasurements
 * @returns {Array} Array of SVG elements as strings
 */
export function renderMeasurementsSVG(measurements) {
  return measurements.map(measurement => {
    if (measurement.type === "dimension") {
      if (measurement.orientation === "horizontal") {
        const y = measurement.from.y;
        const x1 = measurement.from.x;
        const x2 = measurement.to.x;
        const textX = (x1 + x2) / 2;
        
        return `
          <g class="measurement horizontal">
            <line x1="${x1}" y1="${y - 10}" x2="${x1}" y2="${y + 10}" stroke="black" stroke-width="1" />
            <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="black" stroke-width="1" />
            <line x1="${x2}" y1="${y - 10}" x2="${x2}" y2="${y + 10}" stroke="black" stroke-width="1" />
            <text x="${textX}" y="${y - 15}" text-anchor="middle" font-size="12">${measurement.value} ${measurement.unit}</text>
          </g>
        `;
      } else {
        const x = measurement.from.x;
        const y1 = measurement.from.y;
        const y2 = measurement.to.y;
        const textY = (y1 + y2) / 2;
        
        return `
          <g class="measurement vertical">
            <line x1="${x - 10}" y1="${y1}" x2="${x + 10}" y2="${y1}" stroke="black" stroke-width="1" />
            <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="black" stroke-width="1" />
            <line x1="${x - 10}" y1="${y2}" x2="${x + 10}" y2="${y2}" stroke="black" stroke-width="1" />
            <text x="${x + 15}" y="${textY}" text-anchor="middle" font-size="12" transform="rotate(90 ${x + 15} ${textY})">${measurement.value} ${measurement.unit}</text>
          </g>
        `;
      }
    } else if (measurement.type === "diameter") {
      const { center, radius, value, unit } = measurement;
      
      return `
        <g class="measurement diameter">
          <circle cx="${center.x}" cy="${center.y}" r="${radius}" stroke="none" stroke-width="1" stroke-dasharray="4,2" fill="none" />
          <line x1="${center.x - radius}" y1="${center.y}" x2="${center.x + radius}" y2="${center.y}" stroke="black" stroke-width="0.5" stroke-dasharray="4,2" />
          <text x="${center.x}" y="${center.y - 5}" text-anchor="middle" font-size="12">Ø${value} ${unit}</text>
        </g>
      `;
    }
    
    return '';
  });
}