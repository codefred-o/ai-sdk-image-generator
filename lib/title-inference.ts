/**
 * Title-based thumbnail inference via GPT-4o-mini (AI SDK structured output).
 *
 * Given a YouTube video title the LLM returns a structured set of suggestions
 * that can pre-fill the ThumbnailForm fields so the user can review and edit
 * before generating.
 *
 * Caching strategy
 * ----------------
 * Responses are cached by a SHA-256 hash of the normalised title (lowercased,
 * collapsed whitespace).  The in-memory Map acts as a per-serverless-instance
 * cache and cuts LLM costs for repeated lookups within the same deployment.
 * An LRU eviction policy (max 500 entries) prevents unbounded growth.
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { StylePreset, EmotionPreset } from "./prompt-builder";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface TitleInferenceResult {
  /** Short description of who/what is the visual focal point. */
  subject: string;
  /** Best-matching StylePreset for the inferred content. */
  stylePreset: StylePreset;
  /** Best-matching EmotionPreset for the inferred content. */
  emotionPreset: EmotionPreset;
  /**
   * A punchy, short overlay text suggestion (≤ 6 words) that could appear on
   * the finished thumbnail.  Distinct from the title — should be a hook or
   * call-to-action.
   */
  overlayText: string;
  /** One-sentence rationale explaining the choices (shown to the user). */
  rationale: string;
}

export interface TitleInferenceSuccess {
  ok: true;
  result: TitleInferenceResult;
  /** Whether this response was served from the in-memory cache. */
  cached: boolean;
}

export interface TitleInferenceError {
  ok: false;
  error: string;
}

export type TitleInferenceOutcome = TitleInferenceSuccess | TitleInferenceError;

// ---------------------------------------------------------------------------
// Zod schema that drives structured output
// ---------------------------------------------------------------------------

const STYLE_PRESETS: [StylePreset, ...StylePreset[]] = [
  "MrBeast/high-energy",
  "tutorial/clean",
  "gaming/dynamic",
  "vlog/aesthetic",
  "tech-explainer",
];

const EMOTION_PRESETS: [EmotionPreset, ...EmotionPreset[]] = [
  "shocked",
  "excited",
  "confident",
  "curious",
  "intense",
];

const inferenceSchema = z.object({
  subject: z
    .string()
    .min(1)
    .describe(
      "Short description of the main visual subject or scene for the thumbnail (e.g. 'person holding a trophy', 'exploding server rack')"
    ),
  stylePreset: z
    .enum(STYLE_PRESETS)
    .describe("Best-matching visual style preset for this video"),
  emotionPreset: z
    .enum(EMOTION_PRESETS)
    .describe(
      "Primary emotion that the thumbnail should convey to the viewer"
    ),
  overlayText: z
    .string()
    .max(40)
    .describe(
      "Short, punchy overlay text (≤6 words) to appear on the thumbnail — different from the title"
    ),
  rationale: z
    .string()
    .describe(
      "One sentence explaining why these choices fit the video title"
    ),
});

// ---------------------------------------------------------------------------
// In-memory LRU cache
// ---------------------------------------------------------------------------

const CACHE_MAX_SIZE = 500;

// Map preserves insertion order; we use this for cheap LRU eviction by
// deleting the first (oldest) entry when the limit is reached.
const responseCache = new Map<string, TitleInferenceResult>();

async function titleHash(title: string): Promise<string> {
  const normalised = title.toLowerCase().replace(/\s+/g, " ").trim();
  // Use the Web Crypto API which is available in both Node.js and Edge runtimes.
  const msgBuffer = new TextEncoder().encode(normalised);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cacheGet(key: string): TitleInferenceResult | undefined {
  const hit = responseCache.get(key);
  if (hit) {
    // Move to end (most-recently-used) by re-inserting.
    responseCache.delete(key);
    responseCache.set(key, hit);
  }
  return hit;
}

function cacheSet(key: string, value: TitleInferenceResult): void {
  if (responseCache.size >= CACHE_MAX_SIZE) {
    // Evict the oldest entry (first key in insertion order).
    const firstKey = responseCache.keys().next().value;
    if (firstKey !== undefined) responseCache.delete(firstKey);
  }
  responseCache.set(key, value);
}

// ---------------------------------------------------------------------------
// Main inference function (server-side only)
// ---------------------------------------------------------------------------

/**
 * Calls GPT-4o-mini via the AI SDK to infer thumbnail fields from a title.
 *
 * Must be called from a server context (API route / server action) because it
 * reads `OPENAI_API_KEY` from the environment.
 */
export async function inferFromTitle(
  title: string
): Promise<TitleInferenceOutcome> {
  const trimmedTitle = title.trim();

  if (!trimmedTitle) {
    return { ok: false, error: "Title must not be empty." };
  }

  if (trimmedTitle.length > 300) {
    return {
      ok: false,
      error: "Title is too long. Please keep it under 300 characters.",
    };
  }

  // Check cache first.
  const hash = await titleHash(trimmedTitle);
  const cached = cacheGet(hash);
  if (cached) {
    return { ok: true, result: cached, cached: true };
  }

  // Call the LLM with structured output.
  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: inferenceSchema,
      system: `You are an expert YouTube thumbnail strategist. Given a video title, you identify the best visual elements to make a high-CTR thumbnail.

Guidelines:
- "subject" should describe a concrete, photographable scene or subject (avoid abstract descriptions)
- Choose the style preset that best matches the video's niche and energy
- Choose the emotion that would make a viewer most likely to click
- "overlayText" should be a punchy 1-6 word hook — not just a repeat of the title
- Keep "rationale" to one sentence`,
      prompt: `Video title: "${trimmedTitle}"

Infer the best thumbnail subject, style preset, emotion preset, overlay text, and rationale for this YouTube video.`,
      temperature: 0.4,
    });

    const result: TitleInferenceResult = {
      subject: object.subject,
      stylePreset: object.stylePreset as StylePreset,
      emotionPreset: object.emotionPreset as EmotionPreset,
      overlayText: object.overlayText,
      rationale: object.rationale,
    };

    cacheSet(hash, result);
    return { ok: true, result, cached: false };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    console.error("[title-inference] LLM call failed:", message);
    return {
      ok: false,
      error:
        "Failed to infer thumbnail fields. Please check your OpenAI API key and try again.",
    };
  }
}
