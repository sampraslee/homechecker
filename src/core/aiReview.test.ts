import { describe, expect, test } from "vitest";
import type { HomeCheck } from "./homeCheck";
import type { AiAnswer } from "./ports";
import { createTestHomeCheckWithItem, expectOk, noteOf } from "../testing/homeCheck";

/** A second Draft Move-in on the same phone, for another Unit. */
async function anotherInspection(homeCheck: HomeCheck) {
  const started = await homeCheck.startMoveIn({
    unitNumber: "9",
    buildingName: "Vista Sutera",
  });
  return expectOk(started).inspection;
}

/** A Wardrobe with one photo, whose AI Suggestions are `answers`. */
async function photoWithSuggestions(answers: AiAnswer[] = [{ code: "SF-SCRATCH", confidence: "High" }]) {
  const setup = await createTestHomeCheckWithItem();
  const { homeCheck, itemId, aiClient } = setup;
  aiClient.answer(answers);
  const photo = expectOk(await homeCheck.addPhoto(itemId, new Blob(["wardrobe door"], { type: "image/jpeg" }))).evidence;
  await homeCheck.processAiQueue();
  const suggestions = await homeCheck.listAiSuggestions(itemId);
  return { ...setup, photoId: photo.id, suggestions };
}

describe("confirming an AI Suggestion", () => {
  test("makes it a Defect on the Item, marked AI-suggested, with the photo as Evidence", async () => {
    const { homeCheck, itemId, photoId, suggestions, environment } = await photoWithSuggestions();
    environment.setNow(new Date("2026-01-05T09:10:00.000Z"));

    const confirmed = await homeCheck.confirmAiSuggestion(suggestions[0].id, { severity: "Minor" });

    expect(confirmed.ok).toBe(true);
    expect(await homeCheck.listDefects(itemId)).toMatchObject([
      {
        defectTypeCode: "SF-SCRATCH",
        dictionaryVersion: "test-dictionary-1",
        source: "ai-suggested",
        aiSuggestionId: suggestions[0].id,
        evidenceIds: [photoId],
      },
    ]);
    expect(await homeCheck.listAiSuggestions(itemId)).toMatchObject([
      { outcome: "confirmed", reviewedAt: "2026-01-05T09:10:00.000Z" },
    ]);
  });
});

describe("confirming an AI Suggestion for a Defect Type the Item already has", () => {
  test("links the photo to the existing Defect and adds no new one", async () => {
    const { homeCheck, itemId, photoId, suggestions } = await photoWithSuggestions();
    const note = expectOk(await homeCheck.addNote(itemId, "scratches by the handle")).evidence;
    const existing = expectOk(
      await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", note: "by the handle", evidenceIds: [note.id] }),
    ).defect;

    const confirmed = expectOk(await homeCheck.confirmAiSuggestion(suggestions[0].id, { severity: "Minor" }));

    expect(confirmed.defect.id).toBe(existing.id);
    expect(await homeCheck.listDefects(itemId)).toEqual([
      { ...existing, evidenceIds: [note.id, photoId] },
    ]);
    expect(await homeCheck.listAiSuggestions(itemId)).toMatchObject([{ outcome: "confirmed" }]);
  });

  test("leaves the Defect as it is when the photo is already linked", async () => {
    const { homeCheck, itemId, photoId, suggestions } = await photoWithSuggestions();
    const existing = expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photoId] })).defect;

    await homeCheck.confirmAiSuggestion(suggestions[0].id, { severity: "Minor" });

    expect(await homeCheck.listDefects(itemId)).toEqual([existing]);
  });
});

describe("rejecting an AI Suggestion", () => {
  test("records it as rejected and adds no Defect", async () => {
    const { homeCheck, itemId, suggestions, environment } = await photoWithSuggestions();
    environment.setNow(new Date("2026-01-05T09:12:00.000Z"));

    const rejected = await homeCheck.rejectAiSuggestion(suggestions[0].id);

    expect(rejected.ok).toBe(true);
    expect(await homeCheck.listDefects(itemId)).toEqual([]);
    expect(await homeCheck.listAiSuggestions(itemId)).toMatchObject([
      { outcome: "rejected", reviewedAt: "2026-01-05T09:12:00.000Z" },
    ]);
  });
});

