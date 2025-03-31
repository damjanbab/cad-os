// models/staircase.js
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
import { isPositive, validateAll } from "../validators.js";

/**
 * Creates a staircase model with stringers and L-profiles
 */
export function createStaircase({
  width = 50, 
  depth = 100, 
  height = 200, 
  showHelper = true, 
  explosionFactor = 0
}) {
  // Create helper space (defines overall dimensions)
  const helperSpace = createCuboid({ width, depth, height });
  
  // Calculate number of steps based on height
  const n_steps = Math.round(height / 17.5) - 1;
  
  // If we end up with no steps (small height), just return the helper space
  if (n_steps <= 0) {
    return modelWithHelpers(compoundShapes([]), showHelper ? [helperSpace] : []);
  }
  
  // Calculate spacing between steps
  const vertical_difference = height / (n_steps + 1);
  const horizontal_difference = (n_steps > 1) ? ((depth - 28) / (n_steps - 1)) : 0;

  // Create base components
  // ------------------------

  // Create main stringer (thin cuboid)
  const stringer = createCuboid({ width: width-1, depth: 20, height: 0.5 });
  const stringerCenter = stringer.boundingBox.center;
  
  // Create and position drill
  const drill = constraintModelsByPoints(
    stringer, 
    { type: 'face', element: FACES.TOP, params: { u: 1.5 / (width-1), v: 2.25 / 20 } },
    createDrill({
      bottomRadius: 1.2, 
      topRadius: 0.8, 
      frustumHeight: 0.5 * 0.8, 
      cylinderHeight: 0.5 * 0.2
    })
  );
  
  // Cut holes in the stringer
  const drilledStringer = stringer
    .cut(drill)
    .cut(mirror(drill, "XZ", stringerCenter, true))
    .cut(mirror(drill, "YZ", stringerCenter, true))
    .cut(mirror(mirror(drill, "XZ", stringerCenter, true), "YZ", stringerCenter, true));
  
  // Create a reference model for technical drawings
  const drilledStringerForDrawing = drilledStringer.clone();
  
  // Create L-profile
  const lProfile = createLProfile({
    depth: 20, 
    flangeXLenght: 4.5, 
    flangeYLenght: 4.5, 
    thickness: 0.5
  });
  const profileCenter = lProfile.boundingBox.center;
  
  // Create and position hole for L-profile
  const holeDrill = constraintModelsByPoints(
    lProfile,
    { type: 'face', element: FACES.BOTTOM, params: { u: 1.5 / 4.5, v: 2.25 / 20 } },
    createCylinder({ radius: 0.800001, height: 0.5 })
  );
  
  // Drill both holes in L-profile
  const drilledLProfile = lProfile
    .cut(holeDrill)
    .cut(mirror(holeDrill, "XZ", profileCenter, true));
  
  // Create a reference model for technical drawings
  const drilledLProfileForDrawing = drilledLProfile.clone();
  
  // Position L-profile
  const lProfile1 = constraintModelsByPoints(
    drilledStringer,
    { type: 'edge', element: EDGES.LEFT_BOTTOM, params: { t: 0.5 } },
    drilledLProfile,
    { normal: [0, 0, -1], xDir: [1, 0, 0] }
  );
  
  // Create second L-profile by mirroring
  const lProfile2 = mirror(lProfile1, "YZ", stringerCenter, true);
  
  // Arrays to store all parts
  const allParts = [];
  
  // Position of first step
  let currentX = 0;
  let currentY = -depth/2+14;
  let currentZ = vertical_difference - (drilledStringer.boundingBox.bounds[1][2] - drilledStringer.boundingBox.bounds[0][2]);
  
  // Create and position all steps
  for (let i = 0; i < n_steps; i++) {
    // Calculate explosion offsets
    const explodeX = explosionFactor * 15; // L-profile outward explosion
    
    // Position stringer
    allParts.push(
      drilledStringer.clone().translate([
        currentX, 
        currentY, 
        currentZ
      ])
    );
    
    // Position L-profiles with outward explosion
    allParts.push(
      lProfile1.clone().translate([
        currentX - explodeX, 
        currentY, 
        currentZ
      ])
    );
    
    allParts.push(
      lProfile2.clone().translate([
        currentX + explodeX, 
        currentY, 
        currentZ
      ])
    );
    
    // Update position for next step
    currentY += horizontal_difference;
    currentZ += vertical_difference;
  }
  
  // Create side stringers
  const sideStringer = createCuboid({ width: 600, depth: 20, height: 0.5 });
  
  // Calculate xDir from the translation vectors
  const deltaY = horizontal_difference;
  const deltaZ = vertical_difference;
  const magnitude = Math.sqrt(deltaY * deltaY + deltaZ * deltaZ);
  const xDir = magnitude > 0.001 ? 
    [0, deltaY / magnitude, deltaZ / magnitude] : 
    [1, 0, 0];
  
  // Position the side stringer
  const positionedSideStringer = constraintModelsByPoints(
    helperSpace,
    { type: 'face', element: FACES.RIGHT },
    sideStringer,
    {
      normal: [-1, 0, 0],
      xDir: xDir
    }
  );
  
  // Intersect with helper space to cut off part outside
  const trimmedSideStringer = positionedSideStringer.intersect(helperSpace);
  
  // Create a reference model for technical drawings
  const trimmedSideStringerForDrawing = trimmedSideStringer.clone();
  
  // Mirror the trimmed side stringer
  const helperCenter = helperSpace.boundingBox.center;
  const mirroredSideStringer = mirror(trimmedSideStringer, "YZ", helperCenter, true);
  
  // Add explosion to the side stringers
  const explodeRightX = explosionFactor * 30;
  const explodeLeftX = explosionFactor * 30;
  
  // Add both side stringers to our collection with explosion
  allParts.push(
    trimmedSideStringer.translate([explodeRightX, 0, 0])
  );
  allParts.push(
    mirroredSideStringer.translate([-explodeLeftX, 0, 0])
  );
  
  // Combine all parts
  const finalModel = compoundShapes(allParts);
  
  // Prepare BOM data - no models, just metadata
  const componentData = [
    {
      id: "ST001",
      name: "Stringer",
      quantity: n_steps,
      dimensions: `${width-1}×20×0.5cm`,
      material: "Steel"
    },
    {
      id: "LP001",
      name: "L-Profile",
      quantity: n_steps * 2,
      dimensions: `4.5×4.5×20cm`,
      material: "Steel"
    },
    {
      id: "SS001",
      name: "Side Stringer",
      quantity: 2,
      dimensions: "Variable",
      material: "Steel"
    }
  ];
  
  // Store the technical drawing models internally - these won't be serialized
  const technicalDrawingModels = {
    "ST001": drilledStringerForDrawing,
    "LP001": drilledLProfileForDrawing,
    "SS001": trimmedSideStringerForDrawing
  };
  
  // Return model with helper space, component data and technical drawing models
  return {
    main: finalModel,
    helperSpaces: showHelper ? [helperSpace] : [],
    componentData: componentData,
    technicalDrawingModels: technicalDrawingModels
  };
}

// Model definition
export const staircaseModel = {
  name: "Staircase",
  create: createStaircase,
  params: [
    { name: "width", defaultValue: 50 },
    { name: "depth", defaultValue: 100 },
    { name: "height", defaultValue: 200 },
    { name: "showHelper", defaultValue: true },
    { name: "explosionFactor", defaultValue: 0 }
  ],
  validators: [
    validateAll(isPositive, ["width", "depth", "height"])
  ],
  hasExplosion: true
};