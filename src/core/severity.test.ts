import { describe, expect, test } from "vitest";
import { createTestHomeCheckWithItem, expectOk } from "../testing/homeCheck";

const photo = new Blob(["wardrobe door"], { type: "image/jpeg" });

async function wardrobeWithPhoto() {
  const setup = await createTestHomeCheckWithItem();
  const evidence = expectOk(await setup.homeCheck.addPhoto(setup.itemId, photo)).evidence;
  return { ...setup, photoId: evidence.id };
}

/** A photo whose AI Suggestion is waiting for review. */
async function withSuggestion() {
  const setup = await createTestHomeCheckWithItem();
  setup.aiClient.answer([{ code: "SF-SCRATCH", confidence: "High" }]);
  expectOk(await setup.homeCheck.addPhoto(setup.itemId, photo));
  await setup.homeCheck.processAiQueue();
  const [suggestion] = await setup.homeCheck.listAiSuggestions(setup.itemId);
  return { ...setup, suggestion };
}

describe("a Defect's Severity", () => {
  test("is kept when given on adding", async () => {
    const { homeCheck, itemId, photoId } = await wardrobeWithPhoto();

    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photoId], severity: "Moderate" }));

    expect(await homeCheck.listDefects(itemId)).toMatchObject([{ severity: "Moderate" }]);
  });

  test("can be missing, so a Defect made before the Severity step is still saved", async () => {
    const { homeCheck, itemId, photoId } = await wardrobeWithPhoto();

    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photoId] }));

    const [defect] = await homeCheck.listDefects(itemId);
    expect(defect.severity).toBeUndefined();
  });

  test("can be set later and changed, while the note and Evidence stay", async () => {
    const { homeCheck, itemId, photoId } = await wardrobeWithPhoto();
    const { defect } = expectOk(
      await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", note: "lower left", evidenceIds: [photoId] }),
    );

    expectOk(await homeCheck.editDefect(defect.id, { severity: "Minor" }));
    expectOk(await homeCheck.editDefect(defect.id, { severity: "Major" }));

    expect(await homeCheck.listDefects(itemId)).toMatchObject([{ severity: "Major", note: "lower left", evidenceIds: [photoId] }]);
  });

  test("is not changed by an edit that leaves it out", async () => {
    const { homeCheck, itemId, photoId } = await wardrobeWithPhoto();
    const { defect } = expectOk(
      await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photoId], severity: "Minor" }),
    );

    expectOk(await homeCheck.editDefect(defect.id, { note: "by the handle" }));

    expect(await homeCheck.listDefects(itemId)).toMatchObject([{ severity: "Minor", note: "by the handle" }]);
  });

  test("must be Minor, Moderate or Major", async () => {
    const { homeCheck, itemId, photoId } = await wardrobeWithPhoto();

    const added = await homeCheck.addDefect(itemId, {
      defectTypeCode: "SF-SCRATCH",
      evidenceIds: [photoId],
      severity: "Severe" as never,
    });

    expect(added).toEqual({ ok: false, reason: "unknown-severity" });
  });
});

describe("confirming or correcting an AI Suggestion", () => {
  test("is refused without a Severity when it would make a new Defect", async () => {
    const { homeCheck, itemId, suggestion } = await withSuggestion();

    expect(await homeCheck.confirmAiSuggestion(suggestion.id)).toEqual({ ok: false, reason: "severity-required" });
    expect(await homeCheck.correctAiSuggestion(suggestion.id, { defectTypeCode: "CF-HINGE" })).toEqual({
      ok: false,
      reason: "severity-required",
    });
    expect(await homeCheck.listDefects(itemId)).toEqual([]);
    expect(await homeCheck.listAiSuggestions(itemId)).toMatchObject([{ outcome: "unreviewed" }]);
  });

  test("gives the new Defect the Severity", async () => {
    const { homeCheck, itemId, suggestion } = await withSuggestion();

    expectOk(await homeCheck.confirmAiSuggestion(suggestion.id, { severity: "Major" }));

    expect(await homeCheck.listDefects(itemId)).toMatchObject([{ source: "ai-suggested", severity: "Major" }]);
  });

  test("needs no Severity when the photo only joins a Defect the Item already has", async () => {
    const { homeCheck, itemId, suggestion } = await withSuggestion();
    const note = expectOk(await homeCheck.addNote(itemId, "scratches by the handle")).evidence;
    const existing = expectOk(
      await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [note.id], severity: "Minor" }),
    ).defect;

    const confirmed = expectOk(await homeCheck.confirmAiSuggestion(suggestion.id));

    expect(confirmed.defect).toMatchObject({ id: existing.id, severity: "Minor" });
  });

  test("still asks for a Severity on a Completed Inspection, where late suggestions may add Defects", async () => {
    const { homeCheck, itemId, inspectionId, suggestion } = await withSuggestion();
    expectOk(await homeCheck.completeInspection(inspectionId));

    expect(await homeCheck.confirmAiSuggestion(suggestion.id)).toEqual({ ok: false, reason: "severity-required" });
    expectOk(await homeCheck.confirmAiSuggestion(suggestion.id, { severity: "Minor" }));
    expect(await homeCheck.listDefects(itemId)).toMatchObject([{ severity: "Minor" }]);
  });
});

describe("a Defect made before Severity existed", () => {
  test("stays valid with no Severity and can be given one", async () => {
    const { homeCheck, itemId, photoId } = await wardrobeWithPhoto();
    const { defect } = expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photoId] }));

    expect((await homeCheck.getDefect(defect.id))?.severity).toBeUndefined();
    expectOk(await homeCheck.editDefect(defect.id, { severity: "Minor" }));
    expect((await homeCheck.getDefect(defect.id))?.severity).toBe("Minor");
  });
});

describe("the Inspection's totals", () => {
  test("count the Defects that have no Severity yet", async () => {
    const { homeCheck, inspectionId, itemId, photoId } = await wardrobeWithPhoto();
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photoId], severity: "Minor" }));
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "CF-HINGE", evidenceIds: [photoId] }));

    expect(await homeCheck.inspectionTotals(inspectionId)).toMatchObject({ defects: 2, defectsWithoutSeverity: 1 });
  });
});
