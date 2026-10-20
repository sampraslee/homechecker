import type { AiAnswer, AiClient, AiRequest } from "../core/ports";

/** How long the fake takes to answer, so AI Suggestions arrive as they would from Gemini. */
const FAKE_DELAY_MS = 800;

/**
 * Dev only: suggests Defect Types without Gemini, so AI Suggestion cards can be seen and reviewed in a preview.
 * Turned on with `?fakeAi` in a dev build (see main.tsx); never part of a production build.
 *
 * Each photo gets three suggestions from the Item's relevant Categories, at High, Medium and Low confidence. They rotate
 * with each photo, and one is the long "Further Inspection Required" when the Dictionary has it, to test long titles.
 */
export function createFakeAiClient(): AiClient {
  let photos = 0;
  return {
    async suggestDefectTypes(request: AiRequest): Promise<AiAnswer[]> {
      await new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS));
      const relevant = request.relevantCategories.map((category) => `${category.code}-`);
      const candidates = request.allowedCodes.filter((code) => relevant.some((prefix) => code.startsWith(prefix)));
      const pool = candidates.length > 0 ? candidates : request.allowedCodes;
      const start = (photos++ * 3) % pool.length;
      const picked = [pool[start], pool[(start + 1) % pool.length]];
      const long = request.allowedCodes.find((code) => code === "OT-INSPECT");
      picked.push(long ?? pool[(start + 2) % pool.length]);
      return picked.map((code, index) => ({ code, confidence: ["High", "Medium", "Low"][index] }));
    },
  };
}
