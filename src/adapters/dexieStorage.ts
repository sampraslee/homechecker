import Dexie, { type DexieOptions, type EntityTable } from "dexie";
import { isMedia, type AiQueueEntry, type AiSuggestion, type Area, type Defect, type Evidence, type Inspection, type Item, type MediaVersion, type Settings } from "../core/model";
import type { Storage } from "../core/ports";

type SettingsRow = Settings & { key: "settings" };

type MediaRow = { evidenceId: string; version: MediaVersion; blob: Blob };

class HomeCheckDb extends Dexie {
  settings!: EntityTable<SettingsRow, "key">;
  inspections!: EntityTable<Inspection, "id">;
  areas!: EntityTable<Area, "id">;
  items!: EntityTable<Item, "id">;
  evidence!: EntityTable<Evidence, "id">;
  media!: Dexie.Table<MediaRow, [string, MediaVersion]>;
  defects!: EntityTable<Defect, "id">;
  aiQueue!: EntityTable<AiQueueEntry, "evidenceId">;
  aiSuggestions!: EntityTable<AiSuggestion, "id">;

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
    this.version(4).stores({
      defects: "id, itemId",
    });
    this.version(5).stores({
      aiQueue: "evidenceId, queuedAt",
      aiSuggestions: "id, itemId, evidenceId",
    });
  }
}

/** `options` lets tests pass a fake-indexeddb factory. */
export function createDexieStorage(name = "home-check", options?: DexieOptions): Storage {
  const db = new HomeCheckDb(name, options);

  return {
    async getSettings() {
      const row = await db.settings.get("settings");
      return { inspectorName: row?.inspectorName ?? null, storageDurability: row?.storageDurability ?? null };
    },
    async saveSettings(settings) {
      await db.settings.put({ ...settings, key: "settings" });
    },
    async putInspection(inspection) {
      await db.inspections.put(inspection);
    },
    async putInspectionWithAreasAndItems(inspection, areas, items) {
      await db.transaction("rw", db.inspections, db.areas, db.items, async () => {
        await db.inspections.put(inspection);
        await db.areas.bulkPut(areas);
        await db.items.bulkPut(items);
      });
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
    async putEvidence(evidence, media, aiQueueEntry) {
      await db.transaction("rw", db.evidence, db.media, db.aiQueue, async () => {
        await db.evidence.put(evidence);
        for (const [version, blob] of Object.entries(media) as [MediaVersion, Blob][]) {
          await db.media.put({ evidenceId: evidence.id, version, blob });
        }
        if (aiQueueEntry) await db.aiQueue.put(aiQueueEntry);
      });
    },
    async getEvidence(id) {
      return db.evidence.get(id);
    },
    async listEvidence(itemId) {
      return db.evidence.where({ itemId }).sortBy("position");
    },
    async listUnprocessedEvidence() {
      const evidence = await db.evidence.toArray();
      return evidence.filter(isMedia).filter((media) => !media.processed);
    },
    async getMedia(evidenceId, version) {
      return (await db.media.get([evidenceId, version]))?.blob;
    },
    async deleteEvidence(id) {
      await db.transaction("rw", [db.evidence, db.media, db.aiQueue, db.aiSuggestions], async () => {
        await db.media.where({ evidenceId: id }).delete();
        await db.aiQueue.delete(id);
        await db.aiSuggestions.where({ evidenceId: id }).delete();
        await db.evidence.delete(id);
      });
    },
    async putDefect(defect) {
      await db.defects.put(defect);
    },
    async getDefect(id) {
      return db.defects.get(id);
    },
    async listDefects(itemId) {
      return db.defects.where({ itemId }).sortBy("position");
    },
    async deleteDefect(id) {
      await db.defects.delete(id);
    },
    async listAiQueue() {
      return db.aiQueue.orderBy("queuedAt").toArray();
    },
    async recordFailedAiAttempt(evidenceId, attemptedAt) {
      await db.aiQueue.where({ evidenceId }).modify((entry) => {
        entry.attempts += 1;
        entry.lastAttemptAt = attemptedAt;
      });
    },
    async finishAiRequest(evidenceId, suggestions) {
      await db.transaction("rw", db.aiQueue, db.aiSuggestions, async () => {
        if (!(await db.aiQueue.get(evidenceId))) return;
        await db.aiSuggestions.bulkAdd(suggestions);
        await db.aiQueue.delete(evidenceId);
      });
    },
    async listAiSuggestions(itemId) {
      return db.aiSuggestions.where({ itemId }).toArray();
    },
    async getAiSuggestion(id) {
      return db.aiSuggestions.get(id);
    },
    async saveAiReview(suggestion, defect) {
      await db.transaction("rw", db.aiSuggestions, db.defects, async () => {
        await db.aiSuggestions.put(suggestion);
        if (defect) await db.defects.put(defect);
      });
    },
  };
}
