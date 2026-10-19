import { describe, expect, test, vi } from "vitest";
import { createTestHomeCheckWithItem } from "../testing/homeCheck";

const photo = (content: string) => new Blob([content], { type: "image/jpeg" });

describe("sending photos to the AI", () => {
  test("a new photo's AI Suggestions show on its Item once the queue is processed", async () => {
    const { homeCheck, itemId, aiClient, environment } = await createTestHomeCheckWithItem();
    aiClient.answer([
      { code: "CF-HINGE", confidence: "High" },
      { code: "SF-SCRATCH", confidence: "Low" },
    ]);
    const taken = await homeCheck.addPhoto(itemId, photo("wardrobe door"));
    if (!taken.ok) throw new Error("could not add photo");
    environment.setNow(new Date("2026-01-05T09:02:00.000Z"));

    await homeCheck.processAiQueue();

    expect(await homeCheck.listAiSuggestions(itemId)).toMatchObject([
      {
        evidenceId: taken.evidence.id,
        defectTypeCode: "CF-HINGE",
        defectTypeName: "Hinge Fault",
        confidence: "High",
        outcome: "unreviewed",
        dictionaryVersion: "test-dictionary-1",
        suggestedAt: "2026-01-05T09:02:00.000Z",
      },
      { evidenceId: taken.evidence.id, defectTypeCode: "SF-SCRATCH", confidence: "Low", outcome: "unreviewed" },
    ]);
  });
});

describe("what is queued for AI", () => {
  test("each photo is sent once, in capture order; processing the queue again sends nothing more", async () => {
    const { homeCheck, itemId, aiClient, environment } = await createTestHomeCheckWithItem();
    await homeCheck.addPhoto(itemId, photo("first"));
    environment.setNow(new Date("2026-01-05T09:01:00.000Z"));
    await homeCheck.addPhoto(itemId, photo("second"));

    await homeCheck.processAiQueue();
    await homeCheck.processAiQueue();

    expect(await Promise.all(aiClient.requests.map((request) => request.evidenceCopy.text()))).toEqual([
      "evidence copy of first",
      "evidence copy of second",
    ]);
    expect(await homeCheck.countWaitingForAi()).toBe(0);
  });

  test("videos and notes are never sent to the AI", async () => {
    const { homeCheck, itemId, aiClient } = await createTestHomeCheckWithItem();
    await homeCheck.addVideo(itemId, new Blob(["door sticking"], { type: "video/mp4" }), 12);
    await homeCheck.addNote(itemId, "door sticks halfway");

    const waiting = await homeCheck.countWaitingForAi();
    await homeCheck.processAiQueue();

    expect({ waiting, requests: aiClient.requests.length }).toEqual({ waiting: 0, requests: 0 });
  });

  test("photos wait for AI until the queue is processed", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    await homeCheck.addPhoto(itemId, photo("first"));
    await homeCheck.addPhoto(itemId, photo("second"));

    expect(await homeCheck.countWaitingForAi()).toBe(2);
  });
});

