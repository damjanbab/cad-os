// helpers/boundingBox.js
import { Vector } from "replicad";

/**
 * Constants for bounding box face identifiers
 */
export const FACES = {
  FRONT: "front",   // -Y
  BACK: "back",     // +Y
  LEFT: "left",     // -X
  RIGHT: "right",   // +X
  TOP: "top",       // +Z
  BOTTOM: "bottom", // -Z
};

/**
 * Constants for bounding box edge identifiers
 * Each edge is defined by the two faces it connects
 */
export const EDGES = {
  FRONT_LEFT: "front_left",       // Edge between FRONT and LEFT faces
  FRONT_RIGHT: "front_right",     // Edge between FRONT and RIGHT faces
  FRONT_TOP: "front_top",         // Edge between FRONT and TOP faces
  FRONT_BOTTOM: "front_bottom",   // Edge between FRONT and BOTTOM faces
  BACK_LEFT: "back_left",         // Edge between BACK and LEFT faces
  BACK_RIGHT: "back_right",       // Edge between BACK and RIGHT faces
  BACK_TOP: "back_top",           // Edge between BACK and TOP faces
  BACK_BOTTOM: "back_bottom",     // Edge between BACK and BOTTOM faces
  LEFT_TOP: "left_top",           // Edge between LEFT and TOP faces
  LEFT_BOTTOM: "left_bottom",     // Edge between LEFT and BOTTOM faces
  RIGHT_TOP: "right_top",         // Edge between RIGHT and TOP faces
  RIGHT_BOTTOM: "right_bottom",   // Edge between RIGHT and BOTTOM faces
};

/**
 * Get the normal vector for a specific face of a bounding box
 * @param {string} face - Face identifier (one of FACES constants)
 * @returns {Vector} Normal vector for the face
 */
export function getFaceNormal(face) {
  let normal;
  switch (face) {
    case FACES.FRONT: normal = new Vector([0, -1, 0]); break;
    case FACES.BACK: normal = new Vector([0, 1, 0]); break;
    case FACES.LEFT: normal = new Vector([-1, 0, 0]); break;
    case FACES.RIGHT: normal = new Vector([1, 0, 0]); break;
    case FACES.TOP: normal = new Vector([0, 0, 1]); break;
    case FACES.BOTTOM: normal = new Vector([0, 0, -1]); break;
    default: 
      throw new Error(`Unknown face identifier: ${face}`);
  }
  
  return normal;
}

/**
 * Get the direction vector for a specific edge of a bounding box
 * @param {string} edge - Edge identifier (one of EDGES constants)
 * @returns {Vector} Direction vector along the edge
 */
export function getEdgeDirection(edge) {
  let direction;
  
  switch (edge) {
    // Horizontal edges along X-axis
    case EDGES.FRONT_TOP:
    case EDGES.FRONT_BOTTOM:
    case EDGES.BACK_TOP:
    case EDGES.BACK_BOTTOM:
      direction = new Vector([1, 0, 0]);
      break;
      
    // Horizontal edges along Y-axis
    case EDGES.LEFT_TOP:
    case EDGES.LEFT_BOTTOM:
    case EDGES.RIGHT_TOP:
    case EDGES.RIGHT_BOTTOM:
      direction = new Vector([0, 1, 0]);
      break;
      
    // Vertical edges along Z-axis
    case EDGES.FRONT_LEFT:
    case EDGES.FRONT_RIGHT:
    case EDGES.BACK_LEFT:
    case EDGES.BACK_RIGHT:
      direction = new Vector([0, 0, 1]);
      break;
      
    default:
      throw new Error(`Unknown edge identifier: ${edge}`);
  }
  
  return direction;
}

/**
 * Get the face identifier based on a normal vector
 * @param {Vector} normal - Normal vector
 * @returns {string} Face identifier (one of FACES constants)
 */
