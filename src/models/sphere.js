// models/sphere.js
import { makeSphere } from "replicad";

// Create a sphere
export function createSphere(radius = 50) {
  const sphere = makeSphere(radius);
  return sphere;
}