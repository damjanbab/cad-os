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

// Validate a full set of parameters
export function validateModelParams(params, model) {
  let isValid = true;
  const errors = [];
  
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
  
  return { valid: isValid, errors };
}