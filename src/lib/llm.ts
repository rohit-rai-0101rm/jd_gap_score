import { GoogleGenAI } from "@google/genai";
import type { z } from "zod";

export class LlmJsonParseError extends Error {
  constructor(
    message: string,
    public readonly raw: string,
  ) {
    super(message);
    this.name = "LlmJsonParseError";
  }
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

async function generate(
  systemPrompt: string,
  prompt: string,
  temperature: number,
): Promise<string> {
  const model = process.env.LLM_MODEL;
  if (!model) throw new Error("LLM_MODEL is not set");

  const response = await getClient().models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
      temperature,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from LLM");
  return text;
}

interface CompleteJsonParams<T> {
  systemPrompt: string;
  prompt: string;
  schema: z.ZodType<T>;
  temperature?: number;
}

// Calls the LLM, requests strict JSON, and validates against `schema`.
// Retries once (with the parse/validation error fed back to the model) on
// failure, then throws LlmJsonParseError. See CLAUDE.md hard rules.
export async function completeJSON<T>({
  systemPrompt,
  prompt,
  schema,
  temperature = 0.2,
}: CompleteJsonParams<T>): Promise<T> {
  let lastRaw = "";
  let lastError = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    const attemptPrompt =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous response could not be used: ${lastError}\nRespond again with ONLY valid JSON matching the required shape — no markdown fences, no commentary.`;

    const raw = await generate(systemPrompt, attemptPrompt, temperature);
    lastRaw = raw;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch (err) {
      lastError = err instanceof Error ? err.message : "invalid JSON";
      continue;
    }

    const result = schema.safeParse(parsedJson);
    if (result.success) return result.data;

    lastError = result.error.message;
  }

  throw new LlmJsonParseError(
    `LLM response failed schema validation after 2 attempts: ${lastError}`,
    lastRaw,
  );
}