export function getFaceFromNormal(normal) {
  const norm = normal.normalized();
  const x = norm.x;
  const y = norm.y;
  const z = norm.z;
  
  let result;
  if (Math.abs(x) > Math.abs(y) && Math.abs(x) > Math.abs(z)) {
    result = x > 0 ? FACES.RIGHT : FACES.LEFT;
  } else if (Math.abs(y) > Math.abs(x) && Math.abs(y) > Math.abs(z)) {
    result = y > 0 ? FACES.BACK : FACES.FRONT;
  } else {
    result = z > 0 ? FACES.TOP : FACES.BOTTOM;
  }
  
  return result;
}

/**
 * Get the center point of a specific face of a bounding box
 * @param {BoundingBox} boundingBox - The bounding box
 * @param {string} face - Face identifier (one of FACES constants)
 * @returns {Vector} Center point of the face
 */
export function getFaceCenter(boundingBox, face) {
  const [[xmin, ymin, zmin], [xmax, ymax, zmax]] = boundingBox.bounds;
  const center = boundingBox.center;
  
  let faceCenter;
  switch (face) {
    case FACES.FRONT: faceCenter = new Vector([center[0], ymin, center[2]]); break;
    case FACES.BACK: faceCenter = new Vector([center[0], ymax, center[2]]); break;
    case FACES.LEFT: faceCenter = new Vector([xmin, center[1], center[2]]); break;
    case FACES.RIGHT: faceCenter = new Vector([xmax, center[1], center[2]]); break;
    case FACES.TOP: faceCenter = new Vector([center[0], center[1], zmax]); break;
    case FACES.BOTTOM: faceCenter = new Vector([center[0], center[1], zmin]); break;
    default: 
      throw new Error(`Unknown face identifier: ${face}`);
  }
  
  return faceCenter;
}

/**
 * Get the midpoint of a specific edge of a bounding box
 * @param {BoundingBox} boundingBox - The bounding box
 * @param {string} edge - Edge identifier (one of EDGES constants)
 * @returns {Vector} Midpoint of the edge
 */
export function getEdgeMidpoint(boundingBox, edge) {
  const [[xmin, ymin, zmin], [xmax, ymax, zmax]] = boundingBox.bounds;
  const center = boundingBox.center;
  
  let midpoint;
  switch (edge) {
    // Edges along X-axis (front and back edges)
    case EDGES.FRONT_TOP: midpoint = new Vector([center[0], ymin, zmax]); break;
    case EDGES.FRONT_BOTTOM: midpoint = new Vector([center[0], ymin, zmin]); break;
    case EDGES.BACK_TOP: midpoint = new Vector([center[0], ymax, zmax]); break;
    case EDGES.BACK_BOTTOM: midpoint = new Vector([center[0], ymax, zmin]); break;
    
    // Edges along Y-axis (left and right edges)
    case EDGES.LEFT_TOP: midpoint = new Vector([xmin, center[1], zmax]); break;
    case EDGES.LEFT_BOTTOM: midpoint = new Vector([xmin, center[1], zmin]); break;
    case EDGES.RIGHT_TOP: midpoint = new Vector([xmax, center[1], zmax]); break;
    case EDGES.RIGHT_BOTTOM: midpoint = new Vector([xmax, center[1], zmin]); break;
    
    // Edges along Z-axis (vertical edges)
    case EDGES.FRONT_LEFT: midpoint = new Vector([xmin, ymin, center[2]]); break;
    case EDGES.FRONT_RIGHT: midpoint = new Vector([xmax, ymin, center[2]]); break;
    case EDGES.BACK_LEFT: midpoint = new Vector([xmin, ymax, center[2]]); break;
    case EDGES.BACK_RIGHT: midpoint = new Vector([xmax, ymax, center[2]]); break;
    
    default:
      throw new Error(`Unknown edge identifier: ${edge}`);
  }
  
  return midpoint;
}