describe("connectivity and failures", () => {
  test("while offline, photos stay queued and nothing is sent", async () => {
    const { homeCheck, itemId, aiClient, environment } = await createTestHomeCheckWithItem();
    environment.setOnline(false);
    await homeCheck.addPhoto(itemId, photo("wardrobe"));

    await homeCheck.processAiQueue();

    expect({ requests: aiClient.requests.length, waiting: await homeCheck.countWaitingForAi() }).toEqual({
      requests: 0,
      waiting: 1,
    });
  });

  test("a failed AI request keeps the photo queued with its attempts counted, and the next try gets its suggestions", async () => {
    const { homeCheck, itemId, aiClient, environment } = await createTestHomeCheckWithItem();
    await homeCheck.addPhoto(itemId, photo("wardrobe"));
    aiClient.failNext();

    environment.setNow(new Date("2026-01-05T09:03:00.000Z"));
    await homeCheck.processAiQueue();
    const afterFailure = {
      waiting: await homeCheck.listWaitingForAi(),
      suggestions: (await homeCheck.listAiSuggestions(itemId)).length,
    };
    await homeCheck.processAiQueue();

    expect(afterFailure).toMatchObject({
      waiting: [{ attempts: 1, queuedAt: "2026-01-05T09:00:00.000Z", lastAttemptAt: "2026-01-05T09:03:00.000Z" }],
      suggestions: 0,
    });
    expect(await homeCheck.countWaitingForAi()).toBe(0);
    expect(await homeCheck.listAiSuggestions(itemId)).toMatchObject([{ defectTypeCode: "SF-SCRATCH" }]);
  });

  test("one photo failing doesn't hold up the photos queued after it", async () => {
    const { homeCheck, itemId, aiClient, environment } = await createTestHomeCheckWithItem();
    await homeCheck.addPhoto(itemId, photo("first"));
    environment.setNow(new Date("2026-01-05T09:01:00.000Z"));
    await homeCheck.addPhoto(itemId, photo("second"));
    aiClient.failNext();

    await homeCheck.processAiQueue();

    expect(await homeCheck.countWaitingForAi()).toBe(1);
    expect(await homeCheck.listAiSuggestions(itemId)).toHaveLength(1);
  });
});

describe("when the queue runs by itself", () => {
  test("photos already waiting are sent when the app opens", async () => {
    const { homeCheck, itemId, aiClient, reopen } = await createTestHomeCheckWithItem();
    await homeCheck.addPhoto(itemId, photo("wardrobe"));

    const reopened = reopen();
    reopened.startAiQueue();

    await vi.waitFor(async () => expect(await reopened.countWaitingForAi()).toBe(0));
    expect(aiClient.requests).toHaveLength(1);
  });

  test("a photo taken offline is sent when the phone comes back online", async () => {
    const { homeCheck, itemId, aiClient, environment } = await createTestHomeCheckWithItem();
    homeCheck.startAiQueue();
    environment.setOnline(false);
    await homeCheck.addPhoto(itemId, photo("wardrobe"));
    const whileOffline = aiClient.requests.length;

    environment.setOnline(true);

    await vi.waitFor(async () => expect(await homeCheck.countWaitingForAi()).toBe(0));
    expect({ whileOffline, afterOnline: aiClient.requests.length }).toEqual({ whileOffline: 0, afterOnline: 1 });
  });

  test("a photo taken while online is sent straight after capture, one request at a time", async () => {
    const { homeCheck, itemId, aiClient, environment } = await createTestHomeCheckWithItem();
    homeCheck.startAiQueue();

    await homeCheck.addPhoto(itemId, photo("first"));
    environment.setNow(new Date("2026-01-05T09:01:00.000Z"));
    await homeCheck.addPhoto(itemId, photo("second"));

    await vi.waitFor(async () => expect(await homeCheck.countWaitingForAi()).toBe(0));
    expect(aiClient.requests).toHaveLength(2);
    expect(aiClient.mostAtOnce).toBe(1);
  });

  test("a failed request is retried when the phone comes back online", async () => {
    const { homeCheck, itemId, aiClient, environment } = await createTestHomeCheckWithItem();
    homeCheck.startAiQueue();
    aiClient.failNext();
    await homeCheck.addPhoto(itemId, photo("wardrobe"));
    await vi.waitFor(async () => expect(await homeCheck.listWaitingForAi()).toMatchObject([{ attempts: 1 }]));
    environment.setOnline(false);

    environment.setOnline(true);

    await vi.waitFor(async () => expect(await homeCheck.countWaitingForAi()).toBe(0));
    expect(aiClient.requests).toHaveLength(2);
  });

  test("tells listeners when a photo is queued, when its suggestions arrive and when one is deleted", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    let changes = 0;
    homeCheck.onAiChange(() => changes++);

    const taken = await homeCheck.addPhoto(itemId, photo("wardrobe"));
    const afterCapture = changes;
    await homeCheck.processAiQueue();
    const afterSuggestions = changes;
    if (taken.ok) await homeCheck.deleteEvidence(taken.evidence.id);

    expect({ afterCapture, afterSuggestions, afterDelete: changes }).toEqual({
      afterCapture: 1,
      afterSuggestions: 2,
      afterDelete: 3,
    });
  });
});

