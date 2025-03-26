import { sketchCircle } from "replicad";

/**
 * Creates a frustum (truncated cone)
 * @param {number} bottomRadius - Radius of the bottom circle
 * @param {number} topRadius - Radius of the top circle
 * @param {number} height - Height of the frustum
 * @returns {Object} Frustum solid
 */
export function createFrustum(
  bottomRadius = 50, 
  topRadius = 25, 
  height = 100
) {
  return sketchCircle(bottomRadius, {
    plane: "XY", 
    origin: [0, 0, 0]
  }).loftWith(
    sketchCircle(topRadius, {
      plane: "XY",
      origin: [0, 0, -height]  // Changed to negative height
    }),
    { ruled: true }
  );
}
