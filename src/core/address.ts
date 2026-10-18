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
