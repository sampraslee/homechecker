import { AI_CONFIDENCES, type AiConfidence, type AiSuggestionView, type DefectView } from "../core";

/** Where a Defect came from, as its card says: a confirmed AI Suggestion (with its confidence), or the Inspector's own entry. */
export type DefectOrigin = { kind: "ai-suggested"; confidence: AiConfidence } | { kind: "manual" };

/**
 * A Defect is AI suggested only when the Inspector confirmed an AI Suggestion for its Defect Type on the same Item;
 * a corrected suggestion was wrong about the Defect Type, so its Defect counts as manual. With several confirmed
 * suggestions, the highest confidence is shown.
 */
export function defectOrigin(defect: DefectView, suggestions: AiSuggestionView[]): DefectOrigin {
  const confirmed = suggestions.filter(
    (suggestion) =>
      suggestion.itemId === defect.itemId && suggestion.outcome === "confirmed" && suggestion.defectTypeCode === defect.defectTypeCode,
  );
  if (confirmed.length === 0) return { kind: "manual" };
  // AI_CONFIDENCES runs High, Medium, Low.
  const best = Math.min(...confirmed.map((suggestion) => AI_CONFIDENCES.indexOf(suggestion.confidence)));
  return { kind: "ai-suggested", confidence: AI_CONFIDENCES[best] };
}
