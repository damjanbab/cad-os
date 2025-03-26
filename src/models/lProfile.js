// models/lProfile.js
import { makeBox } from "replicad";

/**
 * Creates an L-profile (angle profile)
 * @param {number} depth - Length of the profile (along y-axis)
 * @param {number} flangeXLenght - Width of first flange (along x-axis)
 * @param {number} flangeYLenght - Width of second flange (along z-axis)
 * @param {number} thickness - Thickness of both flanges
 * @returns {Object} L-profile solid
 */
export function createLProfile(
  depth = 100,
  flangeXLenght = 50,
  flangeYLenght = 50,
  thickness = 5
) {
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