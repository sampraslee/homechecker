export type StandardArea = {
  id: string;
  name: string;
  /** Item Catalog ids shown first when picking an Item in this Area. */
  itemsShownFirst: string[];
};

export type CatalogItem = {
  id: string;
  name: string;
  /** Defect Category codes, most relevant first. */
  relevantCategories: string[];
};

export type DefectType = { code: string; name: string };

export type DefectCategory = {
  code: string;
  name: string;
  /** Recording one of this Category's Defect Types needs a note, e.g. Other / Unknown. */
  noteRequired?: boolean;
  defectTypes: DefectType[];
};

export type DefectDictionary = { version: string; categories: DefectCategory[] };

export type StandardAreaList = { version: string; areas: StandardArea[] };

export type ItemCatalog = { version: string; items: CatalogItem[] };

/** Bundled, versioned data the core reads; replacing it needs no code change. */
export type ReferenceData = {
  standardAreas: StandardAreaList;
  itemCatalog: ItemCatalog;
  defectDictionary: DefectDictionary;
};

export function findStandardArea({ standardAreas }: ReferenceData, id: string | null): StandardArea | undefined {
  return standardAreas.areas.find((area) => area.id === id);
}

export function findCatalogItem({ itemCatalog }: ReferenceData, id: string): CatalogItem | undefined {
  return itemCatalog.items.find((item) => item.id === id);
}

/** The Defect Type with this code, and the Category it belongs to. */
export function findDefectType(
  { defectDictionary }: ReferenceData,
  code: string,
): { defectType: DefectType; category: DefectCategory } | undefined {
  for (const category of defectDictionary.categories) {
    const defectType = category.defectTypes.find((candidate) => candidate.code === code);
    if (defectType) return { defectType, category };
  }
  return undefined;
}

/** Throws on reference data the core can't work with, so a bad replacement fails at start-up, not mid-Inspection. */
export function checkReferenceData({ standardAreas, itemCatalog, defectDictionary }: ReferenceData): void {
  assertUniqueIds("Item Catalog", itemCatalog.items);
  assertUniqueIds("Standard Area list", standardAreas.areas);
  assertUnique("Defect Category code", defectDictionary.categories.map((category) => category.code));
  assertUnique(
    "Defect Type code",
    defectDictionary.categories.flatMap((category) => category.defectTypes.map((defectType) => defectType.code)),
  );
  const categoryCodes = new Set(defectDictionary.categories.map((category) => category.code));
  for (const item of itemCatalog.items) {
    for (const code of item.relevantCategories) {
      if (!categoryCodes.has(code)) {
        throw new Error(`Item "${item.name}" lists relevant Defect Category "${code}", which is not in the Defect Dictionary`);
      }
    }
  }
  const catalogIds = new Set(itemCatalog.items.map((item) => item.id));
  for (const area of standardAreas.areas) {
    for (const itemId of area.itemsShownFirst) {
      if (!catalogIds.has(itemId)) {
        throw new Error(`Standard Area "${area.name}" shows first Item "${itemId}", which is not in the Item Catalog`);
      }
    }
  }
}

function assertUniqueIds(listName: string, entries: { id: string }[]): void {
  assertUnique(`${listName} id`, entries.map(({ id }) => id));
}

function assertUnique(what: string, values: string[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`${what} "${value}" is used more than once`);
    seen.add(value);
  }
}
