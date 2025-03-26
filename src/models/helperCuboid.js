// models/helperCuboid.js
import { createCuboid } from './cuboid.js';
import { modelWithHelpers } from '../helperUtils.js';
import { constraintModelsByPoints } from '../helpers/mate.js';
import { FACES, EDGES } from '../helpers/boundingBox.js';
import { createDrill } from './drill.js';
import { mirror } from '../helpers/shapes.js';
import { createLProfile } from './lProfile.js';
import { createCylinder } from './cylinder.js';
import { compoundShapes } from "replicad";
import { Vector } from "replicad";

/**
 * Creates a model with a helper cuboid space and drill holes in all four corners
 * Plus two L-profiles on the bottom edges with holes in the bottom face
 * Distributes the models in a linear pattern within the helper space
 * @param {number} width - Width of the helper cuboid
 * @param {number} depth - Depth of the helper cuboid
 * @param {number} height - Height of the helper cuboid
 * @param {boolean} showHelper - Whether to show the helper space
 * @param {number} explosionFactor - Factor for exploded view (0-1)
 * @returns {Object} Model with helper space
 */
export function createHelperCuboid(width = 50, depth = 100, height = 200, showHelper = true, explosionFactor = 0) {
  // Create base model components separately (without fusing)
  const createBaseModel = () => {
    // Create main model (thin cuboid)
    const mainModel = createCuboid(width-1, 20, 0.5);
    const mainCenter = mainModel.boundingBox.center;
    
    // Create and position first drill
    const drill = constraintModelsByPoints(
      mainModel, 
      { type: 'face', element: FACES.TOP, params: { u: 1.5 / (width-1), v: 2.25 / 20 } },
      createDrill(1.2, 0.8, 0.5 * 0.8, 0.5 * 0.2)
    );
    
    // Cut holes in the main model
    const drilledModel = mainModel
      .cut(drill)
      .cut(mirror(drill, "XZ", mainCenter, true))
      .cut(mirror(drill, "YZ", mainCenter, true))
      .cut(mirror(mirror(drill, "XZ", mainCenter, true), "YZ", mainCenter, true));
    
    // Create L-profile
    const lProfile = createLProfile(20, 4.5, 4.5, 0.5);
    const profileCenter = lProfile.boundingBox.center;
    
    // Create and position hole for L-profile
    const holeDrill = constraintModelsByPoints(
      lProfile,
      { type: 'face', element: FACES.BOTTOM, params: { u: 1.5 / 4.5, v: 2.25 / 20 } },
      createCylinder(0.800001, 0.5)
    );
    
    // Drill both holes in L-profile
    const drilledLProfile = lProfile
      .cut(holeDrill)
      .cut(mirror(holeDrill, "XZ", profileCenter, true));
    
    // Position first L-profile
    const lProfile1 = constraintModelsByPoints(
      drilledModel,
      { type: 'edge', element: EDGES.LEFT_BOTTOM, params: { t: 0.5 } },
      drilledLProfile,
      { normal: [0, 0, -1], xDir: [1, 0, 0] }
    );
    
    // Create second L-profile by mirroring
    const lProfile2 = mirror(lProfile1, "YZ", mainCenter, true);
    
    // Return all parts separately
    return {
      cuboid: drilledModel,
      lProfile1: lProfile1,
      lProfile2: lProfile2
    };
  };
  
  // Create helper space
  const helperSpace = createCuboid(width, depth, height);
  
  // Calculate number of models based on height
  const n_models = Math.round(height / 17.5) - 1;
  
  // If we end up with no models (small height), just return the helper space
  if (n_models <= 0) {
    const helperSpace = createCuboid(width, depth, height);
    return modelWithHelpers(compoundShapes([]), showHelper ? [helperSpace] : []);
  }
  
  // Calculate spacing between models
  const vertical_difference = height / (n_models + 1);
  const horizontal_difference = (n_models > 1) ? ((depth - 28) / (n_models - 1)) : 0;

  // Calculate the model height for positioning
  const baseModelParts = createBaseModel();
  const modelHeight = baseModelParts.cuboid.boundingBox.bounds[1][2] - baseModelParts.cuboid.boundingBox.bounds[0][2];
  
  // Arrays to store all components separately
  const allParts = [];
  
  // Position of first model
  let currentX = 0;
  let currentY = -depth/2+14;
  let currentZ = vertical_difference - modelHeight;
  
  // Create and position all models
  for (let i = 0; i < n_models; i++) {
    // Create new base model parts for each position
    const modelParts = createBaseModel();
    
    // Calculate explosion offsets
    const explodeX = explosionFactor * 15; // L-profile outward explosion
    
    // Position main cuboid without vertical explosion - keep it in place
    allParts.push(
      modelParts.cuboid.clone().translate([
        currentX, 
        currentY, 
        currentZ
      ])
    );
    
    // Position L-profiles with outward explosion only
    allParts.push(
      modelParts.lProfile1.clone().translate([
        currentX - explodeX, 
        currentY, 
        currentZ
      ])
    );
    
    allParts.push(
      modelParts.lProfile2.clone().translate([
        currentX + explodeX, 
        currentY, 
        currentZ
      ])
    );
    
    // Update position for next model
    currentY += horizontal_difference;
    currentZ += vertical_difference;
  }
  
  // Create a new cuboid with the specified dimensions
  const newCuboid = createCuboid(600, 20, 0.5);
  
  // Calculate xDir from the translation vectors used in the model placement
  // We'll use the direction defined by the change in Y and Z coordinates
  const deltaY = horizontal_difference;
  const deltaZ = vertical_difference;
  const magnitude = Math.sqrt(deltaY * deltaY + deltaZ * deltaZ);
  
  // Normalize to get a unit vector (if magnitude is not zero)
  const xDir = magnitude > 0.001 ? 
    [0, deltaY / magnitude, deltaZ / magnitude] : 
    [1, 0, 0]; // fallback if magnitude is too small
  
  // Position the new cuboid using constraintModelsByPoints with right face of helper space
  const positionedNewCuboid = constraintModelsByPoints(
    helperSpace,
    { type: 'face', element: FACES.RIGHT },
    newCuboid,
    {
      normal: [-1, 0, 0],
      xDir: xDir
    }
  );
  
  // Intersect with helper space to cut off part outside
  const trimmedCuboid = positionedNewCuboid.intersect(helperSpace);
  
  // Mirror the trimmed cuboid across YZ plane
  const helperCenter = helperSpace.boundingBox.center;
  const mirroredCuboid = mirror(trimmedCuboid, "YZ", helperCenter, true);
  
  // Add explosion to the trimmed and mirrored cuboids
  const explodeRightX = explosionFactor * 30; // Right cuboid explosion distance
  const explodeLeftX = explosionFactor * 30; // Left cuboid explosion distance
  
  // Add both the trimmed and mirrored cuboids to our collection with explosion
  allParts.push(
    trimmedCuboid.translate([explodeRightX, 0, 0])
  );
  allParts.push(
    mirroredCuboid.translate([-explodeLeftX, 0, 0])
  );
  
  // Combine all parts using compoundShapes (keeps them as distinct parts)
  const finalModel = compoundShapes(allParts);
  
  // Return model with optional helper space
  return modelWithHelpers(finalModel, showHelper ? [helperSpace] : []);
}