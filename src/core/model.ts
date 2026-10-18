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
