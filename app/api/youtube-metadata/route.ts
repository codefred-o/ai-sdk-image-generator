/**
 * GET /api/youtube-metadata?url=<youtubeUrl>
 *
 * Fetches title, author name, and thumbnail URL for a YouTube video via the
 * public oEmbed endpoint.  No API key required.
 *
 * Response shape (200):
 * {
 *   title: string;
 *   authorName: string;
 *   thumbnailUrl: string;
 *   videoId: string;
 * }
 *
 * Error response (4xx / 5xx):
 * { error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchYouTubeMetadata } from "@/lib/youtube-fetcher";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url || url.trim() === "") {
    return NextResponse.json(
      { error: "Please provide a YouTube URL." },
      { status: 400 }
    );
  }

  const outcome = await fetchYouTubeMetadata(url);

  if (!outcome.ok) {
    // Distinguish client errors (bad URL / not found) from server errors.
    const isClientError =
      outcome.error.includes("valid YouTube URL") ||
      outcome.error.includes("not found");
    
    // Make error messages more user-friendly
    let userError = outcome.error;
    if (outcome.error.includes("valid YouTube URL")) {
      userError = "Please enter a valid YouTube URL (e.g., youtube.com/watch?v=...)";
    } else if (outcome.error.includes("not found")) {
      userError = "Could not find this YouTube video. Please check the URL and try again.";
    } else {
      userError = "Unable to fetch video information. Please try again in a moment.";
    }
    
    return NextResponse.json(
      { error: userError },
      { status: isClientError ? 400 : 502 }
    );
  }

  return NextResponse.json(outcome.metadata, {
    status: 200,
    headers: {
      // Cache at the CDN/browser level for 1 hour — video metadata rarely changes.
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
