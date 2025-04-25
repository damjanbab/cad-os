import { drawProjection } from "replicad";
import { exportableModel } from '../helperUtils.js';
import { parseViewBox, combineViewBoxes } from '../utils/svgUtils.js';
import { TOLERANCE, arePointsClose, areCollinear } from '../utils/geometryUtils.js';

// --- SVG Path Transformation Helpers ---

/**
 * Parses an SVG path 'd' attribute string into an array of command objects.
 * Handles absolute/relative commands and various parameter counts.
 * @param {string} d - The SVG path data string.
 * @returns {Array<Object>} Array of command objects (e.g., { command: 'M', values: [x, y] }). Returns empty array on error.
 */
function parsePathData(d) {
  if (!d || typeof d !== 'string') {
    console.error("Invalid input to parsePathData:", d);
    return [];
  }
  // Regex to capture command and parameters, handling scientific notation and optional commas/spaces
  const commandRegex = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/ig;
  const commands = [];
  let match;

  while ((match = commandRegex.exec(d)) !== null) {
    const command = match[1];
    const paramString = match[2].trim();
    // Regex to extract numbers (including scientific notation) separated by spaces, commas, or signs
    const paramRegex = /[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g;
    const values = (paramString.match(paramRegex) || []).map(Number);

    // Basic validation: Check if any extracted number is NaN
    if (values.some(isNaN)) {
      console.warn(`Skipping command due to invalid parameters: ${match[0]}`);
      continue; // Skip this command if parsing failed
    }

    commands.push({ command, values });
  }
  return commands;
}

/**
 * Applies a translation (tx, ty) to the coordinates within a parsed path data array.
 * Modifies the array in place.
 * @param {Array<Object>} pathDataArray - Parsed path data from parsePathData.
 * @param {number} tx - Translation offset in X.
 * @param {number} ty - Translation offset in Y.
 */
function transformPathData(pathDataArray, tx, ty) {
  pathDataArray.forEach(item => {
    const command = item.command;
    const values = item.values;

    // Only transform coordinates for absolute commands
    // Relative commands ('m', 'l', 'h', 'v', 'c', 's', 'q', 't', 'a') remain relative to the previous point
    // and don't need direct translation of their parameters.
    // The absolute 'M' command sets the starting point, which needs translation.
    // Subsequent absolute commands define points in the translated coordinate space.
    if (command === command.toUpperCase() && command !== 'Z') { // Absolute commands (except Z)
      for (let i = 0; i < values.length; i++) {
        // Apply transformation based on command type and parameter index
        // M, L, T: (x y)+ pairs
        // H: x+ values
        // V: y+ values
        // C: (x1 y1 x2 y2 x y)+ triplets
        // S, Q: (x2 y2 x y)+ pairs
        // A: (rx ry x-axis-rotation large-arc-flag sweep-flag x y)+ sets
        // We need to transform the endpoint coordinates (x, y)
        // and control points for curves (x1, y1, x2, y2).
        // Radii (rx, ry) and flags for arcs are not translated.

        switch (command) {
          case 'M':
          case 'L':
          case 'T':
            // Every value is a coordinate pair (x, y)
            values[i] += (i % 2 === 0) ? tx : ty;
            break;
          case 'H':
            // Only x values
            values[i] += tx;
            break;
          case 'V':
            // Only y values
            values[i] += ty;
            break;
          case 'C':
            // (x1 y1 x2 y2 x y) - transform all
            values[i] += (i % 2 === 0) ? tx : ty;
            break;
          case 'S':
          case 'Q':
            // (x2 y2 x y) - transform all
            values[i] += (i % 2 === 0) ? tx : ty;
            break;
          case 'A':
            // (rx ry angle large-arc sweep x y) - only transform last two (x, y)
            if (i >= 5) { // Indices 5 and 6 are x and y
              values[i] += (i % 2 !== 0) ? tx : ty; // Index 5 is x, Index 6 is y
            }
            break;
        }
      }
    }
  });
}


/**
 * Serializes a parsed (and potentially transformed) path data array back into an SVG 'd' string.
 * @param {Array<Object>} pathDataArray - The array of command objects.
 * @returns {string} The reconstructed SVG path data string.
 */
function serializePathData(pathDataArray) {
  return pathDataArray.map(item => {
    // Format numbers to avoid excessive precision, but handle potential scientific notation
    const paramsString = item.values.map(v => {
        // Use exponential notation for very small or very large numbers, otherwise fixed precision
        if (Math.abs(v) > 1e6 || (Math.abs(v) < 1e-4 && v !== 0)) {
            return v.toExponential(4);
        }
        return parseFloat(v.toFixed(4)); // Limit precision
    }).join(' ');
    return `${item.command}${paramsString}`;
  }).join('');
}

// --- End SVG Path Transformation Helpers ---


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
        const bottomView = drawProjection(centeredModel, "bottom"); // Changed from top to bottom
        const leftView = drawProjection(centeredModel, "left"); // Generate left view data

        console.log(`${key} front view bounds:`, frontView.visible.toSVGViewBox());
        console.log(`${key} bottom view bounds:`, bottomView.visible.toSVGViewBox()); // Changed log
        console.log(`${key} left view (data) bounds:`, leftView.visible.toSVGViewBox()); // Log left view data bounds

        // Get all viewboxes for consistent scaling calculation
        const frontViewBox = parseViewBox(frontView.visible.toSVGViewBox());
        const bottomViewBox = parseViewBox(bottomView.visible.toSVGViewBox()); // Changed variable
        const leftViewBox = parseViewBox(leftView.visible.toSVGViewBox()); // Get left view box

        // Calculate a consistent scale factor based on the largest dimensions
        // This ensures all views have the same scale
        const maxWidth = Math.max(frontViewBox?.width || 0, bottomViewBox?.width || 0, leftViewBox?.width || 0);
        const maxHeight = Math.max(frontViewBox?.height || 0, bottomViewBox?.height || 0, leftViewBox?.height || 0);

        // Create normalized viewboxes with consistent scale
        // We'll keep these separately for use in the rendering
        if (frontViewBox) frontView.normalizedViewBox = createNormalizedViewBox(frontViewBox, maxWidth, maxHeight);
        if (bottomViewBox) bottomView.normalizedViewBox = createNormalizedViewBox(bottomViewBox, maxWidth, maxHeight); // Changed variable
        if (leftViewBox) leftView.normalizedViewBox = createNormalizedViewBox(leftViewBox, maxWidth, maxHeight); // Normalize left view box

        const componentViews = {
          front: frontView,
          bottom: bottomView, // Changed key and value
          left: leftView // Store left view data under 'left' key
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
    const bottomView = drawProjection(centeredMainModel, "bottom"); // Changed from top to bottom
    const leftView = drawProjection(centeredMainModel, "left"); // Generate left view data

    console.log("Standard front view bounds:", frontView.visible.toSVGViewBox());
    console.log("Standard bottom view bounds:", bottomView.visible.toSVGViewBox()); // Changed log
    console.log("Standard left view (data) bounds:", leftView.visible.toSVGViewBox()); // Log left view data bounds

    // Get all viewboxes for consistent scaling calculation
    const frontViewBox = parseViewBox(frontView.visible.toSVGViewBox());
    const bottomViewBox = parseViewBox(bottomView.visible.toSVGViewBox()); // Changed variable
    const leftViewBox = parseViewBox(leftView.visible.toSVGViewBox()); // Get left view box

    // Calculate a consistent scale factor based on the largest dimensions
    const maxWidth = Math.max(frontViewBox?.width || 0, bottomViewBox?.width || 0, leftViewBox?.width || 0);
    const maxHeight = Math.max(frontViewBox?.height || 0, bottomViewBox?.height || 0, leftViewBox?.height || 0);

    // Create normalized viewboxes with consistent scale
    if (frontViewBox) frontView.normalizedViewBox = createNormalizedViewBox(frontViewBox, maxWidth, maxHeight);
    if (bottomViewBox) bottomView.normalizedViewBox = createNormalizedViewBox(bottomViewBox, maxWidth, maxHeight); // Changed variable
    if (leftViewBox) leftView.normalizedViewBox = createNormalizedViewBox(leftViewBox, maxWidth, maxHeight); // Normalize left view box

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
      const mainBottomView = drawProjection(centeredMain, "bottom"); // Changed from top to bottom
      const mainLeftView = drawProjection(centeredMain, "left"); // Generate left view data

      // Get all viewboxes for consistent scaling calculation
      const mFrontViewBox = parseViewBox(mainFrontView.visible.toSVGViewBox());
      const mBottomViewBox = parseViewBox(mainBottomView.visible.toSVGViewBox()); // Changed variable
      const mLeftViewBox = parseViewBox(mainLeftView.visible.toSVGViewBox()); // Get left view box

      // Calculate a consistent scale factor
      const mMaxWidth = Math.max(mFrontViewBox?.width || 0, mBottomViewBox?.width || 0, mLeftViewBox?.width || 0);
      const mMaxHeight = Math.max(mFrontViewBox?.height || 0, mBottomViewBox?.height || 0, mLeftViewBox?.height || 0);

      // Create normalized viewboxes with consistent scale
      if (mFrontViewBox) mainFrontView.normalizedViewBox = createNormalizedViewBox(mFrontViewBox, mMaxWidth, mMaxHeight);
      if (mBottomViewBox) mainBottomView.normalizedViewBox = createNormalizedViewBox(mBottomViewBox, mMaxWidth, mMaxHeight); // Changed variable
      if (mLeftViewBox) mainLeftView.normalizedViewBox = createNormalizedViewBox(mLeftViewBox, mMaxWidth, mMaxHeight); // Normalize left view box

      const mainPartViews = {
        front: mainFrontView,
        bottom: mainBottomView, // Changed key and value
        left: mainLeftView // Store left view data under 'left' key
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
        const helperBottomView = drawProjection(centeredHelper, "bottom"); // Changed from top to bottom
        const helperLeftView = drawProjection(centeredHelper, "left"); // Generate left view data

        // Get all viewboxes for consistent scaling calculation
        const hFrontViewBox = parseViewBox(helperFrontView.visible.toSVGViewBox());
        const hBottomViewBox = parseViewBox(helperBottomView.visible.toSVGViewBox()); // Changed variable
        const hLeftViewBox = parseViewBox(helperLeftView.visible.toSVGViewBox()); // Get left view box

        // Calculate a consistent scale factor
        const hMaxWidth = Math.max(hFrontViewBox?.width || 0, hBottomViewBox?.width || 0, hLeftViewBox?.width || 0);
        const hMaxHeight = Math.max(hFrontViewBox?.height || 0, hBottomViewBox?.height || 0, hLeftViewBox?.height || 0);

        // Create normalized viewboxes
        if (hFrontViewBox) helperFrontView.normalizedViewBox = createNormalizedViewBox(hFrontViewBox, hMaxWidth, hMaxHeight);
        if (hBottomViewBox) helperBottomView.normalizedViewBox = createNormalizedViewBox(hBottomViewBox, hMaxWidth, hMaxHeight); // Changed variable
        if (hLeftViewBox) helperLeftView.normalizedViewBox = createNormalizedViewBox(hLeftViewBox, hMaxWidth, hMaxHeight); // Normalize left view box

        const helperPartViews = {
          front: helperFrontView,
          bottom: helperBottomView, // Changed key and value
          left: helperLeftView // Store left view data under 'left' key
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
        bottomView, // Changed value
        left: leftView // Store left view data under 'left' key
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
 * @returns {Object} Processed projections ready for SVG rendering (potentially with standardLayout)
 */
export function processProjectionsForRendering(projections) {
  const finalOutput = {};
  const layoutGap = 20; // Gap between views in the combined layout (SVG units)

  // Process standard views into a combined layout if they exist
  if (projections.standard && projections.standard.frontView) {
    console.log("[INFO] Processing standard views for combined layout.");
    // Destructure, expecting 'left' key for the side view data
    const { frontView, bottomView, left: leftViewData } = projections.standard;
    const allPaths = [];

    // --- 1. Get Data & ViewBoxes ---
    const frontData = {
      view: frontView,
      name: 'front',
      viewBox: parseViewBox(frontView.normalizedViewBox || frontView.visible.toSVGViewBox(5)),
      visiblePaths: frontView.visible.toSVGPaths(),
      hiddenPaths: frontView.hidden.toSVGPaths(),
    };
    const bottomData = bottomView ? {
      view: bottomView,
      name: 'bottom',
      viewBox: parseViewBox(bottomView.normalizedViewBox || bottomView.visible.toSVGViewBox(5)),
      visiblePaths: bottomView.visible.toSVGPaths(),
      hiddenPaths: bottomView.hidden.toSVGPaths(),
    } : null;
    // Use the left view data but name it sideViewData for clarity in layout
    const sideViewData = leftViewData ? {
      view: leftViewData,
      name: 'left', // Keep track that the data is from the left view
      viewBox: parseViewBox(leftViewData.normalizedViewBox || leftViewData.visible.toSVGViewBox(5)),
      visiblePaths: leftViewData.visible.toSVGPaths(),
      hiddenPaths: leftViewData.hidden.toSVGPaths(),
    } : null;

    if (!frontData.viewBox) {
        console.error("Front view data is missing or invalid. Cannot create standard layout.");
        // Fallback or decide how to handle this error - perhaps return empty?
        return { parts: processPartProjections(projections.parts) }; // Process parts only
    }

    // --- 2. Calculate Layout & Combined ViewBox ---
    // Initialize with front view dimensions
    let minX = frontData.viewBox.x;
    let minY = frontData.viewBox.y;
    let maxX = frontData.viewBox.x + frontData.viewBox.width;
    let maxY = frontData.viewBox.y + frontData.viewBox.height;

    let bottomOffset = { x: 0, y: 0 };
    let sideViewOffset = { x: 0, y: 0 }; // Offset for the side view (data from left, position on right)

    // Position Bottom View below Front View
    if (bottomData && bottomData.viewBox) {
      bottomOffset.x = frontData.viewBox.x + (frontData.viewBox.width - bottomData.viewBox.width) / 2;
      bottomOffset.y = frontData.viewBox.y + frontData.viewBox.height + layoutGap;
      // Update bounds
      minX = Math.min(minX, bottomOffset.x);
      // minY should be frontData.viewBox.y
      maxX = Math.max(maxX, bottomOffset.x + bottomData.viewBox.width);
      maxY = Math.max(maxY, bottomOffset.y + bottomData.viewBox.height);
    } else {
        console.log("[INFO] No valid Bottom view data for layout.");
    }

    // Position Side View (using left data) to the right of Front View
    if (sideViewData && sideViewData.viewBox) {
      sideViewOffset.x = frontData.viewBox.x + frontData.viewBox.width + layoutGap; // Position to the right
      sideViewOffset.y = frontData.viewBox.y + (frontData.viewBox.height - sideViewData.viewBox.height) / 2; // Align vertically center with front
      // Update bounds
      minX = Math.min(minX, sideViewOffset.x); // Should be frontData.viewBox.x
      minY = Math.min(minY, sideViewOffset.y);
      maxX = Math.max(maxX, sideViewOffset.x + sideViewData.viewBox.width);
      maxY = Math.max(maxY, sideViewOffset.y + sideViewData.viewBox.height);
    } else {
        console.log("[INFO] No valid Side view (left) data for layout.");
    }

    // Calculate final combined viewBox dimensions
    const totalWidth = maxX - minX;
    const totalHeight = maxY - minY;
    const combinedLayoutViewBox = `${minX} ${minY} ${totalWidth} ${totalHeight}`;

    console.log(`[INFO] Calculated Combined Layout ViewBox: ${combinedLayoutViewBox}`);
    console.log(`[INFO] Front Origin: (${frontData.viewBox.x}, ${frontData.viewBox.y})`);
    if (bottomData) console.log(`[INFO] Bottom Offset for Transform: (${bottomOffset.x - bottomData.viewBox.x}, ${bottomOffset.y - bottomData.viewBox.y})`);
    if (sideViewData) console.log(`[INFO] Side View (Left Data) Offset for Transform (Right Position): (${sideViewOffset.x - sideViewData.viewBox.x}, ${sideViewOffset.y - sideViewData.viewBox.y})`);


    // --- 3. Normalize & Transform Paths ---
    const processAndTransform = (viewData, tx, ty, viewType) => {
      if (!viewData) return;
      const prefix = `standard_${viewType}`;
      const normalizedVisible = normalizePaths(viewData.visiblePaths, `${prefix}_visible`, tx, ty);
      const normalizedHidden = normalizePaths(viewData.hiddenPaths, `${prefix}_hidden`, tx, ty);
      normalizedVisible.forEach(p => p.originalView = viewType);
      normalizedHidden.forEach(p => p.originalView = viewType);
      allPaths.push(...normalizedVisible, ...normalizedHidden);
    };

    // Process Front view (no transformation needed relative to its origin)
    processAndTransform(frontData, 0, 0, 'front');

    // Process Bottom view (translate paths)
    if (bottomData && bottomData.viewBox) { // Changed topData to bottomData
      const bottomTx = bottomOffset.x - bottomData.viewBox.x; // Changed topTx/topOffset/topData
      const bottomTy = bottomOffset.y - bottomData.viewBox.y; // Changed topTy/topOffset/topData
      processAndTransform(bottomData, bottomTx, bottomTy, 'bottom');
    }

    // Process Side view (using left data, placed on right)
    if (sideViewData && sideViewData.viewBox) {
      const sideTx = sideViewOffset.x - sideViewData.viewBox.x;
      const sideTy = sideViewOffset.y - sideViewData.viewBox.y;
      // Pass 'left' as viewType because the *data* is from the left view
      processAndTransform(sideViewData, sideTx, sideTy, 'left');
    }

    // Add the combined layout to the final output
    finalOutput.standardLayout = {
      combinedViewBox: combinedLayoutViewBox,
      paths: allPaths,
    };
    console.log(`[INFO] Created standardLayout with ${allPaths.length} total paths.`);

  } else {
    console.log("[INFO] No standard projections found or frontView missing, skipping combined layout.");
  }

  // Process part views if available (unchanged logic, extracted to helper)
  finalOutput.parts = processPartProjections(projections.parts);

  // Pass component data if available
  if (projections.componentData) {
    finalOutput.componentData = projections.componentData;
  }


  return finalOutput;
}


/**
 * Helper function to process part projections (extracted from original logic)
 * @param {Array} partsArray - Array of part projection data from createOrthographicProjections
 * @returns {Array} Processed part projections ready for rendering
 */
function processPartProjections(partsArray = []) {
   const processedParts = [];
   for (const part of partsArray) {
    // Removed redundant outer try block
      try {
        const views = {};

        for (const [viewName, view] of Object.entries(part.views)) {
          // Skip if view is null or undefined (might happen if a projection failed)
          if (!view) {
              console.warn(`[WARN] Skipping null/undefined view '${viewName}' for part '${part.name}'`);
              continue;
          }
          const viewVisiblePaths = view.visible.toSVGPaths();
          const viewHiddenPaths = view.hidden.toSVGPaths();

          // Add component and view name to ID prefix for better organization
          const idPrefix = `${part.name.replace(/\s+/g, '_')}_${viewName}`;

          // Normalize paths with unique IDs (no transformation needed for parts)
          const normalizedVisiblePaths = normalizePaths(viewVisiblePaths, `${idPrefix}_visible`, 0, 0);
          const normalizedHiddenPaths = normalizePaths(viewHiddenPaths, `${idPrefix}_hidden`, 0, 0);

          // Use the normalized viewbox if available for consistent scaling
          const visibleViewBox = view.normalizedViewBox || view.visible.toSVGViewBox(5);
          const hiddenViewBox = view.normalizedViewBox || view.hidden.toSVGViewBox(5);

          // Use normalized viewbox for combined view if available
          const combinedViewBox = view.normalizedViewBox || combineViewBoxes(visibleViewBox, hiddenViewBox);

          console.log(`[INFO] Processed Part ${part.name} ${viewName} viewBox:`, combinedViewBox);

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
        console.error(`[ERROR] Error processing part ${part.name}:`, err);
      }
    // Removed redundant closing brace and adjusted function closing
   }
   return processedParts;
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
 * Normalize paths for rendering, merge collinear lines, add unique IDs, and apply transformations.
 * @param {Array} paths - Array of path strings or arrays from replicad.
 * @param {String} prefix - ID prefix for the paths.
 * @param {number} tx - Translation offset X.
 * @param {number} ty - Translation offset Y.
 * @returns {Array} Normalized paths with IDs, geometry, and transformed data.
 */
function normalizePaths(paths, prefix = 'path', tx = 0, ty = 0) {
  if (!Array.isArray(paths)) {
      console.warn("[WARN] normalizePaths received non-array input:", paths);
      return [];
  }

  const finalPaths = [];
  let pathIndex = 0; // Counter for original paths from replicad

  for (const originalPath of paths) { // Use more descriptive variable name
    // Extract path data string robustly
    let pathDataString;
    if (typeof originalPath === 'string') {
      pathDataString = originalPath;
    } else if (Array.isArray(originalPath) && originalPath.length > 0 && typeof originalPath[0] === 'string') {
      pathDataString = originalPath[0]; // Assume first element if array
    } else if (originalPath && typeof originalPath === 'object' && typeof originalPath.d === 'string') {
      pathDataString = originalPath.d; // Handle object with 'd' property
    } else {
      console.warn(`[WARN] Skipping path due to unexpected format:`, originalPath);
      continue; // Skip this path if format is unknown
    }

    // Skip empty paths
    if (!pathDataString || !pathDataString.trim()) continue;

    // --- Apply Transformation ---
    let transformedPathDataString = pathDataString; // Default to original if no transform needed or fails
    if (tx !== 0 || ty !== 0) {
      try {
        const parsed = parsePathData(pathDataString);
        if (parsed.length > 0) {
            transformPathData(parsed, tx, ty);
            transformedPathDataString = serializePathData(parsed);
        } else {
             console.warn(`[WARN] Could not parse path data for transformation: ${pathDataString.substring(0, 50)}...`);
        }
      } catch (transformError) {
        console.error(`[ERROR] Failed to transform path data: ${pathDataString.substring(0, 50)}...`, transformError);
        // Keep original path data on error
      }
    }
    // --- End Transformation ---


    // Check for circles first (using the potentially transformed path data)
    // Note: Transformation might slightly distort perfect circles, adjust detectCircle if needed
    const circleInfo = detectCircle(transformedPathDataString);
    if (circleInfo) {
      const id = `${prefix}_${pathIndex}_circle`;
      finalPaths.push({
        id: id,
        groupId: id, // Use unique ID as group ID
        data: transformedPathDataString, // Use transformed data
        type: 'circle',
        geometry: {
          type: 'circle',
          // Use calculated center/radius from detectCircle (which used transformed data)
          center: circleInfo.center,
          radius: circleInfo.radius,
          diameter: circleInfo.radius * 2,
        },
        // originalView added by caller if needed
      });
      pathIndex++;
      continue;
    }

    // Decompose the transformed path into segments for merging and geometry extraction
    const initialSegments = decomposePathToSegments(transformedPathDataString);
    const mergedSegments = [];

    if (initialSegments.length > 0) {
      let currentMergedSegment = initialSegments[0];

      for (let j = 1; j < initialSegments.length; j++) {
        const nextSegment = initialSegments[j];

        // Check if both are lines and can be merged
        if (currentMergedSegment && nextSegment &&
            currentMergedSegment.type === 'line' && nextSegment.type === 'line' &&
            currentMergedSegment.endpoints && nextSegment.endpoints &&
            (arePointsClose(currentMergedSegment.endpoints[1], nextSegment.endpoints[0]) || arePointsClose(currentMergedSegment.endpoints[0], nextSegment.endpoints[1]) || arePointsClose(currentMergedSegment.endpoints[0], nextSegment.endpoints[0]) || arePointsClose(currentMergedSegment.endpoints[1], nextSegment.endpoints[1])) &&
            areCollinear(currentMergedSegment.endpoints[0], currentMergedSegment.endpoints[1], nextSegment.endpoints[0]) &&
            areCollinear(currentMergedSegment.endpoints[0], currentMergedSegment.endpoints[1], nextSegment.endpoints[1]))
        {
          currentMergedSegment = mergeLineSegments(currentMergedSegment, nextSegment);
        } else {
          if (currentMergedSegment) {
             mergedSegments.push(currentMergedSegment);
          }
          currentMergedSegment = nextSegment;
        }
      }
      if (currentMergedSegment) {
        mergedSegments.push(currentMergedSegment);
      }

      // Assign final IDs and structure to the merged/processed segments
      mergedSegments.forEach((segment, j) => {
        if (segment && segment.path) {
            const finalId = `${prefix}_${pathIndex}_${j}`;
            finalPaths.push({
              id: finalId,
              groupId: finalId,
              data: segment.path, // This path data comes from the merged segment (already transformed)
              type: segment.type,
              geometry: { // Geometry extracted from the transformed segment
                type: segment.type,
                length: segment.length,
                endpoints: segment.endpoints,
                center: segment.type === 'circle' ? segment.center : undefined, // Should be handled by detectCircle now
                radius: segment.type === 'circle' ? segment.radius : undefined,
                diameter: segment.type === 'circle' ? segment.radius * 2 : undefined,
              },
              // originalView added by caller if needed
            });
        } else {
            console.warn("[WARN] Skipping invalid segment during final ID assignment:", segment);
        }
      });
    } else if (!circleInfo) { // Only add fallback if it wasn't a circle and couldn't be decomposed
      // Fallback for paths we couldn't decompose (and wasn't a circle)
      const id = `${prefix}_${pathIndex}_unknown`;
      finalPaths.push({
        id: id,
        groupId: id,
        data: transformedPathDataString, // Use transformed data
        type: 'unknown',
        geometry: { type: 'unknown' },
        // originalView added by caller if needed
      });
       console.warn(`[WARN] Path could not be decomposed or identified as circle: ${transformedPathDataString.substring(0,50)}...`);
    }

    pathIndex++; // Increment index for the next original path from replicad
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
              const segment = createLineSegment(currentX, currentY, x, y);
              if (segment) segments.push(segment); // Push only if valid
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
              const segment = createLineSegment(currentX, currentY, x, y);
              if (segment) segments.push(segment); // Push only if valid
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
            const segment = createLineSegment(currentX, currentY, x, y);
            if (segment) segments.push(segment); // Push only if valid
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
            const segment = createLineSegment(currentX, currentY, x, y);
            if (segment) segments.push(segment); // Push only if valid
            currentX = x;
            currentY = y;
          }
        }
        break;

      case 'H': // Horizontal line absolute
        for (let i = 0; i < params.length; i++) {
          const x = params[i];
          const segment = createLineSegment(currentX, currentY, x, currentY);
          if (segment) segments.push(segment); // Push only if valid
          currentX = x;
        }
        break;

      case 'h': // Horizontal line relative
        for (let i = 0; i < params.length; i++) {
          const x = currentX + params[i];
          const segment = createLineSegment(currentX, currentY, x, currentY);
          if (segment) segments.push(segment); // Push only if valid
          currentX = x;
        }
        break;

      case 'V': // Vertical line absolute
        for (let i = 0; i < params.length; i++) {
          const y = params[i];
          const segment = createLineSegment(currentX, currentY, currentX, y);
          if (segment) segments.push(segment); // Push only if valid
          currentY = y;
        }
        break;

      case 'v': // Vertical line relative
        for (let i = 0; i < params.length; i++) {
          const y = currentY + params[i];
          const segment = createLineSegment(currentX, currentY, currentX, y);
          if (segment) segments.push(segment); // Push only if valid
          currentY = y;
        }
        break;

      case 'Z': // Close path
      case 'z':
        if (Math.abs(currentX - startX) > TOLERANCE || Math.abs(currentY - startY) > TOLERANCE) {
           const segment = createLineSegment(currentX, currentY, startX, startY);
           if (segment) segments.push(segment); // Push only if valid
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

// Removed duplicated functions: combineViewBoxes, parseViewBox, arePointsClose, areCollinear
