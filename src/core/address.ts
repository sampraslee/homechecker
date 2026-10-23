import type { AddressErrors, UnitAddress, UnitAddressInput } from "./model";

export type AddressValidation = { ok: true; address: UnitAddress } | { ok: false; errors: AddressErrors };

export function validateAddress(input: UnitAddressInput): AddressValidation {
  const unitNumber = input.unitNumber.trim();
  const buildingName = input.buildingName.trim();

  const errors: AddressErrors = {};
  if (!unitNumber) errors.unitNumber = "Unit number is required";
  if (!buildingName) errors.buildingName = "Building name is required";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, address: { unitNumber, buildingName } };
}

/** What an Inspector says out loud, e.g. "A-12-3, Residensi Harmoni". */
export function formatAddress(address: UnitAddress): string {
  return `${address.unitNumber}, ${address.buildingName}`;
}

/**
 * The earlier addresses, newest first, whose unit number or building has a word starting with what's typed. A Unit
 * entered more than once, however spelt in case or spacing, appears once, as most recently entered.
 */
export function matchingAddresses(addresses: UnitAddress[], typed: string): UnitAddress[] {
  const wanted = normalise(typed);
  if (!wanted) return [];
  const seen = new Set<string>();
  return addresses.filter((address) => {
    const matches = SUGGESTING_ADDRESS_FIELDS.some((field) => {
      const words = normalise(address[field]);
      return words.startsWith(wanted) || words.includes(` ${wanted}`);
    });
    const key = sameUnitKey(address);
    if (!matches || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The fields earlier addresses are matched on as the Inspector types. */
export const SUGGESTING_ADDRESS_FIELDS = ["unitNumber", "buildingName"] as const satisfies readonly (keyof UnitAddress)[];

/** Equal for two addresses of the same Unit that differ only in case or spacing. */
function sameUnitKey(address: UnitAddress): string {
  return [address.unitNumber, address.buildingName].map(normalise).join("\n");
}

/** Lowercase, with runs of spaces as one, so "Residensi  Harmoni" and "residensi harmoni" read alike. */
function normalise(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}
