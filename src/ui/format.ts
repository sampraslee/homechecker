import type { InspectionStatus, InspectionType, RefusalReason } from "../core";

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
};
