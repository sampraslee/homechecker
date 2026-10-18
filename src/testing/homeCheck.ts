import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { createDexieStorage } from "../adapters/dexieStorage";
import { createHomeCheck, type HomeCheck } from "../core/homeCheck";
import type { Environment, ImageProcessor } from "../core/ports";
import type { ReferenceData } from "../core/referenceData";
import { testReferenceData } from "./referenceData";

export type FakeEnvironment = Environment & {
  setNow(date: Date): void;
  setOnline(online: boolean): void;
};

export function createFakeEnvironment(start = new Date("2026-01-05T09:00:00.000Z")): FakeEnvironment {
  let now = start;
  let online = true;
  const listeners = new Set<(online: boolean) => void>();

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
  };
}

export type StubImageProcessor = ImageProcessor & { failNext(): void };

/** Labels each version with the original's text, e.g. "evidence copy of <original>". */
export function createStubImageProcessor(): StubImageProcessor {
  let failNext = false;
  return {
    async processPhoto(original) {
      if (failNext) {
        failNext = false;
        throw new Error("could not decode image");
      }
      const text = await original.text();
      return {
        evidenceCopy: new Blob([`evidence copy of ${text}`], { type: "image/jpeg" }),
        thumbnail: new Blob([`thumbnail of ${text}`], { type: "image/jpeg" }),
      };
    },
    failNext() {
      failNext = true;
    },
  };
}

/** A Home Check core on a fresh fake-indexeddb database. */
export function createTestHomeCheck(referenceData: ReferenceData = testReferenceData) {
  const environment = createFakeEnvironment();
  const imageProcessor = createStubImageProcessor();
  const indexedDB = new IDBFactory();
  /** A fresh core on a new connection to the same database, as after closing and reopening the app. */
  const reopen = () =>
    createHomeCheck({
      storage: createDexieStorage("home-check-test", { indexedDB, IDBKeyRange }),
      environment,
      referenceData,
      imageProcessor,
    });
  return { homeCheck: reopen(), environment, imageProcessor, reopen };
}

/** A Home Check core with one Draft Move-in Inspection already started. */
export async function createTestHomeCheckWithInspection(referenceData: ReferenceData = testReferenceData) {
  const test = createTestHomeCheck(referenceData);
  const inspectionId = await startDraftInspection(test.homeCheck);
  return { ...test, inspectionId };
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
