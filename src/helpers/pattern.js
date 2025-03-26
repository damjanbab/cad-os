// helpers/pattern.js
// Functions for creating various patterns of points/positions

import { Plane, Vector, compoundShapes } from "replicad";

/**
 * Helper to combine multiple model generators into one
 * @param {...Function} modelGenerators - Model creation functions to combine
 * @returns {Function} Combined model generator
 */
export function combine(...modelGenerators) {
  return (...args) => {
    const allModels = modelGenerators.flatMap(generator => generator(...args));
    return compoundShapes(allModels);
  };
}

/**
 * Creates a 2D grid of points with orientation in 3D space
 * @param {Object} gridPlane - Plane definition {origin, xDirection, normal}
 * @param {number} rowCount - Number of rows
 * @param {number} colCount - Number of columns
 * @param {number} xSpacing - Spacing between columns
 * @param {number} ySpacing - Spacing between rows
 * @param {number} orientationX - X component of orientation vector
 * @param {number} orientationY - Y component of orientation vector
 * @param {number} orientationZ - Z component of orientation vector
 * @returns {Array<Object>} Array of position objects with orientation
 */
export function createRectangularGrid(gridPlane, rowCount, colCount, xSpacing, ySpacing, orientationX = 0, orientationY = 0, orientationZ = 1) {
  const orientationVector = new Vector([orientationX, orientationY, orientationZ]).normalized();
  
  return Array.from({ length: rowCount * colCount }, (_, index) => {
    const row = Math.floor(index / colCount);
    const col = index % colCount;
    const x = col * xSpacing;
    const y = row * ySpacing;
    // Create plane inline for single return statement
    const plane = new Plane(
      new Vector(gridPlane.origin),
      new Vector(gridPlane.xDirection).normalized(),
      new Vector(gridPlane.normal).normalized()
    );
    const worldPoint = plane.toWorldCoords([x, y, 0]);
    return {
      position: [worldPoint.x, worldPoint.y, worldPoint.z],
      direction: [gridPlane.normal[0], gridPlane.normal[1], gridPlane.normal[2]],
      orientation: [orientationVector.x, orientationVector.y, orientationVector.z]
    };
  });
}

/**
 * Create points with orientation along a line
 * @param {Array} origin - Starting point [x, y, z]
 * @param {Array} direction - Direction vector [x, y, z]
 * @param {number} count - Number of points to create
 * @param {number} orientationX - X component of orientation vector
 * @param {number} orientationY - Y component of orientation vector
 * @param {number} orientationZ - Z component of orientation vector
 * @returns {Array<Object>} Array of position objects with orientation
 */
export function createLinearPattern(origin, direction, count, orientationX = 0, orientationY = 0, orientationZ = 1) {
  return createRectangularGrid(
    {
      origin: origin,
      xDirection: direction,
      normal: (() => {
        const dirVector = new Vector(direction);
        const upVector = new Vector([0, 0, 1]);
        const planeNormal = Math.abs(dirVector.normalized().dot(upVector)) > 0.99 
          ? new Vector([1, 0, 0]) 
          : dirVector.cross(upVector).normalized();
        return [planeNormal.x, planeNormal.y, planeNormal.z];
      })()
    },
    1,                                                            // 1 row
    count,                                                        // columns = count of points
    count > 1 ? new Vector(direction).Length / (count - 1) : 0,   // spacing to achieve desired length
    0,                                                            // no vertical spacing
    orientationX,
    orientationY,
    orientationZ
  );
}