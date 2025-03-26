// models/diagonalPattern.js
import { compoundShapes } from "replicad";
import { createCuboid } from './cuboid.js';
import { centerSelector } from '../helpers/selectors.js';
import { placeModelsAtPoints } from '../helpers/positioning.js';
import { createLinearPattern } from '../helpers/pattern.js';

/**
 * Create a linear pattern of cuboids along a specified vector
 * @param {number} count - Number of cuboids in the pattern
 * @param {number} vectorX - X component of the direction vector
 * @param {number} vectorY - Y component of the direction vector
 * @param {number} vectorZ - Z component of the direction vector
 * @param {number} originX - X component of the origin point
 * @param {number} originY - Y component of the origin point
 * @param {number} originZ - Z component of the origin point
 * @param {number} boxWidth - Width of each cuboid
 * @param {number} boxDepth - Depth of each cuboid
 * @param {number} boxHeight - Height of each cuboid
 * @param {number} orientationX - X component of the orientation vector
 * @param {number} orientationY - Y component of the orientation vector
 * @param {number} orientationZ - Z component of the orientation vector
 * @returns {Object} Combined solid of all cuboids
 */
export function createLinearCuboidPattern(
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
) {
  return compoundShapes(
    placeModelsAtPoints(
      () => createCuboid(boxWidth, boxDepth, boxHeight),
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