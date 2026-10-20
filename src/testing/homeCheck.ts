import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { createDexieStorage } from "../adapters/dexieStorage";
import { createHomeCheck, type HomeCheck } from "../core/homeCheck";
import type { AiAnswer, AiClient, AiRequest, Environment, ImageProcessor } from "../core/ports";
import type { ReferenceData } from "../core/referenceData";
import { testReferenceData } from "./referenceData";

export type FakeEnvironment = Environment & {
  setNow(date: Date): void;
  setOnline(online: boolean): void;
  /** How many times persistent storage was requested. */
  readonly persistentStorageRequests: number;
  /** The browser grants persistent storage, now and when asked; the default. */
  grantPersistentStorage(): void;
  /** The browser won't keep storage, as Safari or a not-installed app may. */
  refusePersistentStorage(): void;
};

export function createFakeEnvironment(start = new Date("2026-01-05T09:00:00.000Z")): FakeEnvironment {
  let now = start;
  let online = true;
  const listeners = new Set<(online: boolean) => void>();
  let persistent = true;
  let persistentStorageRequests = 0;

  return {
    now: () => now,
    isOnline: () => online,
    onOnlineChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setNow(date) {
      now = date;
    },
    setOnline(next) {
      online = next;
      listeners.forEach((listener) => listener(next));
    },
    async requestPersistentStorage() {
      persistentStorageRequests++;
      return persistent;
    },
    async isStoragePersisted() {
      return persistent;
    },
    get persistentStorageRequests() {
      return persistentStorageRequests;
    },
    grantPersistentStorage() {
      persistent = true;
    },
    refusePersistentStorage() {
      persistent = false;
    },
  };
}

export type StubImageProcessor = ImageProcessor & {
  failNext(): void;
  /** How many times a photo's smaller versions were made, successfully or not. */
  readonly photosProcessed: number;
  /** Holds the next photo's smaller versions back until the returned function is called. */
  holdNext(): () => void;
};

/** Labels each version with the original's text, e.g. "evidence copy of <original>". */
export function createStubImageProcessor(): StubImageProcessor {
  let failNext = false;
  let photosProcessed = 0;
  let held: Promise<void> | null = null;
  function failIfAsked() {
    if (failNext) {
      failNext = false;
      throw new Error("could not decode media");
    }
  }
  return {
    get photosProcessed() {
      return photosProcessed;
    },
    async processPhoto(original) {
      photosProcessed++;
      failIfAsked();
      const hold = held;
      held = null;
      if (hold) await hold;
      const text = await original.text();
      return {
        evidenceCopy: new Blob([`evidence copy of ${text}`], { type: "image/jpeg" }),
        thumbnail: new Blob([`thumbnail of ${text}`], { type: "image/jpeg" }),
      };
    },
    async processVideo(original) {
      failIfAsked();
      return { thumbnail: new Blob([`thumbnail of ${await original.text()}`], { type: "image/jpeg" }) };
    },
    failNext() {
      failNext = true;
    },
    holdNext() {
      let release!: () => void;
      held = new Promise((resolve) => (release = resolve));
      return release;
    },
  };
}

export type FakeAiClient = AiClient & {
  /** Every request made, in order. */
  requests: AiRequest[];
  /** The most requests that were ever in flight together. */
  readonly mostAtOnce: number;
  /** What every later request answers, until changed. */
  answer(answers: AiAnswer[]): void;
  /** Makes the next `times` requests fail, as on a dropped connection. */
  failNext(times?: number): void;
  /** Holds the next request's answer back until the returned function is called. */
  holdNext(): () => void;
};

