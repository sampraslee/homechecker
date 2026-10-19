import { describe, expect, test } from "vitest";
import { createTestHomeCheckWithInspection, createTestHomeCheckWithItem, expectOk } from "../testing/homeCheck";

async function areaInDraft(standardAreaId = "bedroom") {
  const { homeCheck, inspectionId } = await createTestHomeCheckWithInspection();
  const added = await homeCheck.addArea(inspectionId, { standardAreaId });
  if (!added.ok) throw new Error("could not add Area");
  return { homeCheck, areaId: added.area.id, inspectionId };
}

const displayNames = (items: { displayName: string }[]) => items.map((item) => item.displayName);

describe("adding Items", () => {
  test("adds catalog Items to an Area, in the order added", async () => {
    const { homeCheck, areaId } = await areaInDraft();

    await homeCheck.addItem(areaId, { catalogItemId: "wardrobe" });
    await homeCheck.addItem(areaId, { catalogItemId: "wall" });

    expect(displayNames(await homeCheck.listItems(areaId))).toEqual(["Wardrobe", "Wall"]);
  });

  test("the same catalog Item can be added more than once, each with an optional short name", async () => {
    const { homeCheck, areaId } = await areaInDraft();

    await homeCheck.addItem(areaId, { catalogItemId: "window", shortName: " left " });
    await homeCheck.addItem(areaId, { catalogItemId: "window", shortName: "right" });
    await homeCheck.addItem(areaId, { catalogItemId: "window" });

    expect(displayNames(await homeCheck.listItems(areaId))).toEqual(["Window – left", "Window – right", "Window"]);
  });

  test("an Other item is added with its free-text name, which is required", async () => {
    const { homeCheck, areaId } = await areaInDraft();

    const blank = await homeCheck.addItem(areaId, { otherName: "  " });
    const added = await homeCheck.addItem(areaId, { otherName: " Built-in aquarium " });

    expect(blank).toEqual({ ok: false, reason: "item-name-required" });
    expect(added.ok && added.item).toMatchObject({ catalogItemId: null, displayName: "Built-in aquarium" });
    expect(displayNames(await homeCheck.listItems(areaId))).toEqual(["Built-in aquarium"]);
  });

  test("an Item that is not in the Item Catalog is refused", async () => {
    const { homeCheck, areaId } = await areaInDraft();

    const result = await homeCheck.addItem(areaId, { catalogItemId: "jacuzzi" });

    expect(result).toEqual({ ok: false, reason: "unknown-catalog-item" });
    expect(await homeCheck.listItems(areaId)).toEqual([]);
  });
});

describe("choosing an Item", () => {
  const ids = (items: { id: string }[]) => items.map((item) => item.id);

  test("shows the Area's relevant Items first, then every other catalog Item", async () => {
    const { homeCheck, areaId } = await areaInDraft("bedroom");

    const choices = await homeCheck.itemChoices(areaId);

    expect(choices.ok && { shownFirst: ids(choices.shownFirst), others: ids(choices.others) }).toEqual({
      shownFirst: ["wardrobe", "window"],
      others: ["wall", "toilet"],
    });
  });

  test("a renamed standard Area keeps its relevant Items", async () => {
    const { homeCheck, areaId } = await areaInDraft("bathroom");
    await homeCheck.renameArea(areaId, "Ensuite");

    const choices = await homeCheck.itemChoices(areaId);

    expect(choices.ok && ids(choices.shownFirst)).toEqual(["toilet"]);
  });

  test("a custom Area offers every catalog Item, in catalog order", async () => {
    const { homeCheck, inspectionId } = await areaInDraft();
    const custom = await homeCheck.addArea(inspectionId, { customName: "Rooftop Terrace" });
    if (!custom.ok) throw new Error("could not add Area");

    const choices = await homeCheck.itemChoices(custom.area.id);

    expect(choices.ok && { shownFirst: ids(choices.shownFirst), others: ids(choices.others) }).toEqual({
      shownFirst: [],
      others: ["wall", "window", "toilet", "wardrobe"],
    });
  });
});

describe("renaming an Item", () => {
  test("sets or clears a catalog Item's short name", async () => {
    const { homeCheck, areaId } = await areaInDraft();
    const added = await homeCheck.addItem(areaId, { catalogItemId: "window" });
    if (!added.ok) throw new Error("could not add Item");

    await homeCheck.renameItem(added.item.id, " facing road ");
    const named = displayNames(await homeCheck.listItems(areaId));
    await homeCheck.renameItem(added.item.id, "");
    const cleared = displayNames(await homeCheck.listItems(areaId));

    expect({ named, cleared }).toEqual({ named: ["Window – facing road"], cleared: ["Window"] });
  });

  test("changes an Other item's free-text name, which stays required", async () => {
    const { homeCheck, areaId } = await areaInDraft();
    const added = await homeCheck.addItem(areaId, { otherName: "Aquarium" });
    if (!added.ok) throw new Error("could not add Item");

    const blank = await homeCheck.renameItem(added.item.id, " ");
    await homeCheck.renameItem(added.item.id, "Built-in aquarium");

    expect(blank).toEqual({ ok: false, reason: "item-name-required" });
    expect(displayNames(await homeCheck.listItems(areaId))).toEqual(["Built-in aquarium"]);
  });
});

describe("removing an Item", () => {
  test("takes it out of its Area", async () => {
    const { homeCheck, areaId } = await areaInDraft();
    const wall = await homeCheck.addItem(areaId, { catalogItemId: "wall" });
    await homeCheck.addItem(areaId, { catalogItemId: "window" });
    if (!wall.ok) throw new Error("could not add Item");

    const result = await homeCheck.removeItem(wall.item.id);

    expect(result).toEqual({ ok: true });
    expect(displayNames(await homeCheck.listItems(areaId))).toEqual(["Window"]);
  });
  test("with Evidence or Defects is refused, unless its contents go too", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    expectOk(await homeCheck.addNote(itemId, "Door scratched"));

    expect(await homeCheck.removeItem(itemId)).toEqual({ ok: false, reason: "item-has-evidence" });
    expect(await homeCheck.getItem(itemId)).toBeDefined();
  });

  test("with its contents deletes its Evidence, media, Defects and AI queue entries", async () => {
    const { homeCheck, areaId, itemId } = await createTestHomeCheckWithItem();
    const photo = expectOk(await homeCheck.addPhoto(itemId, new Blob(["scratched door"]))).evidence;
    const note = expectOk(await homeCheck.addNote(itemId, "Door scratched")).evidence;
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photo.id, note.id] }));
    expect(await homeCheck.countWaitingForAi()).toBe(1);

    const result = await homeCheck.removeItem(itemId, { withContents: true });

    expect(result).toEqual({ ok: true });
    expect(await homeCheck.listItems(areaId)).toEqual([]);
    expect(await homeCheck.listEvidence(itemId)).toEqual([]);
    expect(await homeCheck.listDefects(itemId)).toEqual([]);
    expect(await homeCheck.getMedia(photo.id, "original")).toBeUndefined();
    expect(await homeCheck.countWaitingForAi()).toBe(0);
  });

  test("with its contents is still refused on a Completed Inspection", async () => {
    const { homeCheck, inspectionId, itemId } = await createTestHomeCheckWithItem();
    expectOk(await homeCheck.addNote(itemId, "Door scratched"));
    expectOk(await homeCheck.completeInspection(inspectionId));

    expect(await homeCheck.removeItem(itemId, { withContents: true })).toEqual({ ok: false, reason: "inspection-completed" });
    expect(await homeCheck.listEvidence(itemId)).toHaveLength(1);
  });
});
