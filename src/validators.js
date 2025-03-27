export function isNumber(value, param) {
  if (typeof value !== 'number' || isNaN(value)) {
    return {
      valid: false,
      message: `Parameter '${param}' must be a number`
    };
  }
  return { valid: true };
}

export function isGreaterThanZero(value, param) {
  if (value <= 0) {
    return {
      valid: false,
      message: `Parameter '${param}' must be positive`
    };
  }
  return { valid: true };
}

export function isLessThan(value, compareValue, param) {
  if (value >= compareValue) {
    return {
      valid: false,
      message: `${param} (${value}) must be less than ${compareValue}`
    };
  }
  return { valid: true };
}

// Composed validators
export function isPositive(value, param) {
  const numberCheck = isNumber(value, param);
  if (!numberCheck.valid) return numberCheck;
  return isGreaterThanZero(value, param);
}

export function lessThan(value, compareValue, param) {
  const numberCheck = isNumber(value, param);
  if (!numberCheck.valid) return numberCheck;
  return isLessThan(value, compareValue, param);
}

// New function to validate multiple parameters with the same validator
export function validateAll(validator, paramNames) {
  return (params) => {
    const errors = [];
    for (const paramName of paramNames) {
      const result = validator(params[paramName], paramName);
      if (!result.valid) {
        errors.push(result.message);
      }
    }
    return { valid: errors.length === 0, errors };
  };
}

// Special validator to check one param is less than another
export function validateLessThan(smallerParam, largerParam) {
  return (params) => {
    const smaller = params[smallerParam];
    const larger = params[largerParam];
    const result = lessThan(smaller, larger, smallerParam);
    
    if (!result.valid) {
      return {
        valid: false,
        errors: [result.message]
      };
    }
    return { valid: true, errors: [] };
  };
}

// Validate a full set of parameters
export function validateModelParams(params, model) {
  let isValid = true;
  const errors = [];
  
  // First process individual parameter validators from params array
  if (model.params) {
    for (const paramDef of model.params) {
      const { name, validators } = paramDef;
      if (!validators) continue;
      
      const value = params[name];
      
      for (const validator of validators) {
        const result = validator(value, name);
        if (!result.valid) {
          isValid = false;
          errors.push(result.message);
          break; // No need to check other validators for this param
        }
      }
    }
  }
  
  // Then process model-level validators if they exist
  if (model.validators) {
    for (const validator of model.validators) {
      const result = validator(params);
      if (!result.valid) {
        isValid = false;
        errors.push(...result.errors);
      }
    }
  }
  
  return { valid: isValid, errors };
}