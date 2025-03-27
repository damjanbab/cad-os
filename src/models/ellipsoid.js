// models/ellipsoid.js
import { makeEllipsoid } from "replicad";
import { isPositive, validateAll } from "../validators.js";

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
    { name: "aLength", defaultValue: 80 },
    { name: "bLength", defaultValue: 50 },
    { name: "cLength", defaultValue: 30 }
  ],
  validators: [
    validateAll(isPositive, ["aLength", "bLength", "cLength"])
  ],
  hasExplosion: false
};