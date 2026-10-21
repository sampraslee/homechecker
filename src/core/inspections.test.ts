import { describe, expect, test } from "vitest";
import { createTestHomeCheck, createTestHomeCheckWithInspection, createTestHomeCheckWithItem, expectOk } from "../testing/homeCheck";

const address = {
  unitNumber: "A-12-3",
  buildingName: "Residensi Harmoni",
  street: "Jalan Ampang",
  locality: "Taman U-Thant",
  postcode: "50450",
  city: "Kuala Lumpur",
  state: "W.P. Kuala Lumpur",
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
      street: "Jalan Kenari 3",
      postcode: "47100",
      city: "Puchong",
      state: "Selangor",
    });

    const list = await homeCheck.listInspections();

    expect(list.map(({ id: _id, ...summary }) => summary)).toEqual([
      {
        type: "move-in",
        status: "draft",
        address: { unitNumber: "7", street: "Jalan Kenari 3", postcode: "47100", city: "Puchong", state: "Selangor" },
        addressLine: "7, Jalan Kenari 3, 47100 Puchong, Selangor",
        startedAt: "2026-01-06T14:30:00.000Z",
        defectCount: 0,
      },
      {
        type: "move-in",
        status: "draft",
        address: expect.objectContaining({ unitNumber: "A-12-3", city: "Kuala Lumpur" }),
        addressLine: "A-12-3, Residensi Harmoni, Jalan Ampang, Taman U-Thant, 50450 Kuala Lumpur, W.P. Kuala Lumpur",
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

  test.each(["5045", "504501", "5O450", "50 45"])("refuses postcode %j, which is not 5 digits", async (postcode) => {
    const { result, inspections } = await startWith({ postcode });

    expect(result).toEqual({
      ok: false,
      reason: "invalid-address",
      errors: { postcode: "Postcode must be 5 digits" },
    });
    expect(inspections).toEqual([]);
  });

  test("refuses a state that is not one of the 13 states or 3 Federal Territories", async () => {
    const { result } = await startWith({ state: "Kuala Lumpur City" });

    expect(result).toEqual({
      ok: false,
      reason: "invalid-address",
      errors: { state: "Choose a state or Federal Territory" },
    });
  });

  test("accepts each of the 13 states and 3 Federal Territories", async () => {
    const accepted = [
      "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan", "Pahang", "Perak", "Perlis",
      "Pulau Pinang", "Sabah", "Sarawak", "Selangor", "Terengganu",
      "W.P. Kuala Lumpur", "W.P. Labuan", "W.P. Putrajaya",
    ];

    for (const state of accepted) {
      const { result } = await startWith({ state });
      expect(result.ok, state).toBe(true);
    }
  });

  test("requires unit number, street, postcode, city and state", async () => {
    const { result } = await startWith({ unitNumber: "  ", street: "", postcode: "", city: " ", state: "" });

    expect(result).toEqual({
      ok: false,
      reason: "invalid-address",
      errors: {
        unitNumber: "Unit number is required",
        street: "Street is required",
        postcode: "Postcode is required",
        city: "City is required",
        state: "Choose a state or Federal Territory",
      },
    });
  });

  test("building name and locality (area / Taman) are optional, and every field is trimmed", async () => {
    const { result } = await startWith({
      unitNumber: " 7 ",
      buildingName: "  ",
      street: " Jalan Kenari 3 ",
      locality: undefined,
      postcode: " 47100 ",
      city: " Puchong ",
      state: "Selangor",
    });

    expect(result.ok && result.inspection.address).toEqual({
      unitNumber: "7",
      street: "Jalan Kenari 3",
      postcode: "47100",
      city: "Puchong",
      state: "Selangor",
    });
  });
});

describe("the Inspection list", () => {
  test("flags an Inspection that has never been exported", async () => {
    const { homeCheck } = await createTestHomeCheckWithInspection();

    const [summary] = await homeCheck.listInspections();

    expect(summary.lastExportedAt).toBeUndefined();
  });

  test("shows when an Inspection was last exported", async () => {
    const { homeCheck, environment, inspectionId } = await createTestHomeCheckWithInspection();
    environment.setNow(new Date("2026-01-05T10:30:00.000Z"));
    expectOk(await homeCheck.exportInspection(inspectionId));
    environment.setNow(new Date("2026-01-06T08:00:00.000Z"));
    expectOk(await homeCheck.exportInspection(inspectionId));

    const [summary] = await homeCheck.listInspections();

    expect(summary.lastExportedAt).toBe("2026-01-06T08:00:00.000Z");
  });
});
