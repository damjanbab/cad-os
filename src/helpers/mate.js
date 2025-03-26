// In helpers/mate.js

import { Transformation, Vector, cast } from "replicad";
import { getFaceNormal, getEdgeConnectingFaces, getPointOnBoundingBox } from "./boundingBox.js";
import { findPerpendicularVector } from "./math.js";

/**
 * Constrain models by specifying a reference point with orientation
 * @param {Object} fixedModel - Model that stays fixed
 * @param {Object} fixedPointSpec - Point specification on fixed model
 * @param {Object} movingModel - Model to be moved
 * @param {Object} options - Additional options for constraint
 * @param {Array} [options.normal] - Override normal direction
 * @param {Array} [options.xDir] - Override orientation direction
 * @param {string} [options.faceForEdge] - Face to use for normal if point is on edge
 * @param {string} [options.faceForCorner] - Face to use for normal if point is corner
 * @returns {Object} Transformed moving model
 */
export function constraintModelsByPoints(
  fixedModel, 
  fixedPointSpec, 
  movingModel, 
  options = {}
) {
  // Get reference point from specification
  const fixedPoint = getPointOnBoundingBox(fixedModel.boundingBox, fixedPointSpec);
  
  // Get normal direction (zDir)
  let normal;
  if (options.normal) {
    normal = new Vector(options.normal);
  } else {
    normal = getNormalForPointSpec(fixedModel, fixedPointSpec, options);
  }
  
  // Get orientation direction (xDir)
  let xDir;
  if (options.xDir) {
    xDir = new Vector(options.xDir);
  } else {
    xDir = findPerpendicularVector(normal);
  }
  
  // Create transformation
  const transformation = new Transformation();
  
  // Set up coordinate system at the reference point
  transformation.coordSystemChange(
    {
      origin: fixedPoint.toTuple(),
      zDir: normal.toTuple(),
      xDir: xDir.toTuple()
    },
    "reference"
  );
  
  // Apply transformation
  const transformed = cast(transformation.transform(movingModel.wrapped));
  
  // Clean up
  transformation.delete();
  normal.delete();
  xDir.delete();
  fixedPoint.delete();
  
  return transformed;
}

/**
 * Get normal vector for a point specification
 * @param {Object} model - The model
 * @param {Object} pointSpec - Point specification
 * @param {Object} options - Additional options
 * @returns {Vector} Normal vector
 */
function getNormalForPointSpec(model, pointSpec, options = {}) {
  const { type, element } = pointSpec;
  
  switch (type) {
    case 'face':
      return getFaceNormal(element);
    case 'edge':
      // For edges, use specified face if provided
      if (options.faceForEdge) {
        return getFaceNormal(options.faceForEdge);
      } else {
        // Use one of the faces connected to this edge
        const faces = getEdgeConnectingFaces(element);
        return getFaceNormal(faces[0]);
      }
    case 'corner':
      // For corners, use specified face if provided
      if (options.faceForCorner) {
        return getFaceNormal(options.faceForCorner);
      } else {
        // Default to Z-axis
        return new Vector([0, 0, 1]);
      }
    case 'center':
    default:
      // Default to Z-axis for center or unknown types
      return new Vector([0, 0, 1]);
  }
}

/**
 * Offset a constrained model along a direction
 * @param {Object} model - The constrained model
 * @param {Array} direction - Direction to offset along
 * @param {number} distance - Distance to offset
 * @returns {Object} Offset model
 */
export function offsetConstrainedModel(model, direction, distance) {
  const directionVec = new Vector(direction);
  
  // Simple translation along the direction
  const transformedModel = model.translate([
    directionVec.x * distance,
    directionVec.y * distance,
    directionVec.z * distance
  ]);
  
  directionVec.delete();
  return transformedModel;
}