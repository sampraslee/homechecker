import type { InspectionStatus, InspectionType } from "../core";

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