describe("correcting an AI Suggestion", () => {
  test("records the chosen Defect Type as an AI-suggested Defect, and the suggestion as corrected to it", async () => {
    const { homeCheck, itemId, photoId, suggestions, environment } = await photoWithSuggestions();
    environment.setNow(new Date("2026-01-05T09:11:00.000Z"));

    const corrected = await homeCheck.correctAiSuggestion(suggestions[0].id, { severity: "Minor", defectTypeCode: "CF-HINGE" });

    expect(corrected.ok).toBe(true);
    expect(await homeCheck.listDefects(itemId)).toMatchObject([
      { defectTypeCode: "CF-HINGE", source: "ai-suggested", aiSuggestionId: suggestions[0].id, evidenceIds: [photoId] },
    ]);
    expect(await homeCheck.listAiSuggestions(itemId)).toMatchObject([
      {
        defectTypeCode: "SF-SCRATCH",
        outcome: "corrected",
        correctedCode: "CF-HINGE",
        correctedDefectTypeName: "Hinge Fault",
        reviewedAt: "2026-01-05T09:11:00.000Z",
      },
    ]);
  });

  test("to a Defect Type the Item already has links the photo to that Defect", async () => {
    const { homeCheck, itemId, photoId, suggestions } = await photoWithSuggestions();
    const proof = await noteOf(homeCheck, itemId);
    const existing = expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "CF-HINGE", evidenceIds: [proof] })).defect;

    const corrected = expectOk(await homeCheck.correctAiSuggestion(suggestions[0].id, { severity: "Minor", defectTypeCode: "CF-HINGE" }));

    expect(corrected.defect.id).toBe(existing.id);
    expect(await homeCheck.listDefects(itemId)).toEqual([{ ...existing, evidenceIds: [proof, photoId] }]);
  });

  test("to a code not in the Dictionary is refused and leaves the suggestion unreviewed", async () => {
    const { homeCheck, itemId, suggestions } = await photoWithSuggestions();

    const corrected = await homeCheck.correctAiSuggestion(suggestions[0].id, { severity: "Minor", defectTypeCode: "SF-SMUDGE" });

    expect(corrected).toEqual({ ok: false, reason: "unknown-defect-type" });
    expect(await homeCheck.listAiSuggestions(itemId)).toMatchObject([{ outcome: "unreviewed" }]);
    expect(await homeCheck.listDefects(itemId)).toEqual([]);
  });
});

describe("once an AI Suggestion is reviewed", () => {
  test("it can't be confirmed, corrected or rejected again", async () => {
    const { homeCheck, itemId, suggestions } = await photoWithSuggestions();
    const [suggestion] = suggestions;
    await homeCheck.rejectAiSuggestion(suggestion.id);

    const refusals = [
      await homeCheck.confirmAiSuggestion(suggestion.id, { severity: "Minor" }),
      await homeCheck.correctAiSuggestion(suggestion.id, { severity: "Minor", defectTypeCode: "CF-HINGE" }),
      await homeCheck.rejectAiSuggestion(suggestion.id),
    ];

    expect(refusals).toEqual(Array(3).fill({ ok: false, reason: "ai-suggestion-already-reviewed" }));
    expect(await homeCheck.listDefects(itemId)).toEqual([]);
    expect(await homeCheck.listAiSuggestions(itemId)).toMatchObject([{ outcome: "rejected" }]);
  });

  test("reviewing the photo's other suggestions never changes the Defect it made", async () => {
    const { homeCheck, itemId, suggestions } = await photoWithSuggestions([
      { code: "CF-HINGE", confidence: "High" },
      { code: "HF-HINGE-LOOSE", confidence: "Medium" },
      { code: "SF-SCRATCH", confidence: "Low" },
    ]);
    const [hinge, looseHinge, scratch] = suggestions;
    const made = expectOk(await homeCheck.confirmAiSuggestion(hinge.id, { severity: "Minor" })).defect;

    await homeCheck.rejectAiSuggestion(looseHinge.id);
    await homeCheck.correctAiSuggestion(scratch.id, { severity: "Minor", defectTypeCode: "SF-STAIN" });

    const [first, second] = await homeCheck.listDefects(itemId);
    expect(first).toEqual(made);
    expect(second).toMatchObject({ defectTypeCode: "SF-STAIN", aiSuggestionId: scratch.id });
  });
});

