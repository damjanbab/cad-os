// Tolerance for floating point comparisons
export const TOLERANCE = 1e-6;

/**
 * Basic vector operations
 */
export const vec = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  add: (a, b) => [a[0] + b[0], a[1] + b[1]],
  scale: (a, s) => [a[0] * s, a[1] * s],
  len: (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1]),
  normalize: (a) => {
    const l = vec.len(a);
    return l > 1e-9 ? vec.scale(a, 1 / l) : [0, 0];
  },
  perp: (a) => [-a[1], a[0]], // Perpendicular vector (rotated 90 deg CCW)
  dot: (a, b) => a[0] * b[0] + a[1] * b[1],
};


/**
 * Check if two points are close within a tolerance
 */
export function arePointsClose(p1, p2, tolerance = TOLERANCE) {
  if (!p1 || !p2) return false;
  return Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2)) < tolerance;
}

/**
 * Check if three points are collinear within a tolerance
 * Uses the area of the triangle method.
 */
export function areCollinear(p1, p2, p3, tolerance = TOLERANCE) {
  if (!p1 || !p2 || !p3) return false;
  // Check for vertical line first to avoid division by zero or large slopes
  if (Math.abs(p1[0] - p2[0]) < tolerance && Math.abs(p2[0] - p3[0]) < tolerance) {
    return true;
  }
  // Check for horizontal line
  if (Math.abs(p1[1] - p2[1]) < tolerance && Math.abs(p2[1] - p3[1]) < tolerance) {
    return true;
  }
  // Calculate the area of the triangle formed by the three points
  // Using a robust method less prone to floating point issues with large coordinates
  const area = Math.abs((p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1]));
  // Normalize by the length of the base segment (p1 to p3) to get a relative tolerance
  const baseLengthSq = Math.pow(p3[0] - p1[0], 2) + Math.pow(p3[1] - p1[1], 2);
  // Avoid division by zero for coincident points
  if (baseLengthSq < tolerance * tolerance) return true;
  // Compare area relative to base length
  return area / Math.sqrt(baseLengthSq) < tolerance;
}
