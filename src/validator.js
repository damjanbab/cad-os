// validator.js - Elegant functional validators with proper composition

// Basic validators - each does exactly one thing
export function isNumber(params, param) {
  if (typeof params[param] !== 'number' || isNaN(params[param])) {
    return {
      valid: false,
      message: `Parameter '${param}' must be a number`
    };
  }
  return { valid: true };
}

export function isGreaterThanZero(params, param) {
  if (params[param] <= 0) {
    return {
      valid: false,
      message: `Parameter '${param}' must be positive`
    };
  }
  return { valid: true };
}

export function isLessThan(params, param, compareValue) {
  const value = params[param];
  if (value >= compareValue) {
    return {
      valid: false,
      message: `${param} (${value}) must be less than ${compareValue}`
    };
  }
  return { valid: true };
}

// Helper functions
export function halfOfMin(params, dimensions) {
  const values = dimensions.map(dim => params[dim]);
  return Math.min(...values) / 2;
}

// Functional composition utilities
export function validateAll(validator, ...params) {
  return (allParams) => {
    for (const param of params) {
      const result = validator(allParams, param);
      if (!result.valid) return result;
    }
    return { valid: true };
  };
}

export function validateWith(param, ...validators) {
  return (allParams) => {
    for (const validator of validators) {
      const result = validator(allParams, param);
      if (!result.valid) return result;
    }
    return { valid: true };
  };
}

export function combine(...validatorFns) {
  return (params) => {
    for (const validator of validatorFns) {
      const result = validator(params);
      if (!result.valid) return result;
    }
    return { valid: true };
  };
}

// Composed validators using combine
export const isPositive = (params, param) => 
  combine(
    (p) => isNumber(p, param),
    (p) => isGreaterThanZero(p, param)
  )(params);

export const lessThan = (params, param, compareValue) => 
  combine(
    (p) => isNumber(p, param),
    (p) => isLessThan(p, param, compareValue)
  )(params);

// Validation runner
export function validateModelParams(params, validators) {
  let isValid = true;
  const errors = [];
  
  for (const validator of validators) {
    const result = validator(params);
    if (!result.valid) {
      isValid = false;
      errors.push(result.message);
    }
  }
  
  return { valid: isValid, errors };
}

// Import model metadata to use for validation
import { modelMetadata } from './models/metadata.js';

// Higher-order function to apply validation to model functions
export function withValidation(modelFn, validators, modelName) {
  const wrappedFn = (...args) => {
    // Get parameter metadata for this model
    const paramInfo = modelMetadata[modelName].params;
    
    // Create params object by mapping the named parameters
    const params = {};
    paramInfo.forEach((param, index) => {
      params[param.name] = args[index];
    });
    
    // Validate params
    const validation = validateModelParams(params, validators);
    
    if (validation.valid) {
      return modelFn(...args);
    }
    
    // Return validation result instead of model
    return { validationErrors: validation.errors };
  };
  
  // Store original function for reference
  wrappedFn.original = modelFn;
  
  return wrappedFn;
}