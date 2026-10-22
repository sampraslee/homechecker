import type { AiSuggestionView } from "../core";

/** What the AI Suggestions list shows: the unreviewed ones to act on, and rejected ones that can be reviewed again. Confirmed and corrected ones are Defects now. */
export function suggestionsToReview(suggestions: AiSuggestionView[]): AiSuggestionView[] {
  return suggestions.filter((suggestion) => suggestion.outcome === "unreviewed" || suggestion.outcome === "rejected");
}

/** Suggestions grouped by the photo they came from, in the order the photos first appear. */
export function groupByEvidence(suggestions: AiSuggestionView[]): { evidenceId: string; list: AiSuggestionView[] }[] {
  const groups: { evidenceId: string; list: AiSuggestionView[] }[] = [];
  for (const suggestion of suggestions) {
    const group = groups.find((each) => each.evidenceId === suggestion.evidenceId);
    if (group) group.list.push(suggestion);
    else groups.push({ evidenceId: suggestion.evidenceId, list: [suggestion] });
  }
  return groups;
}
