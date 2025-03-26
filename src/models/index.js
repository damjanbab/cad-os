// models/index.js
// Import models from individual files
import { createCuboid } from './cuboid.js';
import { createSphere } from './sphere.js';
import { createCylinder } from './cylinder.js';
import { createEllipsoid } from './ellipsoid.js';
import { createLinearCuboidPattern } from './diagonalPattern.js';
import { createRectangularCuboidGrid } from './gridPattern.js';
import { createLProfile } from './lProfile.js';
import { createFrustum } from './frustum.js';
import { createDrill } from './drill.js';
import { createHelperCuboid } from './helperCuboid.js';


// Import validation utilities
import { withValidation } from "../validator.js";
import { modelSchemas } from "../modelValidation.js";


// Export model functions with validation - now passing the model name as the third parameter
export const modelFunctions = {
  "Cuboid": withValidation(createCuboid, modelSchemas["Cuboid"], "Cuboid"),
  "Sphere": withValidation(createSphere, modelSchemas["Sphere"], "Sphere"),
  "Cylinder": withValidation(createCylinder, modelSchemas["Cylinder"], "Cylinder"),
  "Ellipsoid": withValidation(createEllipsoid, modelSchemas["Ellipsoid"], "Ellipsoid"),
  "DiagonalCuboidPattern": withValidation(createLinearCuboidPattern, modelSchemas["DiagonalCuboidPattern"], "DiagonalCuboidPattern"),
  "RectangularCuboidGrid": withValidation(createRectangularCuboidGrid, modelSchemas["RectangularCuboidGrid"], "RectangularCuboidGrid"),
  "LProfile": withValidation(createLProfile, modelSchemas["LProfile"], "LProfile"),
  "Frustum": withValidation(createFrustum, modelSchemas["Frustum"], "Frustum"),
  "HelperCuboid": withValidation(createHelperCuboid, modelSchemas["HelperCuboid"], "HelperCuboid"),
  "Drill": withValidation(createDrill, modelSchemas["Drill"], "Drill")
};