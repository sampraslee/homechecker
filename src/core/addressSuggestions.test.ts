import { describe, expect, test } from "vitest";
import { createTestHomeCheck } from "../testing/homeCheck";

const harmoni = {
  unitNumber: "A-12-3",
  buildingName: "Residensi Harmoni",
  street: "Jalan Ampang",
  locality: "Taman U-Thant",
  postcode: "50450",
  city: "Kuala Lumpur",
  state: "W.P. Kuala Lumpur",
};

const kenari = {
  unitNumber: "7",
  street: "Jalan Kenari 3",
  postcode: "47100",
  city: "Puchong",
  state: "Selangor",
};

async function withInspectionsAt(...addresses: (typeof harmoni | typeof kenari)[]) {
  const testHomeCheck = createTestHomeCheck();
  await testHomeCheck.homeCheck.setInspectorName("Aisyah");
  for (const address of addresses) await testHomeCheck.homeCheck.startMoveIn(address);
  return testHomeCheck;
}

describe("suggesting earlier addresses as the Inspector types", () => {
  test("matches the start of a unit number, ignoring case", async () => {
    const { homeCheck } = await withInspectionsAt(harmoni, kenari);

    expect(await homeCheck.suggestAddresses("a-12")).toEqual([harmoni]);
  });

  test.each([
    ["building name", "Residensi Harm"],
    ["building name, past the first word", "harmoni"],
    ["street, however spaced", "jalan  amp"],
    ["postcode", "504"],
  ])("matches the start of a word in the %s", async (_field, typed) => {
    const { homeCheck } = await withInspectionsAt(harmoni, kenari);

    expect(await homeCheck.suggestAddresses(typed)).toEqual([harmoni]);
  });

  test("doesn't match from the middle of a word, or on the locality, city or state", async () => {
    const { homeCheck } = await withInspectionsAt(harmoni, kenari);

    for (const typed of ["mpang", "Kuala", "Taman", "W.P."]) {
      expect(await homeCheck.suggestAddresses(typed)).toEqual([]);
    }
  });

  test("lists each address once, however many Inspections it has, as most recently entered", async () => {
    const { homeCheck, environment } = await withInspectionsAt(harmoni);
    environment.setNow(new Date("2026-01-06T09:00:00.000Z"));
    const respaced = { ...harmoni, buildingName: "residensi  HARMONI", street: " Jalan Ampang" };
    await homeCheck.startMoveIn(respaced);

    expect(await homeCheck.suggestAddresses("A-12")).toEqual([{ ...respaced, street: "Jalan Ampang" }]);
  });

  test("lists the most recently entered addresses first", async () => {
    const { homeCheck, environment } = await withInspectionsAt(harmoni);
    environment.setNow(new Date("2026-01-06T09:00:00.000Z"));
    const neighbour = { ...harmoni, unitNumber: "A-12-4" };
    await homeCheck.startMoveIn(neighbour);

    expect(await homeCheck.suggestAddresses("A-12")).toEqual([neighbour, harmoni]);
  });

  test("lists nothing until something is typed", async () => {
    const { homeCheck } = await withInspectionsAt(harmoni, kenari);

    expect(await homeCheck.suggestAddresses("  ")).toEqual([]);
  });
});
