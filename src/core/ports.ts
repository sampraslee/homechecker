import type { Area, Evidence, Inspection, Item, PhotoVersion, Settings } from "./model";

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
  /** Saves Evidence metadata together with the given media, atomically. */
  putEvidence(evidence: Evidence, media: Partial<Record<PhotoVersion, Blob>>): Promise<void>;
  getEvidence(id: string): Promise<Evidence | undefined>;
  listEvidence(itemId: string): Promise<Evidence[]>;
  /** Photos across all Inspections still missing their Evidence copy and thumbnail. */
  listUnprocessedEvidence(): Promise<Evidence[]>;
  getMedia(evidenceId: string, version: PhotoVersion): Promise<Blob | undefined>;
  /** Removes Evidence metadata and all its media. */
  deleteEvidence(id: string): Promise<void>;
}

/** Makes the smaller versions of a photo. Production: canvas. */
export interface ImageProcessor {
  processPhoto(original: Blob): Promise<{ evidenceCopy: Blob; thumbnail: Blob }>;
}

/** The outside world's clock and connectivity. */
export interface Environment {
  now(): Date;
  isOnline(): boolean;
  /** Calls `listener` whenever online state changes; returns an unsubscribe function. */
  onOnlineChange(listener: (online: boolean) => void): () => void;
}
