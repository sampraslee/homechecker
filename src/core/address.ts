import { MALAYSIAN_STATES, type AddressErrors, type MalaysianState, type UnitAddress, type UnitAddressInput } from "./model";

export type AddressValidation = { ok: true; address: UnitAddress } | { ok: false; errors: AddressErrors };

export function validateAddress(input: UnitAddressInput): AddressValidation {
  const unitNumber = input.unitNumber.trim();
  const buildingName = input.buildingName?.trim();
  const street = input.street.trim();
  const locality = input.locality?.trim();
  const postcode = input.postcode.trim();
  const city = input.city.trim();
  const state = input.state.trim();

  const errors: AddressErrors = {};
  if (!unitNumber) errors.unitNumber = "Unit number is required";
  if (!street) errors.street = "Street is required";
  if (!postcode) errors.postcode = "Postcode is required";
  else if (!/^\d{5}$/.test(postcode)) errors.postcode = "Postcode must be 5 digits";
  if (!city) errors.city = "City is required";
  const validState = isMalaysianState(state) ? state : null;
  if (!validState) errors.state = "Choose a state or Federal Territory";

  if (!validState || Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    address: {
      unitNumber,
      ...(buildingName && { buildingName }),
      street,
      ...(locality && { locality }),
      postcode,
      city,
      state: validState,
    },
  };
}

function isMalaysianState(value: string): value is MalaysianState {
  return (MALAYSIAN_STATES as readonly string[]).includes(value);
}

/** One line, Malaysian order: unit, building, street, locality (Taman), "postcode city", state. */
export function formatAddress(address: UnitAddress): string {
  return [
    address.unitNumber,
    address.buildingName,
    address.street,
    address.locality,
    `${address.postcode} ${address.city}`,
    address.state,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * The earlier addresses, newest first, whose unit number, building, street or postcode has a word starting with what's
 * typed. An address entered more than once, however spelt in case or spacing, appears once, as most recently entered.
 */
export function matchingAddresses(addresses: UnitAddress[], typed: string): UnitAddress[] {
  const wanted = normalise(typed);
  if (!wanted) return [];
  const seen = new Set<string>();
  return addresses.filter((address) => {
    const matches = SUGGESTING_ADDRESS_FIELDS.some((field) => {
      const words = normalise(address[field] ?? "");
      return words.startsWith(wanted) || words.includes(` ${wanted}`);
    });
    const key = sameUnitKey(address);
    if (!matches || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The fields earlier addresses are matched on as the Inspector types. */
export const SUGGESTING_ADDRESS_FIELDS = ["unitNumber", "buildingName", "street", "postcode"] as const satisfies readonly (keyof UnitAddress)[];

/** Equal for two addresses of the same Unit that differ only in case or spacing. */
function sameUnitKey(address: UnitAddress): string {
  return [address.unitNumber, address.buildingName, address.street, address.locality, address.postcode, address.city, address.state]
    .map((field) => normalise(field ?? ""))
    .join("\n");
}

/** Lowercase, with runs of spaces as one, so "Jalan  Ampang" and "jalan ampang" read alike. */
function normalise(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}
