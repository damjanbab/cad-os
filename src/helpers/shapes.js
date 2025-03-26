// helpers/shapes.js
import { cast } from 'replicad';

/**
 * Mirrors a shape, with option to keep the original intact by working on a clone
 * @param {Object} shape - The shape to mirror
 * @param {string|Array} plane - Mirror plane (either "XY", "YZ", "XZ" or a normal vector)
 * @param {Array} [center] - Optional center point of mirroring
 * @param {boolean} [keepOriginal=false] - When true, creates a clone first to keep original intact
 * @returns {Object} The mirrored shape
 */
export function mirror(shape, plane, center, keepOriginal = false) {
  if (keepOriginal) {
    // Create a proper copy using cast, then mirror it
    const clone = cast(shape.wrapped);
    return clone.mirror(plane, center);
  } else {
    // Directly mirror the original shape
    return shape.mirror(plane, center);
  }
}