/** Answers every request with one High-confidence `SF-SCRATCH` until told otherwise. */
export function createFakeAiClient(): FakeAiClient {
  let answers: AiAnswer[] = [{ code: "SF-SCRATCH", confidence: "High" }];
  let failuresLeft = 0;
  const requests: AiRequest[] = [];
  let held: Promise<void> | null = null;
  let inFlight = 0;
  let mostAtOnce = 0;
  return {
    requests,
    get mostAtOnce() {
      return mostAtOnce;
    },
    async suggestDefectTypes(request) {
      requests.push(request);
      inFlight++;
      mostAtOnce = Math.max(mostAtOnce, inFlight);
      try {
        // Answer on a later turn, as a real request would, so overlapping requests would show.
        await new Promise((resolve) => setTimeout(resolve, 1));
        const hold = held;
        held = null;
        if (hold) await hold;
        if (failuresLeft > 0) {
          failuresLeft--;
          throw new Error("network request failed");
        }
        return answers;
      } finally {
        inFlight--;
      }
    },
    answer(next) {
      answers = next;
    },
    failNext(times = 1) {
      failuresLeft = times;
    },
    holdNext() {
      let release!: () => void;
      held = new Promise((resolve) => (release = resolve));
      return release;
    },
  };
}

/** The result of a core operation that must succeed; fails the test with the refusal otherwise. */
export function expectOk<R extends { ok: boolean }>(result: R): Extract<R, { ok: true }> {
  if (!result.ok) throw new Error(`refused: ${JSON.stringify(result)}`);
  return result as Extract<R, { ok: true }>;
}

/** A Home Check core on a fresh fake-indexeddb database. */
export function createTestHomeCheck(referenceData: ReferenceData = testReferenceData) {
  const environment = createFakeEnvironment();
  const imageProcessor = createStubImageProcessor();
  const aiClient = createFakeAiClient();
  const indexedDB = new IDBFactory();
  /** A fresh core on a new connection to the same database, as after closing and reopening the app. */
  const reopen = () =>
    createHomeCheck({
      storage: createDexieStorage("home-check-test", { indexedDB, IDBKeyRange }),
      environment,
      referenceData,
      imageProcessor,
      aiClient,
    });
  return { homeCheck: reopen(), environment, imageProcessor, aiClient, reopen };
}

/** A Home Check core with one Draft Move-in Inspection already started. */
export async function createTestHomeCheckWithInspection(referenceData: ReferenceData = testReferenceData) {
  const test = createTestHomeCheck(referenceData);
  const inspectionId = await startDraftInspection(test.homeCheck);
  return { ...test, inspectionId };
}

/** A Home Check core with a Wardrobe in a Bedroom of a Draft Move-in Inspection. */
/** A note on the Item, to serve as the Evidence a Defect needs. Notes need no image processing, so they don't disturb the photo tests. */
export async function noteOf(homeCheck: HomeCheck, itemId: string): Promise<string> {
  const note = await homeCheck.addNote(itemId, "seen");
  if (!note.ok) throw new Error(`could not add note: ${note.reason}`);
  return note.evidence.id;
}

export async function createTestHomeCheckWithItem(referenceData: ReferenceData = testReferenceData) {
  const setup = await createTestHomeCheckWithInspection(referenceData);
  const area = await setup.homeCheck.addArea(setup.inspectionId, { standardAreaId: "bedroom" });
  if (!area.ok) throw new Error(`could not add Area: ${area.reason}`);
  const item = await setup.homeCheck.addItem(area.area.id, { catalogItemId: "wardrobe" });
  if (!item.ok) throw new Error(`could not add Item: ${item.reason}`);
  return { ...setup, areaId: area.area.id, itemId: item.item.id };
}

async function startDraftInspection(homeCheck: HomeCheck): Promise<string> {
  await homeCheck.setInspectorName("Aisyah");
  const started = await homeCheck.startMoveIn({
    unitNumber: "7",
    street: "Jalan Kenari 3",
    postcode: "47100",
    city: "Puchong",
    state: "Selangor",
  });
  if (!started.ok) throw new Error(`could not start Inspection: ${started.reason}`);
  return started.inspection.id;
}
