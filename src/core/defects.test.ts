import { describe, expect, test } from "vitest";
import type { HomeCheck } from "./homeCheck";
import { createTestHomeCheckWithInspection } from "../testing/homeCheck";

async function wardrobeInBedroom() {
  const setup = await createTestHomeCheckWithInspection();
  const area = await setup.homeCheck.addArea(setup.inspectionId, { standardAreaId: "bedroom" });
  if (!area.ok) throw new Error("could not add Area");
  const item = await setup.homeCheck.addItem(area.area.id, { catalogItemId: "wardrobe" });
  if (!item.ok) throw new Error("could not add Item");
  return { ...setup, areaId: area.area.id, itemId: item.item.id };
}

const photo = (content: string) => new Blob([content], { type: "image/jpeg" });

async function takePhoto(homeCheck: HomeCheck, itemId: string) {
  const taken = await homeCheck.addPhoto(itemId, photo("wardrobe"));
  if (!taken.ok) throw new Error("could not add photo");
  return taken.evidence.id;
}

describe("adding a Defect by hand", () => {
  test("records the Defect Type code, Dictionary version, source, note and linked photos", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();
    const photoId = await takePhoto(homeCheck, itemId);

    const added = await homeCheck.addDefect(itemId, {
      defectTypeCode: "SF-SCRATCH",
      note: "three scratches, lower left",
      evidenceIds: [photoId],
    });

    expect(added.ok).toBe(true);
    const [defect] = await homeCheck.listDefects(itemId);
    expect(defect).toMatchObject({
      itemId,
      defectTypeCode: "SF-SCRATCH",
      dictionaryVersion: "test-dictionary-1",
      source: "manual",
      note: "three scratches, lower left",
      evidenceIds: [photoId],
    });
  });
});

describe("picking a Defect Type", () => {
  test("shows the Item's relevant Defect Categories first, in catalog order, then every other Category", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();

    const choices = await homeCheck.defectChoices(itemId);
    if (!choices.ok) throw new Error("no Defect choices");

    expect(choices.shownFirst.map((category) => category.code)).toEqual(["CF", "HF"]);
    expect(choices.others.map((category) => category.code)).toEqual(["SF", "CD", "DW", "GM", "SN", "PL", "PE", "OT"]);
  });

  test("an Other item shows every Category, none first", async () => {
    const { homeCheck, areaId } = await wardrobeInBedroom();
    const other = await homeCheck.addItem(areaId, { otherName: "Ironing board" });
    if (!other.ok) throw new Error("could not add Item");

    const choices = await homeCheck.defectChoices(other.item.id);
    if (!choices.ok) throw new Error("no Defect choices");

    expect(choices.shownFirst).toEqual([]);
    expect(choices.others).toHaveLength(10);
  });

  test("in each Category, the Defect Types named after the Item come first", async () => {
    const { homeCheck, inspectionId } = await createTestHomeCheckWithInspection();
    const area = await homeCheck.addArea(inspectionId, { standardAreaId: "bathroom" });
    if (!area.ok) throw new Error("could not add Area");
    const toilet = await homeCheck.addItem(area.area.id, { catalogItemId: "toilet" });
    if (!toilet.ok) throw new Error("could not add Item");

    const choices = await homeCheck.defectChoices(toilet.item.id);
    if (!choices.ok) throw new Error("no Defect choices");

    expect(choices.shownFirst.find((category) => category.code === "SN")?.defectTypes.map((type) => type.name)).toEqual([
      "Toilet Bowl Loose",
      "Basin Cracked",
    ]);
  });

  test("each Category lists its Defect Types", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();

    const choices = await homeCheck.defectChoices(itemId);
    if (!choices.ok) throw new Error("no Defect choices");

    expect(choices.others.find((category) => category.code === "SF")?.defectTypes).toEqual([
      { code: "SF-SCRATCH", name: "Scratched" },
      { code: "SF-STAIN", name: "Stained" },
    ]);
  });
});

