import type { UnitAddress } from "../core";

/** The heading above the Areas: "Unit 4B · Maple House". */
export function unitHeading(address: UnitAddress): string {
  return `Unit ${address.unitNumber} · ${address.buildingName}`;
}
