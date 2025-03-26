// helperUtils.js
import { compoundShapes } from "replicad";

/**
 * Utility to combine a model with helper spaces
 * 
 * @param {Object} mainModel - The main replicad model
 * @param {Array<Object>} helperSpaces - Array of helper space models
 * @returns {Object} Object with main model and helper spaces
 */
export function modelWithHelpers(mainModel, helperSpaces) {
  return {
    main: mainModel,
    helperSpaces: helperSpaces
  };
}

/**
 * Utility to handle exports by stripping helper spaces
 * Only exports the main model, not the helper spaces
 * 
 * @param {Object} modelWithHelpers - Model with helper spaces
 * @returns {Object} Just the main model for export
 */
export function exportableModel(modelWithHelpers) {
  return modelWithHelpers.main || modelWithHelpers;
}