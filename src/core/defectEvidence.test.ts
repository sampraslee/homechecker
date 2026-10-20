import { describe, expect, test } from "vitest";
import { createTestHomeCheckWithItem, expectOk, noteOf } from "../testing/homeCheck";

/** A Defect is made by assigning a Defect Type to Evidence, so it always has at least one piece. */
describe("a Defect needs Evidence", () => {
  test("can't be added without Evidence, and nothing is recorded", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();

    const added = await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH" });

    expect(added).toEqual({ ok: false, reason: "evidence-required" });
    expect(await homeCheck.listDefects(itemId)).toEqual([]);
  });

  test("can't be edited to have no Evidence, and keeps what it had", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    const proof = await noteOf(homeCheck, itemId);
    const added = expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [proof] })).defect;

    const edited = await homeCheck.editDefect(added.id, { evidenceIds: [] });

    expect(edited).toEqual({ ok: false, reason: "evidence-required" });
    expect((await homeCheck.getDefect(added.id))?.evidenceIds).toEqual([proof]);
  });

  test("deleting the only Evidence behind a Defect removes that Defect", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    const proof = await noteOf(homeCheck, itemId);
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [proof] }));

    expectOk(await homeCheck.deleteEvidence(proof));

    expect(await homeCheck.listDefects(itemId)).toEqual([]);
  });

  test("deleting one of several pieces of Evidence keeps the Defect on the rest", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    const first = await noteOf(homeCheck, itemId);
    const second = await noteOf(homeCheck, itemId);
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [first, second] }));

    expectOk(await homeCheck.deleteEvidence(first));

    expect((await homeCheck.listDefects(itemId)).map((defect) => defect.evidenceIds)).toEqual([[second]]);
  });
});
