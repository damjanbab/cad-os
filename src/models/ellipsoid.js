// models/ellipsoid.js
import { makeEllipsoid } from "replicad";

// Create an ellipsoid
export function createEllipsoid(aLength = 80, bLength = 50, cLength = 30) {
  const ellipsoid = makeEllipsoid(aLength, bLength, cLength);
  return ellipsoid;
}