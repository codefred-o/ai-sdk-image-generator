"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Maximum allowed upload size: 10 MB */
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export interface ImageUploaderProps {
  /** Label shown inside the drop zone */
  label?: string;
  /** Sub-label shown below the main label */
  subLabel?: string;
  /** Called when a valid image has been picked and converted to base64 */
  onImageChange: (base64: string | null) => void;
  /** Optional current value (base64) for controlled usage */
  value?: string | null;
  /** Extra classes forwarded to the root element */
  className?: string;
}

/**
 * Drag-and-drop / click-to-upload component.
 *
 * - Accepts any image type (MIME `image/*`).
 * - Enforces a 10 MB cap and surfaces a clear inline error on violation.
 * - Converts the picked file to base64 **entirely client-side** — no bytes
 *   ever leave the browser until the user explicitly submits the form.
 * - Shows a live preview once an image is loaded.
 */
export function ImageUploader({
  label = "Drop image here or click to upload",
  subLabel = "PNG, JPG, WEBP up to 10 MB",
  onImageChange,
  value,
  className,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalPreview, setInternalPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Prefer the controlled `value`; fall back to local state for uncontrolled usage.
  const preview = value ?? internalPreview;

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      if (!file.type.startsWith("image/")) {
        setError("Only image files are accepted.");
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        setError("File is too large. Maximum size is 10 MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setInternalPreview(result);
        onImageChange(result);
      };
      reader.onerror = () => {
        setError("Failed to read the file. Please try again.");
      };
      reader.readAsDataURL(file);
    },
    [onImageChange],
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so the same file can be re-selected after removal
    e.target.value = "";
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalPreview(null);
    setError(null);
    onImageChange(null);
  };

  return (
    <div className={cn("w-full", className)}>
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        onClick={preview ? undefined : handleClick}
        onKeyDown={(e) => {
          if (!preview && (e.key === "Enter" || e.key === " ")) handleClick();
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors",
          preview ? "cursor-default border-transparent p-0" : "cursor-pointer p-8",
          !preview && isDragging
            ? "border-zinc-400 bg-zinc-100"
            : !preview
              ? "border-zinc-300 bg-zinc-50 hover:border-zinc-400 hover:bg-zinc-100"
              : "",
        )}
      >
        {preview ? (
          /* ── Preview state ─────────────────────────────────────────── */
          <div className="group relative w-full overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Uploaded preview"
              className="w-full rounded-xl object-cover"
              style={{ maxHeight: 240 }}
            />
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove image"
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          /* ── Empty / drag state ────────────────────────────────────── */
          <>
            <UploadCloud
              className={cn(
                "mb-3 h-10 w-10 transition-colors",
                isDragging ? "text-zinc-600" : "text-zinc-400",
              )}
            />
            <p className="text-sm font-medium text-zinc-700">{label}</p>
            <p className="mt-1 text-xs text-zinc-400">{subLabel}</p>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleInputChange}
        aria-hidden="true"
      />

      {/* Error message */}
      {error && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
