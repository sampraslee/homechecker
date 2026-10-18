import { formatAddress, validateAddress } from "./address";
import type {
  Area,
  AreaSource,
  AreaView,
  Evidence,
  Inspection,
  InspectionSummary,
  Item,
  ItemChoices,
  ItemSource,
  ItemView,
  PhotoVersion,
  UnitAddressInput,
} from "./model";
import type { Environment, ImageProcessor, Storage } from "./ports";
import { checkReferenceData, findCatalogItem, findStandardArea, type ReferenceData } from "./referenceData";

export type HomeCheckDeps = {
  storage: Storage;
  environment: Environment;
  referenceData: ReferenceData;
  imageProcessor: ImageProcessor;
};

const inspectorNameRequired = { ok: false, reason: "inspector-name-required" } as const;
const areaNotFound = { ok: false, reason: "area-not-found" } as const;
const itemNotFound = { ok: false, reason: "item-not-found" } as const;
const itemNameRequired = { ok: false, reason: "item-name-required" } as const;

export function createHomeCheck({ storage, environment, referenceData, imageProcessor }: HomeCheckDeps) {
  checkReferenceData(referenceData);

  /** Adds the Evidence copy and thumbnail; on failure leaves the photo unprocessed with its original intact. */
  async function makeSmallerVersions(evidence: Evidence, original: Blob): Promise<Evidence> {
    let versions;
    try {
      versions = await imageProcessor.processPhoto(original);
    } catch {
      return evidence;
    }
    const processed = { ...evidence, processed: true };
    await storage.putEvidence(processed, versions);
    return processed;
  }

  return {
    async getSettings() {
      return storage.getSettings();
    },

    async setInspectorName(name: string) {
      const inspectorName = name.trim();
      if (!inspectorName) return inspectorNameRequired;
      const settings = await storage.getSettings();
      await storage.saveSettings({ ...settings, inspectorName });
      return { ok: true as const, inspectorName };
    },

    async startMoveIn(input: UnitAddressInput) {
      const { inspectorName } = await storage.getSettings();
      if (!inspectorName) return inspectorNameRequired;
      const validation = validateAddress(input);
      if (!validation.ok) return { ok: false as const, reason: "invalid-address" as const, errors: validation.errors };
      const inspection: Inspection = {
        id: crypto.randomUUID(),
        type: "move-in",
        status: "draft",
        address: validation.address,
        inspectorName,
        startedAt: environment.now().toISOString(),
      };
      await storage.putInspection(inspection);
      return { ok: true as const, inspection };
    },

    async getInspection(id: string) {
      return storage.getInspection(id);
    },

    async listInspections(): Promise<InspectionSummary[]> {
      const inspections = await storage.listInspections();
      return inspections
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .map(({ id, type, status, startedAt, address }) => ({
          id,
          type,
          status,
          addressLine: formatAddress(address),
          startedAt,
        }));
    },

    async listStandardAreas() {
      return referenceData.standardAreas.areas.map(({ id, name }) => ({ id, name }));
    },

    async addArea(inspectionId: string, source: AreaSource) {
      if (!(await storage.getInspection(inspectionId))) return { ok: false as const, reason: "inspection-not-found" as const };
      const existing = await storage.listAreas(inspectionId);
      const takenNames = existing.map((other) => other.name);

      let name: string;
      let standardAreaId: string | null = null;
      if ("standardAreaId" in source) {
        const standardArea = findStandardArea(referenceData, source.standardAreaId);
        if (!standardArea) return { ok: false as const, reason: "unknown-standard-area" as const };
        name = firstFreeName(standardArea.name, takenNames);
        standardAreaId = standardArea.id;
      } else {
        name = source.customName.trim();
        const problem = areaNameProblem(name, takenNames);
        if (problem) return { ok: false as const, reason: problem };
      }

      const area: Area = {
        id: crypto.randomUUID(),
        inspectionId,
        name,
        standardAreaId,
        position: nextPosition(existing),
      };
      await storage.putArea(area);
      return { ok: true as const, area };
    },

    async renameArea(areaId: string, newName: string) {
      const area = await storage.getArea(areaId);
      if (!area) return areaNotFound;
      const name = newName.trim();
      const others = (await storage.listAreas(area.inspectionId)).filter((other) => other.id !== areaId);
      const problem = areaNameProblem(name, others.map((other) => other.name));
      if (problem) return { ok: false as const, reason: problem };
      const renamed = { ...area, name };
      await storage.putArea(renamed);
      return { ok: true as const, area: renamed };
    },

    async removeArea(areaId: string) {
      const area = await storage.getArea(areaId);
      if (!area) return areaNotFound;
      if ((await storage.listItems(areaId)).length > 0) return { ok: false as const, reason: "area-has-items" as const };
      await storage.deleteArea(areaId);
      return { ok: true as const };
    },

    async getArea(areaId: string) {
      return storage.getArea(areaId);
    },

    async listAreas(inspectionId: string): Promise<AreaView[]> {
      const areas = await storage.listAreas(inspectionId);
      return Promise.all(areas.map(async (area) => ({ ...area, itemCount: (await storage.listItems(area.id)).length })));
    },

    async addItem(areaId: string, source: ItemSource) {
      const area = await storage.getArea(areaId);
      if (!area) return areaNotFound;

      let itemIdentity: Pick<Item, "catalogItemId" | "name" | "shortName">;
      if ("catalogItemId" in source) {
        const catalogItem = findCatalogItem(referenceData, source.catalogItemId);
        if (!catalogItem) return { ok: false as const, reason: "unknown-catalog-item" as const };
        const shortName = source.shortName?.trim();
        itemIdentity = { catalogItemId: catalogItem.id, name: catalogItem.name, ...(shortName && { shortName }) };
      } else {
        const name = source.otherName.trim();
        if (!name) return itemNameRequired;
        itemIdentity = { catalogItemId: null, name };
      }

      const existing = await storage.listItems(areaId);
      const item: Item = {
        id: crypto.randomUUID(),
        inspectionId: area.inspectionId,
        areaId,
        ...itemIdentity,
        position: nextPosition(existing),
      };
      await storage.putItem(item);
      return { ok: true as const, item: toItemView(item) };
    },

    /** Sets a catalog Item's short name (blank clears it), or an Other item's free-text name. */
    async renameItem(itemId: string, newName: string) {
      const item = await storage.getItem(itemId);
      if (!item) return itemNotFound;
      const trimmed = newName.trim();
      let renamed: Item;
      if (item.catalogItemId) {
        const { shortName: _old, ...rest } = item;
        renamed = trimmed ? { ...rest, shortName: trimmed } : rest;
      } else {
        if (!trimmed) return itemNameRequired;
        renamed = { ...item, name: trimmed };
      }
      await storage.putItem(renamed);
      return { ok: true as const, item: toItemView(renamed) };
    },

    async removeItem(itemId: string) {
      const item = await storage.getItem(itemId);
      if (!item) return itemNotFound;
      if ((await storage.listEvidence(itemId)).length > 0) return { ok: false as const, reason: "item-has-evidence" as const };
      await storage.deleteItem(itemId);
      return { ok: true as const };
    },

    async itemChoices(areaId: string) {
      const area = await storage.getArea(areaId);
      if (!area) return areaNotFound;
      const shownFirstIds = findStandardArea(referenceData, area.standardAreaId)?.itemsShownFirst ?? [];
      // checkReferenceData guarantees every shown-first id is in the catalog.
      const choices: ItemChoices = {
        shownFirst: shownFirstIds.map((id) => findCatalogItem(referenceData, id)!),
        others: referenceData.itemCatalog.items.filter((item) => !shownFirstIds.includes(item.id)),
      };
      return { ok: true as const, ...choices };
    },

    async getItem(itemId: string): Promise<ItemView | undefined> {
      const item = await storage.getItem(itemId);
      return item && toItemView(item);
    },

    async listItems(areaId: string): Promise<ItemView[]> {
      return (await storage.listItems(areaId)).map(toItemView);
    },

    /** Saves the original before making the smaller versions, so a capture is never lost. */
    async addPhoto(itemId: string, original: Blob) {
      const item = await storage.getItem(itemId);
      if (!item) return itemNotFound;
      const evidence: Evidence = {
        id: crypto.randomUUID(),
        inspectionId: item.inspectionId,
        itemId,
        kind: "photo",
        capturedAt: environment.now().toISOString(),
        processed: false,
        position: nextPosition(await storage.listEvidence(itemId)),
      };
      await storage.putEvidence(evidence, { original });
      return { ok: true as const, evidence: await makeSmallerVersions(evidence, original) };
    },

    /** Retries photos whose Evidence copy and thumbnail couldn't be made at capture. Returns how many now have them. */
    async finishPhotoProcessing() {
      let finished = 0;
      for (const evidence of await storage.listUnprocessedEvidence()) {
        const original = await storage.getMedia(evidence.id, "original");
        if (original && (await makeSmallerVersions(evidence, original)).processed) finished++;
      }
      return finished;
    },

    async listEvidence(itemId: string) {
      return storage.listEvidence(itemId);
    },

    async deleteEvidence(evidenceId: string) {
      if (!(await storage.getEvidence(evidenceId))) return { ok: false as const, reason: "evidence-not-found" as const };
      await storage.deleteEvidence(evidenceId);
      return { ok: true as const };
    },

    /** An unprocessed photo has no Evidence copy, and shows its original as its thumbnail. */
    async getPhoto(evidenceId: string, version: PhotoVersion) {
      const blob = await storage.getMedia(evidenceId, version);
      if (blob || version !== "thumbnail") return blob;
      return storage.getMedia(evidenceId, "original");
    },
  };
}