describe("Other / Unknown AI Suggestions", () => {
  test("confirming Unable to Determine needs a note, as adding it by hand does", async () => {
    const { homeCheck, itemId, suggestions } = await photoWithSuggestions([{ code: "OT-UNKNOWN", confidence: "Low" }]);

    const withoutNote = await homeCheck.confirmAiSuggestion(suggestions[0].id, { severity: "Minor" });
    const withNote = await homeCheck.confirmAiSuggestion(suggestions[0].id, { severity: "Minor", note: "  dark patch behind door  " });

    expect(withoutNote).toEqual({ ok: false, reason: "note-required" });
    expect(withNote.ok).toBe(true);
    expect(await homeCheck.listDefects(itemId)).toMatchObject([{ defectTypeCode: "OT-UNKNOWN", note: "dark patch behind door" }]);
  });

  test("correcting to Other Defect needs a note", async () => {
    const { homeCheck, suggestions } = await photoWithSuggestions();

    const corrected = await homeCheck.correctAiSuggestion(suggestions[0].id, { severity: "Minor", defectTypeCode: "OT-OTHER" });

    expect(corrected).toEqual({ ok: false, reason: "note-required" });
  });

  test("needs no note when the Item already has that Defect, which keeps its own note", async () => {
    const { homeCheck, itemId, photoId, suggestions } = await photoWithSuggestions([{ code: "OT-UNKNOWN", confidence: "Low" }]);
    const proof = await noteOf(homeCheck, itemId);
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "OT-UNKNOWN", note: "odd smell", evidenceIds: [proof] }));

    const confirmed = await homeCheck.confirmAiSuggestion(suggestions[0].id, { severity: "Minor" });

    expect(confirmed.ok).toBe(true);
    expect(await homeCheck.listDefects(itemId)).toMatchObject([{ note: "odd smell", evidenceIds: [proof, photoId] }]);
  });

  test("a note given for an ordinary Defect Type is kept on the new Defect", async () => {
    const { homeCheck, itemId, suggestions } = await photoWithSuggestions();

    await homeCheck.correctAiSuggestion(suggestions[0].id, { severity: "Minor", defectTypeCode: "CF-HINGE", note: "top hinge" });

    expect(await homeCheck.listDefects(itemId)).toMatchObject([{ defectTypeCode: "CF-HINGE", note: "top hinge" }]);
  });
});

describe("on a Completed Inspection", () => {
  test("refuses reviewing an AI Suggestion, whichever way", async () => {
    const { homeCheck, inspectionId, itemId, photoId, suggestions } = await photoWithSuggestions();
    await homeCheck.completeInspection(inspectionId);

    const byHand = await homeCheck.addDefect(itemId, { defectTypeCode: "CF-HINGE", evidenceIds: [photoId] });
    const confirmed = await homeCheck.confirmAiSuggestion(suggestions[0].id, { severity: "Minor" });
    const corrected = await homeCheck.correctAiSuggestion(suggestions[0].id, { severity: "Minor", defectTypeCode: "CF-HINGE" });
    const rejected = await homeCheck.rejectAiSuggestion(suggestions[0].id);

    const locked = { ok: false, reason: "inspection-completed" };
    expect({ byHand, confirmed, corrected, rejected }).toEqual({ byHand: locked, confirmed: locked, corrected: locked, rejected: locked });
    expect(await homeCheck.listDefects(itemId)).toEqual([]);
    const after = await homeCheck.listAiSuggestions(itemId);
    expect(after.every((suggestion) => suggestion.outcome === "unreviewed")).toBe(true);
  });

  test("a photo still waiting for AI when completed still gets its suggestions, stored unreviewed", async () => {
    const { homeCheck, inspectionId, itemId } = await createTestHomeCheckWithItem();
    expectOk(await homeCheck.addPhoto(itemId, new Blob(["door"], { type: "image/jpeg" })));
    await homeCheck.completeInspection(inspectionId);

    await homeCheck.processAiQueue();

    const late = await homeCheck.listAiSuggestions(itemId);
    expect(late.length).toBeGreaterThan(0);
    expect(late.every((suggestion) => suggestion.outcome === "unreviewed")).toBe(true);
    expect(await homeCheck.confirmAiSuggestion(late[0].id, { severity: "Minor" })).toEqual({ ok: false, reason: "inspection-completed" });
  });
});