/**
 * Get the start point of a specific edge of a bounding box
 * @param {BoundingBox} boundingBox - The bounding box
 * @param {string} edge - Edge identifier (one of EDGES constants)
 * @returns {Vector} Start point of the edge
 */
export function getEdgeStartPoint(boundingBox, edge) {
  const [[xmin, ymin, zmin], [xmax, ymax, zmax]] = boundingBox.bounds;
  
  let startPoint;
  switch (edge) {
    // X-axis edges
    case EDGES.FRONT_TOP: startPoint = new Vector([xmin, ymin, zmax]); break;
    case EDGES.FRONT_BOTTOM: startPoint = new Vector([xmin, ymin, zmin]); break;
    case EDGES.BACK_TOP: startPoint = new Vector([xmin, ymax, zmax]); break;
    case EDGES.BACK_BOTTOM: startPoint = new Vector([xmin, ymax, zmin]); break;
    
    // Y-axis edges
    case EDGES.LEFT_TOP: startPoint = new Vector([xmin, ymin, zmax]); break;
    case EDGES.LEFT_BOTTOM: startPoint = new Vector([xmin, ymin, zmin]); break;
    case EDGES.RIGHT_TOP: startPoint = new Vector([xmax, ymin, zmax]); break;
    case EDGES.RIGHT_BOTTOM: startPoint = new Vector([xmax, ymin, zmin]); break;
    
    // Z-axis edges
    case EDGES.FRONT_LEFT: startPoint = new Vector([xmin, ymin, zmin]); break;
    case EDGES.FRONT_RIGHT: startPoint = new Vector([xmax, ymin, zmin]); break;
    case EDGES.BACK_LEFT: startPoint = new Vector([xmin, ymax, zmin]); break;
    case EDGES.BACK_RIGHT: startPoint = new Vector([xmax, ymax, zmin]); break;
    
    default:
      throw new Error(`Unknown edge identifier: ${edge}`);
  }
  
  return startPoint;
}

/**
 * Get the end point of a specific edge of a bounding box
 * @param {BoundingBox} boundingBox - The bounding box
 * @param {string} edge - Edge identifier (one of EDGES constants)
 * @returns {Vector} End point of the edge
 */
export function getEdgeEndPoint(boundingBox, edge) {
  const [[xmin, ymin, zmin], [xmax, ymax, zmax]] = boundingBox.bounds;
  
  let endPoint;
  switch (edge) {
    // X-axis edges
    case EDGES.FRONT_TOP: endPoint = new Vector([xmax, ymin, zmax]); break;
    case EDGES.FRONT_BOTTOM: endPoint = new Vector([xmax, ymin, zmin]); break;
    case EDGES.BACK_TOP: endPoint = new Vector([xmax, ymax, zmax]); break;
    case EDGES.BACK_BOTTOM: endPoint = new Vector([xmax, ymax, zmin]); break;
    
    // Y-axis edges
    case EDGES.LEFT_TOP: endPoint = new Vector([xmin, ymax, zmax]); break;
    case EDGES.LEFT_BOTTOM: endPoint = new Vector([xmin, ymax, zmin]); break;
    case EDGES.RIGHT_TOP: endPoint = new Vector([xmax, ymax, zmax]); break;
    case EDGES.RIGHT_BOTTOM: endPoint = new Vector([xmax, ymax, zmin]); break;
    
    // Z-axis edges
    case EDGES.FRONT_LEFT: endPoint = new Vector([xmin, ymin, zmax]); break;
    case EDGES.FRONT_RIGHT: endPoint = new Vector([xmax, ymin, zmax]); break;
    case EDGES.BACK_LEFT: endPoint = new Vector([xmin, ymax, zmax]); break;
    case EDGES.BACK_RIGHT: endPoint = new Vector([xmax, ymax, zmax]); break;
    
    default:
      throw new Error(`Unknown edge identifier: ${edge}`);
  }
  
  return endPoint;
}

