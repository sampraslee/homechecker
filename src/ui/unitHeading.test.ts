import { describe, expect, test } from "vitest";
import { unitHeading } from "./unitHeading";

describe("the Move-in / Move-out heading", () => {
  test("shows the unit number and building name", () => {
    expect(unitHeading({ unitNumber: "4B", buildingName: "Maple House" })).toBe("Unit 4B · Maple House");
  });
});
