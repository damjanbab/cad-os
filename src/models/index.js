// models/index.js
import { cuboidModel } from './cuboid.js';
import { sphereModel } from './sphere.js';
import { cylinderModel } from './cylinder.js';
import { ellipsoidModel } from './ellipsoid.js';
import { linearCuboidPatternModel } from './diagonalPattern.js';
import { rectangularCuboidGridModel } from './gridPattern.js';
import { lProfileModel } from './lProfile.js';
import { frustumModel } from './frustum.js';
import { drillModel } from './drill.js';
import { staircaseModel } from './staircase.js';
import { validateModelParams } from '../validators.js';

// Register all models in a single place
export const modelRegistry = {
  "Cuboid": cuboidModel,
  "Sphere": sphereModel,
  "Cylinder": cylinderModel,
  "Ellipsoid": ellipsoidModel,
  "DiagonalCuboidPattern": linearCuboidPatternModel,
  "RectangularCuboidGrid": rectangularCuboidGridModel,
  "LProfile": lProfileModel,
  "Frustum": frustumModel,
  "Drill": drillModel,
  "Staircase": staircaseModel
};

// Helper function to create object with default values
export function createDefaultParams(model) {
  return model.params.reduce((obj, param) => {
    obj[param.name] = param.defaultValue;
    return obj;
  }, {});
}

// Wrapper for model creation with validation
export function createModelWithValidation(modelName, params) {
  const model = modelRegistry[modelName];
  if (!model) {
    throw new Error(`Model "${modelName}" not found`);
  }
  
  // Validate parameters
  const validation = validateModelParams(params, model);
  
  if (!validation.valid) {
    return { error: true, validationErrors: validation.errors };
  }
  
  // Create the model with validated parameters
  return model.create(params);
}