describe("what the AI is asked", () => {
  test("it gets the Evidence copy, the Area and Item names, the Item's relevant Categories and every Dictionary code", async () => {
    const { homeCheck, itemId, aiClient } = await createTestHomeCheckWithItem();
    await homeCheck.renameItem(itemId, "left");
    await homeCheck.addPhoto(itemId, photo("wardrobe door"));

    await homeCheck.processAiQueue();

    const [request] = aiClient.requests;
    expect({ ...request, evidenceCopy: await request.evidenceCopy.text() }).toEqual({
      evidenceCopy: "evidence copy of wardrobe door",
      areaName: "Bedroom",
      itemName: "Wardrobe – left",
      relevantCategories: [
        { code: "CF", name: "Cabinet / Furniture Specific" },
        { code: "HF", name: "Hardware & Fittings" },
      ],
      allowedCodes: [
        "SF-SCRATCH",
        "SF-STAIN",
        "CD-HAIRLINE",
        "DW-STICK",
        "GM-CRACK",
        "SN-BASIN-CRACK",
        "SN-TOILET-LOOSE",
        "PL-FLUSHFAIL",
        "CF-HINGE",
        "HF-HINGE-LOOSE",
        "PE-TERMITE",
        "OT-OTHER",
        "OT-UNKNOWN",
      ],
    });
  });

  test("an Other item has no relevant Categories to hint with", async () => {
    const { homeCheck, areaId, aiClient } = await createTestHomeCheckWithItem();
    const other = await homeCheck.addItem(areaId, { otherName: "Ceiling fan" });
    if (!other.ok) throw new Error("could not add Item");
    await homeCheck.addPhoto(other.item.id, photo("fan"));

    await homeCheck.processAiQueue();

    expect(aiClient.requests[0]).toMatchObject({ itemName: "Ceiling fan", relevantCategories: [] });
  });
});

describe("checking what the AI answers", () => {
  test("codes not in the bundled Dictionary and unknown confidences are dropped", async () => {
    const { homeCheck, itemId, aiClient } = await createTestHomeCheckWithItem();
    aiClient.answer([
      { code: "SF-SMUDGE", confidence: "High" },
      { code: "CF-HINGE", confidence: "Certain" },
      { code: "SF-STAIN", confidence: "Medium" },
    ]);
    await homeCheck.addPhoto(itemId, photo("wardrobe"));

    await homeCheck.processAiQueue();

    expect(await homeCheck.listAiSuggestions(itemId)).toMatchObject([{ defectTypeCode: "SF-STAIN", confidence: "Medium" }]);
  });

  test("at most three are kept, in the AI's order, each Defect Type once", async () => {
    const { homeCheck, itemId, aiClient } = await createTestHomeCheckWithItem();
    aiClient.answer([
      { code: "CF-HINGE", confidence: "High" },
      { code: "CF-HINGE", confidence: "Low" },
      { code: "HF-HINGE-LOOSE", confidence: "Medium" },
      { code: "SF-SCRATCH", confidence: "Low" },
      { code: "SF-STAIN", confidence: "Low" },
    ]);
    await homeCheck.addPhoto(itemId, photo("wardrobe"));

    await homeCheck.processAiQueue();

    expect((await homeCheck.listAiSuggestions(itemId)).map((s) => [s.defectTypeCode, s.confidence])).toEqual([
      ["CF-HINGE", "High"],
      ["HF-HINGE-LOOSE", "Medium"],
      ["SF-SCRATCH", "Low"],
    ]);
  });

  test("Unable to Determine is kept as a suggestion like any other", async () => {
    const { homeCheck, itemId, aiClient } = await createTestHomeCheckWithItem();
    aiClient.answer([{ code: "OT-UNKNOWN", confidence: "Low" }]);
    await homeCheck.addPhoto(itemId, photo("dark corner"));

    await homeCheck.processAiQueue();

    expect(await homeCheck.listAiSuggestions(itemId)).toMatchObject([
      { defectTypeCode: "OT-UNKNOWN", defectTypeName: "Unable to Determine", categoryName: "Other / Unknown" },
    ]);
  });

  test("an answer with nothing valid takes the photo off the queue with no suggestions", async () => {
    const { homeCheck, itemId, aiClient } = await createTestHomeCheckWithItem();
    aiClient.answer([{ code: "XX-MADE-UP", confidence: "High" }]);
    await homeCheck.addPhoto(itemId, photo("wardrobe"));

    await homeCheck.processAiQueue();

    expect({ waiting: await homeCheck.countWaitingForAi(), suggestions: await homeCheck.listAiSuggestions(itemId) }).toEqual({
      waiting: 0,
      suggestions: [],
    });
  });
});

