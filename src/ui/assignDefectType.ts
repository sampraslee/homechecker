import type { DefectView, HomeCheck, RefusalReason } from "../core";
import type { PickedDefectType } from "./DefectPanels";

/** What happened when a Defect Type was assigned to a piece of Evidence. */
export type Assigned =
  | { kind: "added"; defect: DefectView }
  /** The Item already had this Defect Type, so the Evidence joined that Defect. */
  | { kind: "linked"; defectId: string }
  /** The Item already has this Defect Type, and this Evidence is already on it. */
  | { kind: "already-linked"; defectId: string }
  /** The Defect Type needs a note before the Defect can be made. */
  | { kind: "needs-note" }
  | { kind: "refused"; reason: RefusalReason };

/**
 * Assigns a Defect Type to a piece of Evidence of the Item. An Item has one Defect per Defect Type, so if it already has
 * one the Evidence is added to it instead (ADR 0006).
 */
export async function assignDefectType(
  homeCheck: HomeCheck,
  itemId: string,
  defectType: PickedDefectType,
  evidenceId: string,
): Promise<Assigned> {
  const existing = (await homeCheck.listDefects(itemId)).find((defect) => defect.defectTypeCode === defectType.code);
  if (existing) {
    if (existing.evidenceIds.includes(evidenceId)) return { kind: "already-linked", defectId: existing.id };
    const linked = await homeCheck.editDefect(existing.id, { evidenceIds: [...existing.evidenceIds, evidenceId] });
    return linked.ok ? { kind: "linked", defectId: existing.id } : { kind: "refused", reason: linked.reason };
  }
  if (defectType.noteRequired) return { kind: "needs-note" };
  const result = await homeCheck.addDefect(itemId, { defectTypeCode: defectType.code, evidenceIds: [evidenceId] });
  if (result.ok) return { kind: "added", defect: result.defect };
  if (result.reason === "defect-type-already-recorded") return { kind: "already-linked", defectId: result.existingDefectId };
  if (result.reason === "note-required") return { kind: "needs-note" };
  return { kind: "refused", reason: result.reason };
}