describe("one Defect per Defect Type on an Item", () => {
  test("a second Defect with the same Defect Type is refused and reports the existing one", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();
    const first = await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", note: "door" });
    if (!first.ok) throw new Error("could not add Defect");

    const second = await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", note: "side panel" });

    expect(second).toMatchObject({ ok: false, reason: "defect-type-already-recorded", existingDefectId: first.defect.id });
    expect(await homeCheck.listDefects(itemId)).toHaveLength(1);
  });

  test("the same Defect Type can be recorded on two different Items", async () => {
    const { homeCheck, areaId, itemId } = await wardrobeInBedroom();
    const windowItem = await homeCheck.addItem(areaId, { catalogItemId: "window" });
    if (!windowItem.ok) throw new Error("could not add Item");

    await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH" });
    const onWindow = await homeCheck.addDefect(windowItem.item.id, { defectTypeCode: "SF-SCRATCH" });

    expect(onWindow.ok).toBe(true);
  });

  test("different Defect Types can be recorded on the same Item", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();

    await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH" });
    await homeCheck.addDefect(itemId, { defectTypeCode: "CF-HINGE" });

    expect((await homeCheck.listDefects(itemId)).map((defect) => defect.defectTypeCode)).toEqual(["SF-SCRATCH", "CF-HINGE"]);
  });
});

describe("linking Evidence to a Defect", () => {
  test("a Defect can't link a photo of another Item", async () => {
    const { homeCheck, areaId, itemId } = await wardrobeInBedroom();
    const windowItem = await homeCheck.addItem(areaId, { catalogItemId: "window" });
    if (!windowItem.ok) throw new Error("could not add Item");
    const windowPhotoId = await takePhoto(homeCheck, windowItem.item.id);

    const added = await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [windowPhotoId] });

    expect(added).toEqual({ ok: false, reason: "evidence-not-on-item" });
    expect(await homeCheck.listDefects(itemId)).toEqual([]);
  });

  test("deleting a linked photo unlinks it from every Defect but keeps the Defects", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();
    const wrongPhotoId = await takePhoto(homeCheck, itemId);
    const keptPhotoId = await takePhoto(homeCheck, itemId);
    await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [wrongPhotoId, keptPhotoId] });
    await homeCheck.addDefect(itemId, { defectTypeCode: "CF-HINGE", evidenceIds: [wrongPhotoId] });

    await homeCheck.deleteEvidence(wrongPhotoId);

    expect((await homeCheck.listDefects(itemId)).map((defect) => defect.evidenceIds)).toEqual([[keptPhotoId], []]);
  });

  test("one photo can support several Defects on its Item", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();
    const photoId = await takePhoto(homeCheck, itemId);

    await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photoId] });
    await homeCheck.addDefect(itemId, { defectTypeCode: "CF-HINGE", evidenceIds: [photoId] });

    expect((await homeCheck.listDefects(itemId)).map((defect) => defect.evidenceIds)).toEqual([[photoId], [photoId]]);
  });
});

describe("editing a Defect", () => {
  test("changes its note and linked photos, keeping its Defect Type", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();
    const firstPhotoId = await takePhoto(homeCheck, itemId);
    const secondPhotoId = await takePhoto(homeCheck, itemId);
    const added = await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", note: "door", evidenceIds: [firstPhotoId] });
    if (!added.ok) throw new Error("could not add Defect");

    const edited = await homeCheck.editDefect(added.defect.id, { note: "door and side panel", evidenceIds: [secondPhotoId] });

    expect(edited.ok).toBe(true);
    expect(await homeCheck.getDefect(added.defect.id)).toMatchObject({
      defectTypeCode: "SF-SCRATCH",
      note: "door and side panel",
      evidenceIds: [secondPhotoId],
    });
  });

  test("can't link a photo of another Item", async () => {
    const { homeCheck, areaId, itemId } = await wardrobeInBedroom();
    const windowItem = await homeCheck.addItem(areaId, { catalogItemId: "window" });
    if (!windowItem.ok) throw new Error("could not add Item");
    const windowPhotoId = await takePhoto(homeCheck, windowItem.item.id);
    const added = await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH" });
    if (!added.ok) throw new Error("could not add Defect");

    const edited = await homeCheck.editDefect(added.defect.id, { evidenceIds: [windowPhotoId] });

    expect(edited).toEqual({ ok: false, reason: "evidence-not-on-item" });
    expect((await homeCheck.getDefect(added.defect.id))?.evidenceIds).toEqual([]);
  });

  test("can't clear the note of an Other / Unknown Defect", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();
    const added = await homeCheck.addDefect(itemId, { defectTypeCode: "OT-UNKNOWN", note: "odd mark" });
    if (!added.ok) throw new Error("could not add Defect");

    expect(await homeCheck.editDefect(added.defect.id, { note: "" })).toEqual({ ok: false, reason: "note-required" });
  });

  test("clearing the note of any other Defect removes it", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();
    const added = await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", note: "door" });
    if (!added.ok) throw new Error("could not add Defect");

    await homeCheck.editDefect(added.defect.id, { note: " " });

    expect((await homeCheck.getDefect(added.defect.id))?.note).toBeUndefined();
  });
});