describe("photos whose Evidence copy couldn't be made", () => {
  test("are never sent as the original: the queue makes the Evidence copy first, then sends it", async () => {
    const { homeCheck, itemId, aiClient, imageProcessor } = await createTestHomeCheckWithItem();
    imageProcessor.failNext();
    await homeCheck.addPhoto(itemId, photo("blurry corner"));

    await homeCheck.processAiQueue();

    expect(await aiClient.requests[0].evidenceCopy.text()).toBe("evidence copy of blurry corner");
    expect(await homeCheck.listEvidence(itemId)).toMatchObject([{ processed: true }]);
  });

  test("stay queued, without counting an AI attempt, while the Evidence copy still can't be made", async () => {
    const { homeCheck, itemId, aiClient, imageProcessor } = await createTestHomeCheckWithItem();
    imageProcessor.failNext();
    await homeCheck.addPhoto(itemId, photo("blurry corner"));
    imageProcessor.failNext();

    await homeCheck.processAiQueue();

    expect(aiClient.requests).toHaveLength(0);
    expect(await homeCheck.listWaitingForAi()).toMatchObject([{ attempts: 0 }]);
  });
});

describe("where AI Suggestions are kept", () => {
  test("apart from Defects: suggestions add no Defect to the Item", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    await homeCheck.addPhoto(itemId, photo("wardrobe"));

    await homeCheck.processAiQueue();

    expect(await homeCheck.listAiSuggestions(itemId)).toHaveLength(1);
    expect(await homeCheck.listDefects(itemId)).toEqual([]);
  });

  test("on the phone, and a later photo's suggestions never replace an earlier photo's", async () => {
    const { homeCheck, itemId, aiClient, environment, reopen } = await createTestHomeCheckWithItem();
    await homeCheck.addPhoto(itemId, photo("first"));
    await homeCheck.processAiQueue();
    aiClient.answer([{ code: "CF-HINGE", confidence: "Medium" }]);
    environment.setNow(new Date("2026-01-05T09:01:00.000Z"));
    await homeCheck.addPhoto(itemId, photo("second"));
    await homeCheck.processAiQueue();

    const suggestions = await reopen().listAiSuggestions(itemId);

    const [first, second] = await homeCheck.listEvidence(itemId);
    expect(suggestions.map((s) => [s.evidenceId, s.defectTypeCode])).toEqual([
      [first.id, "SF-SCRATCH"],
      [second.id, "CF-HINGE"],
    ]);
  });

  test("deleting a queued photo takes it off the queue", async () => {
    const { homeCheck, itemId, aiClient } = await createTestHomeCheckWithItem();
    const taken = await homeCheck.addPhoto(itemId, photo("my thumb"));
    if (!taken.ok) throw new Error("could not add photo");

    await homeCheck.deleteEvidence(taken.evidence.id);
    await homeCheck.processAiQueue();

    expect({ waiting: await homeCheck.countWaitingForAi(), requests: aiClient.requests.length }).toEqual({
      waiting: 0,
      requests: 0,
    });
  });

  test("deleting a photo removes its AI Suggestions with it", async () => {
    const { homeCheck, itemId } = await createTestHomeCheckWithItem();
    const taken = await homeCheck.addPhoto(itemId, photo("my thumb"));
    if (!taken.ok) throw new Error("could not add photo");
    await homeCheck.processAiQueue();

    await homeCheck.deleteEvidence(taken.evidence.id);

    expect(await homeCheck.listAiSuggestions(itemId)).toEqual([]);
  });

  test("a photo deleted while its AI request is under way gets no suggestions", async () => {
    const { homeCheck, itemId, aiClient } = await createTestHomeCheckWithItem();
    const taken = await homeCheck.addPhoto(itemId, photo("my thumb"));
    if (!taken.ok) throw new Error("could not add photo");
    const release = aiClient.holdNext();

    const processing = homeCheck.processAiQueue();
    await vi.waitFor(() => expect(aiClient.requests).toHaveLength(1), { interval: 1 });
    await homeCheck.deleteEvidence(taken.evidence.id);
    release();
    await processing;

    expect(await homeCheck.listAiSuggestions(itemId)).toEqual([]);
  });
});

