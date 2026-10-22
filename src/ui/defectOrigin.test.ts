import { describe, expect, test } from "vitest";
import type { AiConfidence, AiSuggestionOutcome, AiSuggestionView, DefectView } from "../core";
import { defectOrigin } from "./defectOrigin";

const defect = { id: "d1", itemId: "i1", defectTypeCode: "SF-SCRATCH" } as DefectView;

function suggestion(outcome: AiSuggestionOutcome, confidence: AiConfidence, overrides: Partial<AiSuggestionView> = {}) {
  return { id: `${outcome}-${confidence}`, itemId: "i1", defectTypeCode: "SF-SCRATCH", outcome, confidence, ...overrides } as AiSuggestionView;
}

describe("defectOrigin", () => {
  test("a Defect with no confirmed suggestion is manual", () => {
    expect(defectOrigin(defect, [])).toEqual({ kind: "manual" });
  });

  test("a confirmed suggestion makes it AI suggested, with that confidence", () => {
    expect(defectOrigin(defect, [suggestion("confirmed", "Medium")])).toEqual({ kind: "ai-suggested", confidence: "Medium" });
  });

  test("a corrected suggestion leaves it manual", () => {
    expect(defectOrigin(defect, [suggestion("corrected", "High")])).toEqual({ kind: "manual" });
  });

  test("unreviewed and rejected suggestions don't count", () => {
    expect(defectOrigin(defect, [suggestion("unreviewed", "High"), suggestion("rejected", "High")])).toEqual({ kind: "manual" });
  });

  test("with several confirmed suggestions, the highest confidence shows", () => {
    const list = [suggestion("confirmed", "Low"), suggestion("confirmed", "High"), suggestion("confirmed", "Medium")];
    expect(defectOrigin(defect, list)).toEqual({ kind: "ai-suggested", confidence: "High" });
  });

  test("suggestions for another Defect Type or Item don't count", () => {
    const list = [suggestion("confirmed", "High", { defectTypeCode: "SF-DENT" }), suggestion("confirmed", "High", { itemId: "i2" })];
    expect(defectOrigin(defect, list)).toEqual({ kind: "manual" });
  });
});
