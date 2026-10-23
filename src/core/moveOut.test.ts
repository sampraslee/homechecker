import { describe, expect, test } from "vitest";
import type { HomeCheck } from "./homeCheck";
import { createTestHomeCheck, createTestHomeCheckWithItem, expectOk, noteOf } from "../testing/homeCheck";

/** The Areas and Items of an Inspection as the Inspector sees them, without ids. */
async function areasAndItemsOf(homeCheck: HomeCheck, inspectionId: string) {
  return Promise.all(
    (await homeCheck.listAreas(inspectionId)).map(async (area) => ({
      name: area.name,
      standardAreaId: area.standardAreaId,
      items: (await homeCheck.listItems(area.id)).map(({ catalogItemId, name, shortName, displayName }) => ({
        catalogItemId,
        name,
        shortName,
        displayName,
      })),
    })),
  );
}

describe("starting a linked Move-out", () => {
  /** A Move-in with a renamed Bedroom holding a Wardrobe (with Evidence and a Defect) and two Windows, a custom Area with an Other item, and an empty Bathroom. */
  async function moveInWithEverything() {
    const setup = await createTestHomeCheckWithItem();
    const { homeCheck, inspectionId, areaId, itemId } = setup;
    expectOk(await homeCheck.renameArea(areaId, "Bedroom 2 – facing road"));
    expectOk(await homeCheck.addItem(areaId, { catalogItemId: "window", shortName: "left" }));
    expectOk(await homeCheck.addItem(areaId, { catalogItemId: "window", shortName: "right" }));
    const storeRoom = expectOk(await homeCheck.addArea(inspectionId, { customName: "Store room" })).area;
    expectOk(await homeCheck.addItem(storeRoom.id, { otherName: "Built-in aquarium" }));
    expectOk(await homeCheck.addArea(inspectionId, { standardAreaId: "bathroom" }));
    const photo = expectOk(await homeCheck.addPhoto(itemId, new Blob(["scratched door"]))).evidence;
    expectOk(await homeCheck.addVideo(itemId, new Blob(["door that sticks"]), 8));
    expectOk(await homeCheck.addNote(itemId, "Smells of damp"));
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photo.id] }));
    await homeCheck.processAiQueue();
    return setup;
  }

  test("copies the Move-in's address, Areas and Items, and records the link", async () => {
    const { homeCheck, environment, inspectionId: moveInId } = await moveInWithEverything();
    environment.setNow(new Date("2027-01-04T02:00:00.000Z"));

    const moveOut = expectOk(await homeCheck.startMoveOut({ moveInId })).inspection;

    const moveIn = await homeCheck.getInspection(moveInId);
    expect(await homeCheck.getInspection(moveOut.id)).toEqual({
      id: moveOut.id,
      type: "move-out",
      status: "draft",
      address: moveIn?.address,
      inspectorName: "Aisyah",
      startedAt: "2027-01-04T02:00:00.000Z",
      linkedMoveInId: moveInId,
    });
    expect(await areasAndItemsOf(homeCheck, moveOut.id)).toEqual(await areasAndItemsOf(homeCheck, moveInId));
    expect(await areasAndItemsOf(homeCheck, moveOut.id)).toEqual([
      {
        name: "Bedroom 2 – facing road",
        standardAreaId: "bedroom",
        items: [
          { catalogItemId: "wardrobe", name: "Wardrobe", shortName: undefined, displayName: "Wardrobe" },
          { catalogItemId: "window", name: "Window", shortName: "left", displayName: "Window – left" },
          { catalogItemId: "window", name: "Window", shortName: "right", displayName: "Window – right" },
        ],
      },
      {
        name: "Store room",
        standardAreaId: null,
        items: [{ catalogItemId: null, name: "Built-in aquarium", shortName: undefined, displayName: "Built-in aquarium" }],
      },
      { name: "Bathroom", standardAreaId: "bathroom", items: [] },
    ]);
  });

  test("copies no Defects, Evidence or AI Suggestions", async () => {
    const { homeCheck, inspectionId: moveInId } = await moveInWithEverything();

    const moveOut = expectOk(await homeCheck.startMoveOut({ moveInId })).inspection;

    for (const area of await homeCheck.listAreas(moveOut.id)) {
      for (const item of await homeCheck.listItems(area.id)) {
        expect(item.defectCount).toBe(0);
        expect(item.aiToReview).toBe(0);
        expect(await homeCheck.listDefects(item.id)).toEqual([]);
        expect(await homeCheck.listEvidence(item.id)).toEqual([]);
        expect(await homeCheck.listAiSuggestions(item.id)).toEqual([]);
      }
    }
  });

  test("leaves the Move-in as it was, and the two change independently", async () => {
    const { homeCheck, inspectionId: moveInId, areaId } = await moveInWithEverything();
    const before = await areasAndItemsOf(homeCheck, moveInId);

    const moveOut = expectOk(await homeCheck.startMoveOut({ moveInId })).inspection;
    const moveOutBedroom = (await homeCheck.listAreas(moveOut.id))[0];
    expectOk(await homeCheck.renameArea(moveOutBedroom.id, "Bedroom 2"));
    expectOk(await homeCheck.addItem(moveOutBedroom.id, { catalogItemId: "wall" }));

    expect(await areasAndItemsOf(homeCheck, moveInId)).toEqual(before);
    expect((await homeCheck.listItems(areaId)).length).toBe(3);
  });

  test("can link to a Completed Move-in", async () => {
    const { homeCheck, inspectionId: moveInId } = await moveInWithEverything();
    expectOk(await homeCheck.completeInspection(moveInId));

    const moveOut = expectOk(await homeCheck.startMoveOut({ moveInId })).inspection;

    expect(moveOut.status).toBe("draft");
    expect(await homeCheck.listAreas(moveOut.id)).toHaveLength(3);
  });

  test("is refused for an Inspection that isn't a Move-in", async () => {
    const { homeCheck, inspectionId: moveInId } = await createTestHomeCheckWithItem();
    const moveOut = expectOk(await homeCheck.startMoveOut({ moveInId })).inspection;

    expect(await homeCheck.startMoveOut({ moveInId: moveOut.id })).toEqual({ ok: false, reason: "not-a-move-in" });
    expect(await homeCheck.listInspections()).toHaveLength(2);
  });

  test("is refused for a Move-in that isn't on this phone", async () => {
    const { homeCheck } = await createTestHomeCheckWithItem();

    expect(await homeCheck.startMoveOut({ moveInId: "no-such-inspection" })).toEqual({
      ok: false,
      reason: "inspection-not-found",
    });
    expect(await homeCheck.listInspections()).toHaveLength(1);
  });
});