describe("a photo deleted while its AI request is under way, when the request then fails", () => {
  test("is not put back on the queue", async () => {
    const { homeCheck, itemId, aiClient } = await createTestHomeCheckWithItem();
    const taken = await homeCheck.addPhoto(itemId, photo("my thumb"));
    if (!taken.ok) throw new Error("could not add photo");
    aiClient.failNext();
    const release = aiClient.holdNext();

    const processing = homeCheck.processAiQueue();
    await vi.waitFor(() => expect(aiClient.requests).toHaveLength(1), { interval: 1 });
    await homeCheck.deleteEvidence(taken.evidence.id);
    release();
    await processing;

    expect(await homeCheck.countWaitingForAi()).toBe(0);
  });
});

describe("a photo taken while the queue is already running", () => {
  test("has its smaller versions made once, not again by the queue at the same time", async () => {
    const { homeCheck, itemId, aiClient, imageProcessor, environment } = await createTestHomeCheckWithItem();
    await homeCheck.addPhoto(itemId, photo("first"));
    const releaseAi = aiClient.holdNext();
    homeCheck.startAiQueue();
    await vi.waitFor(() => expect(aiClient.requests).toHaveLength(1), { interval: 1 });
    environment.setNow(new Date("2026-01-05T09:01:00.000Z"));
    const releaseResizing = imageProcessor.holdNext();

    const capture = homeCheck.addPhoto(itemId, photo("second"));
    await vi.waitFor(async () => expect(await homeCheck.countWaitingForAi()).toBe(2), { interval: 1 });
    environment.setOnline(true); // a trigger while the first photo is with the AI
    releaseAi();
    await vi.waitFor(() => expect(imageProcessor.photosProcessed).toBeGreaterThanOrEqual(2), { interval: 1 });
    await new Promise((resolve) => setTimeout(resolve, 10));
    releaseResizing();
    await capture;

    await vi.waitFor(async () => expect(await homeCheck.countWaitingForAi()).toBe(0));
    expect(imageProcessor.photosProcessed).toBe(2);
  });
});

describe("on a Completed Inspection", () => {
  test("photos still waiting for AI are sent and get their suggestions", async () => {
    const { homeCheck, inspectionId, itemId } = await createTestHomeCheckWithItem();
    await homeCheck.addPhoto(itemId, photo("wardrobe"));
    await homeCheck.completeInspection(inspectionId);

    await homeCheck.processAiQueue();

    expect(await homeCheck.listAiSuggestions(itemId)).toHaveLength(1);
  });
});
