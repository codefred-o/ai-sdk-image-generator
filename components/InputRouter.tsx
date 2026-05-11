"use client";

import { useState } from "react";
import { Camera, ImageIcon, Type, Wand2, Sliders, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageUploader } from "@/components/ImageUploader";
import { YouTubeUrlInput, YouTubeMetadataPayload } from "@/components/YouTubeUrlInput";
import { TitleInferenceInput, TitleInferencePayload } from "@/components/TitleInferenceInput";
import { StylePreset, EmotionPreset } from "@/lib/prompt-builder";

/** The six entry-point modes surfaced by the InputRouter. */
export type InputMode =
  | "selfie"
  | "reference"
  | "youtube"
  | "title-inference"
  | "text"
  | "advanced";

/**
 * Describes a reference image supplied by the user.
 *
 * - `dataUrl`  – base64 data URL produced client-side (never server-persisted).
 * - `mode`     – how the image should influence generation:
 *                `"face"` retains the subject's likeness (selfie path),
 *                `"style"` transfers visual style (reference-image / mood-board path).
 */
export interface ReferenceImage {
  dataUrl: string;
  mode: "face" | "style";
}

/**
 * Pre-fill values that any entry-point tab can push into the ThumbnailForm.
 */
export interface FormPrefillValues {
  title?: string;
  subject?: string;
  stylePreset?: StylePreset;
  emotionPreset?: EmotionPreset;
  overlayText?: string;
}

export interface InputRouterProps {
  /**
   * Called when the user confirms a reference image in either the Selfie or
   * Reference Image tab.  Receives `null` when the image is cleared.
   */
  onReferenceImageChange: (ref: ReferenceImage | null) => void;
  /** Currently committed reference image (controlled). */
  referenceImage: ReferenceImage | null;
  /**
   * Called when an entry-point (YouTube URL or title inference) has values
   * to pre-fill into the ThumbnailForm.  The parent should pass these down as
   * `prefillValues` to `ThumbnailForm`.
   */
  onFormPrefill?: (values: FormPrefillValues) => void;
  /** Extra classes forwarded to the root wrapper. */
  className?: string;
}

interface TabDefinition {
  id: InputMode;
  label: string;
  Icon: React.FC<{ className?: string }>;
  /** Whether this tab has a full implementation in the current release. */
  implemented: boolean;
}

const TABS: TabDefinition[] = [
  {
    id: "selfie",
    label: "Selfie",
    Icon: Camera,
    implemented: true,
  },
  {
    id: "reference",
    label: "Reference Image",
    Icon: ImageIcon,
    implemented: true,
  },
  {
    id: "youtube",
    label: "YouTube URL",
    Icon: Youtube,
    implemented: true,
  },
  {
    id: "title-inference",
    label: "From Title",
    Icon: Wand2,
    implemented: true,
  },
  {
    id: "text",
    label: "Text Only",
    Icon: Type,
    implemented: false,
  },
  {
    id: "advanced",
    label: "Advanced",
    Icon: Sliders,
    implemented: false,
  },
];

/**
 * Tabbed shell that routes the user to one of six image-generation entry
 * points.  **Selfie**, **Reference Image**, **YouTube URL**, and **From Title**
 * are fully wired; the remaining two tabs render a "coming soon" placeholder.
 */