describe("starting an unlinked Move-out", () => {
  const address = {
    unitNumber: "A-12-3",
    buildingName: "Residensi Harmoni",
  };

  test("records a Draft Move-out at the typed address, with no Areas and no linked Move-in", async () => {
    const { homeCheck } = createTestHomeCheck();
    await homeCheck.setInspectorName("Aisyah");

    const moveOut = expectOk(await homeCheck.startMoveOut({ address })).inspection;

    expect(await homeCheck.getInspection(moveOut.id)).toEqual({
      id: moveOut.id,
      type: "move-out",
      status: "draft",
      address,
      inspectorName: "Aisyah",
      startedAt: "2026-01-05T09:00:00.000Z",
    });
    expect(await homeCheck.listAreas(moveOut.id)).toEqual([]);
  });

  test("checks the address the same way as a Move-in", async () => {
    const { homeCheck } = createTestHomeCheck();
    await homeCheck.setInspectorName("Aisyah");

    const result = await homeCheck.startMoveOut({ address: { ...address, unitNumber: " ", buildingName: "" } });

    expect(result).toEqual({
      ok: false,
      reason: "invalid-address",
      errors: { unitNumber: "Unit number is required", buildingName: "Building name is required" },
    });
    expect(await homeCheck.listInspections()).toEqual([]);
  });
});

describe("a Move-out of either kind", () => {
  test("is refused until the Inspector has set their name", async () => {
    const { homeCheck } = createTestHomeCheck();

    expect(await homeCheck.startMoveOut({ moveInId: "any" })).toEqual({ ok: false, reason: "inspector-name-required" });
    expect(
      await homeCheck.startMoveOut({
        address: { unitNumber: "7", buildingName: "Vista Sutera" },
      }),
    ).toEqual({ ok: false, reason: "inspector-name-required" });
  });
});

