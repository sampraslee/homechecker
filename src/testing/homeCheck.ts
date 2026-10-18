import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { createDexieStorage } from "../adapters/dexieStorage";
import { createHomeCheck } from "../core/homeCheck";
import type { Environment } from "../core/ports";

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

/** A Home Check core on a fresh fake-indexeddb database. */
export function createTestHomeCheck() {
  const environment = createFakeEnvironment();
  const storage = createDexieStorage("home-check-test", { indexedDB: new IDBFactory(), IDBKeyRange });
  const homeCheck = createHomeCheck({ storage, environment });
  return { homeCheck, environment };
}
