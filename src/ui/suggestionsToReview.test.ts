import { describe, expect, test } from "vitest";
import type { AiSuggestionOutcome, AiSuggestionView } from "../core";
import { groupByEvidence, suggestionsToReview } from "./suggestionsToReview";

function suggestion(id: string, outcome: AiSuggestionOutcome, evidenceId = "e1") {
  return { id, outcome, evidenceId } as AiSuggestionView;
}

describe("suggestionsToReview", () => {
  test("keeps unreviewed and rejected suggestions, drops confirmed and corrected ones", () => {
    const all = [suggestion("a", "unreviewed"), suggestion("b", "rejected"), suggestion("c", "confirmed"), suggestion("d", "corrected")];
    expect(suggestionsToReview(all).map((each) => each.id)).toEqual(["a", "b"]);
  });
});

describe("groupByEvidence", () => {
  test("groups by photo, in the order photos first appear", () => {
    const all = [suggestion("a", "unreviewed", "e2"), suggestion("b", "unreviewed", "e1"), suggestion("c", "rejected", "e2")];
    expect(groupByEvidence(all).map((group) => [group.evidenceId, group.list.map((each) => each.id)])).toEqual([
      ["e2", ["a", "c"]],
      ["e1", ["b"]],
    ]);
  });
});
