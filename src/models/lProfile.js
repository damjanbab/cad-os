// models/lProfile.js
import { makeBox } from "replicad";
import { isPositive, validateAll, validateLessThan } from "../validators.js";

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

// Model definition
export const lProfileModel = {
  name: "LProfile",
  create: createLProfile,
  params: [
    { name: "depth", defaultValue: 100 },
    { name: "flangeXLenght", defaultValue: 50 },
    { name: "flangeYLenght", defaultValue: 50 },
    { name: "thickness", defaultValue: 5 }
  ],
  validators: [
    validateAll(isPositive, ["depth", "flangeXLenght", "flangeYLenght", "thickness"]),
    validateLessThan("thickness", "flangeXLenght"),
    validateLessThan("thickness", "flangeYLenght")
  ],
  hasExplosion: false
};