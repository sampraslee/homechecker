import { describe, expect, test } from "vitest";
import type { HomeCheck } from "./homeCheck";
import { createTestHomeCheckWithItem } from "../testing/homeCheck";

const photo = (content: string) => new Blob([content], { type: "image/jpeg" });

async function textOf(blob: Blob | undefined) {
  return blob === undefined ? undefined : blob.text();
}

/** The text of each stored version of a photo; undefined where a version is missing. */
async function versionsOf(homeCheck: HomeCheck, evidenceId: string) {
  return {
    original: await textOf(await homeCheck.getMedia(evidenceId, "original")),
    evidenceCopy: await textOf(await homeCheck.getMedia(evidenceId, "evidenceCopy")),
    thumbnail: await textOf(await homeCheck.getMedia(evidenceId, "thumbnail")),
  };
}

describe("taking a photo of an Item", () => {
  test("keeps the untouched original plus an Evidence copy and a thumbnail", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();

    const result = await homeCheck.addPhoto(itemId, photo("wardrobe door scratch"));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(await versionsOf(homeCheck, result.evidence.id)).toEqual({
      original: "wardrobe door scratch",
      evidenceCopy: "evidence copy of wardrobe door scratch",
      thumbnail: "thumbnail of wardrobe door scratch",
    });
  });

  test("is saved on the phone: after reopening the app the Item still lists its photos, in capture order", async () => {
    const { homeCheck, itemId, reopen, environment } = await createTestHomeCheckWithItem();
    await homeCheck.addPhoto(itemId, photo("first"));
    environment.setNow(new Date("2026-01-05T09:05:00.000Z"));
    await homeCheck.addPhoto(itemId, photo("second"));

    const reopened = reopen();
    const photos = await reopened.listEvidence(itemId);

    expect(photos).toMatchObject([
      { kind: "photo", capturedAt: "2026-01-05T09:00:00.000Z", processed: true },
      { kind: "photo", capturedAt: "2026-01-05T09:05:00.000Z", processed: true },
    ]);
    expect(await versionsOf(reopened, photos[1].id)).toEqual({
      original: "second",
      evidenceCopy: "evidence copy of second",
      thumbnail: "thumbnail of second",
    });
  });

  test("is still kept when the smaller versions can't be made, showing the original as its thumbnail", async () => {
    const { homeCheck, itemId, imageProcessor } = await createTestHomeCheckWithItem();
    imageProcessor.failNext();

    const result = await homeCheck.addPhoto(itemId, photo("blurry corner"));

    expect(result.ok && result.evidence.processed).toBe(false);
    const [kept] = await homeCheck.listEvidence(itemId);
    expect(await versionsOf(homeCheck, kept.id)).toEqual({
      original: "blurry corner",
      evidenceCopy: undefined,
      thumbnail: "blurry corner",
    });
  });

  test("whose smaller versions couldn't be made gets them when processing is retried", async () => {
    const { homeCheck, itemId, imageProcessor } = await createTestHomeCheckWithItem();
    imageProcessor.failNext();
    await homeCheck.addPhoto(itemId, photo("blurry corner"));

    const retried = await homeCheck.finishMediaProcessing();

    const [photoAfterRetry] = await homeCheck.listEvidence(itemId);
    expect({ retried, photoAfterRetry }).toMatchObject({ retried: 1, photoAfterRetry: { processed: true } });
    expect(await versionsOf(homeCheck, photoAfterRetry.id)).toEqual({
      original: "blurry corner",
      evidenceCopy: "evidence copy of blurry corner",
      thumbnail: "thumbnail of blurry corner",
    });
  });
});

describe("which Item a photo belongs to", () => {
  test("a photo belongs to exactly the Item it was taken for", async () => {
    const { homeCheck, areaId, itemId } = await createTestHomeCheckWithItem();
    const windowItem = await homeCheck.addItem(areaId, { catalogItemId: "window" });
    if (!windowItem.ok) throw new Error("could not add Item");

    await homeCheck.addPhoto(itemId, photo("wardrobe"));
    await homeCheck.addPhoto(windowItem.item.id, photo("window"));

    const wardrobePhotos = await homeCheck.listEvidence(itemId);
    const windowPhotos = await homeCheck.listEvidence(windowItem.item.id);
    expect({
      wardrobe: await Promise.all(wardrobePhotos.map(async (e) => textOf(await homeCheck.getMedia(e.id, "original")))),
      window: await Promise.all(windowPhotos.map(async (e) => textOf(await homeCheck.getMedia(e.id, "original")))),
    }).toEqual({ wardrobe: ["wardrobe"], window: ["window"] });
  });

  test("a photo cannot be taken for an Item that doesn't exist", async () => {
    const { homeCheck } = await createTestHomeCheckWithItem();

    expect(await homeCheck.addPhoto("no-such-item", photo("x"))).toEqual({ ok: false, reason: "item-not-found" });
  });
});

describe("deleting a photo", () => {
  test("removes it and all three versions from the Item", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    const wrong = await homeCheck.addPhoto(itemId, photo("my thumb"));
    await homeCheck.addPhoto(itemId, photo("wardrobe"));
    if (!wrong.ok) throw new Error("could not add photo");

    const result = await homeCheck.deleteEvidence(wrong.evidence.id);

    expect(result).toEqual({ ok: true });
    expect(await homeCheck.listEvidence(itemId)).toHaveLength(1);
    expect(await versionsOf(homeCheck, wrong.evidence.id)).toEqual({
      original: undefined,
      evidenceCopy: undefined,
      thumbnail: undefined,
    });
  });
});

describe("removing an Item that has photos", () => {
  test("is refused until its photos are deleted, so the app never discards Evidence on its own", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    const taken = await homeCheck.addPhoto(itemId, photo("wardrobe"));
    if (!taken.ok) throw new Error("could not add photo");

    const whilePhotosRemain = await homeCheck.removeItem(itemId);
    await homeCheck.deleteEvidence(taken.evidence.id);
    const onceEmpty = await homeCheck.removeItem(itemId);

    expect(whilePhotosRemain).toEqual({ ok: false, reason: "item-has-evidence" });
    expect(onceEmpty).toEqual({ ok: true });
  });
});
