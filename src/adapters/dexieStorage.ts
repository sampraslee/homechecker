import Dexie, { type DexieOptions, type EntityTable } from "dexie";
import type { Inspection, Settings } from "../core/model";
import type { Storage } from "../core/ports";

type SettingsRow = Settings & { key: "settings" };

class HomeCheckDb extends Dexie {
  settings!: EntityTable<SettingsRow, "key">;
  inspections!: EntityTable<Inspection, "id">;

  constructor(name: string, options?: DexieOptions) {
    super(name, options);
    this.version(1).stores({
      settings: "key",
      inspections: "id",
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
  };
}
