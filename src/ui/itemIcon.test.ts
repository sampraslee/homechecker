import { describe, expect, test } from "vitest";
import { Box, DoorClosed } from "lucide-react";
import { bundledReferenceData } from "../referenceData";
import { hasItemIcon, itemIcon } from "./itemIcon";

describe("the icon for a catalog Item", () => {
  test("every Item in the catalog has its own icon", () => {
    const missing = bundledReferenceData.itemCatalog.items.filter((item) => !hasItemIcon(item.id)).map((item) => item.id);
    expect(missing).toEqual([]);
  });
  test("an Item gets the icon chosen for it", () => {
    expect(itemIcon("internal-door")).toBe(DoorClosed);
  });
  test("an identifier outside the catalog falls back to a generic icon", () => {
    expect(itemIcon("not-in-the-catalog")).toBe(Box);
  });
});
