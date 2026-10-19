import { GoogleGenAI } from "@google/genai";
import { AI_CONFIDENCES, MAX_AI_SUGGESTIONS_PER_PHOTO } from "../core/model";
import type { AiAnswer, AiClient, AiRequest } from "../core/ports";

export const GEMINI_MODEL = "gemini-3.1-flash-lite";

/**
 * Asks Gemini for AI Suggestions, using structured output so it can only answer with Dictionary codes.
 * The key ships inside the app (ADR 0005). Without one every request fails, so photos simply stay queued.
 */
export function createGeminiAiClient(apiKey: string | undefined): AiClient {
  if (!apiKey) {
    return {
      async suggestDefectTypes() {
        throw new Error("No Gemini API key: set VITE_GEMINI_API_KEY at build time (see .env.example)");
      },
    };
  }
  const ai = new GoogleGenAI({ apiKey });
  return {
    async suggestDefectTypes(request) {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { mimeType: request.evidenceCopy.type || "image/jpeg", data: await toBase64(request.evidenceCopy) } },
              { text: buildPrompt(request) },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseJsonSchema: answerSchema(request.allowedCodes),
          temperature: 0,
        },
      });
      return parseAnswers(response.text);
    },
  };
}

function buildPrompt({ areaName, itemName, relevantCategories, allowedCodes }: AiRequest): string {
  const hints = relevantCategories.length
    ? relevantCategories.map(({ code, name }) => `${code} (${name})`).join(", ")
    : "none; consider every Category";
  return [
    "You help a property Inspector record the observable condition of a rental home in Malaysia.",
    `The photo shows the Item "${itemName}" in the Area "${areaName}".`,
    `Defect Categories most relevant to this Item, to prefer but not limit you: ${hints}.`,
    "Defect Type codes start with their Category code, e.g. SF-SCRATCH is in Category SF.",
    "",
    "Rules:",
    `- Choose only from these Defect Type codes: ${allowedCodes.join(", ")}.`,
    `- Suggest at most ${MAX_AI_SUGGESTIONS_PER_PHOTO} Defect Types, most likely first, each once.`,
    `- Give each a confidence: ${AI_CONFIDENCES.join(", ")}.`,
    "- If no defect can be identified in the photo, answer with OT-UNKNOWN alone.",
    "- Report only observable facts: what can be seen in the photo. Never guess causes, age or who is responsible.",
  ].join("\n");
}

function answerSchema(allowedCodes: string[]) {
  return {
    type: "array",
    maxItems: MAX_AI_SUGGESTIONS_PER_PHOTO,
    items: {
      type: "object",
      properties: {
        code: { type: "string", enum: allowedCodes },
        confidence: { type: "string", enum: [...AI_CONFIDENCES] },
      },
      required: ["code", "confidence"],
    },
  };
}

/** Throws on a reply that isn't a JSON array, so the photo stays queued. The core checks each entry against the Dictionary. */
function parseAnswers(text: string | undefined): AiAnswer[] {
  const parsed: unknown = JSON.parse(text ?? "");
  if (!Array.isArray(parsed)) throw new Error("Gemini did not answer with a list of suggestions");
  return parsed.flatMap((entry) =>
    typeof entry?.code === "string" && typeof entry?.confidence === "string"
      ? [{ code: entry.code, confidence: entry.confidence }]
      : [],
  );
}

async function toBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  // In chunks: spreading a whole photo into one call overflows the argument limit.
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000));
  }
  return btoa(binary);
}
