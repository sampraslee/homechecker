import { useRef } from "react";

/**
 * Of `ids`, those that appeared after the screen first loaded (`ready`): new photos, Defects, Items, Areas
 * or AI Suggestions, which get a short arrival animation. What was there on opening never animates.
 */
export function useArrivals(ids: string[], ready: boolean): Set<string> {
  const baseline = useRef<Set<string> | null>(null);
  if (ready && baseline.current === null) baseline.current = new Set(ids);
  const seen = baseline.current;
  return new Set(seen ? ids.filter((id) => !seen.has(id)) : []);
}
