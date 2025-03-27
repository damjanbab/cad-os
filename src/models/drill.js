// models/drill.js
import { makeCylinder } from "replicad";
import { createFrustum } from './frustum.js';
import { isPositive, validateAll } from "../validators.js";

/**
 * Creates a drill shape consisting of a frustum (truncated cone) with a cylinder on top
 */
export function createDrill({
  bottomRadius = 50,
  topRadius = 25,
  frustumHeight = 80,
  cylinderHeight = 40
}) {
  return createFrustum({
    bottomRadius,
    topRadius,
    height: frustumHeight
  }).fuse(
    makeCylinder(
      topRadius, 
      cylinderHeight, 
      [0, 0, -frustumHeight], // Place cylinder at the bottom of the frustum
      [0, 0, -1] // Negative Z axis direction
    )
  );
}

// Model definition
export const drillModel = {
  name: "Drill",
  create: createDrill,
  params: [
    { name: "bottomRadius", defaultValue: 50 },
    { name: "topRadius", defaultValue: 25 },
    { name: "frustumHeight", defaultValue: 80 },
    { name: "cylinderHeight", defaultValue: 40 }
  ],
  validators: [
    validateAll(isPositive, ["bottomRadius", "topRadius", "frustumHeight", "cylinderHeight"])
  ],
  hasExplosion: false
};