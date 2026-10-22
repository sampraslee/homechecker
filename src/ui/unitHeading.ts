import type { UnitAddress } from "../core";

/** The heading above the Areas: "Unit 4B · Maple House", with the street standing in for a missing building name. */
export function unitHeading(address: UnitAddress): string {
  const place = address.buildingName || address.street;
  return address.unitNumber ? `Unit ${address.unitNumber} · ${place}` : place;
}
