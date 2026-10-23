import { afterEach, describe, expect, test, vi } from "vitest";
import { createTestHomeCheck } from "../testing/homeCheck";

/** A page served over plain HTTP (e.g. the dev server opened from a phone on the LAN) isn't a secure context, so it has no crypto.randomUUID. */
function withoutRandomUUID() {
  const { getRandomValues } = globalThis.crypto;
  vi.stubGlobal("crypto", { getRandomValues: getRandomValues.bind(globalThis.crypto) });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("on a page that isn't a secure context", () => {
  test("an Inspector can still start an Inspection and record Areas, Items, photos and Defects", async () => {
    withoutRandomUUID();
    const { homeCheck } = createTestHomeCheck();
    await homeCheck.setInspectorName("Aisyah");

    const started = await homeCheck.startMoveIn({
      unitNumber: "7",
      buildingName: "Vista Sutera",
    });
    if (!started.ok) throw new Error(`could not start Inspection: ${started.reason}`);
    const area = await homeCheck.addArea(started.inspection.id, { standardAreaId: "bedroom" });
    if (!area.ok) throw new Error("could not add Area");
    const item = await homeCheck.addItem(area.area.id, { catalogItemId: "wardrobe" });
    if (!item.ok) throw new Error("could not add Item");
    const photo = await homeCheck.addPhoto(item.item.id, new Blob(["wardrobe"], { type: "image/jpeg" }));
    if (!photo.ok) throw new Error("could not add photo");
    const defect = await homeCheck.addDefect(item.item.id, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photo.evidence.id] });

    expect(defect.ok).toBe(true);
    expect((await homeCheck.listInspections()).map((inspection) => inspection.id)).toEqual([started.inspection.id]);
  });

  test("every new record still gets its own id", async () => {
    withoutRandomUUID();
    const { homeCheck } = createTestHomeCheck();
    await homeCheck.setInspectorName("Aisyah");
    const address = { unitNumber: "7", buildingName: "Vista Sutera" };

    for (let i = 0; i < 20; i++) await homeCheck.startMoveIn(address);

    const ids = (await homeCheck.listInspections()).map((inspection) => inspection.id);
    expect(new Set(ids).size).toBe(20);
  });
});
