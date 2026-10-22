import {
  inspectionTypeLabel,
  VIDEO_TIME_LIMIT_SECONDS,
  type AiSuggestionView,
  type Evidence,
  type InspectionStatus,
  type InspectionType,
  type RefusalReason,
  type UnitAddress,
} from "../core";

export { inspectionTypeLabel };

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

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-MY", { hour: "numeric", minute: "2-digit" });
}

/** A video's length as m:ss, e.g. 0:09. */
export function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** Words for every reason the core can refuse an operation. */
export const refusalMessage: Record<RefusalReason, string> = {
  "inspector-name-required": "Enter your name first.",
  "invalid-address": "Fix the address fields marked below.",
  "inspection-not-found": "This Inspection isn't on this phone.",
  "not-a-move-in": "A Move-out can only be linked to a Move-in. Pick a Move-in.",
  "inspection-completed": "This Inspection is Completed, so it can't be changed.",
  "unknown-standard-area": "That Area isn't in the list. Type its name instead.",
  "area-not-found": "This Area isn't on this phone.",
  "area-name-required": "Enter a name for the Area.",
  "area-name-taken": "Another Area already has this name. Add a number or a detail, such as \"Bedroom 2\".",
  "area-has-items": "Can't remove this Area while it has Items. Remove its Items first.",
  "unknown-catalog-item": "That Item isn't in the list. Type its name instead.",
  "item-not-found": "This Item isn't on this phone.",
  "item-name-required": "Enter a name for the Item.",
  "item-has-evidence": "Can't remove this Item while it has Evidence. Delete its photos, videos and notes first.",
  "item-has-defects": "Can't remove this Item while it has Defects. Remove its Defects first.",
  "evidence-not-found": "This Evidence isn't on this phone.",
  "unknown-defect-type": "That Defect Type isn't in the Defect Dictionary. Pick another.",
  "defect-type-already-recorded": "This Item already has that Defect Type. Add to the existing Defect instead.",
  "evidence-not-on-item": "Only this Item's own Evidence can be linked.",
  "evidence-required": "A Defect needs Evidence. Record a photo, video or note, then assign the Defect Type to it.",
  "note-required": "Add a note describing what you see.",
  "severity-required": "Choose a Severity: Minor, Moderate or Major.",
  "unknown-severity": "Choose Minor, Moderate or Major.",
  "inspection-not-completed": "Complete the Inspection before exporting it.",
  "no-areas": "Can't complete an Inspection with no Areas. Add the Areas you inspected first.",
  "defect-not-found": "This Defect isn't on this phone.",
  "video-too-long": `This video is over ${VIDEO_TIME_LIMIT_SECONDS} seconds. Record a shorter one.`,
  "blank-note": "The note is empty. Write what you see, or cancel.",
  "evidence-not-a-note": "Only a note's text can be edited.",
  "ai-suggestion-not-found": "This AI Suggestion isn't on this phone.",
  "ai-suggestion-already-reviewed": "This AI Suggestion was already reviewed.",
  "ai-suggestion-not-reviewed": "This AI Suggestion isn't reviewed yet, so there's nothing to undo.",
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

/** The band's line above an Area or Item: the Unit and which Inspection, so a Move-out never passes for its Move-in. */
export function unitAndType(inspection: { address: UnitAddress; type: InspectionType }): string {
  return `${shortAddress(inspection.address)} · ${inspectionTypeLabel[inspection.type]}`;
}
