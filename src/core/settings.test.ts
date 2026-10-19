import { describe, expect, test } from "vitest";
import { createTestHomeCheck } from "../testing/homeCheck";

describe("Inspector name", () => {
  test("is unset on a new phone", async () => {
    const { homeCheck } = createTestHomeCheck();

    expect((await homeCheck.getSettings()).inspectorName).toBe(null);
  });

  test("is remembered once set, trimmed", async () => {
    const { homeCheck } = createTestHomeCheck();

    const result = await homeCheck.setInspectorName("  Aisyah binti Rahman ");

    expect(result).toEqual({ ok: true, inspectorName: "Aisyah binti Rahman" });
    expect((await homeCheck.getSettings()).inspectorName).toBe("Aisyah binti Rahman");
  });

  test("cannot be blank", async () => {
    const { homeCheck } = createTestHomeCheck();
    await homeCheck.setInspectorName("Aisyah");

    const result = await homeCheck.setInspectorName("   ");

    expect(result).toEqual({ ok: false, reason: "inspector-name-required" });
    expect((await homeCheck.getSettings()).inspectorName).toBe("Aisyah");
  });
});
