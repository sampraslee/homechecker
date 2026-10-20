import { describe, expect, test } from "vitest";
import { createTestHomeCheck } from "../testing/homeCheck";

/** The status line says when the phone is offline, since AI Suggestions wait for a signal. */
describe("online status", () => {
  test("reports whether the phone is online, and each change until unsubscribed", () => {
    const { homeCheck, environment } = createTestHomeCheck();
    const seen: boolean[] = [];

    expect(homeCheck.isOnline()).toBe(true);
    const unsubscribe = homeCheck.onOnlineChange((online) => seen.push(online));
    environment.setOnline(false);
    environment.setOnline(true);
    unsubscribe();
    environment.setOnline(false);

    expect(seen).toEqual([false, true]);
    expect(homeCheck.isOnline()).toBe(false);
  });
});
