import { makeCylinder } from "replicad";
import { createFrustum } from './frustum.js';

/**
 * Creates a drill shape consisting of a frustum (truncated cone) with a cylinder on top
 * @param {number} bottomRadius - Radius of the bottom of the frustum
 * @param {number} topRadius - Radius of the top of the frustum and the cylinder
 * @param {number} frustumHeight - Height of the frustum
 * @param {number} cylinderHeight - Height of the cylinder
 * @returns {Object} Drill shape solid
 */
export function createDrill(
  bottomRadius = 50,
  topRadius = 25,
  frustumHeight = 80,
  cylinderHeight = 40
) {
  return createFrustum(
    bottomRadius,
    topRadius,
    frustumHeight
  ).fuse(
    makeCylinder(
      topRadius, 
      cylinderHeight, 
      [0, 0, -frustumHeight], // Place cylinder at the bottom of the frustum
      [0, 0, -1] // Negative Z axis direction
    )
  );
}