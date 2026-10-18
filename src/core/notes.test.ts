import { describe, expect, test } from "vitest";
import { createTestHomeCheckWithItem } from "../testing/homeCheck";

describe("adding a note to an Item", () => {
  test("keeps the text, without surrounding spaces, on the phone", async () => {
    const { homeCheck, itemId, reopen } = await createTestHomeCheckWithItem();

    const result = await homeCheck.addNote(itemId, "  hinge loose on the left door \n");

    expect(result.ok).toBe(true);
    expect(await reopen().listEvidence(itemId)).toMatchObject([
      { kind: "note", text: "hinge loose on the left door", capturedAt: "2026-01-05T09:00:00.000Z" },
    ]);
  });

  test("a blank note is refused", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();

    const result = await homeCheck.addNote(itemId, "   ");

    expect(result).toEqual({ ok: false, reason: "blank-note" });
    expect(await homeCheck.listEvidence(itemId)).toEqual([]);
  });
});

describe("editing a note", () => {
  test("replaces its text, keeping its place on the Item", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    const added = await homeCheck.addNote(itemId, "hinge loose");
    await homeCheck.addNote(itemId, "handle missing");
    if (!added.ok) throw new Error("could not add note");

    const result = await homeCheck.editNote(added.evidence.id, " hinge loose on the left door ");

    expect(result.ok).toBe(true);
    expect((await homeCheck.listEvidence(itemId)).map((evidence) => evidence.kind === "note" && evidence.text)).toEqual([
      "hinge loose on the left door",
      "handle missing",
    ]);
  });

  test("to blank is refused and the note keeps its text", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    const added = await homeCheck.addNote(itemId, "hinge loose");
    if (!added.ok) throw new Error("could not add note");

    const result = await homeCheck.editNote(added.evidence.id, "");

    expect(result).toEqual({ ok: false, reason: "blank-note" });
    expect(await homeCheck.listEvidence(itemId)).toMatchObject([{ text: "hinge loose" }]);
  });

  test("only works on notes: a photo has no text to edit", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    const photo = await homeCheck.addPhoto(itemId, new Blob(["wardrobe"], { type: "image/jpeg" }));
    if (!photo.ok) throw new Error("could not add photo");

    expect(await homeCheck.editNote(photo.evidence.id, "text")).toEqual({ ok: false, reason: "evidence-not-a-note" });
    expect(await homeCheck.editNote("no-such-note", "text")).toEqual({ ok: false, reason: "evidence-not-found" });
  });
});
