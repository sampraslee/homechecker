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

export type StandardAreaList = { version: string; areas: StandardArea[] };

export type ItemCatalog = { version: string; items: CatalogItem[] };

/** Bundled, versioned data the core reads; replacing it needs no code change. */
export type ReferenceData = {
  standardAreas: StandardAreaList;
  itemCatalog: ItemCatalog;
};

export function findStandardArea({ standardAreas }: ReferenceData, id: string | null): StandardArea | undefined {
  return standardAreas.areas.find((area) => area.id === id);
}

export function findCatalogItem({ itemCatalog }: ReferenceData, id: string): CatalogItem | undefined {
  return itemCatalog.items.find((item) => item.id === id);
}

/** Throws on reference data the core can't work with, so a bad replacement fails at start-up, not mid-Inspection. */
export function checkReferenceData({ standardAreas, itemCatalog }: ReferenceData): void {
  assertUniqueIds("Item Catalog", itemCatalog.items);
  assertUniqueIds("Standard Area list", standardAreas.areas);
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
  const seen = new Set<string>();
  for (const { id } of entries) {
    if (seen.has(id)) throw new Error(`${listName} id "${id}" is used more than once`);
    seen.add(id);
  }
}
