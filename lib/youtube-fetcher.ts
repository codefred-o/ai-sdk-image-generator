/**
 * YouTube oEmbed fetcher.
 *
 * Uses the public YouTube oEmbed endpoint (no API key required) to retrieve
 * title, author, and thumbnail for a given YouTube URL.
 *
 * oEmbed spec: https://oembed.com/
 * YouTube endpoint: https://www.youtube.com/oembed?url=<videoUrl>&format=json
 */

export interface YouTubeMetadata {
  /** Human-readable video title. */
  title: string;
  /** Channel / author name. */
  authorName: string;
  /** Best-quality thumbnail URL returned by oEmbed. */
  thumbnailUrl: string;
  /** Canonical video ID extracted from the URL. */
  videoId: string;
}

export interface YouTubeFetchResult {
  ok: true;
  metadata: YouTubeMetadata;
}

export interface YouTubeFetchError {
  ok: false;
  error: string;
}

export type YouTubeFetchOutcome = YouTubeFetchResult | YouTubeFetchError;

/** Regex patterns that match the common forms of a YouTube URL. */
const YT_URL_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([A-Za-z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:m\.)?youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{11})/,
];

/**
 * Extracts the 11-character video ID from any common YouTube URL form.
 * Returns `null` if the input doesn't look like a YouTube URL.
 */
export function extractVideoId(url: string): string | null {
  const trimmed = url.trim();
  for (const pattern of YT_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Returns the maxresdefault thumbnail URL for a video ID.
 * Falls back to hqdefault if maxres isn't available (handled by caller).
 */
export function getThumbnailUrl(
  videoId: string,
  quality: "maxresdefault" | "hqdefault" | "mqdefault" = "maxresdefault"
): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Fetches YouTube video metadata via the public oEmbed endpoint.
 *
 * This is a **server-side** function — it must be called from an API route
 * because the oEmbed endpoint doesn't set CORS headers that would allow direct
 * browser access.
 *
 * @param url - Any valid YouTube video URL (watch, short, embed, youtu.be)
 */
export async function fetchYouTubeMetadata(
  url: string
): Promise<YouTubeFetchOutcome> {
  // 1. Validate that this looks like a YouTube URL before hitting the network.
  const videoId = extractVideoId(url);
  if (!videoId) {
    return {
      ok: false,
      error:
        "That doesn't look like a valid YouTube URL. Please paste a link like https://youtube.com/watch?v=…",
    };
  }

  // 2. Build the canonical watch URL so oEmbed always has a consistent input.
  const canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`;

  let response: Response;
  try {
    response = await fetch(oEmbedUrl, {
      // Revalidate infrequently — video titles rarely change.
      next: { revalidate: 3600 },
    } as RequestInit);
  } catch {
    return {
      ok: false,
      error:
        "Could not reach YouTube. Please check your connection and try again.",
    };
  }

  if (response.status === 404) {
    return {
      ok: false,
      error: "Video not found. It may be private, deleted, or unavailable.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `YouTube returned an unexpected error (HTTP ${response.status}). Please try again.`,
    };
  }

  // 3. Parse the oEmbed JSON payload.
  let payload: {
    title: string;
    author_name: string;
    thumbnail_url: string;
  };

  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      error: "Received an unreadable response from YouTube. Please try again.",
    };
  }

  if (!payload.title) {
    return {
      ok: false,
      error: "YouTube returned metadata without a title. Please try again.",
    };
  }

  // 4. Prefer maxresdefault for the sharpest thumbnail; oEmbed often returns
  //    hqdefault so we always upgrade to maxresdefault by video ID.
  const thumbnailUrl = getThumbnailUrl(videoId, "maxresdefault");

  return {
    ok: true,
    metadata: {
      title: payload.title,
      authorName: payload.author_name ?? "",
      thumbnailUrl,
      videoId,
    },
  };
}
