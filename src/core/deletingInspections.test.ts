import { describe, expect, test } from "vitest";
import { createTestHomeCheckWithItem, expectOk } from "../testing/homeCheck";

/** A Draft with a Wardrobe holding a photo, a note and a Defect, and a second, empty Area. */
async function inspectionWithEverything() {
  const setup = await createTestHomeCheckWithItem();
  const { homeCheck, inspectionId, itemId } = setup;
  const emptyArea = expectOk(await homeCheck.addArea(inspectionId, { customName: "Store room" })).area;
  const photo = expectOk(await homeCheck.addPhoto(itemId, new Blob(["scratched door"]))).evidence;
  expectOk(await homeCheck.addNote(itemId, "Smells of damp"));
  expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photo.id] }));
  return { ...setup, emptyAreaId: emptyArea.id, photo };
}

describe("deleting an Inspection", () => {
  test("deletes it with its Areas, Items, Evidence, media, Defects and AI queue entries", async () => {
    const { homeCheck, inspectionId, areaId, emptyAreaId, itemId, photo } = await inspectionWithEverything();
    expect(await homeCheck.countWaitingForAi()).toBe(1);

    const result = await homeCheck.deleteInspection(inspectionId);

    expect(result).toEqual({ ok: true });
    expect(await homeCheck.getInspection(inspectionId)).toBeUndefined();
    expect(await homeCheck.listInspections()).toEqual([]);
    expect(await homeCheck.getArea(areaId)).toBeUndefined();
    expect(await homeCheck.getArea(emptyAreaId)).toBeUndefined();
    expect(await homeCheck.getItem(itemId)).toBeUndefined();
    expect(await homeCheck.listEvidence(itemId)).toEqual([]);
    expect(await homeCheck.listDefects(itemId)).toEqual([]);
    expect(await homeCheck.getMedia(photo.id, "original")).toBeUndefined();
    expect(await homeCheck.countWaitingForAi()).toBe(0);
  });

  test("works on a Completed Inspection too, as clearing exported ones off the phone", async () => {
    const { homeCheck, inspectionId } = await inspectionWithEverything();
    expectOk(await homeCheck.completeInspection(inspectionId));

    expect(await homeCheck.deleteInspection(inspectionId)).toEqual({ ok: true });
    expect(await homeCheck.getInspection(inspectionId)).toBeUndefined();
  });

  test("of an Inspection not on this phone is refused", async () => {
    const { homeCheck } = await inspectionWithEverything();

    expect(await homeCheck.deleteInspection("missing")).toEqual({ ok: false, reason: "inspection-not-found" });
  });

  test("leaves the other Inspections alone", async () => {
    const { homeCheck, inspectionId } = await inspectionWithEverything();
    const moveOut = expectOk(await homeCheck.startMoveOut({ moveInId: inspectionId })).inspection;

    expectOk(await homeCheck.deleteInspection(inspectionId));

    expect((await homeCheck.listInspections()).map((summary) => summary.id)).toEqual([moveOut.id]);
    expect((await homeCheck.listAreas(moveOut.id)).map((area) => area.name)).toEqual(["Bedroom", "Store room"]);
  });
});