/**
 * Get the faces that an edge connects
 * @param {string} edge - Edge identifier (one of EDGES constants)
 * @returns {Array<string>} Array of two face identifiers
 */
export function getEdgeConnectingFaces(edge) {
  switch (edge) {
    case EDGES.FRONT_LEFT: return [FACES.FRONT, FACES.LEFT];
    case EDGES.FRONT_RIGHT: return [FACES.FRONT, FACES.RIGHT];
    case EDGES.FRONT_TOP: return [FACES.FRONT, FACES.TOP];
    case EDGES.FRONT_BOTTOM: return [FACES.FRONT, FACES.BOTTOM];
    case EDGES.BACK_LEFT: return [FACES.BACK, FACES.LEFT];
    case EDGES.BACK_RIGHT: return [FACES.BACK, FACES.RIGHT];
    case EDGES.BACK_TOP: return [FACES.BACK, FACES.TOP];
    case EDGES.BACK_BOTTOM: return [FACES.BACK, FACES.BOTTOM];
    case EDGES.LEFT_TOP: return [FACES.LEFT, FACES.TOP];
    case EDGES.LEFT_BOTTOM: return [FACES.LEFT, FACES.BOTTOM];
    case EDGES.RIGHT_TOP: return [FACES.RIGHT, FACES.TOP];
    case EDGES.RIGHT_BOTTOM: return [FACES.RIGHT, FACES.BOTTOM];
    default:
      throw new Error(`Unknown edge identifier: ${edge}`);
  }
}

/**
 * Find the edge identifier from two connected face identifiers
 * @param {string} face1 - First face identifier (one of FACES constants)
 * @param {string} face2 - Second face identifier (one of FACES constants)
 * @returns {string} Edge identifier (one of EDGES constants)
 */
export function getEdgeFromFaces(face1, face2) {
  // Check if the faces are the same
  if (face1 === face2) {
    throw new Error("Cannot find edge between same face");
  }
  
  // Store valid pairs in a concise format
  const validPairs = [
    [FACES.FRONT, FACES.LEFT, EDGES.FRONT_LEFT],
    [FACES.FRONT, FACES.RIGHT, EDGES.FRONT_RIGHT],
    [FACES.FRONT, FACES.TOP, EDGES.FRONT_TOP],
    [FACES.FRONT, FACES.BOTTOM, EDGES.FRONT_BOTTOM],
    [FACES.BACK, FACES.LEFT, EDGES.BACK_LEFT],
    [FACES.BACK, FACES.RIGHT, EDGES.BACK_RIGHT],
    [FACES.BACK, FACES.TOP, EDGES.BACK_TOP],
    [FACES.BACK, FACES.BOTTOM, EDGES.BACK_BOTTOM],
    [FACES.LEFT, FACES.TOP, EDGES.LEFT_TOP],
    [FACES.LEFT, FACES.BOTTOM, EDGES.LEFT_BOTTOM],
    [FACES.RIGHT, FACES.TOP, EDGES.RIGHT_TOP],
    [FACES.RIGHT, FACES.BOTTOM, EDGES.RIGHT_BOTTOM]
  ];
  
  // Find the matching pair (in either order)
  for (const [f1, f2, edge] of validPairs) {
    if ((f1 === face1 && f2 === face2) || (f1 === face2 && f2 === face1)) {
      return edge;
    }
  }
  
  throw new Error(`No edge connects faces ${face1} and ${face2}`);
}

/**
 * Get arbitrary point on a bounding box face using normalized coordinates
 * @param {BoundingBox} boundingBox - The bounding box
 * @param {string} face - Face identifier (one of FACES constants)
 * @param {number} u - Normalized coordinate along first axis (0.0 to 1.0)
 * @param {number} v - Normalized coordinate along second axis (0.0 to 1.0)
 * @returns {Vector} Point on the face
 */
