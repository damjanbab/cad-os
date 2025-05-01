// Dedicated worker for technical drawing generation
import opencascade from "replicad-opencascadejs/src/replicad_single.js";
import opencascadeWasm from "replicad-opencascadejs/src/replicad_single.wasm?url";
import { setOC, drawProjection } from "replicad"; // Import drawProjection here
import { expose } from "comlink";

// Import model creation and utilities needed for projections
import { modelRegistry, createModelWithValidation } from "./models";
import { exportableModel } from './helperUtils.js';
import { parseViewBox, combineViewBoxes } from './utils/svgUtils.js'; // Assuming these are needed by helpers
import { TOLERANCE, arePointsClose, areCollinear } from './utils/geometryUtils.js'; // Assuming these are needed by helpers
import { parsePathData, transformPathData, serializePathData } from './utils/svgPathUtils.js'; // Import SVG path helpers

// --- OpenCascade Initialization (Copied from original worker) ---
let loaded = false;
const init = async () => {
  console.log("[TECH_DRAW_WORKER_INIT] Starting initialization...");
  if (loaded) {
    console.log("[TECH_DRAW_WORKER_INIT] Already loaded.");
    return Promise.resolve(true);
  }
  try {
    console.log("[TECH_DRAW_WORKER_INIT] Loading OpenCascade...");
    const OC = await opencascade({ locateFile: () => opencascadeWasm });
    console.log("[TECH_DRAW_WORKER_INIT] OpenCascade loaded.");
    loaded = true;
    setOC(OC);
    console.log("[TECH_DRAW_WORKER_INIT] OpenCascade set successfully.");
    return true;
  } catch (initError) {
    console.error("[TECH_DRAW_WORKER_INIT_ERROR] Failed to initialize OpenCascade:", initError);
    throw initError; // Propagate error
  }
};
const started = init();

// --- Projection Generation Logic (Moved from technicalDrawingProcessor.js) ---
// Includes: createOrthographicProjections, processProjectionsForRendering, createNormalizedViewBox,
//           processPartProjections, mergeLineSegments, normalizePaths, detectCircle,
//           decomposePathToSegments, createLineSegment, estimateCurveLength,
//           getEndpointForCommand, getEndpointForCurve

