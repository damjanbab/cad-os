// modelValidation.js
import { 
  validateAll, 
  isPositive,
  isNumber,
  lessThan,
  halfOfMin
} from './validator.js';

export const modelSchemas = {
  "Cuboid": [
    // Validate all parameters are positive numbers
    validateAll(isPositive, 'width', 'depth', 'height')
  ],
  "Sphere": [
    // Validate radius is positive
    validateAll(isPositive, 'radius')
  ],
  "Cylinder": [
    // Validate radius and height are positive
    validateAll(isPositive, 'radius', 'height')
  ],
  "Ellipsoid": [
    // Validate all dimensions are positive
    validateAll(isPositive, 'aLength', 'bLength', 'cLength')
  ],
  "DiagonalCuboidPattern": [
    // Validate count is positive
    validateAll(isPositive, 'count')
  ],
  "RectangularCuboidGrid": [
    // Validate grid parameters
    validateAll(isPositive, 'rowCount', 'colCount', 'xSpacing', 'ySpacing', 'boxWidth', 'boxDepth', 'boxHeight')
  ],
  "LProfile": [
    // Validate all parameters are positive numbers
    validateAll(isPositive, 'depth', 'flangeXLenght', 'flangeYLenght', 'thickness'),
    // Validate thickness is less than flange dimensions
    (params) => lessThan(params, 'thickness', params.flange1Width),
    (params) => lessThan(params, 'thickness', params.flange2Width)
  ],
  "Frustum": [
    // Validate radius and height parameters are positive
    validateAll(isPositive, 'bottomRadius', 'topRadius', 'height')
  ],
  "Drill": [
    // Validate all dimension parameters are positive numbers
    validateAll(isPositive, 'bottomRadius', 'topRadius', 'frustumHeight', 'cylinderHeight')
  ],
  // Add this to modelValidation.js
  "HelperCuboid": [
    // Validate dimensions are positive
    validateAll(isPositive, 'width', 'depth', 'height'),
    // No validation for explosionFactor as it can be 0
  ]
};