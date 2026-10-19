import type { CatalogItem, DefectCategory } from "./referenceData";

export const MALAYSIAN_STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "W.P. Kuala Lumpur",
  "W.P. Labuan",
  "W.P. Putrajaya",
] as const;

export type MalaysianState = (typeof MALAYSIAN_STATES)[number];

export type UnitAddress = {
  unitNumber: string;
  buildingName?: string;
  street: string;
  /** The address's area / Taman. Not an Area of the Unit. */
  locality?: string;
  postcode: string;
  city: string;
  state: MalaysianState;
};

/** What the Inspector typed, before validation. */
export type UnitAddressInput = Omit<UnitAddress, "state"> & { state: string };

export type AddressField = keyof UnitAddressInput;

export type AddressErrors = Partial<Record<AddressField, string>>;

export type InspectionType = "move-in" | "move-out";

export const inspectionTypeLabel: Record<InspectionType, string> = {
  "move-in": "Move-in",
  "move-out": "Move-out",
};

export type InspectionStatus = "draft" | "completed";

export type Inspection = {
  id: string;
  type: InspectionType;
  status: InspectionStatus;
  address: UnitAddress;
  inspectorName: string;
  startedAt: string;
  /** Set when the Inspection is Completed. */
  completedAt?: string;
  /** When the Inspection was last exported, Draft or Completed; unset if never. */
  lastExportedAt?: string;
  /** The Move-in a Move-out was started from; unset for a Move-in or an unlinked Move-out. */
  linkedMoveInId?: string;
};

/** A linked Move-out starts from a Move-in on this phone; an unlinked one from a typed address. */
export type MoveOutSource = { moveInId: string } | { address: UnitAddressInput };

export type Settings = {
  inspectorName: string | null;
};

export type InspectionSummary = Pick<Inspection, "id" | "type" | "status" | "startedAt"> & {
  addressLine: string;
};

export type Area = {
  id: string;
  inspectionId: string;
  name: string;
  /** The standard Area it was added from; null for a custom Area. */
  standardAreaId: string | null;
  /** Order within the Inspection. */
  position: number;
};

export type AreaView = Area & { itemCount: number };

/** Where a new Area's name comes from. */
export type AreaSource = { standardAreaId: string } | { customName: string };

export type Item = {
  id: string;
  inspectionId: string;
  areaId: string;
  /** The Item Catalog entry; null for an "Other item". */
  catalogItemId: string | null;
  /** The catalog name when added, or the Other item's free text. */
  name: string;
  /** Tells repeated catalog Items apart, e.g. "left". */
  shortName?: string;
  /** Order within the Area. */
  position: number;
};

export type ItemView = Item & { displayName: string; defectCount: number };

/** A catalog Item (optionally with a short name), or an Other item with free text. */
export type ItemSource = { catalogItemId: string; shortName?: string } | { otherName: string };

/** Catalog Items for an Area: the Area's relevant ones first, then the rest. */
export type ItemChoices = { shownFirst: CatalogItem[]; others: CatalogItem[] };

/** The stored files of a photo or video. A video has only its original and thumbnail. */
export type MediaVersion = "original" | "evidenceCopy" | "thumbnail";

/** Recording stops by itself at this length. */
export const VIDEO_TIME_LIMIT_SECONDS = 30;

type EvidenceBase = {
  id: string;
  inspectionId: string;
  /** Evidence belongs to exactly one Item. */
  itemId: string;
  capturedAt: string;
  /** Order within the Item, across every kind. */
  position: number;
};

export type PhotoEvidence = EvidenceBase & {
  kind: "photo";
  /** False until the Evidence copy and thumbnail exist; the original is always kept. */
  processed: boolean;
};

export type VideoEvidence = EvidenceBase & {
  kind: "video";
  /** Seconds, to one decimal place; never more than VIDEO_TIME_LIMIT_SECONDS. */
  durationSeconds: number;
  /** False until the thumbnail exists; the original is always kept and never compressed. */
  processed: boolean;
};

export type NoteEvidence = EvidenceBase & {
  kind: "note";
  text: string;
};

/** A photo or video: Evidence with stored media. */
export type MediaEvidence = PhotoEvidence | VideoEvidence;

