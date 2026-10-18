import { describe, expect, test } from "vitest";
import type { HomeCheck } from "./homeCheck";
import { createTestHomeCheckWithItem } from "../testing/homeCheck";

/** One photo, one video and one note of the Item, in that order. */
async function oneOfEachKind(homeCheck: HomeCheck, itemId: string) {
  const photo = await homeCheck.addPhoto(itemId, new Blob(["door scratch"], { type: "image/jpeg" }));
  const video = await homeCheck.addVideo(itemId, new Blob(["door sticking"], { type: "video/mp4" }), 9);
  const note = await homeCheck.addNote(itemId, "door sticks halfway");
  if (!photo.ok || !video.ok || !note.ok) throw new Error("could not add Evidence");
  return { photoId: photo.evidence.id, videoId: video.evidence.id, noteId: note.evidence.id };
}

describe("an Item's Evidence", () => {
  test("lists photos, videos and notes together, in the order they were added", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();

    await oneOfEachKind(homeCheck, itemId);

    expect((await homeCheck.listEvidence(itemId)).map((evidence) => evidence.kind)).toEqual(["photo", "video", "note"]);
  });

  test("videos and notes can be linked to the Item's Defects, like photos", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    const { photoId, videoId, noteId } = await oneOfEachKind(homeCheck, itemId);

    const added = await homeCheck.addDefect(itemId, { defectTypeCode: "HF-HINGE-LOOSE", evidenceIds: [videoId, noteId] });
    if (!added.ok) throw new Error(`could not add Defect: ${added.reason}`);
    const edited = await homeCheck.editDefect(added.defect.id, { evidenceIds: [photoId, videoId, noteId] });

    expect(edited.ok && edited.defect.evidenceIds).toEqual([photoId, videoId, noteId]);
  });

  test("a video or note of another Item can't be linked to a Defect", async () => {
    const { homeCheck, areaId, itemId } = await createTestHomeCheckWithItem();
    const windowItem = await homeCheck.addItem(areaId, { catalogItemId: "window" });
    if (!windowItem.ok) throw new Error("could not add Item");
    const { videoId, noteId } = await oneOfEachKind(homeCheck, windowItem.item.id);

    const withVideo = await homeCheck.addDefect(itemId, { defectTypeCode: "HF-HINGE-LOOSE", evidenceIds: [videoId] });
    const withNote = await homeCheck.addDefect(itemId, { defectTypeCode: "HF-HINGE-LOOSE", evidenceIds: [noteId] });

    expect([withVideo, withNote]).toEqual([
      { ok: false, reason: "evidence-not-on-item" },
      { ok: false, reason: "evidence-not-on-item" },
    ]);
  });

  test("deleting a linked video or note removes it and unlinks it from the Defect, which stays", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    const { photoId, videoId, noteId } = await oneOfEachKind(homeCheck, itemId);
    const added = await homeCheck.addDefect(itemId, { defectTypeCode: "HF-HINGE-LOOSE", evidenceIds: [photoId, videoId, noteId] });
    if (!added.ok) throw new Error(`could not add Defect: ${added.reason}`);

    await homeCheck.deleteEvidence(videoId);
    await homeCheck.deleteEvidence(noteId);

    expect((await homeCheck.listEvidence(itemId)).map((evidence) => evidence.id)).toEqual([photoId]);
    expect(await homeCheck.getMedia(videoId, "original")).toBeUndefined();
    expect((await homeCheck.getDefect(added.defect.id))?.evidenceIds).toEqual([photoId]);
  });

  test("an Item with only a note or a video still can't be removed until they're deleted", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    const note = await homeCheck.addNote(itemId, "door sticks halfway");
    if (!note.ok) throw new Error("could not add note");

    expect(await homeCheck.removeItem(itemId)).toEqual({ ok: false, reason: "item-has-evidence" });
  });

  test("retrying media processing never touches notes", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    await homeCheck.addNote(itemId, "door sticks halfway");

    expect(await homeCheck.finishMediaProcessing()).toBe(0);
    expect(await homeCheck.listEvidence(itemId)).toMatchObject([{ kind: "note", text: "door sticks halfway" }]);
  });
});