export function InputRouter({
  onReferenceImageChange,
  referenceImage,
  onFormPrefill,
  className,
}: InputRouterProps) {
  const [activeTab, setActiveTab] = useState<InputMode>("selfie");

  const handleTabChange = (tab: InputMode) => {
    setActiveTab(tab);
    // Switching away from an upload tab clears any pending reference image
    // so stale data doesn't persist across mode changes.
    if (tab !== "selfie" && tab !== "reference" && tab !== "youtube") {
      onReferenceImageChange(null);
    }
  };

  /** Handles a successful YouTube oEmbed fetch. */
  const handleYouTubeMetadata = (payload: YouTubeMetadataPayload) => {
    // Set the YouTube thumbnail as the style-mode reference image so it feeds
    // into the img2img pipeline.
    onReferenceImageChange({
      dataUrl: payload.thumbnailUrl,
      mode: "style",
    });

    // Pre-fill the form with the video title (subject inferred from title).
    onFormPrefill?.({
      title: payload.title,
      // Use the author name + title as a starting subject hint.
      subject: `${payload.authorName ? payload.authorName + " — " : ""}${payload.title}`,
    });
  };

  /** Handles a successful LLM title-inference response. */
  const handleTitleInference = (payload: TitleInferencePayload) => {
    onFormPrefill?.({
      subject: payload.subject,
      stylePreset: payload.stylePreset,
      emotionPreset: payload.emotionPreset,
      overlayText: payload.overlayText,
    });
  };

  return (
    <div className={cn("w-full", className)}>
      {/* ── Tab bar ──────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Input mode"
        className="flex gap-1 overflow-x-auto rounded-xl bg-zinc-100 p-1"
      >
        {TABS.map(({ id, label, Icon, implemented }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`tabpanel-${id}`}
            id={`tab-${id}`}
            type="button"
            onClick={() => handleTabChange(id)}
            className={cn(
              "flex min-w-max flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
              activeTab === id
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
              !implemented && activeTab !== id && "opacity-60",
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{label}</span>
            {/* On very small viewports show only the icon + a "soon" dot for stubs */}
            {!implemented && (
              <span
                aria-label="Coming soon"
                className="hidden h-1.5 w-1.5 rounded-full bg-zinc-400 sm:inline-block"
              />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab panels ───────────────────────────────────────────────── */}

      {/* Selfie */}
      <div
        role="tabpanel"
        id="tabpanel-selfie"
        aria-labelledby="tab-selfie"
        hidden={activeTab !== "selfie"}
        className="mt-4"
      >
        <p className="mb-3 text-sm text-zinc-600">
          Upload a photo of yourself. Your likeness will be used as the face
          reference — providers that support img2img will receive it; text-only
          providers will run in parallel for comparison.
        </p>
        <ImageUploader
          label="Drop your selfie here or click to upload"
          subLabel="PNG, JPG, WEBP up to 10 MB"
          value={
            referenceImage?.mode === "face" ? referenceImage.dataUrl : null
          }
          onImageChange={(base64) => {
            onReferenceImageChange(
              base64 ? { dataUrl: base64, mode: "face" } : null,
            );
          }}
        />
      </div>

      {/* Reference Image */}
      <div
        role="tabpanel"
        id="tabpanel-reference"
        aria-labelledby="tab-reference"
        hidden={activeTab !== "reference"}
        className="mt-4"
      >
        <p className="mb-3 text-sm text-zinc-600">
          Upload a reference image to use as a style or mood-board guide.
          Providers that support img2img will incorporate it; text-only
          providers will run in parallel for comparison.
        </p>
        <ImageUploader
          label="Drop reference image here or click to upload"
          subLabel="PNG, JPG, WEBP up to 10 MB"
          value={
            referenceImage?.mode === "style" ? referenceImage.dataUrl : null
          }
          onImageChange={(base64) => {
            onReferenceImageChange(
              base64 ? { dataUrl: base64, mode: "style" } : null,
            );
          }}
        />
      </div>

      {/* YouTube URL */}
      <div
        role="tabpanel"
        id="tabpanel-youtube"
        aria-labelledby="tab-youtube"
        hidden={activeTab !== "youtube"}
        className="mt-4"
      >
        <YouTubeUrlInput onMetadataFetched={handleYouTubeMetadata} />
      </div>

      {/* From Title (AI inference) */}
      <div
        role="tabpanel"
        id="tabpanel-title-inference"
        aria-labelledby="tab-title-inference"
        hidden={activeTab !== "title-inference"}
        className="mt-4"
      >
        <TitleInferenceInput onInferred={handleTitleInference} />
      </div>

      {/* Text Only — stub */}
      <div
        role="tabpanel"
        id="tabpanel-text"
        aria-labelledby="tab-text"
        hidden={activeTab !== "text"}
        className="mt-4"
      >
        <ComingSoon label="Text Only" />
      </div>

      {/* Advanced — stub */}
      <div
        role="tabpanel"
        id="tabpanel-advanced"
        aria-labelledby="tab-advanced"
        hidden={activeTab !== "advanced"}
        className="mt-4"
      >
        <ComingSoon label="Advanced" />
      </div>
    </div>
  );
}

/** Placeholder rendered for tabs that are not yet implemented. */
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50 py-10 text-center">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-xs text-zinc-400">Coming soon</p>
    </div>
  );
}
