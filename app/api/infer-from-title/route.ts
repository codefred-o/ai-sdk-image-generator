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
      { error: "Invalid request format. Please refresh the page and try again." },
      { status: 400 }
    );
  }

  const title = body?.title;

  if (typeof title !== "string" || title.trim() === "") {
    return NextResponse.json(
      { error: "Please enter a title to generate suggestions." },
      { status: 400 }
    );
  }

  const outcome = await inferFromTitle(title);

  if (!outcome.ok) {
    const isClientError =
      outcome.error.includes("empty") || outcome.error.includes("long");
    
    // Make error messages more user-friendly
    let userError = outcome.error;
    if (outcome.error.includes("empty")) {
      userError = "Please enter a title to generate suggestions.";
    } else if (outcome.error.includes("long")) {
      userError = "The title is too long. Please use a shorter title (under 200 characters).";
    } else {
      userError = "Unable to generate suggestions right now. Please try again in a moment.";
    }
    
    return NextResponse.json(
      { error: userError },
      { status: isClientError ? 400 : 500 }
    );
  }

  return NextResponse.json(
    { ...outcome.result, cached: outcome.cached },
    { status: 200 }
  );
}