export type HomeCheck = ReturnType<typeof createHomeCheck>;

type OperationResult = { [Op in keyof HomeCheck]: Awaited<ReturnType<HomeCheck[Op]>> }[keyof HomeCheck];

/** Every reason a core operation can refuse. */
export type RefusalReason = Extract<OperationResult, { ok: false }>["reason"];

function nextPosition(siblings: { position: number }[]): number {
  return Math.max(0, ...siblings.map((sibling) => sibling.position)) + 1;
}

function toItemView(item: Item): ItemView {
  return { ...item, displayName: item.shortName ? `${item.name} – ${item.shortName}` : item.name };
}

/** `base`, or `base 2`, `base 3`… whichever is first not already taken. */
function firstFreeName(base: string, taken: string[]): string {
  const takenKeys = new Set(taken.map(comparableName));
  if (!takenKeys.has(comparableName(base))) return base;
  let n = 2;
  while (takenKeys.has(comparableName(`${base} ${n}`))) n++;
  return `${base} ${n}`;
}

function areaNameProblem(name: string, taken: string[]) {
  if (!name) return "area-name-required" as const;
  if (taken.some((other) => comparableName(other) === comparableName(name))) return "area-name-taken" as const;
  return null;
}

function comparableName(name: string): string {
  return name.trim().toLowerCase();
}
