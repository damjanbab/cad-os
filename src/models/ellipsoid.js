// models/ellipsoid.js
import { makeEllipsoid } from "replicad";
import { isPositive } from "../validators.js";

// Create an ellipsoid
export function createEllipsoid({ aLength = 80, bLength = 50, cLength = 30 }) {
  const ellipsoid = makeEllipsoid(aLength, bLength, cLength);
  return ellipsoid;
}

// Model definition
export const ellipsoidModel = {
  name: "Ellipsoid",
  create: createEllipsoid,
  params: [
    { name: "aLength", defaultValue: 80, validators: [isPositive] },
    { name: "bLength", defaultValue: 50, validators: [isPositive] },
    { name: "cLength", defaultValue: 30, validators: [isPositive] }
  ],
  hasExplosion: false
};