import Dexie, { type DexieOptions, type EntityTable } from "dexie";
import type { Area, Evidence, Inspection, Item, PhotoVersion, Settings } from "../core/model";
import type { Storage } from "../core/ports";

type SettingsRow = Settings & { key: "settings" };

type MediaRow = { evidenceId: string; version: PhotoVersion; blob: Blob };

class HomeCheckDb extends Dexie {
  settings!: EntityTable<SettingsRow, "key">;
  inspections!: EntityTable<Inspection, "id">;
  areas!: EntityTable<Area, "id">;
  items!: EntityTable<Item, "id">;
  evidence!: EntityTable<Evidence, "id">;
  media!: Dexie.Table<MediaRow, [string, PhotoVersion]>;

  constructor(name: string, options?: DexieOptions) {
    super(name, options);
    this.version(1).stores({
      settings: "key",
      inspections: "id",
    });
    this.version(2).stores({
      areas: "id, inspectionId",
      items: "id, areaId",
    });
    this.version(3).stores({
      evidence: "id, itemId",
      media: "[evidenceId+version], evidenceId",
    });
  }
}

/** `options` lets tests pass a fake-indexeddb factory. */
export function createDexieStorage(name = "home-check", options?: DexieOptions): Storage {
  const db = new HomeCheckDb(name, options);

  return {
    async getSettings() {
      const row = await db.settings.get("settings");
      return { inspectorName: row?.inspectorName ?? null };
    },
    async saveSettings(settings) {
      await db.settings.put({ ...settings, key: "settings" });
    },
    async putInspection(inspection) {
      await db.inspections.put(inspection);
    },
    async getInspection(id) {
      return db.inspections.get(id);
    },
    async listInspections() {
      return db.inspections.toArray();
    },
    async putArea(area) {
      await db.areas.put(area);
    },
    async getArea(id) {
      return db.areas.get(id);
    },
    async listAreas(inspectionId) {
      return db.areas.where({ inspectionId }).sortBy("position");
    },
    async deleteArea(id) {
      await db.areas.delete(id);
    },
    async putItem(item) {
      await db.items.put(item);
    },
    async getItem(id) {
      return db.items.get(id);
    },
    async listItems(areaId) {
      return db.items.where({ areaId }).sortBy("position");
    },
    async deleteItem(id) {
      await db.items.delete(id);
    },
    async putEvidence(evidence, media) {
      await db.transaction("rw", db.evidence, db.media, async () => {
        await db.evidence.put(evidence);
        for (const [version, blob] of Object.entries(media) as [PhotoVersion, Blob][]) {
          await db.media.put({ evidenceId: evidence.id, version, blob });
        }
      });
    },
    async getEvidence(id) {
      return db.evidence.get(id);
    },
    async listEvidence(itemId) {
      return db.evidence.where({ itemId }).sortBy("position");
    },
    async listUnprocessedEvidence() {
      return db.evidence.filter((evidence) => !evidence.processed).toArray();
    },
    async getMedia(evidenceId, version) {
      return (await db.media.get([evidenceId, version]))?.blob;
    },
    async deleteEvidence(id) {
      await db.transaction("rw", db.evidence, db.media, async () => {
        await db.media.where({ evidenceId: id }).delete();
        await db.evidence.delete(id);
      });
    },
  };
}
