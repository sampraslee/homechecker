import { describe, expect, test } from "vitest";
import type { HomeCheck } from "./homeCheck";
import { createTestHomeCheckWithInspection, createTestHomeCheckWithItem, expectOk } from "../testing/homeCheck";

/**
 * A Completed Inspection with an empty Area and an empty Item (each removable while a Draft),
 * and a Wardrobe with a photo, a video, a note and a Defect linked to the photo.
 */
async function completedInspectionWithEverything() {
  const setup = await createTestHomeCheckWithItem();
  const { homeCheck, inspectionId, areaId, itemId } = setup;
  const emptyArea = expectOk(await homeCheck.addArea(inspectionId, { customName: "Store room" })).area;
  const emptyItem = expectOk(await homeCheck.addItem(areaId, { otherName: "Curtain rail" })).item;
  const photo = expectOk(await homeCheck.addPhoto(itemId, new Blob(["scratched door"]))).evidence;
  const video = expectOk(await homeCheck.addVideo(itemId, new Blob(["door that sticks"]), 8)).evidence;
  const note = expectOk(await homeCheck.addNote(itemId, "Smells of damp")).evidence;
  const defect = expectOk(
    await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photo.id] }),
  ).defect;
  expectOk(await homeCheck.completeInspection(inspectionId));
  return { ...setup, emptyAreaId: emptyArea.id, emptyItemId: emptyItem.id, photo, video, note, defect };
}

/** Everything recorded in the Inspection, as the Inspector can read it back. */
async function recordOf(homeCheck: HomeCheck, inspectionId: string) {
  const areas = await homeCheck.listAreas(inspectionId);
  return Promise.all(
    areas.map(async (area) => ({
      area,
      items: await Promise.all(
        (await homeCheck.listItems(area.id)).map(async (item) => ({
          item,
          evidence: await homeCheck.listEvidence(item.id),
          defects: await homeCheck.listDefects(item.id),
        })),
      ),
    })),
  );
}

type Completed = Awaited<ReturnType<typeof completedInspectionWithEverything>>;

describe("completing an Inspection", () => {
  test("marks the Draft Completed and records when", async () => {
    const { homeCheck, environment, inspectionId } = await createTestHomeCheckWithItem();
    environment.setNow(new Date("2026-01-05T11:45:00.000Z"));

    const result = await homeCheck.completeInspection(inspectionId);

    expect(result.ok).toBe(true);
    expect(await homeCheck.getInspection(inspectionId)).toMatchObject({
      status: "completed",
      startedAt: "2026-01-05T09:00:00.000Z",
      completedAt: "2026-01-05T11:45:00.000Z",
    });
  });

  test("can't be done twice, so the first completion time stands", async () => {
    const { homeCheck, environment, inspectionId } = await createTestHomeCheckWithItem();
    environment.setNow(new Date("2026-01-05T11:45:00.000Z"));
    await homeCheck.completeInspection(inspectionId);
    environment.setNow(new Date("2026-01-06T08:00:00.000Z"));

    const again = await homeCheck.completeInspection(inspectionId);

    expect(again).toEqual({ ok: false, reason: "inspection-completed" });
    expect(await homeCheck.getInspection(inspectionId)).toMatchObject({ completedAt: "2026-01-05T11:45:00.000Z" });
  });

  test("with no Areas is refused, and it stays a Draft", async () => {
    const { homeCheck, inspectionId } = await createTestHomeCheckWithInspection();

    expect(await homeCheck.completeInspection(inspectionId)).toEqual({ ok: false, reason: "no-areas" });
    expect(await homeCheck.getInspection(inspectionId)).toMatchObject({ status: "draft" });
  });

  test("counts what will be locked in: Areas, Items, Evidence and Defects", async () => {
    const { homeCheck, inspectionId, areaId, itemId } = await createTestHomeCheckWithItem();
    expectOk(await homeCheck.addItem(areaId, { otherName: "Curtain rail" }));
    expectOk(await homeCheck.addArea(inspectionId, { customName: "Store room" }));
    const photo = expectOk(await homeCheck.addPhoto(itemId, new Blob(["scratched door"]))).evidence;
    expectOk(await homeCheck.addNote(itemId, "Smells of damp"));
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photo.id] }));

    expect(await homeCheck.inspectionTotals(inspectionId)).toEqual({ areas: 2, areasCompleted: 0, items: 2, evidence: 2, defects: 1, defectsWithoutSeverity: 1 });
  });

  test("of an Inspection not on this phone is refused", async () => {
    const { homeCheck } = await createTestHomeCheckWithInspection();

    expect(await homeCheck.completeInspection("missing")).toEqual({ ok: false, reason: "inspection-not-found" });
  });

  test("shows as Completed on the Inspection list", async () => {
    const { homeCheck, inspectionId } = await createTestHomeCheckWithItem();

    await homeCheck.completeInspection(inspectionId);

    expect((await homeCheck.listInspections()).map((summary) => summary.status)).toEqual(["completed"]);
  });
});

