import type { ReferenceData } from "../core";

/** A small stand-in for the bundled data, so tests don't depend on content pending approval. */
export const testReferenceData: ReferenceData = {
  standardAreas: {
    version: "test-areas-1",
    areas: [
      { id: "bedroom", name: "Bedroom", itemsShownFirst: ["wardrobe", "window"] },
      { id: "bathroom", name: "Bathroom", itemsShownFirst: ["toilet"] },
    ],
  },
  itemCatalog: {
    version: "test-items-1",
    items: [
      { id: "wall", name: "Wall", relevantCategories: ["SF", "CD"] },
      { id: "window", name: "Window", relevantCategories: ["DW", "GM"] },
      { id: "toilet", name: "Toilet", relevantCategories: ["SN", "PL"] },
      { id: "wardrobe", name: "Wardrobe", relevantCategories: ["CF", "HF"] },
    ],
  },
};
