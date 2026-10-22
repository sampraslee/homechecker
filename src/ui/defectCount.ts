/** The Defect count on an Inspection card's meta line, e.g. "7 Defects". */
export function defectCountLabel(count: number): string {
  if (count === 0) return "No Defects";
  return count === 1 ? "1 Defect" : `${count} Defects`;
}