export function getPointOnFace(boundingBox, face, u = 0.5, v = 0.5) {
  const [[xmin, ymin, zmin], [xmax, ymax, zmax]] = boundingBox.bounds;
  
  // Clamp parameters to valid range
  const uParam = Math.max(0, Math.min(1, u));
  const vParam = Math.max(0, Math.min(1, v));
  
  let point;
  switch (face) {
    case FACES.FRONT: 
      point = new Vector([
        xmin + (xmax - xmin) * uParam, 
        ymin, 
        zmin + (zmax - zmin) * vParam
      ]); 
      break;
    case FACES.BACK: 
      point = new Vector([
        xmin + (xmax - xmin) * uParam, 
        ymax, 
        zmin + (zmax - zmin) * vParam
      ]); 
      break;
    case FACES.LEFT: 
      point = new Vector([
        xmin, 
        ymin + (ymax - ymin) * uParam, 
        zmin + (zmax - zmin) * vParam
      ]); 
      break;
    case FACES.RIGHT: 
      point = new Vector([
        xmax, 
        ymin + (ymax - ymin) * uParam, 
        zmin + (zmax - zmin) * vParam
      ]); 
      break;
    case FACES.TOP: 
      point = new Vector([
        xmin + (xmax - xmin) * uParam, 
        ymin + (ymax - ymin) * vParam, 
        zmax
      ]); 
      break;
    case FACES.BOTTOM: 
      point = new Vector([
        xmin + (xmax - xmin) * uParam, 
        ymin + (ymax - ymin) * vParam, 
        zmin
      ]); 
      break;
    default: 
      throw new Error(`Unknown face identifier: ${face}`);
  }
  
  return point;
}

/**
 * Get arbitrary point along a bounding box edge
 * @param {BoundingBox} boundingBox - The bounding box
 * @param {string} edge - Edge identifier (one of EDGES constants)
 * @param {number} t - Parameter along edge (0.0 to 1.0)
 * @returns {Vector} Point on the edge
 */
export function getPointOnEdge(boundingBox, edge, t = 0.5) {
  // Clamp parameter to valid range
  const tParam = Math.max(0, Math.min(1, t));
  
  const startPoint = getEdgeStartPoint(boundingBox, edge);
  const endPoint = getEdgeEndPoint(boundingBox, edge);
  
  // Linear interpolation between start and end points
  return new Vector([
    startPoint.x + (endPoint.x - startPoint.x) * tParam,
    startPoint.y + (endPoint.y - startPoint.y) * tParam,
    startPoint.z + (endPoint.z - startPoint.z) * tParam
  ]);
}

/**
 * Get arbitrary point on a bounding box by specifying a generic position
 * @param {BoundingBox} boundingBox - The bounding box
 * @param {Object} position - Position specification object
 * @param {string} position.type - Type of position ('face', 'edge', 'corner', or 'center')
 * @param {string} position.element - Element identifier (face or edge name)
 * @param {Object} position.params - Parameters for position (u,v for face, t for edge)
 * @returns {Vector} Point on the bounding box
 */
export function getPointOnBoundingBox(boundingBox, position) {
  const { type, element, params = {} } = position;
  
  switch (type) {
    case 'face':
      return getPointOnFace(boundingBox, element, params.u, params.v);
    case 'edge':
      return getPointOnEdge(boundingBox, element, params.t);
    case 'corner':
      // Corners are just the start or end points of edges
      if (element.includes('START')) {
        const edgeName = element.replace('_START', '');
        return getEdgeStartPoint(boundingBox, edgeName);
      } else if (element.includes('END')) {
        const edgeName = element.replace('_END', '');
        return getEdgeEndPoint(boundingBox, edgeName);
      } else {
        throw new Error(`Invalid corner identifier: ${element}`);
      }
    case 'center':
      return new Vector(boundingBox.center);
    default:
      throw new Error(`Unknown position type: ${type}`);
  }
}