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

export type InspectionStatus = "draft" | "completed";

export type Inspection = {
  id: string;
  type: InspectionType;
  status: InspectionStatus;
  address: UnitAddress;
  inspectorName: string;
  startedAt: string;
};

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

/** Where a Defect came from. Defects confirmed from AI Suggestions will add "ai-suggested". */
export type DefectSource = "manual";

export type Defect = {
  id: string;
  inspectionId: string;
  itemId: string;
  defectTypeCode: string;
  /** The Defect Dictionary version the code comes from, so the record stays readable after the Dictionary changes. */
  dictionaryVersion: string;
  source: DefectSource;
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