describe("AI Suggestions still to review", () => {
  test("are counted on each Item and on its Area, leaving out reviewed ones", async () => {
    const { homeCheck, inspectionId, areaId, itemId, aiClient } = await createTestHomeCheckWithItem();
    const bathroom = expectOk(await homeCheck.addArea(inspectionId, { standardAreaId: "bathroom" })).area;
    const toilet = expectOk(await homeCheck.addItem(bathroom.id, { catalogItemId: "toilet" })).item;
    aiClient.answer([{ code: "SN-TOILET-LOOSE", confidence: "Medium" }]);
    await homeCheck.addPhoto(toilet.id, new Blob(["toilet"], { type: "image/jpeg" }));
    await homeCheck.processAiQueue();
    aiClient.answer([
      { code: "CF-HINGE", confidence: "High" },
      { code: "SF-SCRATCH", confidence: "Low" },
    ]);
    await homeCheck.addPhoto(itemId, new Blob(["wardrobe"], { type: "image/jpeg" }));
    await homeCheck.processAiQueue();
    expect((await homeCheck.getItem(itemId))?.aiToReview).toBe(2);

    const [hinge] = await homeCheck.listAiSuggestions(itemId);
    await homeCheck.rejectAiSuggestion(hinge.id);

    expect((await homeCheck.getItem(itemId))?.aiToReview).toBe(1);
    expect((await homeCheck.getItem(toilet.id))?.aiToReview).toBe(1);
    const areas = await homeCheck.listAreas(inspectionId);
    expect(areas.map(({ id, aiToReview }) => [id, aiToReview])).toEqual([
      [areaId, 1],
      [bathroom.id, 1],
    ]);
  });

  test("a rejected suggestion stays on record as Rejected", async () => {
    const { homeCheck, itemId } = await photoWithSuggestions();
    const [suggestion] = await homeCheck.listAiSuggestions(itemId);

    await homeCheck.rejectAiSuggestion(suggestion.id);

    expect(await homeCheck.listAiSuggestions(itemId)).toMatchObject([{ id: suggestion.id, outcome: "rejected" }]);
  });

  test("leave out other Inspections' suggestions", async () => {
    const { homeCheck, itemId } = await photoWithSuggestions();
    const other = await anotherInspection(homeCheck);

    expect(await homeCheck.listAreas(other.id)).toEqual([]);
    expect(await homeCheck.listAiSuggestions(itemId)).toHaveLength(1);
  });
});

describe("the check before completing", () => {
  test("counts this Inspection's photos waiting for AI and its unreviewed AI Suggestions", async () => {
    const { homeCheck, inspectionId, itemId, environment } = await photoWithSuggestions([
      { code: "CF-HINGE", confidence: "High" },
      { code: "SF-SCRATCH", confidence: "Low" },
    ]);
    const [hinge] = await homeCheck.listAiSuggestions(itemId);
    await homeCheck.confirmAiSuggestion(hinge.id, { severity: "Minor" });
    environment.setOnline(false);
    await homeCheck.addPhoto(itemId, new Blob(["second"], { type: "image/jpeg" }));
    await homeCheck.addPhoto(itemId, new Blob(["third"], { type: "image/jpeg" }));
    const other = await anotherInspection(homeCheck);
    const otherArea = expectOk(await homeCheck.addArea(other.id, { standardAreaId: "bedroom" })).area;
    const otherItem = expectOk(await homeCheck.addItem(otherArea.id, { catalogItemId: "window" })).item;
    await homeCheck.addPhoto(otherItem.id, new Blob(["other unit"], { type: "image/jpeg" }));

    expect(await homeCheck.aiWorkLeft(inspectionId)).toEqual({ waitingForAi: 2, unreviewedAiSuggestions: 1 });
  });
});

describe("listeners for AI changes", () => {
  test("are told when an AI Suggestion is reviewed", async () => {
    const { homeCheck, suggestions } = await photoWithSuggestions([
      { code: "CF-HINGE", confidence: "High" },
      { code: "SF-SCRATCH", confidence: "Low" },
    ]);
    let changes = 0;
    homeCheck.onAiChange(() => changes++);

    await homeCheck.confirmAiSuggestion(suggestions[0].id, { severity: "Minor" });
    await homeCheck.rejectAiSuggestion(suggestions[1].id);

    expect(changes).toBe(2);
  });
});

describe("correcting an AI Suggestion to the Defect Type it already suggested", () => {
  test("counts as confirming it", async () => {
    const { homeCheck, itemId, suggestions } = await photoWithSuggestions();

    await homeCheck.correctAiSuggestion(suggestions[0].id, { severity: "Minor", defectTypeCode: "SF-SCRATCH" });

    const [reviewed] = await homeCheck.listAiSuggestions(itemId);
    expect(reviewed.outcome).toBe("confirmed");
    expect(reviewed.correctedCode).toBeUndefined();
  });
});

