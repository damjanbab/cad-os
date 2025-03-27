// models/frustum.js
import { sketchCircle } from "replicad";
import { isPositive, validateAll } from "../validators.js";

/**
 * Creates a frustum (truncated cone)
 */
export function createFrustum({
  bottomRadius = 50, 
  topRadius = 25, 
  height = 100
}) {
  return sketchCircle(bottomRadius, {
    plane: "XY", 
    origin: [0, 0, 0]
  }).loftWith(
    sketchCircle(topRadius, {
      plane: "XY",
      origin: [0, 0, -height]
    }),
    { ruled: true }
  );
}

// Model definition
export const frustumModel = {
  name: "Frustum",
  create: createFrustum,
  params: [
    { name: "bottomRadius", defaultValue: 50 },
    { name: "topRadius", defaultValue: 25 },
    { name: "height", defaultValue: 100 }
  ],
  validators: [
    validateAll(isPositive, ["bottomRadius", "topRadius", "height"])
  ],
  hasExplosion: false
};