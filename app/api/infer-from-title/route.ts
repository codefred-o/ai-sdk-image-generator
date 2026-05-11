/**
 * POST /api/infer-from-title
 *
 * Uses GPT-4o-mini (via AI SDK structured output) to infer thumbnail form
 * fields from a YouTube video title.
 *
 * Request body:
 * { title: string }
 *
 * Response shape (200):
 * {
 *   subject: string;
 *   stylePreset: StylePreset;
 *   emotionPreset: EmotionPreset;
 *   overlayText: string;
 *   rationale: string;
 *   cached: boolean;
 * }
 *
 * Error response (4xx / 5xx):
 * { error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { inferFromTitle } from "@/lib/title-inference";

export async function POST(req: NextRequest) {
  let body: { title?: unknown };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const title = body?.title;

  if (typeof title !== "string" || title.trim() === "") {
    return NextResponse.json(
      { error: "Missing or empty required field: title" },
      { status: 400 }
    );
  }

  const outcome = await inferFromTitle(title);

  if (!outcome.ok) {
    const isClientError =
      outcome.error.includes("empty") || outcome.error.includes("long");
    return NextResponse.json(
      { error: outcome.error },
      { status: isClientError ? 400 : 500 }
    );
  }

  return NextResponse.json(
    { ...outcome.result, cached: outcome.cached },
    { status: 200 }
  );
}
