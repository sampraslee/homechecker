import type { Area, Inspection, Item, Settings } from "./model";

/** Persists Home Check records. Production: Dexie. */
export interface Storage {
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  putInspection(inspection: Inspection): Promise<void>;
  getInspection(id: string): Promise<Inspection | undefined>;
  listInspections(): Promise<Inspection[]>;
  putArea(area: Area): Promise<void>;
  getArea(id: string): Promise<Area | undefined>;
  listAreas(inspectionId: string): Promise<Area[]>;
  deleteArea(id: string): Promise<void>;
  putItem(item: Item): Promise<void>;
  getItem(id: string): Promise<Item | undefined>;
  listItems(areaId: string): Promise<Item[]>;
  deleteItem(id: string): Promise<void>;
}

/** The outside world's clock and connectivity. */
export interface Environment {
  now(): Date;
  isOnline(): boolean;
  /** Calls `listener` whenever online state changes; returns an unsubscribe function. */
  onOnlineChange(listener: (online: boolean) => void): () => void;
}
