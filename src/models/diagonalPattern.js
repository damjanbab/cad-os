// models/diagonalPattern.js
import { compoundShapes } from "replicad";
import { createCuboid } from './cuboid.js';
import { centerSelector } from '../helpers/selectors.js';
import { placeModelsAtPoints } from '../helpers/positioning.js';
import { createLinearPattern } from '../helpers/pattern.js';
import { isPositive, validateAll } from "../validators.js";

/**
 * Create a linear pattern of cuboids along a specified vector
 */
export function createLinearCuboidPattern({
  count = 5,
  vectorX = 0, 
  vectorY = 50, 
  vectorZ = 50,
  originX = 0,
  originY = 0,
  originZ = 0,
  boxWidth = 10,
  boxDepth = 10,
  boxHeight = 10,
  orientationX = 0,
  orientationY = 0,
  orientationZ = 1
}) {
  return compoundShapes(
    placeModelsAtPoints(
      () => createCuboid({ width: boxWidth, depth: boxDepth, height: boxHeight }),
      centerSelector,
      createLinearPattern(
        [originX, originY, originZ],
        [vectorX, vectorY, vectorZ],
        count,
        orientationX,
        orientationY,
        orientationZ
      )
    )
  );
}

// Model definition
export const linearCuboidPatternModel = {
  name: "DiagonalCuboidPattern",
  create: createLinearCuboidPattern,
  params: [
    { name: "count", defaultValue: 5 },
    { name: "vectorX", defaultValue: 0 },
    { name: "vectorY", defaultValue: 50 },
    { name: "vectorZ", defaultValue: 50 },
    { name: "originX", defaultValue: 0 },
    { name: "originY", defaultValue: 0 },
    { name: "originZ", defaultValue: 0 },
    { name: "boxWidth", defaultValue: 10 },
    { name: "boxDepth", defaultValue: 10 },
    { name: "boxHeight", defaultValue: 10 },
    { name: "orientationX", defaultValue: 0 },
    { name: "orientationY", defaultValue: 0 },
    { name: "orientationZ", defaultValue: 1 }
  ],
  validators: [
    validateAll(isPositive, ["count", "boxWidth", "boxDepth", "boxHeight"])
  ],
  hasExplosion: false
};