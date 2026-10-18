import type { CatalogItem } from "./referenceData";

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

export type ItemView = Item & { displayName: string };

/** A catalog Item (optionally with a short name), or an Other item with free text. */
export type ItemSource = { catalogItemId: string; shortName?: string } | { otherName: string };

/** Catalog Items for an Area: the Area's relevant ones first, then the rest. */
export type ItemChoices = { shownFirst: CatalogItem[]; others: CatalogItem[] };
