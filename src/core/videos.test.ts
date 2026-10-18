import { describe, expect, test } from "vitest";
import type { HomeCheck } from "./homeCheck";
import { createTestHomeCheckWithItem } from "../testing/homeCheck";

const video = (content: string) => new Blob([content], { type: "video/mp4" });

async function textOf(blob: Blob | undefined) {
  return blob === undefined ? undefined : blob.text();
}

/** The text of each stored version of a video; undefined where a version is missing. */
async function versionsOf(homeCheck: HomeCheck, evidenceId: string) {
  return {
    original: await textOf(await homeCheck.getMedia(evidenceId, "original")),
    evidenceCopy: await textOf(await homeCheck.getMedia(evidenceId, "evidenceCopy")),
    thumbnail: await textOf(await homeCheck.getMedia(evidenceId, "thumbnail")),
  };
}

describe("recording a video of an Item", () => {
  test("keeps the original exactly as recorded, with a thumbnail and its length, and no Evidence copy", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();

    const result = await homeCheck.addVideo(itemId, video("door that sticks"), 12.34);

    if (!result.ok) throw new Error(`could not add video: ${result.reason}`);
    expect(result.evidence).toMatchObject({ kind: "video", durationSeconds: 12.3, processed: true });
    expect(await versionsOf(homeCheck, result.evidence.id)).toEqual({
      original: "door that sticks",
      evidenceCopy: undefined,
      thumbnail: "thumbnail of door that sticks",
    });
  });

  test("is still kept when its thumbnail can't be made, and gets one when processing is retried", async () => {
    const { homeCheck, itemId, imageProcessor } = await createTestHomeCheckWithItem();
    imageProcessor.failNext();

    const result = await homeCheck.addVideo(itemId, video("rattling fan"), 8);
    if (!result.ok) throw new Error(`could not add video: ${result.reason}`);
    const beforeRetry = await versionsOf(homeCheck, result.evidence.id);
    const retried = await homeCheck.finishMediaProcessing();

    expect({ processedAtCapture: result.evidence.processed, beforeRetry }).toEqual({
      processedAtCapture: false,
      beforeRetry: { original: "rattling fan", evidenceCopy: undefined, thumbnail: undefined },
    });
    expect({ retried, afterRetry: await versionsOf(homeCheck, result.evidence.id) }).toEqual({
      retried: 1,
      afterRetry: { original: "rattling fan", evidenceCopy: undefined, thumbnail: "thumbnail of rattling fan" },
    });
  });
});

describe("the 30 second limit on a video", () => {
  test("a recording that stopped itself at the limit, a moment late, is recorded as 30 seconds", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();

    const result = await homeCheck.addVideo(itemId, video("tap running"), 30.4);

    expect(result.ok && result.evidence.durationSeconds).toBe(30);
  });

  test("a video longer than the limit is refused and nothing is saved", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();

    const result = await homeCheck.addVideo(itemId, video("whole room tour"), 45);

    expect(result).toEqual({ ok: false, reason: "video-too-long" });
    expect(await homeCheck.listEvidence(itemId)).toEqual([]);
  });
});
