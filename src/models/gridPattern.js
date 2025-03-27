// models/gridPattern.js
import { compoundShapes } from "replicad";
import { createCuboid } from './cuboid.js';
import { centerSelector } from '../helpers/selectors.js';
import { placeModelsAtPoints } from '../helpers/positioning.js';
import { createRectangularGrid } from '../helpers/pattern.js';
import { isPositive, validateAll } from "../validators.js";

/**
 * Creates a rectangular grid of cuboids
 */
export function createRectangularCuboidGrid({
  originX = 0,
  originY = 0,
  originZ = 0,
  directionX = 1,
  directionY = 0,
  directionZ = 0,
  normalX = 0,
  normalY = 0,
  normalZ = 1,
  rowCount = 3,
  colCount = 3,
  xSpacing = 30,
  ySpacing = 30,
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
      createRectangularGrid(
        {
          origin: [originX, originY, originZ],
          xDirection: [directionX, directionY, directionZ],
          normal: [normalX, normalY, normalZ]
        },
        rowCount,
        colCount,
        xSpacing,
        ySpacing,
        orientationX,
        orientationY,
        orientationZ
      )
    )
  );
}

// Model definition
export const rectangularCuboidGridModel = {
  name: "RectangularCuboidGrid",
  create: createRectangularCuboidGrid,
  params: [
    { name: "originX", defaultValue: 0 },
    { name: "originY", defaultValue: 0 },
    { name: "originZ", defaultValue: 0 },
    { name: "directionX", defaultValue: 1 },
    { name: "directionY", defaultValue: 0 },
    { name: "directionZ", defaultValue: 0 },
    { name: "normalX", defaultValue: 0 },
    { name: "normalY", defaultValue: 0 },
    { name: "normalZ", defaultValue: 1 },
    { name: "rowCount", defaultValue: 3 },
    { name: "colCount", defaultValue: 3 },
    { name: "xSpacing", defaultValue: 30 },
    { name: "ySpacing", defaultValue: 30 },
    { name: "boxWidth", defaultValue: 10 },
    { name: "boxDepth", defaultValue: 10 },
    { name: "boxHeight", defaultValue: 10 },
    { name: "orientationX", defaultValue: 0 },
    { name: "orientationY", defaultValue: 0 },
    { name: "orientationZ", defaultValue: 1 }
  ],
  validators: [
    validateAll(isPositive, ["rowCount", "colCount", "xSpacing", "ySpacing", "boxWidth", "boxDepth", "boxHeight"])
  ],
  hasExplosion: false
};