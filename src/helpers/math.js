// helpers/math.js
import { Vector } from "replicad";

/**
 * Find a vector perpendicular to the given vector
 * @param {Vector} vec - Vector to find perpendicular to
 * @returns {Vector} A vector perpendicular to the input vector
 */
export function findPerpendicularVector(vec) {
  const v = vec.normalized();
  
  // Choose the component with the smallest absolute value to set to zero
  const absX = Math.abs(v.x);
  const absY = Math.abs(v.y);
  const absZ = Math.abs(v.z);
  
  let perpendicular;
  
  if (absX <= absY && absX <= absZ) {
    // X is smallest, set it to 0 and swap Y and Z with one negated
    perpendicular = new Vector([0, v.z, -v.y]);
  } else if (absY <= absX && absY <= absZ) {
    // Y is smallest, set it to 0 and swap X and Z with one negated
    perpendicular = new Vector([v.z, 0, -v.x]);
  } else {
    // Z is smallest, set it to 0 and swap X and Y with one negated
    perpendicular = new Vector([v.y, -v.x, 0]);
  }
  
  // Normalize the perpendicular vector
  return perpendicular.normalized();
}

/**
 * Check if two vectors are approximately parallel
 * @param {Vector} v1 - First vector
 * @param {Vector} v2 - Second vector
 * @param {number} tolerance - Tolerance for dot product comparison
 * @returns {boolean} True if vectors are parallel
 */
export function areVectorsParallel(v1, v2, tolerance = 1e-10) {
  const n1 = v1.normalized();
  const n2 = v2.normalized();
  
  const crossProduct = n1.cross(n2);
  const crossLength = crossProduct.Length;
  
  const isParallel = crossLength < tolerance;
  
  return isParallel;
}

/**
 * Check if two vectors are approximately anti-parallel
 * @param {Vector} v1 - First vector
 * @param {Vector} v2 - Second vector
 * @param {number} tolerance - Tolerance for dot product comparison
 * @returns {boolean} True if vectors are anti-parallel
 */
export function areVectorsAntiParallel(v1, v2, tolerance = 1e-10) {
  const n1 = v1.normalized();
  const n2 = v2.normalized();
  
  const dot = n1.dot(n2);
  
  const isAntiParallel = Math.abs(dot + 1) < tolerance;
  
  return isAntiParallel;
}

/**
 * Calculate the distance from a point to a plane
 * @param {Vector} point - Point to check
 * @param {Vector} planePoint - Point on the plane
 * @param {Vector} planeNormal - Normal vector of the plane
 * @returns {number} Signed distance to the plane
 */
export function distanceToPlane(point, planePoint, planeNormal) {
  const normal = planeNormal.normalized();
  
  const vectorToPoint = point.sub(planePoint);
  
  const distance = vectorToPoint.dot(normal);
  
  return distance;
}