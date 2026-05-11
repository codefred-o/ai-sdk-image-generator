"use client";

/**
 * YouTubeUrlInput
 *
 * Accepts a YouTube URL, fetches oEmbed metadata via the internal API route,
 * and calls `onMetadataFetched` so the parent can pre-fill the ThumbnailForm
 * and set the YouTube thumbnail as a style-mode reference image.
 */

import { useState, useRef } from "react";
import { Youtube, Loader2, X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { extractVideoId } from "@/lib/youtube-fetcher";

export interface YouTubeMetadataPayload {
  title: string;
  authorName: string;
  thumbnailUrl: string;
  videoId: string;
}

export interface YouTubeUrlInputProps {
  /** Called when metadata has been successfully fetched. */
  onMetadataFetched: (payload: YouTubeMetadataPayload) => void;
  /** Extra Tailwind classes for the wrapper. */
  className?: string;
}

type FetchState = "idle" | "loading" | "success" | "error";

/**
 * Converts a remote image URL to a base64 data URL so it can be used as a
 * reference image in the existing img2img pipeline.
 */
async function urlToDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function YouTubeUrlInput({
  onMetadataFetched,
  className,
}: YouTubeUrlInputProps) {
  const [url, setUrl] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fetchedTitle, setFetchedTitle] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Returns true when the current value looks like a YouTube URL. */
  const isYouTubeUrl = (value: string) => extractVideoId(value) !== null;

  const handleClear = () => {
    setUrl("");
    setFetchState("idle");
    setErrorMessage(null);
    setFetchedTitle(null);
    inputRef.current?.focus();
  };

  const handleFetch = async (urlToFetch: string) => {
    if (!urlToFetch.trim()) return;

    setFetchState("loading");
    setErrorMessage(null);
    setFetchedTitle(null);

    try {
      const response = await fetch(
        `/api/youtube-metadata?url=${encodeURIComponent(urlToFetch.trim())}`
      );
      const data = await response.json();

      if (!response.ok) {
        setFetchState("error");
        setErrorMessage(data.error ?? "Failed to fetch YouTube metadata.");
        return;
      }

      const payload = data as YouTubeMetadataPayload;

      // Try to convert the YouTube thumbnail to a data URL for img2img use.
      // Silently fall back if the remote fetch fails (e.g. CORS / network issue).
      let thumbnailDataUrl: string | undefined;
      try {
        thumbnailDataUrl = await urlToDataUrl(payload.thumbnailUrl);
      } catch {
        // Non-fatal: the parent will receive an undefined thumbnailDataUrl and
        // can gracefully omit the reference image.
        console.warn("[YouTubeUrlInput] Could not convert thumbnail to data URL");
      }

      setFetchState("success");
      setFetchedTitle(payload.title);
      onMetadataFetched({
        ...payload,
        // Pass the data URL version of the thumbnail if we got one, otherwise
        // keep the original remote URL (used for display only).
        thumbnailUrl: thumbnailDataUrl ?? payload.thumbnailUrl,
      });
    } catch {
      setFetchState("error");
      setErrorMessage("Could not reach the server. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isYouTubeUrl(url) && fetchState !== "loading") {
      handleFetch(url);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    // Reset previous result when user edits the URL
    if (fetchState !== "idle") {
      setFetchState("idle");
      setErrorMessage(null);
      setFetchedTitle(null);
    }
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      <p className="text-sm text-zinc-600">
        Paste a YouTube video URL to auto-fill the form from the video&apos;s
        title and thumbnail.
      </p>

      {/* URL input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Youtube
            className={cn(
              "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors",
              fetchState === "success"
                ? "text-green-500"
                : fetchState === "error"
                  ? "text-red-400"
                  : "text-zinc-400"
            )}
          />
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="https://youtube.com/watch?v=…"
            aria-label="YouTube URL"
            aria-describedby="youtube-url-description"
            aria-invalid={fetchState === "error"}
            className={cn(
              "w-full rounded-lg border bg-white py-3 sm:py-2 pl-9 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-colors min-h-[48px] sm:min-h-0",
              fetchState === "error"
                ? "border-red-300 focus:ring-red-200"
                : fetchState === "success"
                  ? "border-green-300 focus:ring-green-200"
                  : "border-zinc-200 focus:ring-zinc-300"
            )}
          />
          <span id="youtube-url-description" className="sr-only">
            Enter a YouTube video URL to auto-fill the form with the video's metadata
          </span>
          {url && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear YouTube URL"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-zinc-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleFetch(url)}
          disabled={!isYouTubeUrl(url) || fetchState === "loading"}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-4 py-3 sm:py-2 text-sm font-medium transition-colors min-h-[48px] sm:min-h-0",
            "bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2"
          )}
        >
          {fetchState === "loading" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Fetching…</span>
            </>
          ) : (
            <span>Fetch</span>
          )}
        </button>
      </div>

      {/* Status messages */}
      {fetchState === "success" && fetchedTitle && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
          <span>
            Found: <span className="font-medium">{fetchedTitle}</span> — form
            fields have been pre-filled below.
          </span>
        </div>
      )}

      {fetchState === "error" && errorMessage && (
        <p role="alert" className="text-xs font-medium text-red-500">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
