import type { HomeCheck, Severity } from "../core";

type Found = { id: string };

/** Unwraps a core result, so a refusal stops the loading with its reason. */
function must<R extends { ok: boolean }>(result: R): Extract<R, { ok: true }> {
  if (!result.ok) throw new Error(`Sample data refused: ${JSON.stringify(result)}`);
  return result as Extract<R, { ok: true }>;
}

type SampleDefect = { item: string; type: string; severity: Severity; note: string };
type SampleArea = { standardAreaId: string; items: string[]; defects: SampleDefect[]; completed?: boolean };

/** Adds an Area with its Items, then a Defect backed by a note on each Item that has one, then marks it Completed. */
async function recordArea(homeCheck: HomeCheck, inspectionId: string, sample: SampleArea): Promise<Found> {
  const area = must(await homeCheck.addArea(inspectionId, { standardAreaId: sample.standardAreaId })).area;
  const itemIds = new Map<string, string>();
  for (const catalogItemId of sample.items) {
    itemIds.set(catalogItemId, must(await homeCheck.addItem(area.id, { catalogItemId })).item.id);
  }
  for (const { item, type, severity, note } of sample.defects) {
    const itemId = itemIds.get(item)!;
    const evidence = must(await homeCheck.addNote(itemId, note)).evidence;
    must(await homeCheck.addDefect(itemId, { defectTypeCode: type, evidenceIds: [evidence.id], severity }));
  }
  if (sample.completed) must(await homeCheck.setAreaCompleted(area.id, true));
  return area;
}

/**
 * Three Inspections for trying the app: a Draft Move-in, a Completed Move-in that was never exported, and a Draft
 * Move-out linked to it. Evidence is notes, so nothing is sent to the AI.
 */
export async function loadSampleInspections(homeCheck: HomeCheck): Promise<void> {
  if (!(await homeCheck.getSettings()).inspectorName) must(await homeCheck.setInspectorName("Aisyah"));

  const draftMoveIn = must(
    await homeCheck.startMoveIn({
      unitNumber: "A-12-3",
      buildingName: "Residensi Harmoni",
    }),
  ).inspection;
  await recordArea(homeCheck, draftMoveIn.id, {
    standardAreaId: "living-room",
    items: ["wall", "air-conditioner"],
    defects: [
      { item: "wall", type: "SF-SCRATCH", severity: "Minor", note: "Long scratch on the wall behind the sofa." },
      { item: "air-conditioner", type: "FO-NOTWORK", severity: "Major", note: "Does not switch on from the remote or the unit." },
    ],
    completed: true,
  });
  await recordArea(homeCheck, draftMoveIn.id, {
    standardAreaId: "master-bedroom",
    items: ["wardrobe", "window"],
    defects: [{ item: "wardrobe", type: "HF-HINGE-LOOSE", severity: "Moderate", note: "Left door hinge is loose." }],
  });
  await recordArea(homeCheck, draftMoveIn.id, { standardAreaId: "dry-kitchen", items: [], defects: [] });

  const completedMoveIn = must(
    await homeCheck.startMoveIn({
      unitNumber: "B-07-1",
      buildingName: "Vista Sutera",
    }),
  ).inspection;
  await recordArea(homeCheck, completedMoveIn.id, {
    standardAreaId: "master-bedroom",
    items: ["wall", "window"],
    defects: [
      { item: "wall", type: "CD-HAIRLINE", severity: "Minor", note: "Hairline crack above the window." },
      { item: "window", type: "PD-DENT", severity: "Moderate", note: "Dent in the window frame, lower left." },
    ],
    completed: true,
  });
  await recordArea(homeCheck, completedMoveIn.id, { standardAreaId: "common-bathroom", items: ["tap", "mirror"], defects: [], completed: true });
  must(await homeCheck.completeInspection(completedMoveIn.id));

  const moveOut = must(await homeCheck.startMoveOut({ moveInId: completedMoveIn.id })).inspection;
  const bedroom = (await homeCheck.listAreas(moveOut.id)).find((area) => area.name === "Master Bedroom")!;
  const wall = (await homeCheck.listItems(bedroom.id)).find((item) => item.catalogItemId === "wall")!;
  const note = must(await homeCheck.addNote(wall.id, "The hairline crack has grown, and there is a new scuff beside it.")).evidence;
  must(await homeCheck.addDefect(wall.id, { defectTypeCode: "SF-SCUFF", evidenceIds: [note.id], severity: "Minor" }));
}
