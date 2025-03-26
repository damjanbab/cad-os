// models/cuboid.js
import { makeBox } from "replicad";
import { isPositive } from "../validators.js";

// Create a cuboid with its bottom center at the origin
export function createCuboid({ width = 100, depth = 100, height = 100 }) {
  // For zero dimensions, just return a point
  if (width === 0 && depth === 0 && height === 0) {
    return makeBox([0, 0, 0], [0.0000001, 0.0000001, 0.0000001]);
  }
  
  // Calculate half-dimensions for centering
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  
  // Create the box centered on X and Y axes, with bottom face at Z=0
  const cuboid = makeBox(
    [-halfWidth, -halfDepth, 0],              // bottom-center point
    [halfWidth, halfDepth, height]            // top-center point
  );
  
  return cuboid;
}

// Model definition - all in one place
export const cuboidModel = {
  name: "Cuboid",
  create: createCuboid,
  params: [
    { name: "width", defaultValue: 100, validators: [isPositive] },
    { name: "depth", defaultValue: 100, validators: [isPositive] },
    { name: "height", defaultValue: 100, validators: [isPositive] }
  ],
  hasExplosion: false
};