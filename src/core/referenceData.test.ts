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
});