export type Evidence = MediaEvidence | NoteEvidence;

export function isMedia(evidence: Evidence): evidence is MediaEvidence {
  return evidence.kind !== "note";
}

export function isNote(evidence: Evidence): evidence is NoteEvidence {
  return evidence.kind === "note";
}

/** Where a Defect came from: added by hand, or from an AI Suggestion the Inspector confirmed or corrected. */
export type DefectSource = "manual" | "ai-suggested";

export type Defect = {
  id: string;
  inspectionId: string;
  itemId: string;
  defectTypeCode: string;
  /** The Defect Dictionary version the code comes from, so the record stays readable after the Dictionary changes. */
  dictionaryVersion: string;
  source: DefectSource;
  /** The AI Suggestion an "ai-suggested" Defect was made from. */
  aiSuggestionId?: string;
  note?: string;
  /** Evidence of the same Item that supports this Defect. */
  evidenceIds: string[];
  /** Order within the Item. */
  position: number;
};

/** A Defect with the names of its Defect Type and Category, and whether it needs a note, from the bundled Dictionary. */
export type DefectView = Defect & { defectTypeName: string; categoryName: string; noteRequired: boolean };

/** What the Inspector chose when adding a Defect. */
export type DefectInput = { defectTypeCode: string; note?: string; evidenceIds?: string[] };

/** What to change on a Defect; a blank note clears it. Its Defect Type never changes. */
export type DefectChanges = { note?: string; evidenceIds?: string[] };

/** Defect Categories for an Item: its relevant ones first, then the rest. */
export type DefectChoices = { shownFirst: DefectCategory[]; others: DefectCategory[] };

export const AI_CONFIDENCES = ["High", "Medium", "Low"] as const;

export type AiConfidence = (typeof AI_CONFIDENCES)[number];

/** At most this many AI Suggestions are kept per photo. */
export const MAX_AI_SUGGESTIONS_PER_PHOTO = 3;

/** A photo waiting to be sent to the AI. Every photo is queued exactly once, at capture. */
export type AiQueueEntry = {
  evidenceId: string;
  inspectionId: string;
  queuedAt: string;
  /** Failed requests so far; the photo stays queued and is retried on the next trigger. */
  attempts: number;
  lastAttemptAt?: string;
};

/** Where review of an AI Suggestion stands. Once reviewed it never changes. */
export type AiSuggestionOutcome = "unreviewed" | "confirmed" | "corrected" | "rejected";

/** A Defect Type the AI proposed for a photo. Kept apart from Defects and never overwritten by a later AI run. */
export type AiSuggestion = {
  id: string;
  inspectionId: string;
  itemId: string;
  /** The photo it was suggested for. */
  evidenceId: string;
  defectTypeCode: string;
  dictionaryVersion: string;
  confidence: AiConfidence;
  outcome: AiSuggestionOutcome;
  /** The Defect Type the Inspector chose instead, when the outcome is "corrected". */
  correctedCode?: string;
  /** When the AI answered. */
  suggestedAt: string;
  /** When the Inspector confirmed, corrected or rejected it. */
  reviewedAt?: string;
  /** Order among the photo's suggestions, as the AI ranked them. */
  rank: number;
};

/** An AI Suggestion with the names of its Defect Type and Category, and of any corrected Defect Type, from the bundled Dictionary. */
export type AiSuggestionView = AiSuggestion & { defectTypeName: string; categoryName: string; correctedDefectTypeName?: string };

/** An AI Suggestion still to review, with the names of the Area and Item it's on. */
export type UnreviewedAiSuggestionView = AiSuggestionView & { areaName: string; itemName: string };

/** An Inspection's AI work still to come or to review, shown before completing. */
export type AiWorkLeft = { waitingForAi: number; unreviewedAiSuggestions: number };

/** What the Inspector adds when confirming an AI Suggestion: a note for a new Defect, needed for Other / Unknown. */
export type AiConfirmInput = { note?: string };

/** The Defect Type the Inspector chose in place of the AI's, and a note for a new Defect. */
export type AiCorrectionInput = AiConfirmInput & { defectTypeCode: string };
