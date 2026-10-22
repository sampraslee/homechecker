import { describe, expect, test } from "vitest";
import { defectCountLabel } from "./defectCount";

describe("the Defect count on an Inspection card", () => {
  test("says No Defects for none", () => {
    expect(defectCountLabel(0)).toBe("No Defects");
  });
  test("is singular for one", () => {
    expect(defectCountLabel(1)).toBe("1 Defect");
  });
  test("is plural for several", () => {
    expect(defectCountLabel(7)).toBe("7 Defects");
  });
});
