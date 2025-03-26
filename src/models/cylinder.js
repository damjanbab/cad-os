// models/cylinder.js
import { makeCylinder } from "replicad";

// Create a cylinder
export function createCylinder(radius = 50, height = 100) {
  // Create cylinder centered at origin, along Z axis
  const location = [0, 0, 0];  // center of base
  const direction = [0, 0, -1]; // Z axis direction
  
  return makeCylinder(radius, height, location, direction);
}