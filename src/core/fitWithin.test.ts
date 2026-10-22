import { describe, expect, test } from "vitest";
import { fitWithin } from "./fitWithin";

describe("fitting a photo within a longest edge", () => {
  test("shrinks a landscape photo so its width is the limit", () => {
    expect(fitWithin({ width: 4000, height: 3000 }, 1024)).toEqual({ width: 1024, height: 768 });
  });

  test("shrinks a portrait photo so its height is the limit", () => {
    expect(fitWithin({ width: 3000, height: 4000 }, 1024)).toEqual({ width: 768, height: 1024 });
  });

  test("shrinks a square photo to the limit on both edges", () => {
    expect(fitWithin({ width: 3000, height: 3000 }, 1024)).toEqual({ width: 1024, height: 1024 });
  });

  test("leaves a photo exactly at the limit as it is", () => {
    expect(fitWithin({ width: 1024, height: 600 }, 1024)).toEqual({ width: 1024, height: 600 });
  });

  test("never enlarges a photo within the limit", () => {
    expect(fitWithin({ width: 800, height: 600 }, 1024)).toEqual({ width: 800, height: 600 });
  });

  test("never enlarges a very small photo", () => {
    expect(fitWithin({ width: 10, height: 5 }, 1024)).toEqual({ width: 10, height: 5 });
  });

  test("rounds to whole pixels", () => {
    expect(fitWithin({ width: 4032, height: 3023 }, 1024)).toEqual({ width: 1024, height: 768 });
  });
});
