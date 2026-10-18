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
  defectDictionary: {
    version: "test-dictionary-1",
    categories: [
      { code: "SF", name: "Surface & Finish", defectTypes: [{ code: "SF-SCRATCH", name: "Scratched" }, { code: "SF-STAIN", name: "Stained" }] },
      { code: "CD", name: "Crack / Separation / Deformation", defectTypes: [{ code: "CD-HAIRLINE", name: "Hairline Crack" }] },
      { code: "DW", name: "Door / Window", defectTypes: [{ code: "DW-STICK", name: "Sticking" }] },
      { code: "GM", name: "Glass / Mirror", defectTypes: [{ code: "GM-CRACK", name: "Cracked Glass" }] },
      { code: "SN", name: "Sanitary Fittings", defectTypes: [{ code: "SN-TOILET-LOOSE", name: "Toilet Bowl Loose" }] },
      { code: "PL", name: "Plumbing & Drainage", defectTypes: [{ code: "PL-FLUSHFAIL", name: "Flush Not Working" }] },
      { code: "CF", name: "Cabinet / Furniture Specific", defectTypes: [{ code: "CF-HINGE", name: "Hinge Fault" }] },
      { code: "HF", name: "Hardware & Fittings", defectTypes: [{ code: "HF-HINGE-LOOSE", name: "Loose Hinge" }] },
      { code: "PE", name: "Pest Evidence", defectTypes: [{ code: "PE-TERMITE", name: "Termite Evidence" }] },
      {
        code: "OT",
        name: "Other / Unknown",
        noteRequired: true,
        defectTypes: [{ code: "OT-OTHER", name: "Other Defect" }, { code: "OT-UNKNOWN", name: "Unable to Determine" }],
      },
    ],
  },
};
