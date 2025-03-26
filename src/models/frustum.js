// models/frustum.js
import { sketchCircle } from "replicad";
import { isPositive } from "../validators.js";

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
    { name: "bottomRadius", defaultValue: 50, validators: [isPositive] },
    { name: "topRadius", defaultValue: 25, validators: [isPositive] },
    { name: "height", defaultValue: 100, validators: [isPositive] }
  ],
  hasExplosion: false
};