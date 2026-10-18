import { VIDEO_TIME_LIMIT_SECONDS, type InspectionStatus, type InspectionType, type RefusalReason } from "../core";

export const inspectionTypeLabel: Record<InspectionType, string> = {
  "move-in": "Move-in",
  "move-out": "Move-out",
};

export const inspectionStatusLabel: Record<InspectionStatus, string> = {
  draft: "Draft",
  completed: "Completed",
};

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
};
