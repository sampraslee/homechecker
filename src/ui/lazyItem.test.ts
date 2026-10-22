import { describe, expect, test } from "vitest";
import { createTestHomeCheckWithInspection, expectOk } from "../testing/homeCheck";
import { createLazyItem } from "./lazyItem";

async function bedroom() {
  const setup = await createTestHomeCheckWithInspection();
  const area = expectOk(await setup.homeCheck.addArea(setup.inspectionId, { standardAreaId: "bedroom" })).area;
  return { ...setup, areaId: area.id };
}

describe("an Item chosen in Record a Defect", () => {
  test("does not exist until it is first needed, so quitting before then leaves no Item", async () => {
    const { homeCheck, areaId } = await bedroom();

    createLazyItem(homeCheck, areaId, { catalogItemId: "wardrobe" });

    expect(await homeCheck.listItems(areaId)).toEqual([]);
  });

  test("is created when first needed, as the Item that was chosen", async () => {
    const { homeCheck, areaId } = await bedroom();
    const lazy = createLazyItem(homeCheck, areaId, { catalogItemId: "wardrobe", shortName: "Left" });

    const result = await lazy.ensure();

    expect(expectOk(result).item).toMatchObject({ areaId, name: "Wardrobe", shortName: "Left" });
    expect(lazy.created()?.id).toBe(expectOk(result).item.id);
    expect(await homeCheck.listItems(areaId)).toHaveLength(1);
  });

  test("a catalog Item chosen with no short name is created under its catalog name, and can be told apart later", async () => {
    const { homeCheck, areaId } = await bedroom();
    const first = expectOk(await createLazyItem(homeCheck, areaId, { catalogItemId: "window" }).ensure()).item;
    const second = expectOk(await createLazyItem(homeCheck, areaId, { catalogItemId: "window" }).ensure()).item;

    expect(first).toMatchObject({ name: "Window", displayName: "Window" });
    expect(first.shortName).toBeUndefined();

    expectOk(await homeCheck.renameItem(second.id, "right"));
    expect((await homeCheck.listItems(areaId)).map((item) => item.displayName)).toEqual(["Window", "Window – right"]);
  });

  test("is created once, however many captures need it, even at the same time", async () => {
    const { homeCheck, areaId } = await bedroom();
    const lazy = createLazyItem(homeCheck, areaId, { catalogItemId: "wardrobe" });

    const [first, second] = await Promise.all([lazy.ensure(), lazy.ensure()]);
    const third = await lazy.ensure();

    expect(expectOk(first).item.id).toBe(expectOk(second).item.id);
    expect(expectOk(third).item.id).toBe(expectOk(first).item.id);
    expect(await homeCheck.listItems(areaId)).toHaveLength(1);
  });

  test("creates nothing when the Item is refused, and tries again next time", async () => {
    const { homeCheck, areaId } = await bedroom();
    const lazy = createLazyItem(homeCheck, areaId, { otherName: "   " });

    expect(await lazy.ensure()).toEqual({ ok: false, reason: "item-name-required" });
    expect(lazy.created()).toBeNull();
    expect(await lazy.ensure()).toEqual({ ok: false, reason: "item-name-required" });
    expect(await homeCheck.listItems(areaId)).toEqual([]);
  });
});