describe("removing a Defect", () => {
  test("removes it from the Item and keeps its photos", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();
    const photoId = await takePhoto(homeCheck, itemId);
    const added = await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photoId] });
    if (!added.ok) throw new Error("could not add Defect");

    const removed = await homeCheck.removeDefect(added.defect.id);

    expect(removed).toEqual({ ok: true });
    expect(await homeCheck.listDefects(itemId)).toEqual([]);
    expect((await homeCheck.listEvidence(itemId)).map((evidence) => evidence.id)).toEqual([photoId]);
  });

  test("lets the same Defect Type be recorded again", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();
    const added = await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH" });
    if (!added.ok) throw new Error("could not add Defect");

    await homeCheck.removeDefect(added.defect.id);

    expect((await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH" })).ok).toBe(true);
  });

  test("a Defect that doesn't exist can't be edited or removed", async () => {
    const { homeCheck } = await wardrobeInBedroom();

    expect(await homeCheck.editDefect("no-such-defect", { note: "x" })).toEqual({ ok: false, reason: "defect-not-found" });
    expect(await homeCheck.removeDefect("no-such-defect")).toEqual({ ok: false, reason: "defect-not-found" });
  });
});

describe("the Defect Dictionary", () => {
  test("only Defect Types in the Dictionary can be recorded", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();

    const invented = await homeCheck.addDefect(itemId, { defectTypeCode: "SF-UGLY" });

    expect(invented).toEqual({ ok: false, reason: "unknown-defect-type" });
    expect(await homeCheck.listDefects(itemId)).toEqual([]);
  });

  test("when nothing fits, Other / Unknown can be recorded with a note, but not without one", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();

    const withoutNote = await homeCheck.addDefect(itemId, { defectTypeCode: "OT-OTHER", note: "  " });
    const withNote = await homeCheck.addDefect(itemId, { defectTypeCode: "OT-OTHER", note: "sticker residue inside door" });

    expect(withoutNote).toEqual({ ok: false, reason: "note-required" });
    expect(withNote.ok && withNote.defect).toMatchObject({ note: "sticker residue inside door", noteRequired: true });
  });
});

describe("Defects on an Item", () => {
  test("an Item with Defects can't be removed until its Defects are", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();
    const added = await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH" });
    if (!added.ok) throw new Error("could not add Defect");

    const whileDefectRemains = await homeCheck.removeItem(itemId);
    await homeCheck.removeDefect(added.defect.id);
    const onceEmpty = await homeCheck.removeItem(itemId);

    expect(whileDefectRemains).toEqual({ ok: false, reason: "item-has-defects" });
    expect(onceEmpty).toEqual({ ok: true });
  });

  test("an Area lists how many Defects each of its Items has", async () => {
    const { homeCheck, areaId, itemId } = await wardrobeInBedroom();
    await homeCheck.addItem(areaId, { catalogItemId: "window" });
    await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH" });
    await homeCheck.addDefect(itemId, { defectTypeCode: "CF-HINGE" });

    const items = await homeCheck.listItems(areaId);

    expect(items.map(({ displayName, defectCount }) => ({ displayName, defectCount }))).toEqual([
      { displayName: "Wardrobe", defectCount: 2 },
      { displayName: "Window", defectCount: 0 },
    ]);
    expect((await homeCheck.getItem(itemId))?.defectCount).toBe(2);
  });

  test("lists its Defects with their Defect Type and Category names", async () => {
    const { homeCheck, itemId } = await wardrobeInBedroom();
    await homeCheck.addDefect(itemId, { defectTypeCode: "CF-HINGE" });

    const [defect] = await homeCheck.listDefects(itemId);

    expect(defect).toMatchObject({
      defectTypeCode: "CF-HINGE",
      defectTypeName: "Hinge Fault",
      categoryName: "Cabinet / Furniture Specific",
      noteRequired: false,
    });
  });
});
