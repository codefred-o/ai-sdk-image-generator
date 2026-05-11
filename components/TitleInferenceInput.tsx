"use client";

/**
 * TitleInferenceInput
 *
 * Accepts a YouTube video title, calls the `/api/infer-from-title` route
 * (which uses GPT-4o-mini via AI SDK structured output), and surfaces the
 * inferred subject / style / emotion / overlay text so the parent can
 * pre-fill the ThumbnailForm.
 */

import { useState, useRef } from "react";
import { Wand2, Loader2, X, CheckCircle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import { StylePreset, EmotionPreset } from "@/lib/prompt-builder";

export interface TitleInferencePayload {
  subject: string;
  stylePreset: StylePreset;
  emotionPreset: EmotionPreset;
  overlayText: string;
  rationale: string;
  cached: boolean;
}

export interface TitleInferenceInputProps {
  /** Called with the LLM-inferred fields when inference succeeds. */
  onInferred: (payload: TitleInferencePayload) => void;
  /** Extra Tailwind classes for the wrapper. */
  className?: string;
}

type InferState = "idle" | "loading" | "success" | "error";

export function TitleInferenceInput({
  onInferred,
  className,
}: TitleInferenceInputProps) {
  const [title, setTitle] = useState("");
  const [inferState, setInferState] = useState<InferState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<TitleInferencePayload | null>(
    null
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleClear = () => {
    setTitle("");
    setInferState("idle");
    setErrorMessage(null);
    setLastPayload(null);
    textareaRef.current?.focus();
  };

  const handleInfer = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;

    setInferState("loading");
    setErrorMessage(null);
    setLastPayload(null);

    try {
      const response = await fetch("/api/infer-from-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        setInferState("error");
        setErrorMessage(data.error ?? "Failed to infer thumbnail fields.");
        return;
      }

      const payload = data as TitleInferencePayload;
      setInferState("success");
      setLastPayload(payload);
      onInferred(payload);
    } catch {
      setInferState("error");
      setErrorMessage("Could not reach the server. Please try again.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (title.trim() && inferState !== "loading") {
        handleInfer();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value);
    // Reset previous result when user edits the title
    if (inferState !== "idle") {
      setInferState("idle");
      setErrorMessage(null);
      setLastPayload(null);
    }
  };

  return (
    <div className={cn("w-full space-y-3", className)}>
      <p className="text-sm text-zinc-600">
        Paste or type a video title and let AI suggest the best subject, style,
        emotion, and overlay text for your thumbnail.
      </p>

      {/* Title input area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={title}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="e.g. I Quit My Job to Build AI Tools for 30 Days"
          aria-label="Video title for thumbnail inference"
          aria-describedby="title-inference-description"
          aria-invalid={inferState === "error"}
          rows={2}
          className={cn(
            "w-full resize-none rounded-lg border bg-white px-3 py-3 sm:py-2 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition-colors min-h-[80px]",
            inferState === "error"
              ? "border-red-300 focus:ring-red-200"
              : inferState === "success"
                ? "border-green-300 focus:ring-green-200"
                : "border-zinc-200 focus:ring-zinc-300"
          )}
        />
        <span id="title-inference-description" className="sr-only">
          Enter a video title and AI will suggest appropriate thumbnail elements
        </span>
        {title && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear title"
            className="absolute right-1 top-1 p-2 text-zinc-400 hover:text-zinc-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Infer button */}
      <button
        type="button"
        onClick={handleInfer}
        disabled={!title.trim() || inferState === "loading"}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors min-h-[48px]",
          "bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2"
        )}
      >
        {inferState === "loading" ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Inferring…</span>
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" />
            <span>Infer thumbnail fields</span>
          </>
        )}
      </button>

      {/* Success: show inferred rationale */}
      {inferState === "success" && lastPayload && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-1.5 text-sm font-medium text-green-800">
            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
            <span>Fields pre-filled — review and edit below</span>
            {lastPayload.cached && (
              <span className="ml-auto rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-600">
                cached
              </span>
            )}
          </div>
          <div className="flex items-start gap-1.5 text-xs text-green-700">
            <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
            <span className="italic">{lastPayload.rationale}</span>
          </div>

          {/* Compact preview of inferred values */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 pt-1 text-xs text-green-800">
            <div>
              <span className="text-green-600">Style:</span>{" "}
              {lastPayload.stylePreset}
            </div>
            <div>
              <span className="text-green-600">Emotion:</span>{" "}
              {lastPayload.emotionPreset}
            </div>
            <div className="col-span-2">
              <span className="text-green-600">Overlay:</span>{" "}
              &ldquo;{lastPayload.overlayText}&rdquo;
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {inferState === "error" && errorMessage && (
        <p role="alert" className="text-xs font-medium text-red-500">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
