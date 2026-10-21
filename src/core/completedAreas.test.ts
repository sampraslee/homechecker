import { describe, expect, test } from "vitest";
import { createTestHomeCheckWithInspection, createTestHomeCheckWithItem, expectOk } from "../testing/homeCheck";

/** A Wardrobe in a Bedroom, with a photo, and the Bedroom marked Completed. */
async function completedBedroom() {
  const setup = await createTestHomeCheckWithItem();
  const { homeCheck, areaId, itemId } = setup;
  const photo = expectOk(await homeCheck.addPhoto(itemId, new Blob(["scratched door"]))).evidence;
  expectOk(await homeCheck.setAreaCompleted(areaId, true));
  return { ...setup, photo };
}

async function isCompleted(homeCheck: Awaited<ReturnType<typeof completedBedroom>>["homeCheck"], areaId: string) {
  return Boolean((await homeCheck.getArea(areaId))?.completedAt);
}

describe("a Completed Area", () => {
  test("can be marked and unmarked", async () => {
    const { homeCheck, areaId } = await createTestHomeCheckWithItem();

    const marked = expectOk(await homeCheck.setAreaCompleted(areaId, true)).area;
    expect(marked.completedAt).toBeDefined();
    expect((await homeCheck.listAreas(marked.inspectionId))[0].completedAt).toBe(marked.completedAt);

    expectOk(await homeCheck.setAreaCompleted(areaId, false));
    expect(await isCompleted(homeCheck, areaId)).toBe(false);
  });

  test("can be an Area with no Items", async () => {
    const { homeCheck, inspectionId } = await createTestHomeCheckWithInspection();
    const hallway = expectOk(await homeCheck.addArea(inspectionId, { customName: "Hallway" })).area;

    expectOk(await homeCheck.setAreaCompleted(hallway.id, true));

    expect(await isCompleted(homeCheck, hallway.id)).toBe(true);
  });

  test("is counted in the Inspection's totals", async () => {
    const { homeCheck, inspectionId, areaId } = await createTestHomeCheckWithItem();
    expectOk(await homeCheck.addArea(inspectionId, { customName: "Hallway" }));
    expectOk(await homeCheck.setAreaCompleted(areaId, true));

    const totals = await homeCheck.inspectionTotals(inspectionId);

    expect(totals).toMatchObject({ areas: 2, areasCompleted: 1 });
  });

  test("is frozen with the Inspection once that is Completed", async () => {
    const { homeCheck, inspectionId, areaId } = await completedBedroom();
    expectOk(await homeCheck.completeInspection(inspectionId));

    expect(await homeCheck.setAreaCompleted(areaId, false)).toEqual({ ok: false, reason: "inspection-completed" });
    expect(await isCompleted(homeCheck, areaId)).toBe(true);
  });
});

describe("changing a Completed Area", () => {
  test("adding an Item clears the mark", async () => {
    const { homeCheck, areaId } = await completedBedroom();

    expectOk(await homeCheck.addItem(areaId, { otherName: "Curtain rail" }));

    expect(await isCompleted(homeCheck, areaId)).toBe(false);
  });

  test("removing an Item clears the mark", async () => {
    const { homeCheck, areaId } = await completedBedroom();
    const spare = expectOk(await homeCheck.addItem(areaId, { otherName: "Curtain rail" })).item;
    expectOk(await homeCheck.setAreaCompleted(areaId, true));

    expectOk(await homeCheck.removeItem(spare.id));

    expect(await isCompleted(homeCheck, areaId)).toBe(false);
  });

  test("adding a photo, video or note clears the mark", async () => {
    const additions = [
      (homeCheck: Awaited<ReturnType<typeof completedBedroom>>["homeCheck"], itemId: string) => homeCheck.addPhoto(itemId, new Blob(["a"])),
      (homeCheck: Awaited<ReturnType<typeof completedBedroom>>["homeCheck"], itemId: string) => homeCheck.addVideo(itemId, new Blob(["b"]), 5),
      (homeCheck: Awaited<ReturnType<typeof completedBedroom>>["homeCheck"], itemId: string) => homeCheck.addNote(itemId, "Smells of damp"),
    ];
    for (const add of additions) {
      const { homeCheck, areaId, itemId } = await completedBedroom();

      expectOk(await add(homeCheck, itemId));

      expect(await isCompleted(homeCheck, areaId)).toBe(false);
    }
  });

  test("editing a note clears the mark", async () => {
    const { homeCheck, areaId, itemId } = await completedBedroom();
    const note = expectOk(await homeCheck.addNote(itemId, "Smells of damp")).evidence;
    expectOk(await homeCheck.setAreaCompleted(areaId, true));

    expectOk(await homeCheck.editNote(note.id, "Smells of damp near the window"));

    expect(await isCompleted(homeCheck, areaId)).toBe(false);
  });

  test("deleting Evidence clears the mark", async () => {
    const { homeCheck, areaId, photo } = await completedBedroom();

    expectOk(await homeCheck.deleteEvidence(photo.id));

    expect(await isCompleted(homeCheck, areaId)).toBe(false);
  });

  test("adding, editing and removing a Defect each clear the mark", async () => {
    const { homeCheck, areaId, itemId, photo } = await completedBedroom();

    const defect = expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photo.id] })).defect;
    expect(await isCompleted(homeCheck, areaId)).toBe(false);

    expectOk(await homeCheck.setAreaCompleted(areaId, true));
    expectOk(await homeCheck.editDefect(defect.id, { severity: "Minor" }));
    expect(await isCompleted(homeCheck, areaId)).toBe(false);

    expectOk(await homeCheck.setAreaCompleted(areaId, true));
    expectOk(await homeCheck.removeDefect(defect.id));
    expect(await isCompleted(homeCheck, areaId)).toBe(false);
  });

  test("leaves other Areas' marks alone", async () => {
    const { homeCheck, inspectionId, areaId } = await completedBedroom();
    const hallway = expectOk(await homeCheck.addArea(inspectionId, { customName: "Hallway" })).area;
    expectOk(await homeCheck.setAreaCompleted(hallway.id, true));

    expectOk(await homeCheck.addItem(areaId, { otherName: "Curtain rail" }));

    expect(await isCompleted(homeCheck, hallway.id)).toBe(true);
  });
});

describe("a Move-out started from a Move-in", () => {
  test("copies the Areas but none of them is Completed", async () => {
    const { homeCheck, inspectionId, areaId } = await completedBedroom();
    expectOk(await homeCheck.completeInspection(inspectionId));
    expect(await isCompleted(homeCheck, areaId)).toBe(true);

    const moveOut = expectOk(await homeCheck.startMoveOut({ moveInId: inspectionId })).inspection;

    const areas = await homeCheck.listAreas(moveOut.id);
    expect(areas).toHaveLength(1);
    expect(areas[0].completedAt).toBeUndefined();
  });
});
