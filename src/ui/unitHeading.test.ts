import { describe, expect, test } from "vitest";
import { unitHeading } from "./unitHeading";

const base = { street: "Jalan Maple", postcode: "50450", city: "Kuala Lumpur", state: "W.P. Kuala Lumpur" as const };

describe("the Move-in / Move-out heading", () => {
  test("shows the unit number and building name", () => {
    expect(unitHeading({ ...base, unitNumber: "4B", buildingName: "Maple House" })).toBe("Unit 4B · Maple House");
  });
  test("shows the street when there is no building name", () => {
    expect(unitHeading({ ...base, unitNumber: "4B" })).toBe("Unit 4B · Jalan Maple");
  });
  test("shows the building name alone when there is no unit number", () => {
    expect(unitHeading({ ...base, unitNumber: "", buildingName: "Maple House" })).toBe("Maple House");
  });
});