function createOrthographicProjections(model) {
  const mainModel = exportableModel(model);
  if (model && model.technicalDrawingModels) {
    const partProjections = [];
    const centeredModels = [];
    Object.entries(model.technicalDrawingModels).forEach(([key, componentModel]) => {
      try {
        const modelToCenter = exportableModel(componentModel);
        const center = modelToCenter.boundingBox.center;
        const centeredModel = modelToCenter.translate([-center[0], -center[1], -center[2]]);
        centeredModels.push(centeredModel);
        const componentData = model.componentData.find(comp => comp.id === key || comp.name.toLowerCase().includes(key.toLowerCase()));
        const frontView = drawProjection(centeredModel, "front");
        const bottomView = drawProjection(centeredModel, "bottom");
        const leftView = drawProjection(centeredModel, "left");
        const frontViewBox = parseViewBox(frontView.visible.toSVGViewBox());
        const bottomViewBox = parseViewBox(bottomView.visible.toSVGViewBox());
        const leftViewBox = parseViewBox(leftView.visible.toSVGViewBox());
        const maxWidth = Math.max(frontViewBox?.width || 0, bottomViewBox?.width || 0, leftViewBox?.width || 0);
        const maxHeight = Math.max(frontViewBox?.height || 0, bottomViewBox?.height || 0, leftViewBox?.height || 0);
        if (frontViewBox) frontView.normalizedViewBox = createNormalizedViewBox(frontViewBox, maxWidth, maxHeight);
        if (bottomViewBox) bottomView.normalizedViewBox = createNormalizedViewBox(bottomViewBox, maxWidth, maxHeight);
        if (leftViewBox) leftView.normalizedViewBox = createNormalizedViewBox(leftViewBox, maxWidth, maxHeight);
        partProjections.push({ name: componentData ? componentData.name : key, views: { front: frontView, bottom: bottomView, left: leftView } });
      } catch (err) { console.error(`Error processing model ${key}:`, err); }
    });
    return { parts: partProjections };
  }
  const centeredModels = [];
  try {
    const mainToCenter = exportableModel(mainModel);
    const mainCenter = mainToCenter.boundingBox.center;
    const centeredMainModel = mainToCenter.translate([-mainCenter[0], -mainCenter[1], -mainCenter[2]]);
    centeredModels.push(centeredMainModel);
    const frontView = drawProjection(centeredMainModel, "front");
    const bottomView = drawProjection(centeredMainModel, "bottom");
    const leftView = drawProjection(centeredMainModel, "left");
    const frontViewBox = parseViewBox(frontView.visible.toSVGViewBox());
    const bottomViewBox = parseViewBox(bottomView.visible.toSVGViewBox());
    const leftViewBox = parseViewBox(leftView.visible.toSVGViewBox());
    const maxWidth = Math.max(frontViewBox?.width || 0, bottomViewBox?.width || 0, leftViewBox?.width || 0);
    const maxHeight = Math.max(frontViewBox?.height || 0, bottomViewBox?.height || 0, leftViewBox?.height || 0);
    if (frontViewBox) frontView.normalizedViewBox = createNormalizedViewBox(frontViewBox, maxWidth, maxHeight);
    if (bottomViewBox) bottomView.normalizedViewBox = createNormalizedViewBox(bottomViewBox, maxWidth, maxHeight);
    if (leftViewBox) leftView.normalizedViewBox = createNormalizedViewBox(leftViewBox, maxWidth, maxHeight);
    let partProjections = [];
    if (model && model.main && Array.isArray(model.helperSpaces)) {
      const mainComp = model.main;
      const mainCompCenter = mainComp.boundingBox.center;
      const centeredMain = mainComp.translate([-mainCompCenter[0], -mainCompCenter[1], -mainCompCenter[2]]);
      centeredModels.push(centeredMain);
      const mainFrontView = drawProjection(centeredMain, "front");
      const mainBottomView = drawProjection(centeredMain, "bottom");
      const mainLeftView = drawProjection(centeredMain, "left");
      const mFrontViewBox = parseViewBox(mainFrontView.visible.toSVGViewBox());
      const mBottomViewBox = parseViewBox(mainBottomView.visible.toSVGViewBox());
      const mLeftViewBox = parseViewBox(mainLeftView.visible.toSVGViewBox());
      const mMaxWidth = Math.max(mFrontViewBox?.width || 0, mBottomViewBox?.width || 0, mLeftViewBox?.width || 0);
      const mMaxHeight = Math.max(mFrontViewBox?.height || 0, mBottomViewBox?.height || 0, mLeftViewBox?.height || 0);
      if (mFrontViewBox) mainFrontView.normalizedViewBox = createNormalizedViewBox(mFrontViewBox, mMaxWidth, mMaxHeight);
      if (mBottomViewBox) mainBottomView.normalizedViewBox = createNormalizedViewBox(mBottomViewBox, mMaxWidth, mMaxHeight);
      if (mLeftViewBox) mainLeftView.normalizedViewBox = createNormalizedViewBox(mLeftViewBox, mMaxWidth, mMaxHeight);
      partProjections = [{ name: "Main Component", views: { front: mainFrontView, bottom: mainBottomView, left: mainLeftView } }];
      model.helperSpaces.forEach((helperSpace, index) => {
        const helperCenter = helperSpace.boundingBox.center;
        const centeredHelper = helperSpace.translate([-helperCenter[0], -helperCenter[1], -helperCenter[2]]);
        centeredModels.push(centeredHelper);
        const helperFrontView = drawProjection(centeredHelper, "front");
        const helperBottomView = drawProjection(centeredHelper, "bottom");
        const helperLeftView = drawProjection(centeredHelper, "left");
        const hFrontViewBox = parseViewBox(helperFrontView.visible.toSVGViewBox());
        const hBottomViewBox = parseViewBox(helperBottomView.visible.toSVGViewBox());
        const hLeftViewBox = parseViewBox(helperLeftView.visible.toSVGViewBox());
        const hMaxWidth = Math.max(hFrontViewBox?.width || 0, hBottomViewBox?.width || 0, hLeftViewBox?.width || 0);
        const hMaxHeight = Math.max(hFrontViewBox?.height || 0, hBottomViewBox?.height || 0, hLeftViewBox?.height || 0);
        if (hFrontViewBox) helperFrontView.normalizedViewBox = createNormalizedViewBox(hFrontViewBox, hMaxWidth, hMaxHeight);
        if (hBottomViewBox) helperBottomView.normalizedViewBox = createNormalizedViewBox(hBottomViewBox, hMaxWidth, hMaxHeight);
        if (hLeftViewBox) helperLeftView.normalizedViewBox = createNormalizedViewBox(hLeftViewBox, hMaxWidth, hMaxHeight);
        partProjections.push({ name: `Helper Space ${index + 1}`, views: { front: helperFrontView, bottom: helperBottomView, left: helperLeftView } });
      });
    }
    return { standard: { frontView, bottomView, left: leftView }, parts: partProjections };
  } catch (err) { console.error("Error in standard projections:", err); return { standard: {}, parts: [] }; }
}
function createNormalizedViewBox(viewBox, maxWidth, maxHeight) {
  if (!viewBox || typeof viewBox.x !== 'number' || typeof viewBox.y !== 'number' || typeof viewBox.width !== 'number' || typeof viewBox.height !== 'number') { return "0 0 100 100"; }
  const centerX = viewBox.x + viewBox.width / 2;
  const centerY = viewBox.y + viewBox.height / 2;
  const baseWidth = maxWidth > 0 ? maxWidth : 100;
  const baseHeight = maxHeight > 0 ? maxHeight : 100;
  const marginFactor = 1.3;
  const paddedWidth = baseWidth * marginFactor;
  const paddedHeight = baseHeight * marginFactor;
  const newX = centerX - paddedWidth / 2;
  const newY = centerY - paddedHeight / 2;
  return `${newX} ${newY} ${paddedWidth} ${paddedHeight}`;
}
function processProjectionsForRendering(projections) {
  const finalOutput = {};
  const layoutGap = 20;
  if (projections.standard && projections.standard.frontView) {
    const { frontView, bottomView, left: leftViewData } = projections.standard;
    const allPaths = [];
    const frontData = { view: frontView, name: 'front', viewBox: parseViewBox(frontView.normalizedViewBox || frontView.visible.toSVGViewBox(5)), visiblePaths: frontView.visible.toSVGPaths(), hiddenPaths: frontView.hidden.toSVGPaths() };
    const bottomData = bottomView ? { view: bottomView, name: 'bottom', viewBox: parseViewBox(bottomView.normalizedViewBox || bottomView.visible.toSVGViewBox(5)), visiblePaths: bottomView.visible.toSVGPaths(), hiddenPaths: bottomView.hidden.toSVGPaths() } : null;
    const sideViewData = leftViewData ? { view: leftViewData, name: 'left', viewBox: parseViewBox(leftViewData.normalizedViewBox || leftViewData.visible.toSVGViewBox(5)), visiblePaths: leftViewData.visible.toSVGPaths(), hiddenPaths: leftViewData.hidden.toSVGPaths() } : null;
    if (!frontData.viewBox) { return { parts: processPartProjections(projections.parts) }; }
    let minX = frontData.viewBox.x, minY = frontData.viewBox.y, maxX = frontData.viewBox.x + frontData.viewBox.width, maxY = frontData.viewBox.y + frontData.viewBox.height;
    let bottomOffset = { x: 0, y: 0 }, sideViewOffset = { x: 0, y: 0 };
    if (bottomData && bottomData.viewBox) {
      bottomOffset.x = frontData.viewBox.x + (frontData.viewBox.width - bottomData.viewBox.width) / 2;
      bottomOffset.y = frontData.viewBox.y + frontData.viewBox.height + layoutGap;
      minX = Math.min(minX, bottomOffset.x); maxX = Math.max(maxX, bottomOffset.x + bottomData.viewBox.width); maxY = Math.max(maxY, bottomOffset.y + bottomData.viewBox.height);
    }
    if (sideViewData && sideViewData.viewBox) {
      sideViewOffset.x = frontData.viewBox.x + frontData.viewBox.width + layoutGap;
      sideViewOffset.y = frontData.viewBox.y + (frontData.viewBox.height - sideViewData.viewBox.height) / 2;
      minY = Math.min(minY, sideViewOffset.y); maxX = Math.max(maxX, sideViewOffset.x + sideViewData.viewBox.width); maxY = Math.max(maxY, sideViewOffset.y + sideViewData.viewBox.height);
    }
    const totalWidth = maxX - minX, totalHeight = maxY - minY;
    const combinedLayoutViewBox = `${minX} ${minY} ${totalWidth} ${totalHeight}`;
    const processAndTransform = (viewData, tx, ty, viewType) => {
      if (!viewData) return;
      const prefix = `standard_${viewType}`;
      const normalizedVisible = normalizePaths(viewData.visiblePaths, `${prefix}_visible`, tx, ty);
      const normalizedHidden = normalizePaths(viewData.hiddenPaths, `${prefix}_hidden`, tx, ty);
      normalizedVisible.forEach(p => p.originalView = viewType);
      normalizedHidden.forEach(p => p.originalView = viewType);
      allPaths.push(...normalizedVisible, ...normalizedHidden);
    };
    processAndTransform(frontData, 0, 0, 'front');
    if (bottomData && bottomData.viewBox) { processAndTransform(bottomData, bottomOffset.x - bottomData.viewBox.x, bottomOffset.y - bottomData.viewBox.y, 'bottom'); }
    if (sideViewData && sideViewData.viewBox) { processAndTransform(sideViewData, sideViewOffset.x - sideViewData.viewBox.x, sideViewOffset.y - sideViewData.viewBox.y, 'left'); }
    finalOutput.standardLayout = { combinedViewBox: combinedLayoutViewBox, paths: allPaths };
  }
  finalOutput.parts = processPartProjections(projections.parts);
  if (projections.componentData) { finalOutput.componentData = projections.componentData; }
  return finalOutput;
}
function processPartProjections(partsArray = []) {
   const processedParts = [];
   for (const part of partsArray) {
      try {
        const views = {};
        for (const [viewName, view] of Object.entries(part.views)) {
          if (!view) { console.warn(`[WARN] Skipping null/undefined view '${viewName}' for part '${part.name}'`); continue; }
          const viewVisiblePaths = view.visible.toSVGPaths();
          const viewHiddenPaths = view.hidden.toSVGPaths();
          const idPrefix = `${part.name.replace(/\s+/g, '_')}_${viewName}`;
          const normalizedVisiblePaths = normalizePaths(viewVisiblePaths, `${idPrefix}_visible`, 0, 0);
          const normalizedHiddenPaths = normalizePaths(viewHiddenPaths, `${idPrefix}_hidden`, 0, 0);
          const visibleViewBox = view.normalizedViewBox || view.visible.toSVGViewBox(5);
          const hiddenViewBox = view.normalizedViewBox || view.hidden.toSVGViewBox(5);
          const combinedViewBox = view.normalizedViewBox || combineViewBoxes(visibleViewBox, hiddenViewBox);
          views[viewName] = { visible: { paths: normalizedVisiblePaths, viewBox: visibleViewBox }, hidden: { paths: normalizedHiddenPaths, viewBox: hiddenViewBox }, combinedViewBox };
        }
        processedParts.push({ name: part.name, views });
      } catch (err) { console.error(`[ERROR] Error processing part ${part.name}:`, err); }
   }
   return processedParts;
}
function mergeLineSegments(seg1, seg2) {
  let startPoint, endPoint;
  if (arePointsClose(seg1.endpoints[1], seg2.endpoints[0])) { startPoint = seg1.endpoints[0]; endPoint = seg2.endpoints[1]; }
  else if (arePointsClose(seg1.endpoints[0], seg2.endpoints[1])) { startPoint = seg2.endpoints[0]; endPoint = seg1.endpoints[1]; }
  else if (arePointsClose(seg1.endpoints[0], seg2.endpoints[0])) { startPoint = seg1.endpoints[1]; endPoint = seg2.endpoints[1]; }
  else if (arePointsClose(seg1.endpoints[1], seg2.endpoints[1])) { startPoint = seg1.endpoints[0]; endPoint = seg2.endpoints[0]; }
  else { console.warn("Cannot determine merge order for segments", seg1, seg2); return seg1; }
  const newLength = (seg1.length || 0) + (seg2.length || 0);
  const newPath = `M ${startPoint[0]} ${startPoint[1]} L ${endPoint[0]} ${endPoint[1]}`;
  return { type: 'line', path: newPath, length: newLength, endpoints: [startPoint, endPoint] };
}
function normalizePaths(paths, prefix = 'path', tx = 0, ty = 0) {
  if (!Array.isArray(paths)) { console.warn("[WARN] normalizePaths received non-array input:", paths); return []; }
  const finalPaths = []; let pathIndex = 0;
  for (const originalPath of paths) {
    let pathDataString;
    if (typeof originalPath === 'string') { pathDataString = originalPath; }
    else if (Array.isArray(originalPath) && originalPath.length > 0 && typeof originalPath[0] === 'string') { pathDataString = originalPath[0]; }
    else if (originalPath && typeof originalPath === 'object' && typeof originalPath.d === 'string') { pathDataString = originalPath.d; }
    else { console.warn(`[WARN] Skipping path due to unexpected format:`, originalPath); continue; }
    if (!pathDataString || !pathDataString.trim()) continue;
    let transformedPathDataString = pathDataString;
    if (tx !== 0 || ty !== 0) {
      try {
        const parsed = parsePathData(pathDataString);
        if (parsed.length > 0) { transformPathData(parsed, tx, ty); transformedPathDataString = serializePathData(parsed); }
        else { console.warn(`[WARN] Could not parse path data for transformation: ${pathDataString.substring(0, 50)}...`); }
      } catch (transformError) { console.error(`[ERROR] Failed to transform path data: ${pathDataString.substring(0, 50)}...`, transformError); }
    }
    const circleInfo = detectCircle(transformedPathDataString);
    const pathGeometry = { type: 'unknown' }; // Default geometry

    if (circleInfo) {
      pathGeometry.type = 'circle';
      pathGeometry.center = circleInfo.center;
      pathGeometry.radius = circleInfo.radius;
      pathGeometry.diameter = circleInfo.radius * 2;
      // Add circle segment info if needed later
    }

    const initialSegments = decomposePathToSegments(transformedPathDataString);
    const mergedSegments = [];
    if (initialSegments.length > 0) {
      let currentMergedSegment = initialSegments[0];
      for (let j = 1; j < initialSegments.length; j++) {
        const nextSegment = initialSegments[j];
        if (currentMergedSegment && nextSegment && currentMergedSegment.type === 'line' && nextSegment.type === 'line' && currentMergedSegment.endpoints && nextSegment.endpoints && (arePointsClose(currentMergedSegment.endpoints[1], nextSegment.endpoints[0]) || arePointsClose(currentMergedSegment.endpoints[0], nextSegment.endpoints[1]) || arePointsClose(currentMergedSegment.endpoints[0], nextSegment.endpoints[0]) || arePointsClose(currentMergedSegment.endpoints[1], nextSegment.endpoints[1])) && areCollinear(currentMergedSegment.endpoints[0], currentMergedSegment.endpoints[1], nextSegment.endpoints[0]) && areCollinear(currentMergedSegment.endpoints[0], currentMergedSegment.endpoints[1], nextSegment.endpoints[1])) {
          currentMergedSegment = mergeLineSegments(currentMergedSegment, nextSegment);
        } else { if (currentMergedSegment) { mergedSegments.push(currentMergedSegment); } currentMergedSegment = nextSegment; }
      }
      if (currentMergedSegment) { mergedSegments.push(currentMergedSegment); }
      mergedSegments.forEach((segment, j) => {
        if (segment && segment.path) {
            const finalId = `${prefix}_${pathIndex}_${j}`;
            // Directly use the geometry object from the segment
            finalPaths.push({
              id: finalId,
              groupId: finalId, // Keep groupId for potential future use
              data: segment.path,
              type: segment.type, // Redundant? geometry.type should be sufficient
              geometry: segment.geometry // Use the geometry object directly
            });
        } else { console.warn("[WARN] Skipping invalid segment during final ID assignment:", segment); }
      });
    } else if (circleInfo) {
        // Handle the case where it's a circle but wasn't decomposed (should be handled above)
        const id = `${prefix}_${pathIndex}_circle`;
         finalPaths.push({ id: id, groupId: id, data: transformedPathDataString, type: 'circle', geometry: pathGeometry });
    }
     else {
      // Path is neither a circle nor decomposable into known segments
      const id = `${prefix}_${pathIndex}_unknown`;
      finalPaths.push({ id: id, groupId: id, data: transformedPathDataString, type: 'unknown', geometry: { type: 'unknown' } });
       console.warn(`[WARN] Path could not be decomposed or identified as circle: ${transformedPathDataString.substring(0,50)}...`);
    }
    pathIndex++;
  }
  return finalPaths;
}
function detectCircle(pathData) {
    const arcRegex = /([Aa])\s*([-\d.eE+]+)\s*,?\s*([-\d.eE+]+)\s+([-\d.eE+]+)\s+([01])\s*,?\s*([01])\s+([-\d.eE+]+)\s*,?\s*([-\d.eE+]+)/g;
    const moveRegex = /M\s*([-\d.eE+]+)\s*,?\s*([-\d.eE+]+)/i;
    const moveMatch = pathData.match(moveRegex); if (!moveMatch) return null;
    const startX = parseFloat(moveMatch[1]), startY = parseFloat(moveMatch[2]);
    const arcs = []; let match; arcRegex.lastIndex = 0;
    while ((match = arcRegex.exec(pathData)) !== null) { arcs.push({ rx: parseFloat(match[2]), ry: parseFloat(match[3]), xAxisRotation: parseFloat(match[4]), largeArcFlag: parseInt(match[5]), sweepFlag: parseInt(match[6]), endX: parseFloat(match[7]), endY: parseFloat(match[8]), isRelative: match[1] === 'a' }); }
    if (arcs.length === 0) return null;
    const firstRx = Math.abs(arcs[0].rx), firstRy = Math.abs(arcs[0].ry);
    if (firstRx < TOLERANCE || Math.abs(firstRx - firstRy) > TOLERANCE * Math.max(firstRx, firstRy)) { return null; }
    if (!arcs.every(arc => Math.abs(Math.abs(arc.rx) - firstRx) < TOLERANCE && Math.abs(Math.abs(arc.ry) - firstRy) < TOLERANCE)) { return null; }
    let currentX = startX, currentY = startY;
    const allCommands = pathData.match(/([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/ig); if (!allCommands) return null;
    for (const cmdStr of allCommands) {
        const cmd = cmdStr[0]; const params = (cmdStr.slice(1).match(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || []).map(Number);
        if (params.some(isNaN)) { console.warn(`Could not parse parameters for command: ${cmdStr}`); continue; }
        const endpoint = getEndpointForCommand(cmd, params, currentX, currentY); currentX = endpoint[0]; currentY = endpoint[1];
    }
    const isClosed = Math.abs(currentX - startX) < TOLERANCE && Math.abs(currentY - startY) < TOLERANCE;
    if (!isClosed || arcs.length < 2) { return null; }
    let firstArcData = null; currentX = startX; currentY = startY;
    for (const cmdStr of allCommands) {
        const cmd = cmdStr[0]; const params = (cmdStr.slice(1).match(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || []).map(Number); if (params.some(isNaN)) continue;
        if (cmd === 'A' || cmd === 'a') {
             if (params.length < 7) { console.warn(`Invalid arc command parameters: ${cmdStr}`); continue; }
            firstArcData = { rx: Math.abs(params[0]), ry: Math.abs(params[1]), xAxisRotationDeg: params[2], largeArcFlag: params[3], sweepFlag: params[4], endX: cmd === 'a' ? currentX + params[5] : params[5], endY: cmd === 'a' ? currentY + params[6] : params[6], startX: currentX, startY: currentY }; break;
        }
        const endpoint = getEndpointForCommand(cmd, params, currentX, currentY); currentX = endpoint[0]; currentY = endpoint[1];
    }
    if (!firstArcData) return null;
    const { rx, ry, xAxisRotationDeg, largeArcFlag, sweepFlag, endX: x2, endY: y2, startX: x1, startY: y1 } = firstArcData;
    const phi = xAxisRotationDeg * Math.PI / 180, cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
    const x1p = cosPhi * (x1 - x2) / 2 + sinPhi * (y1 - y2) / 2, y1p = -sinPhi * (x1 - x2) / 2 + cosPhi * (y1 - y2) / 2;
    const rx_sq = rx * rx, ry_sq = ry * ry, x1p_sq = x1p * x1p, y1p_sq = y1p * y1p;
    let radiiCheck = x1p_sq / rx_sq + y1p_sq / ry_sq; let correctedRx = rx, correctedRy = ry;
    if (radiiCheck > 1) { const sqrtRadiiCheck = Math.sqrt(radiiCheck); correctedRx = sqrtRadiiCheck * rx; correctedRy = sqrtRadiiCheck * ry; }
    const correctedRx_sq = correctedRx * correctedRx, correctedRy_sq = correctedRy * correctedRy;
    let sign = (largeArcFlag === sweepFlag) ? -1 : 1;
    let sq = Math.max(0, (correctedRx_sq * correctedRy_sq - correctedRx_sq * y1p_sq - correctedRy_sq * x1p_sq) / (correctedRx_sq * y1p_sq + correctedRy_sq * x1p_sq));
    let coef = sign * Math.sqrt(sq);
    const cxp = coef * (correctedRx * y1p / correctedRy), cyp = coef * -(correctedRy * x1p / correctedRx);
    const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2, cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;
    return { center: [cx, cy], radius: correctedRx };
}
function decomposePathToSegments(pathData) { // Returns segments with geometry objects
  const segments = []; let currentX = 0, currentY = 0, startX = 0, startY = 0, isFirstCommand = true;
  const commandsRegex = /([MLHVCSQTAZmlhvcsqtaz])([^MLHVCSQTAZmlhvcsqtaz]*)/g; let match;
  while ((match = commandsRegex.exec(pathData)) !== null) {
    const command = match[1]; const params = (match[2].match(/[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || []).map(Number);
    if (params.some(isNaN)) { console.warn(`Could not parse parameters for command: ${match[0]}`); continue; }
    let pairs = [];
    switch (command) {
      case 'M': if (params.length >= 2) { currentX = params[0]; currentY = params[1]; if (isFirstCommand) { isFirstCommand = false; } startX = currentX; startY = currentY; for (let i = 2; i < params.length; i += 2) { if (i + 1 < params.length) { const x = params[i], y = params[i + 1]; const segment = createLineSegment(currentX, currentY, x, y); if (segment) segments.push(segment); currentX = x; currentY = y; } } } break;
      case 'm': if (params.length >= 2) { currentX += params[0]; currentY += params[1]; if (isFirstCommand) { isFirstCommand = false; } startX = currentX; startY = currentY; for (let i = 2; i < params.length; i += 2) { if (i + 1 < params.length) { const x = currentX + params[i], y = currentY + params[i + 1]; const segment = createLineSegment(currentX, currentY, x, y); if (segment) segments.push(segment); currentX = x; currentY = y; } } } break;
      case 'L': for (let i = 0; i < params.length; i += 2) { if (i + 1 < params.length) { const x = params[i], y = params[i + 1]; const segment = createLineSegment(currentX, currentY, x, y); if (segment) segments.push(segment); currentX = x; currentY = y; } } break;
      case 'l': for (let i = 0; i < params.length; i += 2) { if (i + 1 < params.length) { const x = currentX + params[i], y = currentY + params[i + 1]; const segment = createLineSegment(currentX, currentY, x, y); if (segment) segments.push(segment); currentX = x; currentY = y; } } break;
      case 'H': for (let i = 0; i < params.length; i++) { const x = params[i]; const segment = createLineSegment(currentX, currentY, x, currentY); if (segment) segments.push(segment); currentX = x; } break;
      case 'h': for (let i = 0; i < params.length; i++) { const x = currentX + params[i]; const segment = createLineSegment(currentX, currentY, x, currentY); if (segment) segments.push(segment); currentX = x; } break;
      case 'V': for (let i = 0; i < params.length; i++) { const y = params[i]; const segment = createLineSegment(currentX, currentY, currentX, y); if (segment) segments.push(segment); currentY = y; } break;
      case 'v': for (let i = 0; i < params.length; i++) { const y = currentY + params[i]; const segment = createLineSegment(currentX, currentY, currentX, y); if (segment) segments.push(segment); currentY = y; } break;
      case 'Z': case 'z': if (Math.abs(currentX - startX) > TOLERANCE || Math.abs(currentY - startY) > TOLERANCE) { const segment = createLineSegment(currentX, currentY, startX, startY); if (segment) segments.push(segment); } currentX = startX; currentY = startY; break;
      // Curves and Arcs: Create segment object including geometry
      case 'C': case 'c': pairs = params.length / 6; for(let i=0; i<pairs; ++i) { const p = params.slice(i*6, (i+1)*6); if (p.length === 6) { const endpoint = getEndpointForCurve(command, p, currentX, currentY); segments.push({ type: 'curve', path: `M ${currentX} ${currentY} ${command} ${p.join(' ')}`, geometry: { type: 'curve', length: estimateCurveLength(command, p, currentX, currentY), endpoints: [[currentX, currentY], endpoint] } }); currentX = endpoint[0]; currentY = endpoint[1]; } } break;
      case 'S': case 's': pairs = params.length / 4; for(let i=0; i<pairs; ++i) { const p = params.slice(i*4, (i+1)*4); if (p.length === 4) { const endpoint = getEndpointForCurve(command, p, currentX, currentY); segments.push({ type: 'curve', path: `M ${currentX} ${currentY} ${command} ${p.join(' ')}`, geometry: { type: 'curve', length: estimateCurveLength(command, p, currentX, currentY), endpoints: [[currentX, currentY], endpoint] } }); currentX = endpoint[0]; currentY = endpoint[1]; } } break;
      case 'Q': case 'q': pairs = params.length / 4; for(let i=0; i<pairs; ++i) { const p = params.slice(i*4, (i+1)*4); if (p.length === 4) { const endpoint = getEndpointForCurve(command, p, currentX, currentY); segments.push({ type: 'curve', path: `M ${currentX} ${currentY} ${command} ${p.join(' ')}`, geometry: { type: 'curve', length: estimateCurveLength(command, p, currentX, currentY), endpoints: [[currentX, currentY], endpoint] } }); currentX = endpoint[0]; currentY = endpoint[1]; } } break;
      case 'T': case 't': pairs = params.length / 2; for(let i=0; i<pairs; ++i) { const p = params.slice(i*2, (i+1)*2); if (p.length === 2) { const endpoint = getEndpointForCurve(command, p, currentX, currentY); segments.push({ type: 'curve', path: `M ${currentX} ${currentY} ${command} ${p.join(' ')}`, geometry: { type: 'curve', length: estimateCurveLength(command, p, currentX, currentY), endpoints: [[currentX, currentY], endpoint] } }); currentX = endpoint[0]; currentY = endpoint[1]; } } break;
      case 'A': case 'a': pairs = params.length / 7; for(let i=0; i<pairs; ++i) { const p = params.slice(i*7, (i+1)*7); if (p.length === 7) { const endpoint = getEndpointForCurve(command, p, currentX, currentY); segments.push({ type: 'arc', path: `M ${currentX} ${currentY} ${command} ${p.join(' ')}`, geometry: { type: 'arc', length: estimateCurveLength(command, p, currentX, currentY), endpoints: [[currentX, currentY], endpoint] } }); currentX = endpoint[0]; currentY = endpoint[1]; } } break;
    }
  }
  return segments;
}
function createLineSegment(x1, y1, x2, y2) { // Returns segment with geometry object
  if (Math.abs(x1 - x2) < TOLERANCE && Math.abs(y1 - y2) < TOLERANCE) { return null; }
  const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  return {
    type: 'line',
    path: `M ${x1} ${y1} L ${x2} ${y2}`,
    geometry: { type: 'line', length: length, endpoints: [[x1, y1], [x2, y2]] }
  };
}
function estimateCurveLength(command, params, currentX, currentY) {
  const endpoint = getEndpointForCurve(command, params, currentX, currentY);
  return Math.sqrt( Math.pow(endpoint[0] - currentX, 2) + Math.pow(endpoint[1] - currentY, 2) );
}
function getEndpointForCommand(command, params, currentX, currentY) {
  if ('CSQTAcsgta'.includes(command)) { return getEndpointForCurve(command, params, currentX, currentY); }
  let x = currentX, y = currentY; const isRelative = command === command.toLowerCase(); const numParams = params.length;
  switch (command.toUpperCase()) {
    case 'M': case 'L': if (numParams >= 2) { x = params[numParams - 2]; y = params[numParams - 1]; if (isRelative) { x += currentX; y += currentY; } } break;
    case 'H': if (numParams >= 1) { x = params[numParams - 1]; if (isRelative) { x += currentX; } y = currentY; } break;
    case 'V': if (numParams >= 1) { x = currentX; y = params[numParams - 1]; if (isRelative) { y += currentY; } } break;
    case 'Z': x = currentX; y = currentY; break;
  }
  return [x, y];
}
function getEndpointForCurve(command, params, currentX, currentY) {
  const isRelative = command === command.toLowerCase(); let x = currentX, y = currentY; const numParams = params.length;
  switch (command.toUpperCase()) {
    case 'C': if (numParams >= 6) { x = params[numParams - 2]; y = params[numParams - 1]; if (isRelative) { x += currentX; y += currentY; } } break;
    case 'S': case 'Q': if (numParams >= 4) { x = params[numParams - 2]; y = params[numParams - 1]; if (isRelative) { x += currentX; y += currentY; } } break;
    case 'T': if (numParams >= 2) { x = params[numParams - 2]; y = params[numParams - 1]; if (isRelative) { x += currentX; y += currentY; } } break;
    case 'A': if (numParams >= 7) { x = params[numParams - 2]; y = params[numParams - 1]; if (isRelative) { x += currentX; y += currentY; } } break;
  }
  return [x, y];
}

// --- Helper to Calculate Bounding Box from Normalized Paths ---
function calculatePathsBoundingBox(paths) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasGeometry = false;

  const updateBounds = (x, y) => {
    if (typeof x === 'number' && typeof y === 'number' && !isNaN(x) && !isNaN(y)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
        hasGeometry = true;
    } else {
        // console.warn("Skipping invalid coordinate in bounding box calculation:", x, y);
    }
  };

  for (const path of paths) {
    if (!path || !path.geometry) continue;

    const geom = path.geometry;
    switch (geom.type) {
      case 'line':
        if (geom.endpoints && geom.endpoints.length === 2) {
          updateBounds(geom.endpoints[0][0], geom.endpoints[0][1]);
          updateBounds(geom.endpoints[1][0], geom.endpoints[1][1]);
        }
        break;
      case 'circle':
        if (geom.center && typeof geom.radius === 'number') {
          updateBounds(geom.center[0] - geom.radius, geom.center[1] - geom.radius);
          updateBounds(geom.center[0] + geom.radius, geom.center[1] + geom.radius);
        }
        break;
      case 'arc': // Approximate using endpoints
      case 'curve': // Approximate using endpoints
        if (geom.endpoints && geom.endpoints.length === 2) {
          updateBounds(geom.endpoints[0][0], geom.endpoints[0][1]);
          updateBounds(geom.endpoints[1][0], geom.endpoints[1][1]);
        }
        break;
      // case 'unknown':
      //   // Parsing path data 'd' is complex, skip for now or use viewBox as fallback later
      //   break;
    }
  }

  if (!hasGeometry) {
    console.warn("[TECH_DRAW_WORKER] Could not determine bounding box from paths geometry.");
    return null; // Indicate failure
  }

  // Add a small tolerance/padding if needed, or return exact bounds
  const padding = 0; // Or a small value like TOLERANCE
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}
// --- End Helper ---


// --- Main Exposed Function ---
// This function now orchestrates the process within this dedicated worker
async function generateProjections(modelName, params) {
  console.log(`[TECH_DRAW_WORKER] Generating projections for: ${modelName}`);
  console.time(`[PERF_TD] Total ${modelName} projections creation`);

  // Ensure OpenCascade is ready
  await started;
  console.log(`[TECH_DRAW_WORKER] OpenCascade ready for ${modelName}`);

  // 1. Create the base 3D model
  console.time(`[PERF_TD] Base model creation ${modelName}`);
  const modelResult = createModelWithValidation(modelName, params);
  console.timeEnd(`[PERF_TD] Base model creation ${modelName}`);

  // Handle validation/creation errors
  if (!modelResult || modelResult.error) {
    console.error(`[TECH_DRAW_WORKER] Base model creation failed for ${modelName}:`, modelResult?.validationErrors);
    console.timeEnd(`[PERF_TD] Total ${modelName} projections creation`);
    return { error: true, validationErrors: modelResult?.validationErrors || ["Model creation failed."] };
  }
  console.log(`[TECH_DRAW_WORKER] Base model created for ${modelName}.`);

  // 2. Create Orthographic Projections
  let rawProjections;
  try {
    console.time(`[PERF_TD] createOrthographicProjections ${modelName}`);
    rawProjections = createOrthographicProjections(modelResult); // Pass the validated model result
    console.timeEnd(`[PERF_TD] createOrthographicProjections ${modelName}`);
    console.log(`[TECH_DRAW_WORKER] Raw projections generated for ${modelName}.`);
  } catch (orthoError) {
      console.error(`[TECH_DRAW_WORKER] Error during createOrthographicProjections for ${modelName}:`, orthoError);
      console.timeEnd(`[PERF_TD] Total ${modelName} projections creation`);
      return { error: true, message: `Orthographic projection failed: ${orthoError.message}` };
  }

  // 3. Process Projections for Rendering
  let processedProjections;
   try {
    console.time(`[PERF_TD] processProjectionsForRendering ${modelName}`);
    processedProjections = processProjectionsForRendering(rawProjections);
    console.timeEnd(`[PERF_TD] processProjectionsForRendering ${modelName}`);
    console.log(`[TECH_DRAW_WORKER] Projections processed for rendering for ${modelName}.`);
  } catch (processError) {
      console.error(`[TECH_DRAW_WORKER] Error during processProjectionsForRendering for ${modelName}:`, processError);
      console.timeEnd(`[PERF_TD] Total ${modelName} projections creation`);
      return { error: true, message: `Projection processing failed: ${processError.message}` };
  }

  // 4. Add Component Data if available
  if (modelResult && modelResult.componentData) {
      const serializedComponentData = modelResult.componentData.map(component => ({
        id: component.id, name: component.name, quantity: component.quantity,
        dimensions: component.dimensions, material: component.material
      }));
      processedProjections.componentData = serializedComponentData;
      console.log(`[TECH_DRAW_WORKER] Added component data for ${modelName}.`);
  }

  console.timeEnd(`[PERF_TD] Total ${modelName} projections creation`);
  console.log(`[TECH_DRAW_WORKER] Successfully generated projections for ${modelName}.`);
  return processedProjections; // Return the final processed data
}


// --- New Function for Single Projection ---
const generateSingleProjection = async (modelName, params, viewType, includeHiddenLines, partName = null) => { // Add partName parameter
  console.log(`[TECH_DRAW_WORKER] Generating single projection: Model='${modelName}', Part='${partName || 'Whole'}', View='${viewType}', Hidden=${includeHiddenLines}`);
  console.time(`[PERF_TD_SINGLE] Total ${modelName} ${partName || 'Whole'} ${viewType} projection`);

  // Ensure OpenCascade is ready
  await started; // Make sure OC initialization promise has resolved

  // 1. Create the base 3D model using the existing validated function
  console.time(`[PERF_TD_SINGLE] Base model creation ${modelName}`);
  const modelResult = createModelWithValidation(modelName, params); // Use the helper
  console.timeEnd(`[PERF_TD_SINGLE] Base model creation ${modelName}`);

  if (!modelResult || modelResult.error) {
    console.error(`[TECH_DRAW_WORKER] Base model creation failed for single projection:`, modelResult?.validationErrors);
    console.timeEnd(`[PERF_TD_SINGLE] Total ${modelName} ${partName || 'Whole'} ${viewType} projection`);
    return { error: true, validationErrors: modelResult?.validationErrors || ["Model creation failed."] };
  }

  // 2. Select the model to project (whole model or specific part)
  let modelToProject;
  if (partName) {
    if (!modelResult.technicalDrawingModels || !modelResult.technicalDrawingModels[partName]) {
      const errorMsg = `Part '${partName}' not found in technicalDrawingModels for model '${modelName}'.`;
      console.error(`[TECH_DRAW_WORKER] ${errorMsg}`);
      console.timeEnd(`[PERF_TD_SINGLE] Total ${modelName} ${partName} ${viewType} projection`);
      return { error: true, message: errorMsg };
    }
    modelToProject = exportableModel(modelResult.technicalDrawingModels[partName]);
    console.log(`[TECH_DRAW_WORKER] Projecting specific part: ${partName}`);
  } else {
    modelToProject = exportableModel(modelResult); // Use the main model
    console.log(`[TECH_DRAW_WORKER] Projecting whole model.`);
  }


  // 3. Generate the specific projection using the existing drawProjection helper
  let projection;
  try {
    console.time(`[PERF_TD_SINGLE] drawProjection ${modelName} ${partName || 'Whole'} ${viewType}`);
    projection = drawProjection(modelToProject, viewType.toLowerCase()); // Call the imported helper
    console.timeEnd(`[PERF_TD_SINGLE] drawProjection ${modelName} ${partName || 'Whole'} ${viewType}`);
  } catch (drawError) {
    console.error(`[TECH_DRAW_WORKER] Error during drawProjection for ${modelName} ${partName || 'Whole'} ${viewType}:`, drawError);
    console.timeEnd(`[PERF_TD_SINGLE] Total ${modelName} ${partName || 'Whole'} ${viewType} projection`);
    return { error: true, message: `Drawing projection failed: ${drawError.message}` };
  }

  // 4. Normalize paths using the existing helper function
  const visiblePathsRaw = projection.visible.toSVGPaths();
  const hiddenPathsRaw = includeHiddenLines ? projection.hidden.toSVGPaths() : [];
  // Use partName in prefix if available for better uniqueness
  const idPrefix = `single_${partName ? partName.replace(/\s+/g, '_') + '_' : ''}${viewType}`;

  console.time(`[PERF_TD_SINGLE] normalizePaths ${modelName} ${partName || 'Whole'} ${viewType}`);
  const normalizedVisible = normalizePaths(visiblePathsRaw, `${idPrefix}_visible`, 0, 0); // Use helper
  const normalizedHidden = includeHiddenLines ? normalizePaths(hiddenPathsRaw, `${idPrefix}_hidden`, 0, 0) : []; // Use helper
  console.timeEnd(`[PERF_TD_SINGLE] normalizePaths ${modelName} ${partName || 'Whole'} ${viewType}`);

  const combinedPaths = [...normalizedVisible, ...normalizedHidden];

  // 5. Determine combined viewBox using the projection result
  // 5. Determine combined viewBox string (as before)
  const viewBoxString = projection.visible.toSVGViewBox(5); // Get viewBox string with margin

  // 6. Calculate the actual geometry bounding box from the combined paths
  const geometryBoundingBox = calculatePathsBoundingBox(combinedPaths);
  if (!geometryBoundingBox) {
      console.warn(`[TECH_DRAW_WORKER] Failed to calculate geometryBoundingBox for ${modelName} ${partName || 'Whole'} ${viewType}. PDF measurements might be incorrect.`);
      // Optionally, could try parsing viewBoxString as a fallback, but it includes margins.
  } else {
       console.log(`[TECH_DRAW_WORKER] Calculated geometryBoundingBox:`, geometryBoundingBox);
  }


  console.timeEnd(`[PERF_TD_SINGLE] Total ${modelName} ${partName || 'Whole'} ${viewType} projection`);
  console.log(`[TECH_DRAW_WORKER] Successfully generated single projection for ${modelName} ${partName || 'Whole'} ${viewType}.`);

  return {
    error: false,
    paths: combinedPaths,
    viewBox: viewBoxString, // The string representation including margin
    geometryBoundingBox: geometryBoundingBox // The calculated tight bounding box
  };
};
// --- End New Function ---


// Expose the main function and the new single projection function
expose({ generateProjections, generateSingleProjection });
