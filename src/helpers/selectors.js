// helpers/selectors.js
// Functions for selecting reference points on models

/**
 * Helper to select geometric center of a model
 * @param {Object} model - The model to get center point from
 * @returns {Array} Center coordinates [x, y, z]
 */
export const centerSelector = (model) => model.boundingBox.center;