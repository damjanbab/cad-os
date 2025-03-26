// helpers/explosion.js
import { Vector } from "replicad";

/**
 * Apply explosion transformation to a component
 * @param {Object} component - The component to transform
 * @param {Array} direction - Direction vector for explosion
 * @param {number} distance - Distance to explode
 * @param {number} factor - Explosion factor (0-1)
 * @returns {Object} Transformed component
 */
export function explodeComponent(component, direction, distance, factor = 1) {
  // Simple linear translation based on direction, distance and factor
  return component.translate([
    direction[0] * distance * factor,
    direction[1] * distance * factor,
    direction[2] * distance * factor
  ]);
}

/**
 * Apply radial explosion to a group of components from a center point
 * @param {Array} components - Array of components to explode
 * @param {Array} center - Center point of explosion [x, y, z]
 * @param {number} factor - Explosion factor (0-1)
 * @returns {Array} Exploded components
 */
export function radialExplode(components, center, factor = 1) {
  return components.map(component => {
    // Get component center
    const componentCenter = component.boundingBox.center;
    
    // Calculate direction vector from center to component
    const direction = [
      componentCenter[0] - center[0],
      componentCenter[1] - center[1],
      componentCenter[2] - center[2]
    ];
    
    // Normalize direction
    const length = Math.sqrt(
      direction[0] * direction[0] + 
      direction[1] * direction[1] + 
      direction[2] * direction[2]
    );
    
    if (length < 0.001) {
      // Component is at center - just return it
      return component;
    }
    
    const normalizedDir = [
      direction[0] / length,
      direction[1] / length,
      direction[2] / length
    ];
    
    // Apply explosion - distance is relative to length
    return explodeComponent(component, normalizedDir, length, factor);
  });
}

/**
 * Apply directional explosion to components
 * @param {Array} components - Array of components to explode
 * @param {Array} directions - Array of direction vectors for each component
 * @param {Array} distances - Array of distances for each component
 * @param {number} factor - Explosion factor (0-1)
 * @returns {Array} Exploded components
 */
export function directionalExplode(components, directions, distances, factor = 1) {
  return components.map((component, index) => {
    return explodeComponent(
      component, 
      directions[index] || [0, 0, 1], 
      distances[index] || 10, 
      factor
    );
  });
}

/**
 * Apply axis explosion to components (separates along a single axis)
 * @param {Array} components - Array of components to explode
 * @param {string} axis - Axis to explode along ('x', 'y', or 'z')
 * @param {Array} positions - Array of positions along the axis
 * @param {number} spacing - Spacing between components
 * @param {number} factor - Explosion factor (0-1)
 * @returns {Array} Exploded components
 */
export function axisExplode(components, axis, positions, spacing = 10, factor = 1) {
  const axisIndex = axis === 'x' ? 0 : (axis === 'y' ? 1 : 2);
  const direction = [0, 0, 0];
  direction[axisIndex] = 1;
  
  return components.map((component, index) => {
    const position = positions[index] || 0;
    const distance = position * spacing;
    return explodeComponent(component, direction, distance, factor);
  });
}

/**
 * Apply layered explosion to components (vertical stacking with increasing distance)
 * @param {Array} components - Array of components to explode
 * @param {number} baseSpacing - Base spacing between components
 * @param {number} factor - Explosion factor (0-1)
 * @returns {Array} Exploded components
 */
export function layeredExplode(components, baseSpacing = 10, factor = 1) {
  return components.map((component, index) => {
    const layerDistance = baseSpacing * (index + 1);
    return explodeComponent(component, [0, 0, 1], layerDistance, factor);
  });
}