import { VIDEO_TIME_LIMIT_SECONDS, type AiSuggestionView, type Evidence, type InspectionStatus, type RefusalReason, type UnitAddress } from "../core";

export { inspectionTypeLabel } from "../core";

export const inspectionStatusLabel: Record<InspectionStatus, string> = {
  draft: "Draft",
  completed: "Completed",
};

/** Where review of an AI Suggestion stands, e.g. "Corrected to Hinge Fault". */
export function aiOutcomeLabel(suggestion: AiSuggestionView): string {
  switch (suggestion.outcome) {
    case "unreviewed":
      return "Not reviewed";
    case "confirmed":
      return "Confirmed";
    case "corrected":
      return `Corrected to ${suggestion.correctedDefectTypeName}`;
    case "rejected":
      return "Rejected";
  }
}

/** Shown on a Completed Inspection's screens in place of the editing controls. */
export const lockedNotice = "This Inspection is Completed, so it can't be changed.";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short" });
}

/** A video's length as m:ss, e.g. 0:09. */
export function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** Words for every reason the core can refuse an operation. */
export const refusalMessage: Record<RefusalReason, string> = {
  "inspector-name-required": "Enter your name",
  "invalid-address": "Check the address",
  "inspection-not-found": "This Inspection is not on this phone",
  "not-a-move-in": "A Move-out can only be linked to a Move-in",
  "inspection-completed": "This Inspection is Completed and can't be changed",
  "unknown-standard-area": "That Area is not in the standard list",
  "area-not-found": "This Area is not on this phone",
  "area-name-required": "Enter a name",
  "area-name-taken": "Another Area already has this name",
  "area-has-items": "Remove this Area's Items first",
  "unknown-catalog-item": "That Item is not in the Item Catalog",
  "item-not-found": "This Item is not on this phone",
  "item-name-required": "Enter a name",
  "item-has-evidence": "Delete this Item's Evidence first",
  "item-has-defects": "Remove this Item's Defects first",
  "evidence-not-found": "This Evidence is not on this phone",
  "unknown-defect-type": "That Defect Type is not in the Defect Dictionary",
  "defect-type-already-recorded": "This Item already has that Defect",
  "evidence-not-on-item": "Only this Item's Evidence can be linked",
  "note-required": "Add a note describing what you see",
  "defect-not-found": "This Defect is not on this phone",
  "video-too-long": `Videos can be at most ${VIDEO_TIME_LIMIT_SECONDS} seconds`,
  "blank-note": "Write something in the note",
  "evidence-not-a-note": "Only a note's text can be edited",
  "ai-suggestion-not-found": "This AI Suggestion is not on this phone",
  "ai-suggestion-already-reviewed": "This AI Suggestion has already been reviewed",
};

/** The part of a Unit's address an Inspector says out loud, e.g. "A-12-3, Residensi Harmoni". */
export function shortAddress(address: UnitAddress): string {
  return `${address.unitNumber}, ${address.buildingName || address.street}`;
}

/** What some Evidence is made of, e.g. "4 photos, 1 video"; empty when there is none. */
export function countEvidence(evidence: Evidence[]): string {
  const plural = (count: number, one: string) => (count === 1 ? `1 ${one}` : `${count} ${one}s`);
  const counts: [number, string][] = [
    [evidence.filter((e) => e.kind === "photo").length, "photo"],
    [evidence.filter((e) => e.kind === "video").length, "video"],
    [evidence.filter((e) => e.kind === "note").length, "note"],
  ];
  return counts
    .filter(([count]) => count > 0)
    .map(([count, one]) => plural(count, one))
    .join(", ");
}
