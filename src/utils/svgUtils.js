/**
 * Parse viewBox string to get dimensions
 * @param {string} viewBoxString - SVG viewBox string
 * @returns {Object|null} Parsed viewBox object or null if invalid
 */
export function parseViewBox(viewBoxString) {
  if (!viewBoxString || typeof viewBoxString !== 'string') {
    return null;
  }

  const parts = viewBoxString.split(/[\s,]+/).map(parseFloat); // Allow comma separation
  if (parts.length !== 4 || parts.some(isNaN)) {
     console.warn("Could not parse viewBox string:", viewBoxString);
    return null;
  }

  // Ensure width and height are non-negative
  const width = Math.max(0, parts[2]);
  const height = Math.max(0, parts[3]);


  return {
    x: parts[0],
    y: parts[1],
    width: width,
    height: height
  };
}

/**
 * Convert screen coords to SVG coords
 * @param {SVGElement} svgElement - The target SVG element for coordinate transformation
 * @param {number} x - Screen X coordinate
 * @param {number} y - Screen Y coordinate
 * @returns {Object} SVG coordinates { x, y }
 */
export function screenToSVGCoords(svgElement, x, y) {
  if (!svgElement) return { x: 0, y: 0 };
  const pt = svgElement.createSVGPoint();
  pt.x = x;
  pt.y = y;

  const ctm = svgElement.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  try {
      const svgP = pt.matrixTransform(ctm.inverse());
      return { x: svgP.x, y: svgP.y };
  } catch (e) {
      console.error("Error inverting CTM:", e);
      return { x: 0, y: 0 }; // Fallback on error
  }
}

/**
 * Helper function to combine two viewbox strings
 * @param {string} viewBox1 - First viewBox string
 * @param {string} viewBox2 - Second viewBox string
 * @returns {string} Combined viewBox string
 */
export function combineViewBoxes(viewBox1, viewBox2) {
  // Default empty viewBox
  const defaultViewBox = "0 0 100 100";

  // Parse viewBox strings using the utility function
  const box1 = parseViewBox(viewBox1);
  const box2 = parseViewBox(viewBox2);

  // Handle cases where one or both are invalid/null
  if (!box1 && !box2) return defaultViewBox;
  if (!box1) return viewBox2 || defaultViewBox;
  if (!box2) return viewBox1 || defaultViewBox;

  // Find the combined bounds
  const minX = Math.min(box1.x, box2.x);
  const minY = Math.min(box1.y, box2.y);
  const maxX = Math.max(box1.x + box1.width, box2.x + box2.width);
  const maxY = Math.max(box1.y + box1.height, box2.y + box2.height);

  // Ensure width and height are non-negative
  const width = Math.max(0, maxX - minX);
  const height = Math.max(0, maxY - minY);

  return `${minX} ${minY} ${width} ${height}`;
}
