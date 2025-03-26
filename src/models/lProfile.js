// models/lProfile.js
import { makeBox } from "replicad";
import { isPositive, lessThan } from "../validators.js";

/**
 * Creates an L-profile (angle profile)
 */
export function createLProfile({
  depth = 100,
  flangeXLenght = 50,
  flangeYLenght = 50,
  thickness = 5
}) {
  // Create horizontal flange (along x-axis)
  const horizontalFlange = makeBox(
    [0, -depth/2, 0], 
    [flangeXLenght, depth/2, thickness]
  );
  
  // Create vertical flange (along z-axis)
  const verticalFlange = makeBox(
    [0, -depth/2, 0], 
    [thickness, depth/2, flangeYLenght]
  );
  
  // Fuse the two flanges
  const lProfile = horizontalFlange.fuse(verticalFlange);
  
  return lProfile;
}

// Custom validator for L-profile
function validateLProfileThickness(params) {
  // Check that thickness is less than flange dimensions
  if (params.thickness >= params.flangeXLenght) {
    return {
      valid: false,
      message: `Thickness (${params.thickness}) must be less than flangeXLenght (${params.flangeXLenght})`
    };
  }
  
  if (params.thickness >= params.flangeYLenght) {
    return {
      valid: false,
      message: `Thickness (${params.thickness}) must be less than flangeYLenght (${params.flangeYLenght})`
    };
  }
  
  return { valid: true };
}

// Model definition
export const lProfileModel = {
  name: "LProfile",
  create: createLProfile,
  params: [
    { name: "depth", defaultValue: 100, validators: [isPositive] },
    { name: "flangeXLenght", defaultValue: 50, validators: [isPositive] },
    { name: "flangeYLenght", defaultValue: 50, validators: [isPositive] },
    { name: "thickness", defaultValue: 5, validators: [isPositive] }
  ],
  // Add custom validator to check thickness against flange dimensions
  validators: [validateLProfileThickness],
  hasExplosion: false
};