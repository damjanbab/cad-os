// Utility functions for parsing, transforming, and serializing SVG path data

/**
 * Parses an SVG path data string into an array of command objects.
 * @param {string} d - The SVG path data string.
 * @returns {Array<{command: string, values: number[]}>} Array of command objects.
 */
export function parsePathData(d) {
  if (!d || typeof d !== 'string') {
    console.error("Invalid input to parsePathData:", d);
    return [];
  }
  // Regex to capture command letter and subsequent parameters
  const commandRegex = /([MLHVCSQTAZ])([^MLHVCSQTAZ]*)/ig;
  const commands = [];
  let match;

  while ((match = commandRegex.exec(d)) !== null) {
    const command = match[1];
    const paramString = match[2].trim();
    // Regex to extract numeric parameters, handling scientific notation
    const paramRegex = /[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g;
    const values = (paramString.match(paramRegex) || []).map(Number);

    // Basic validation: Check if any parameter failed to parse as a number
    if (values.some(isNaN)) {
      console.warn(`[svgPathUtils] Skipping command due to invalid parameters: ${match[0]}`);
      continue; // Skip this command if parameters are invalid
    }

    commands.push({ command, values });
  }
  return commands;
}

/**
 * Transforms the coordinates within a parsed path data array by applying a translation.
 * Only absolute commands (uppercase, except Z) are transformed.
 * @param {Array<{command: string, values: number[]}>} pathDataArray - Parsed path data.
 * @param {number} tx - Translation in the x-direction.
 * @param {number} ty - Translation in the y-direction.
 */
export function transformPathData(pathDataArray, tx, ty) {
  if (tx === 0 && ty === 0) return; // No transformation needed

  pathDataArray.forEach(item => {
    const command = item.command;
    const values = item.values;

    // Only transform absolute coordinates (uppercase commands, excluding Z)
    if (command === command.toUpperCase() && command !== 'Z') {
      for (let i = 0; i < values.length; i++) {
        switch (command) {
          case 'M': // MoveTo: x, y
          case 'L': // LineTo: x, y
          case 'T': // Smooth quadratic Bézier curve: x, y
            values[i] += (i % 2 === 0) ? tx : ty; // Alternate x and y
            break;
          case 'H': // Horizontal LineTo: x
            values[i] += tx;
            break;
          case 'V': // Vertical LineTo: y
            values[i] += ty;
            break;
          case 'C': // Cubic Bézier curve: x1, y1, x2, y2, x, y
            values[i] += (i % 2 === 0) ? tx : ty; // Alternate x and y
            break;
          case 'S': // Smooth cubic Bézier curve: x2, y2, x, y
          case 'Q': // Quadratic Bézier curve: x1, y1, x, y
            values[i] += (i % 2 === 0) ? tx : ty; // Alternate x and y
            break;
          case 'A': // Elliptical Arc: rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y
            // Only transform the final x, y coordinates (indices 5 and 6)
            if (i >= 5) {
              values[i] += (i % 2 !== 0) ? tx : ty; // Index 5 is x, Index 6 is y
            }
            break;
          // No transformation needed for Z/z
        }
      }
    }
  });
  // Note: This function modifies the input array in place.
}

/**
 * Scales the coordinates and relevant parameters within a parsed path data array.
 * Modifies the input array in place.
 * @param {Array<{command: string, values: number[]}>} pathDataArray - Parsed path data.
 * @param {number} scale - The scaling factor.
 */
export function scalePathData(pathDataArray, scale) {
  if (scale === 1 || !pathDataArray) return; // No scaling needed or invalid input

  pathDataArray.forEach(item => {
    const command = item.command;
    const values = item.values;

    // Scale absolute and relative coordinates/values
    // For relative commands (lowercase), the offsets/deltas are scaled.
    // For absolute commands (uppercase), the absolute coordinates are scaled.
    // Z/z command has no values.
    if (command.toUpperCase() !== 'Z') {
      for (let i = 0; i < values.length; i++) {
        switch (command.toUpperCase()) {
          case 'M': // MoveTo: x, y
          case 'L': // LineTo: x, y
          case 'T': // Smooth quadratic Bézier curve: x, y
          case 'C': // Cubic Bézier curve: x1, y1, x2, y2, x, y
          case 'S': // Smooth cubic Bézier curve: x2, y2, x, y
          case 'Q': // Quadratic Bézier curve: x1, y1, x, y
            values[i] *= scale; // Scale x and y coordinates
            break;
          case 'H': // Horizontal LineTo: x
          case 'V': // Vertical LineTo: y
            values[i] *= scale; // Scale x or y coordinate
            break;
          case 'A': // Elliptical Arc: rx, ry, x-axis-rotation, large-arc-flag, sweep-flag, x, y
            // Scale radii (rx, ry) and the final endpoint (x, y)
            // Flags and rotation remain unchanged.
            if (i < 2 || i >= 5) {
              values[i] *= scale;
            }
            break;
        }
      }
    }
  });
  // Note: This function modifies the input array in place.
}


/**
 * Serializes a parsed path data array back into an SVG path data string.
 * Formats numbers to a fixed precision or exponential notation for large/small values.
 * @param {Array<{command: string, values: number[]}>} pathDataArray - Parsed path data.
 * @returns {string} The SVG path data string.
 */
export function serializePathData(pathDataArray) {
  return pathDataArray.map(item => {
    const paramsString = item.values.map(v => {
      // Use exponential notation for very large or very small numbers (excluding 0)
      if (Math.abs(v) > 1e6 || (Math.abs(v) < 1e-4 && v !== 0)) {
        return v.toExponential(4);
      }
      // Otherwise, format to a fixed number of decimal places
      return parseFloat(v.toFixed(4));
    }).join(' '); // Use space as separator
    return `${item.command}${paramsString}`;
  }).join(''); // Join commands without extra spaces
}
