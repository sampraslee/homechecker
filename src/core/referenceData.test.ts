import { describe, expect, test } from "vitest";
import { bundledReferenceData } from "../referenceData";
import { createTestHomeCheck, createTestHomeCheckWithInspection } from "../testing/homeCheck";
import { testReferenceData } from "../testing/referenceData";

describe("reference data", () => {
  test("the bundled data offers a standard Area's usual Items first and every catalog Item somewhere", async () => {
    const { homeCheck, inspectionId } = await createTestHomeCheckWithInspection(bundledReferenceData);
    const added = await homeCheck.addArea(inspectionId, { standardAreaId: "powder-room" });
    if (!added.ok) throw new Error("could not add Area");

    const choices = await homeCheck.itemChoices(added.area.id);
    if (!choices.ok) throw new Error("no Item choices");

    expect(choices.shownFirst.map((item) => item.name)).toEqual([
      "Wall", "Floor", "Toilet", "Basin", "Tap", "Mirror", "Exhaust Fan", "Light Fitting",
    ]);
    expect(choices.shownFirst.length + choices.others.length).toBe(57);
  });

  test("the bundled Defect Dictionary is the blueprint's V1, with a Wall's relevant Categories first and every Category somewhere", async () => {
    const { homeCheck, inspectionId } = await createTestHomeCheckWithInspection(bundledReferenceData);
    const area = await homeCheck.addArea(inspectionId, { standardAreaId: "living-room" });
    if (!area.ok) throw new Error("could not add Area");
    const wall = await homeCheck.addItem(area.area.id, { catalogItemId: "wall" });
    if (!wall.ok) throw new Error("could not add Item");

    const choices = await homeCheck.defectChoices(wall.item.id);
    if (!choices.ok) throw new Error("no Defect choices");
    const recorded = await homeCheck.addDefect(wall.item.id, { defectTypeCode: "CD-HAIRLINE" });

    expect(choices.shownFirst.map((category) => category.code)).toEqual(["SF", "CD", "WM", "MB", "CL", "PD", "IW"]);
    const categories = [...choices.shownFirst, ...choices.others];
    expect(categories).toHaveLength(28);
    expect(categories.flatMap((category) => category.defectTypes)).toHaveLength(382);
    expect(recorded.ok && recorded.defect.dictionaryVersion).toBe("master-v1");
  });

  test("is refused when an Area shows first an Item the catalog doesn't have", () => {
    const broken = {
      ...testReferenceData,
      standardAreas: {
        version: "broken",
        areas: [{ id: "bedroom", name: "Bedroom", itemsShownFirst: ["wardrobe", "four-poster-bed"] }],
      },
    };

    expect(() => createTestHomeCheck(broken)).toThrow(
      'Standard Area "Bedroom" shows first Item "four-poster-bed", which is not in the Item Catalog',
    );
  });

  test("is refused when two Items share an id", () => {
    const broken = {
      ...testReferenceData,
      itemCatalog: {
        version: "broken",
        items: [
          { id: "wall", name: "Wall", relevantCategories: ["SF"] },
          { id: "wall", name: "Wall (again)", relevantCategories: ["SF"] },
        ],
      },
      standardAreas: { version: "ok", areas: [] },
    };

    expect(() => createTestHomeCheck(broken)).toThrow('Item Catalog id "wall" is used more than once');
  });

  test("is refused when an Item's relevant Category is not in the Defect Dictionary", () => {
    const broken = {
      ...testReferenceData,
      itemCatalog: { version: "broken", items: [{ id: "wall", name: "Wall", relevantCategories: ["SF", "XX"] }] },
      standardAreas: { version: "ok", areas: [] },
    };

    expect(() => createTestHomeCheck(broken)).toThrow(
      'Item "Wall" lists relevant Defect Category "XX", which is not in the Defect Dictionary',
    );
  });

  test("is refused when two Defect Types share a code, since a Defect records only its code", () => {
    const broken = {
      ...testReferenceData,
      defectDictionary: {
        version: "broken",
        categories: [
          ...testReferenceData.defectDictionary.categories,
          { code: "WD", name: "Wear & Deterioration", defectTypes: [{ code: "SF-STAIN", name: "Stained again" }] },
        ],
      },
    };

    expect(() => createTestHomeCheck(broken)).toThrow('Defect Type code "SF-STAIN" is used more than once');
  });
});
