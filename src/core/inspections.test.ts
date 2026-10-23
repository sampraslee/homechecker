import { describe, expect, test } from "vitest";
import { createTestHomeCheck, createTestHomeCheckWithInspection, createTestHomeCheckWithItem, expectOk } from "../testing/homeCheck";

const address = {
  unitNumber: "A-12-3",
  buildingName: "Residensi Harmoni",
};

describe("starting a Move-in Inspection", () => {
  test("records a Draft Move-in stamped with the Inspector and start time", async () => {
    const { homeCheck } = createTestHomeCheck();
    await homeCheck.setInspectorName("Aisyah");

    const result = await homeCheck.startMoveIn(address);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const saved = await homeCheck.getInspection(result.inspection.id);
    expect(saved).toEqual({
      id: result.inspection.id,
      type: "move-in",
      status: "draft",
      address,
      inspectorName: "Aisyah",
      startedAt: "2026-01-05T09:00:00.000Z",
    });
  });

  test("is refused until the Inspector has set their name", async () => {
    const { homeCheck } = createTestHomeCheck();

    const result = await homeCheck.startMoveIn(address);

    expect(result).toEqual({ ok: false, reason: "inspector-name-required" });
    expect(await homeCheck.listInspections()).toEqual([]);
  });
});

describe("the Inspection list", () => {
  test("counts the Defects recorded across an Inspection's Areas and Items", async () => {
    const { homeCheck, areaId, itemId } = await createTestHomeCheckWithItem();
    const mirror = expectOk(await homeCheck.addItem(areaId, { catalogItemId: "wardrobe", shortName: "Left" })).item;
    for (const id of [itemId, mirror.id]) {
      const photo = expectOk(await homeCheck.addPhoto(id, new Blob(["photo"]))).evidence;
      expectOk(await homeCheck.addDefect(id, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photo.id] }));
    }

    const [summary] = await homeCheck.listInspections();

    expect(summary.defectCount).toBe(2);
  });

  test("shows each Inspection's type, address, date and status, newest first", async () => {
    const { homeCheck, environment } = createTestHomeCheck();
    await homeCheck.setInspectorName("Aisyah");
    await homeCheck.startMoveIn(address);
    environment.setNow(new Date("2026-01-06T14:30:00.000Z"));
    const second = await homeCheck.startMoveIn({
      unitNumber: "7",
      buildingName: "Vista Sutera",
    });

    const list = await homeCheck.listInspections();

    expect(list.map(({ id: _id, ...summary }) => summary)).toEqual([
      {
        type: "move-in",
        status: "draft",
        address: { unitNumber: "7", buildingName: "Vista Sutera" },
        addressLine: "7, Vista Sutera",
        startedAt: "2026-01-06T14:30:00.000Z",
        defectCount: 0,
      },
      {
        type: "move-in",
        status: "draft",
        address: { unitNumber: "A-12-3", buildingName: "Residensi Harmoni" },
        addressLine: "A-12-3, Residensi Harmoni",
        startedAt: "2026-01-05T09:00:00.000Z",
        defectCount: 0,
      },
    ]);
    expect(list[0].id).toBe(second.ok && second.inspection.id);
  });
});

describe("Unit address validation", () => {
  async function startWith(changes: Partial<typeof address>) {
    const { homeCheck } = createTestHomeCheck();
    await homeCheck.setInspectorName("Aisyah");
    const result = await homeCheck.startMoveIn({ ...address, ...changes });
    return { result, inspections: await homeCheck.listInspections() };
  }

  test("requires unit number and building name", async () => {
    const { result, inspections } = await startWith({ unitNumber: "  ", buildingName: "" });

    expect(result).toEqual({
      ok: false,
      reason: "invalid-address",
      errors: {
        unitNumber: "Unit number is required",
        buildingName: "Building name is required",
      },
    });
    expect(inspections).toEqual([]);
  });

  test("every field is trimmed", async () => {
    const { result } = await startWith({ unitNumber: " 7 ", buildingName: "  Vista Sutera " });

    expect(result.ok && result.inspection.address).toEqual({ unitNumber: "7", buildingName: "Vista Sutera" });
  });
});

describe("the Inspection list", () => {
  test("flags an Inspection that has never been exported", async () => {
    const { homeCheck } = await createTestHomeCheckWithInspection();

    const [summary] = await homeCheck.listInspections();

    expect(summary.lastExportedAt).toBeUndefined();
  });

  test("shows when an Inspection was last exported", async () => {
    const { homeCheck, environment, inspectionId } = await createTestHomeCheckWithItem();
    expectOk(await homeCheck.completeInspection(inspectionId));
    environment.setNow(new Date("2026-01-05T10:30:00.000Z"));
    expectOk(await homeCheck.exportInspection(inspectionId));
    environment.setNow(new Date("2026-01-06T08:00:00.000Z"));
    expectOk(await homeCheck.exportInspection(inspectionId));

    const [summary] = await homeCheck.listInspections();

    expect(summary.lastExportedAt).toBe("2026-01-06T08:00:00.000Z");
  });
});
