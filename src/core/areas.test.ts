import { describe, expect, test } from "vitest";
import { createTestHomeCheckWithInspection as draftInspection } from "../testing/homeCheck";

const names = (areas: { name: string }[]) => areas.map((area) => area.name);

describe("adding Areas", () => {
  test("adds Areas from the standard list or with a custom name, in the order added", async () => {
    const { homeCheck, inspectionId } = await draftInspection();

    await homeCheck.addArea(inspectionId, { standardAreaId: "bathroom" });
    await homeCheck.addArea(inspectionId, { customName: "Rooftop Terrace" });

    expect(names(await homeCheck.listAreas(inspectionId))).toEqual(["Bathroom", "Rooftop Terrace"]);
  });

  test("adding the same standard Area again gives each one a distinct name", async () => {
    const { homeCheck, inspectionId } = await draftInspection();

    await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom" });
    await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom" });
    await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom" });

    expect(names(await homeCheck.listAreas(inspectionId))).toEqual(["Bedroom", "Bedroom 2", "Bedroom 3"]);
  });

  test("a custom name is trimmed and cannot be blank", async () => {
    const { homeCheck, inspectionId } = await draftInspection();

    const blank = await homeCheck.addArea(inspectionId, { customName: "   " });
    await homeCheck.addArea(inspectionId, { customName: "  Study  " });

    expect(blank).toEqual({ ok: false, reason: "area-name-required" });
    expect(names(await homeCheck.listAreas(inspectionId))).toEqual(["Study"]);
  });

  test("a custom name already used in the Inspection is refused, ignoring case", async () => {
    const { homeCheck, inspectionId } = await draftInspection();
    await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom" });

    const result = await homeCheck.addArea(inspectionId, { customName: "BEDROOM" });

    expect(result).toEqual({ ok: false, reason: "area-name-taken" });
    expect(names(await homeCheck.listAreas(inspectionId))).toEqual(["Bedroom"]);
  });

  test("a standard Area that is not in the list is refused", async () => {
    const { homeCheck, inspectionId } = await draftInspection();

    const result = await homeCheck.addArea(inspectionId, { standardAreaId: "ballroom" });

    expect(result).toEqual({ ok: false, reason: "unknown-standard-area" });
    expect(await homeCheck.listAreas(inspectionId)).toEqual([]);
  });
});

describe("listing Areas", () => {
  test("shows how many Items each Area has", async () => {
    const { homeCheck, inspectionId } = await draftInspection();
    const bedroom = await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom" });
    await homeCheck.addArea(inspectionId, { standardAreaId: "bathroom" });
    if (!bedroom.ok) throw new Error("could not add Area");
    await homeCheck.addItem(bedroom.area.id, { catalogItemId: "wardrobe" });
    await homeCheck.addItem(bedroom.area.id, { catalogItemId: "window" });

    const areas = await homeCheck.listAreas(inspectionId);

    expect(areas.map(({ name, itemCount }) => ({ name, itemCount }))).toEqual([
      { name: "Bedroom", itemCount: 2 },
      { name: "Bathroom", itemCount: 0 },
    ]);
  });

  test("an Area cannot be added to an Inspection that doesn't exist", async () => {
    const { homeCheck } = await draftInspection();

    const result = await homeCheck.addArea("no-such-inspection", { standardAreaId: "bedroom" });

    expect(result).toEqual({ ok: false, reason: "inspection-not-found" });
  });
});

describe("renaming an Area", () => {
  test("changes its name, trimmed", async () => {
    const { homeCheck, inspectionId } = await draftInspection();
    const added = await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom" });
    if (!added.ok) throw new Error("could not add Area");

    const result = await homeCheck.renameArea(added.area.id, "  Bedroom 2 – facing road ");

    expect(result.ok).toBe(true);
    expect(names(await homeCheck.listAreas(inspectionId))).toEqual(["Bedroom 2 – facing road"]);
  });

  test("refuses a blank name or one another Area already has, but allows changing only its case", async () => {
    const { homeCheck, inspectionId } = await draftInspection();
    await homeCheck.addArea(inspectionId, { standardAreaId: "bathroom" });
    const bedroom = await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom" });
    if (!bedroom.ok) throw new Error("could not add Area");

    expect(await homeCheck.renameArea(bedroom.area.id, " ")).toEqual({ ok: false, reason: "area-name-required" });
    expect(await homeCheck.renameArea(bedroom.area.id, "bathroom")).toEqual({ ok: false, reason: "area-name-taken" });
    expect((await homeCheck.renameArea(bedroom.area.id, "BEDROOM")).ok).toBe(true);
    expect(names(await homeCheck.listAreas(inspectionId))).toEqual(["Bathroom", "BEDROOM"]);
  });
});

describe("removing an Area", () => {
  test("removes an Area that has no Items", async () => {
    const { homeCheck, inspectionId } = await draftInspection();
    const added = await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom" });
    await homeCheck.addArea(inspectionId, { standardAreaId: "bathroom" });
    if (!added.ok) throw new Error("could not add Area");

    const result = await homeCheck.removeArea(added.area.id);

    expect(result).toEqual({ ok: true });
    expect(names(await homeCheck.listAreas(inspectionId))).toEqual(["Bathroom"]);
  });

  test("refuses to remove an Area that still has Items, until they are removed", async () => {
    const { homeCheck, inspectionId } = await draftInspection();
    const area = await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom" });
    if (!area.ok) throw new Error("could not add Area");
    const item = await homeCheck.addItem(area.area.id, { catalogItemId: "wardrobe" });
    if (!item.ok) throw new Error("could not add Item");

    const whileItemsRemain = await homeCheck.removeArea(area.area.id);
    await homeCheck.removeItem(item.item.id);
    const onceEmpty = await homeCheck.removeArea(area.area.id);

    expect(whileItemsRemain).toEqual({ ok: false, reason: "area-has-items" });
    expect(onceEmpty).toEqual({ ok: true });
    expect(await homeCheck.listAreas(inspectionId)).toEqual([]);
  });
});

describe("naming a standard Area when adding it", () => {
  test("offers the standard name, then the next free number once one exists", async () => {
    const { homeCheck, inspectionId } = await draftInspection();

    expect(await homeCheck.defaultAreaName(inspectionId, "bedroom")).toEqual({ ok: true, name: "Bedroom" });
    await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom" });
    expect(await homeCheck.defaultAreaName(inspectionId, "bedroom")).toEqual({ ok: true, name: "Bedroom 2" });
  });

  test("keeps the standard Area but uses the name the Inspector typed", async () => {
    const { homeCheck, inspectionId } = await draftInspection();

    const added = await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom", name: "  Bedroom – facing road " });

    expect(added).toMatchObject({ ok: true, area: { name: "Bedroom – facing road", standardAreaId: "bedroom" } });
  });

  test("refuses a typed name another Area already has", async () => {
    const { homeCheck, inspectionId } = await draftInspection();
    await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom" });

    const result = await homeCheck.addArea(inspectionId, { standardAreaId: "bedroom", name: "bedroom" });

    expect(result).toEqual({ ok: false, reason: "area-name-taken" });
  });

  test("does not know an unknown standard Area", async () => {
    const { homeCheck, inspectionId } = await draftInspection();

    expect(await homeCheck.defaultAreaName(inspectionId, "nowhere")).toEqual({ ok: false, reason: "unknown-standard-area" });
  });
});