describe("the Move-in picker", () => {
  test("lists the Move-ins on this phone, Draft or Completed, with address and date, newest first", async () => {
    const { homeCheck, environment, inspectionId: firstMoveInId } = await createTestHomeCheckWithItem();
    expectOk(await homeCheck.completeInspection(firstMoveInId));
    environment.setNow(new Date("2026-02-10T03:00:00.000Z"));
    const secondMoveIn = expectOk(
      await homeCheck.startMoveIn({ unitNumber: "9", buildingName: "Vista Sutera" }),
    ).inspection;
    environment.setNow(new Date("2026-03-01T03:00:00.000Z"));
    expectOk(await homeCheck.startMoveOut({ moveInId: firstMoveInId }));

    expect(await homeCheck.listMoveIns()).toEqual([
      {
        id: secondMoveIn.id,
        type: "move-in",
        status: "draft",
        address: { unitNumber: "9", buildingName: "Vista Sutera" },
        addressLine: "9, Vista Sutera",
        defectCount: 0,
        startedAt: "2026-02-10T03:00:00.000Z",
      },
      {
        id: firstMoveInId,
        type: "move-in",
        status: "completed",
        address: { unitNumber: "7", buildingName: "Vista Sutera" },
        addressLine: "7, Vista Sutera",
        defectCount: 0,
        startedAt: "2026-01-05T09:00:00.000Z",
      },
    ]);
  });

  test("is empty when there's no Move-in on this phone", async () => {
    const { homeCheck } = createTestHomeCheck();

    expect(await homeCheck.listMoveIns()).toEqual([]);
  });
});

describe("what the Move-in recorded, shown on a Move-out Item", () => {
  /** A Move-in Bedroom with a scratched Wardrobe (one photo) and two Windows, the right one cracked; and its Move-out. */
  async function moveInAndMoveOut() {
    const setup = await createTestHomeCheckWithItem();
    const { homeCheck, inspectionId: moveInId, areaId, itemId } = setup;
    const photo = expectOk(await homeCheck.addPhoto(itemId, new Blob(["scratched door"]))).evidence;
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photo.id], severity: "Major" }));
    expectOk(await homeCheck.addItem(areaId, { catalogItemId: "window", shortName: "left" }));
    const right = expectOk(await homeCheck.addItem(areaId, { catalogItemId: "window", shortName: "right" })).item;
    expectOk(await homeCheck.addDefect(right.id, { defectTypeCode: "SF-STAIN", evidenceIds: [await noteOf(homeCheck, right.id)] }));
    const moveOut = expectOk(await homeCheck.startMoveOut({ moveInId })).inspection;
    const [area] = await homeCheck.listAreas(moveOut.id);
    const items = await homeCheck.listItems(area.id);
    const byName = (displayName: string) => items.find((item) => item.displayName === displayName)!.id;
    return { ...setup, moveInId, moveOutAreaId: area.id, photoId: photo.id, moveOutItem: byName };
  }

  test("lists the Defects and photos of the Item with the same Area and Item name", async () => {
    const { homeCheck, photoId, moveOutItem } = await moveInAndMoveOut();

    const record = await homeCheck.moveInRecord(moveOutItem("Wardrobe"));

    expect(record?.defects.map((defect) => defect.defectTypeCode)).toEqual(["SF-SCRATCH"]);
    expect(record?.media.map((media) => media.id)).toEqual([photoId]);
  });

  test("carries each Defect's Severity for reference", async () => {
    const { homeCheck, moveOutItem } = await moveInAndMoveOut();

    const defects = (await homeCheck.moveInRecord(moveOutItem("Wardrobe")))?.defects;

    expect(defects?.map((defect) => defect.severity)).toEqual(["Major"]);
  });

  test("tells Items apart by their short name", async () => {
    const { homeCheck, moveOutItem } = await moveInAndMoveOut();

    expect((await homeCheck.moveInRecord(moveOutItem("Window – right")))?.defects.map((d) => d.defectTypeCode)).toEqual(["SF-STAIN"]);
    expect(await homeCheck.moveInRecord(moveOutItem("Window – left"))).toEqual({ defects: [], media: [] });
  });

  test("is missing when the Area was renamed, so nothing matches", async () => {
    const { homeCheck, moveOutAreaId, moveOutItem } = await moveInAndMoveOut();
    expectOk(await homeCheck.renameArea(moveOutAreaId, "Guest room"));

    expect(await homeCheck.moveInRecord(moveOutItem("Wardrobe"))).toBeUndefined();
  });

  test("is missing once the Move-in is deleted from this phone", async () => {
    const { homeCheck, moveInId, moveOutItem } = await moveInAndMoveOut();
    expectOk(await homeCheck.deleteInspection(moveInId));

    expect(await homeCheck.moveInRecord(moveOutItem("Wardrobe"))).toBeUndefined();
  });

  test("is missing on a Move-in's own Item", async () => {
    const { homeCheck, itemId } = await moveInAndMoveOut();

    expect(await homeCheck.moveInRecord(itemId)).toBeUndefined();
  });
});
