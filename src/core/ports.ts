import type {
  AiQueueEntry,
  AiSuggestion,
  Area,
  Defect,
  Evidence,
  Inspection,
  Item,
  MediaEvidence,
  MediaVersion,
  Settings,
} from "./model";

/** Persists Home Check records. Production: Dexie. */
export interface Storage {
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  putInspection(inspection: Inspection): Promise<void>;
  /** Saves a new Inspection together with the Areas and Items it starts with, atomically. */
  putInspectionWithAreasAndItems(inspection: Inspection, areas: Area[], items: Item[]): Promise<void>;
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
  /** Saves Evidence metadata together with the given media, and queues it for AI if given an entry, atomically. */
  putEvidence(evidence: Evidence, media: Partial<Record<MediaVersion, Blob>>, aiQueueEntry?: AiQueueEntry): Promise<void>;
  getEvidence(id: string): Promise<Evidence | undefined>;
  listEvidence(itemId: string): Promise<Evidence[]>;
  /** Photos and videos across all Inspections still missing their smaller versions. */
  listUnprocessedEvidence(): Promise<MediaEvidence[]>;
  getMedia(evidenceId: string, version: MediaVersion): Promise<Blob | undefined>;
  /** Removes Evidence metadata, all its media, its AI queue entry and its AI Suggestions. */
  deleteEvidence(id: string): Promise<void>;
  putDefect(defect: Defect): Promise<void>;
  getDefect(id: string): Promise<Defect | undefined>;
  listDefects(itemId: string): Promise<Defect[]>;
  deleteDefect(id: string): Promise<void>;
  /** Photos across all Inspections still waiting for AI. */
  listAiQueue(): Promise<AiQueueEntry[]>;
  /** Counts one more failed attempt at sending the photo; does nothing if it's no longer queued (deleted meanwhile). */
  recordFailedAiAttempt(evidenceId: string, attemptedAt: string): Promise<void>;
  /** Saves a photo's AI Suggestions and takes it off the AI queue, atomically; does nothing if it's no longer queued (deleted meanwhile). */
  finishAiRequest(evidenceId: string, suggestions: AiSuggestion[]): Promise<void>;
  listAiSuggestions(itemId: string): Promise<AiSuggestion[]>;
  getAiSuggestion(id: string): Promise<AiSuggestion | undefined>;
  /** Saves a reviewed AI Suggestion together with the Defect it made or added its photo to, if any, atomically. */
  saveAiReview(suggestion: AiSuggestion, defect?: Defect): Promise<void>;
}

/** Makes the smaller versions of a photo, and a video's thumbnail. Production: canvas and a video element. */
export interface ImageProcessor {
  processPhoto(original: Blob): Promise<{ evidenceCopy: Blob; thumbnail: Blob }>;
  processVideo(original: Blob): Promise<{ thumbnail: Blob }>;
}

/** The outside world's clock and connectivity. */
export interface Environment {
  now(): Date;
  isOnline(): boolean;
  /** Calls `listener` whenever online state changes; returns an unsubscribe function. */
  onOnlineChange(listener: (online: boolean) => void): () => void;
}

/** What the AI client is asked about one photo. */
export type AiRequest = {
  /** The photo's Evidence copy, never the original. */
  evidenceCopy: Blob;
  areaName: string;
  itemName: string;
  /** The Item's relevant Defect Categories, as preferred hints. */
  relevantCategories: { code: string; name: string }[];
  /** Every Defect Type code in the bundled Dictionary; nothing else may be suggested. */
  allowedCodes: string[];
};

/** One suggestion as the model returned it, before the core checks it against the Dictionary. */
export type AiAnswer = { code: string; confidence: string };

/** Suggests Defect Types for a photo (ADR 0002). Production: Gemini. */
export interface AiClient {
  /** Up to MAX_AI_SUGGESTIONS_PER_PHOTO suggestions; rejects when the request fails, so the photo stays queued. */
  suggestDefectTypes(request: AiRequest): Promise<AiAnswer[]>;
}