describe("what a review reports", () => {
  test("whether it made a new Defect or added the photo to one the Item already had", async () => {
    const { homeCheck, itemId, suggestions } = await photoWithSuggestions([
      { code: "CF-HINGE", confidence: "High" },
      { code: "SF-SCRATCH", confidence: "Low" },
    ]);
    expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [await noteOf(homeCheck, itemId)] }));

    const made = expectOk(await homeCheck.confirmAiSuggestion(suggestions[0].id, { severity: "Minor" }));
    const linked = expectOk(await homeCheck.confirmAiSuggestion(suggestions[1].id, { severity: "Minor" }));

    expect({ made: made.addedToExisting, linked: linked.addedToExisting }).toEqual({ made: false, linked: true });
  });
});

describe("undoing an AI review", () => {
  test("after confirming, removes the Defect it made and leaves the suggestion unreviewed", async () => {
    const { homeCheck, itemId, suggestions } = await photoWithSuggestions();
    expectOk(await homeCheck.confirmAiSuggestion(suggestions[0].id, { severity: "Minor" }));

    expectOk(await homeCheck.undoAiReview(suggestions[0].id));

    expect(await homeCheck.listDefects(itemId)).toEqual([]);
    const [undone] = await homeCheck.listAiSuggestions(itemId);
    expect(undone.outcome).toBe("unreviewed");
    expect(undone.reviewedAt).toBeUndefined();
  });

  test("after correcting, removes the corrected Defect and the correction", async () => {
    const { homeCheck, itemId, suggestions } = await photoWithSuggestions();
    expectOk(await homeCheck.correctAiSuggestion(suggestions[0].id, { severity: "Minor", defectTypeCode: "CF-HINGE" }));

    expectOk(await homeCheck.undoAiReview(suggestions[0].id));

    expect(await homeCheck.listDefects(itemId)).toEqual([]);
    const [undone] = await homeCheck.listAiSuggestions(itemId);
    expect(undone.outcome).toBe("unreviewed");
    expect(undone.correctedCode).toBeUndefined();
  });

  test("after rejecting, leaves the suggestion unreviewed", async () => {
    const { homeCheck, itemId, suggestions } = await photoWithSuggestions();
    expectOk(await homeCheck.rejectAiSuggestion(suggestions[0].id));

    expectOk(await homeCheck.undoAiReview(suggestions[0].id));

    expect((await homeCheck.listAiSuggestions(itemId))[0].outcome).toBe("unreviewed");
  });

  test("after adding the photo to an existing Defect, unlinks the photo and keeps the Defect", async () => {
    const { homeCheck, itemId, suggestions } = await photoWithSuggestions();
    const note = expectOk(await homeCheck.addNote(itemId, "by the handle")).evidence;
    const existing = expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [note.id] })).defect;
    expectOk(await homeCheck.confirmAiSuggestion(suggestions[0].id, { severity: "Minor" }));

    expectOk(await homeCheck.undoAiReview(suggestions[0].id));

    expect(await homeCheck.listDefects(itemId)).toMatchObject([{ id: existing.id, evidenceIds: [note.id] }]);
  });

  test("leaves a photo linked when it was linked before the review", async () => {
    const { homeCheck, itemId, photoId, suggestions } = await photoWithSuggestions();
    const existing = expectOk(await homeCheck.addDefect(itemId, { defectTypeCode: "SF-SCRATCH", evidenceIds: [photoId] })).defect;
    expectOk(await homeCheck.confirmAiSuggestion(suggestions[0].id, { severity: "Minor" }));

    expectOk(await homeCheck.undoAiReview(suggestions[0].id));

    expect(await homeCheck.listDefects(itemId)).toMatchObject([{ id: existing.id, evidenceIds: [photoId] }]);
  });

  test("of a suggestion still unreviewed is refused", async () => {
    const { homeCheck, suggestions } = await photoWithSuggestions();

    expect(await homeCheck.undoAiReview(suggestions[0].id)).toEqual({ ok: false, reason: "ai-suggestion-not-reviewed" });
  });

  test("is refused on a Completed Inspection, as reviewing is", async () => {
    const { homeCheck, inspectionId, suggestions } = await photoWithSuggestions();
    expectOk(await homeCheck.confirmAiSuggestion(suggestions[0].id, { severity: "Minor" }));
    expectOk(await homeCheck.completeInspection(inspectionId));

    expect(await homeCheck.undoAiReview(suggestions[0].id)).toEqual({ ok: false, reason: "inspection-completed" });
  });
});
