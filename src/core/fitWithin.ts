export interface Dimensions {
  width: number;
  height: number;
}

/** The size that fits a photo within a longest edge, keeping its proportions. Never enlarges. */
export function fitWithin(size: Dimensions, longestEdge: number): Dimensions {
  const scale = Math.min(1, longestEdge / Math.max(size.width, size.height));
  return { width: Math.round(size.width * scale), height: Math.round(size.height * scale) };
}
