// models/gridPattern.js
import { compoundShapes } from "replicad";
import { createCuboid } from './cuboid.js';
import { centerSelector } from '../helpers/selectors.js';
import { placeModelsAtPoints } from '../helpers/positioning.js';
import { createRectangularGrid } from '../helpers/pattern.js';

/**
 * Creates a rectangular grid of cuboids
 * @param {number} originX - X component of grid origin
 * @param {number} originY - Y component of grid origin
 * @param {number} originZ - Z component of grid origin
 * @param {number} directionX - X component of grid x-direction
 * @param {number} directionY - Y component of grid x-direction
 * @param {number} directionZ - Z component of grid x-direction
 * @param {number} normalX - X component of grid normal
 * @param {number} normalY - Y component of grid normal
 * @param {number} normalZ - Z component of grid normal
 * @param {number} rowCount - Number of rows
 * @param {number} colCount - Number of columns
 * @param {number} xSpacing - Spacing between columns
 * @param {number} ySpacing - Spacing between rows
 * @param {number} boxWidth - Width of each cuboid
 * @param {number} boxDepth - Depth of each cuboid
 * @param {number} boxHeight - Height of each cuboid
 * @param {number} orientationX - X component of orientation vector
 * @param {number} orientationY - Y component of orientation vector
 * @param {number} orientationZ - Z component of orientation vector
 * @returns {Object} Combined solid of all cuboids
 */
export function createRectangularCuboidGrid(
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
) {
  return compoundShapes(
    placeModelsAtPoints(
      () => createCuboid(boxWidth, boxDepth, boxHeight),
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