describe("a Completed Inspection", () => {
  test("refuses a new Area", async () => {
    const { homeCheck, inspectionId } = await createTestHomeCheckWithItem();
    await homeCheck.completeInspection(inspectionId);

    const result = await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom" });

    expect(result).toEqual({ ok: false, reason: "inspection-completed" });
    expect((await homeCheck.listAreas(inspectionId)).map((area) => area.name)).toEqual(["Bedroom"]);
  });

  const refusedChanges: [string, (c: Completed) => Promise<{ ok: boolean }>][] = [
    ["renaming an Area", (c) => c.homeCheck.renameArea(c.areaId, "Master bedroom")],
    ["removing an empty Area", (c) => c.homeCheck.removeArea(c.emptyAreaId)],
    ["adding an Item", (c) => c.homeCheck.addItem(c.areaId, { catalogItemId: "wardrobe" })],
    ["renaming an Item", (c) => c.homeCheck.renameItem(c.itemId, "left")],
    ["removing an empty Item", (c) => c.homeCheck.removeItem(c.emptyItemId)],
    ["adding a photo", (c) => c.homeCheck.addPhoto(c.itemId, new Blob(["another shot"]))],
    ["adding a video", (c) => c.homeCheck.addVideo(c.itemId, new Blob(["another clip"]), 5)],
    ["adding a note", (c) => c.homeCheck.addNote(c.itemId, "Another note")],
    ["editing a note", (c) => c.homeCheck.editNote(c.note.id, "Changed my mind")],
    ["deleting a photo linked to a Defect", (c) => c.homeCheck.deleteEvidence(c.photo.id)],
    ["deleting a video", (c) => c.homeCheck.deleteEvidence(c.video.id)],
    ["deleting a note", (c) => c.homeCheck.deleteEvidence(c.note.id)],
    ["adding a Defect", (c) => c.homeCheck.addDefect(c.itemId, { defectTypeCode: "SF-STAIN" })],
    ["editing a Defect", (c) => c.homeCheck.editDefect(c.defect.id, { note: "deep", evidenceIds: [] })],
    ["removing a Defect", (c) => c.homeCheck.removeDefect(c.defect.id)],
  ];

  test.each(refusedChanges)("refuses %s and leaves the record as it was", async (_change, change) => {
    const completed = await completedInspectionWithEverything();
    const before = await recordOf(completed.homeCheck, completed.inspectionId);

    const result = await change(completed);

    expect(result).toEqual({ ok: false, reason: "inspection-completed" });
    expect(await recordOf(completed.homeCheck, completed.inspectionId)).toEqual(before);
  });

  test("keeps its media readable", async () => {
    const { homeCheck, photo, video } = await completedInspectionWithEverything();

    expect(await (await homeCheck.getMedia(photo.id, "original"))?.text()).toBe("scratched door");
    expect(await (await homeCheck.getMedia(video.id, "original"))?.text()).toBe("door that sticks");
  });
});
