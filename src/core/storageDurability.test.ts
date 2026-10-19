import { describe, expect, test } from "vitest";
import { createTestHomeCheck } from "../testing/homeCheck";

describe("persistent storage", () => {
  test("is requested on first launch, and settings show it granted", async () => {
    const { homeCheck, environment } = createTestHomeCheck();

    expect(await homeCheck.checkStorageDurability()).toBe("granted");

    expect(environment.persistentStorageRequests).toBe(1);
    expect((await homeCheck.getSettings()).storageDurability).toBe("granted");
  });

  test("shows as refused when the browser won't keep storage", async () => {
    const { homeCheck, environment } = createTestHomeCheck();
    environment.refusePersistentStorage();

    expect(await homeCheck.checkStorageDurability()).toBe("refused");

    expect((await homeCheck.getSettings()).storageDurability).toBe("refused");
  });

  test("is unknown in settings until checked", async () => {
    const { homeCheck } = createTestHomeCheck();

    expect((await homeCheck.getSettings()).storageDurability).toBeNull();
  });

  test("is requested only on first launch; later launches only look, so the Inspector isn't asked again", async () => {
    const { homeCheck, environment, reopen } = createTestHomeCheck();
    environment.refusePersistentStorage();
    await homeCheck.checkStorageDurability();

    expect(await reopen().checkStorageDurability()).toBe("refused");

    expect(environment.persistentStorageRequests).toBe(1);
  });

  test("shows a grant the browser makes later, as after installing the app", async () => {
    const { homeCheck, environment, reopen } = createTestHomeCheck();
    environment.refusePersistentStorage();
    await homeCheck.checkStorageDurability();
    environment.grantPersistentStorage();

    const reopened = reopen();
    expect(await reopened.checkStorageDurability()).toBe("granted");

    expect((await reopened.getSettings()).storageDurability).toBe("granted");
  });
});
