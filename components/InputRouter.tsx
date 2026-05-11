"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
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
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const handleTabChange = (tab: InputMode) => {
    setActiveTab(tab);
    // Switching away from an upload tab clears any pending reference image
    // so stale data doesn't persist across mode changes.
    if (tab !== "selfie" && tab !== "reference" && tab !== "youtube") {
      onReferenceImageChange(null);
    }
  };

  // Keyboard navigation for tabs
  const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const tabs = TABS.filter(tab => tab.implemented);
    let newIndex = currentIndex;

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        break;
      case "ArrowRight":
        e.preventDefault();
        newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        break;
      case "Home":
        e.preventDefault();
        newIndex = 0;
        break;
      case "End":
        e.preventDefault();
        newIndex = tabs.length - 1;
        break;
      default:
        return;
    }

    const newTab = tabs[newIndex];
    handleTabChange(newTab.id);
    // Focus the new tab
    const tabButton = tabRefs.current.get(newTab.id);
    tabButton?.focus();
  };

  // Scroll active tab into view on mobile
  useEffect(() => {
    const activeTabButton = tabRefs.current.get(activeTab);
    if (activeTabButton && tabListRef.current) {
      const tabList = tabListRef.current;
      const tabListRect = tabList.getBoundingClientRect();
      const tabRect = activeTabButton.getBoundingClientRect();
      
      if (tabRect.left < tabListRect.left || tabRect.right > tabListRect.right) {
        activeTabButton.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [activeTab]);

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
        ref={tabListRef}
        role="tablist"
        aria-label="Input mode selection"
        className="flex gap-1 overflow-x-auto scrollbar-hide rounded-xl bg-zinc-100 p-1 snap-x snap-mandatory"
      >
        {TABS.map(({ id, label, Icon, implemented }, index) => {
          const implementedTabs = TABS.filter(tab => tab.implemented);
          const currentIndex = implementedTabs.findIndex(tab => tab.id === id);
          
          return (
            <button
              key={id}
              ref={(el) => {
                if (el) tabRefs.current.set(id, el);
              }}
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`tabpanel-${id}`}
              aria-disabled={!implemented}
              id={`tab-${id}`}
              tabIndex={activeTab === id ? 0 : -1}
              type="button"
              onClick={() => implemented && handleTabChange(id)}
              onKeyDown={(e) => implemented && handleTabKeyDown(e, currentIndex)}
              className={cn(
                "flex min-w-[80px] sm:min-w-max flex-1 items-center justify-center gap-1.5 rounded-lg px-2 sm:px-3 py-2.5 sm:py-2 text-xs font-medium transition-all snap-center",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-100",
                activeTab === id
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700",
                !implemented && "opacity-60 cursor-not-allowed",
                "min-h-[44px] sm:min-h-[36px]"
              )}
            >
              <Icon className="h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
              {/* Show "soon" indicator for unimplemented tabs */}
              {!implemented && (
                <span
                  aria-label="Coming soon"
                  className="h-1.5 w-1.5 rounded-full bg-zinc-400 flex-shrink-0"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab panels ───────────────────────────────────────────────── */}

      {/* Selfie */}
      <div
        role="tabpanel"
        id="tabpanel-selfie"
        aria-labelledby="tab-selfie"
        hidden={activeTab !== "selfie"}
        tabIndex={0}
        className="mt-4 focus:outline-none"
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
        tabIndex={0}
        className="mt-4 focus:outline-none"
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
        tabIndex={0}
        className="mt-4 focus:outline-none"
      >
        <YouTubeUrlInput onMetadataFetched={handleYouTubeMetadata} />
      </div>

      {/* From Title (AI inference) */}
      <div
        role="tabpanel"
        id="tabpanel-title-inference"
        aria-labelledby="tab-title-inference"
        hidden={activeTab !== "title-inference"}
        tabIndex={0}
        className="mt-4 focus:outline-none"
      >
        <TitleInferenceInput onInferred={handleTitleInference} />
      </div>

      {/* Text Only — stub */}
      <div
        role="tabpanel"
        id="tabpanel-text"
        aria-labelledby="tab-text"
        hidden={activeTab !== "text"}
        tabIndex={0}
        className="mt-4 focus:outline-none"
      >
        <ComingSoon label="Text Only" />
      </div>

      {/* Advanced — stub */}
      <div
        role="tabpanel"
        id="tabpanel-advanced"
        aria-labelledby="tab-advanced"
        hidden={activeTab !== "advanced"}
        tabIndex={0}
        className="mt-4 focus:outline-none"
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
