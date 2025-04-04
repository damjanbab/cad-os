// models/sphere.js
import { makeSphere } from "replicad";
import { isPositive, validateAll } from "../validators.js";

// Create a sphere
export function createSphere({ radius = 50 }) {
  const sphere = makeSphere(radius);
  return sphere;
}

// Model definition
export const sphereModel = {
  name: "Sphere",
  create: createSphere,
  params: [
    { name: "radius", defaultValue: 50 }
  ],
  validators: [
    validateAll(isPositive, ["radius"])
  ],
  hasExplosion: false
};