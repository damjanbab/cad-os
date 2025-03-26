// helpers/technicalDrawing.js - CORRECTED VERSION
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
  
  // Create projections for standard views
  const frontView = drawProjection(mainModel, "front");
  const topView = drawProjection(mainModel, "top");
  const rightView = drawProjection(mainModel, "right");
  
  // For models with multiple parts
  let partProjections = [];
  
  // If the model has separate components (like helperCuboid)
  if (model && model.main && Array.isArray(model.helperSpaces)) {
    partProjections = [{
      name: "Main Component",
      views: {
        front: drawProjection(model.main, "front"),
        top: drawProjection(model.main, "top"),
        right: drawProjection(model.main, "right")
      }
    }];
    
    // For helper spaces
    model.helperSpaces.forEach((helperSpace, index) => {
      partProjections.push({
        name: `Helper Space ${index + 1}`,
        views: {
          front: drawProjection(helperSpace, "front"),
          top: drawProjection(helperSpace, "top"),
          right: drawProjection(helperSpace, "right")
        }
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
  
  // Process standard views
  for (const [viewName, view] of Object.entries(projections.standard)) {
    // Process each view to get SVG path data
    processedViews[viewName] = {
      visible: {
        paths: view.visible.toSVGPaths(),
        viewBox: view.visible.toSVGViewBox(2)
      },
      hidden: {
        paths: view.hidden.toSVGPaths(),
        viewBox: view.hidden.toSVGViewBox(2)
      },
      // Combine both viewboxes to ensure consistent scaling
      combinedViewBox: combineViewBoxes(
        view.visible.toSVGViewBox(2), 
        view.hidden.toSVGViewBox(2)
      )
    };
  }
  
  // Process part views if available
  const processedParts = [];
  for (const part of projections.parts) {
    const views = {};
    for (const [viewName, view] of Object.entries(part.views)) {
      views[viewName] = {
        visible: {
          paths: view.visible.toSVGPaths(),
          viewBox: view.visible.toSVGViewBox(2)
        },
        hidden: {
          paths: view.hidden.toSVGPaths(),
          viewBox: view.hidden.toSVGViewBox(2)
        },
        combinedViewBox: combineViewBoxes(
          view.visible.toSVGViewBox(2), 
          view.hidden.toSVGViewBox(2)
        )
      };
    }
    
    processedParts.push({
      name: part.name,
      views
    });
  }
  
  return {
    standard: processedViews,
    parts: processedParts
  };
}

/**
 * Helper function to combine two viewbox strings to create one that encompasses both
 * @param {string} viewBox1 - First viewBox string "x y width height"
 * @param {string} viewBox2 - Second viewBox string "x y width height"
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
  
  // Construct the new viewBox
  return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`;
}