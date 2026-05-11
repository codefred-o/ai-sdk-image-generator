"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloud, X, CheckCircle } from "lucide-react";
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
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Prefer the controlled `value`; fall back to local state for uncontrolled usage.
  const preview = value ?? internalPreview;

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      setUploadStatus("Processing image...");

      if (!file.type.startsWith("image/")) {
        const errorMsg = "Only image files are accepted.";
        setError(errorMsg);
        setUploadStatus(`Error: ${errorMsg}`);
        return;
      }

      if (file.size > MAX_SIZE_BYTES) {
        const errorMsg = "File is too large. Maximum size is 10 MB.";
        setError(errorMsg);
        setUploadStatus(`Error: ${errorMsg}`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setInternalPreview(result);
        onImageChange(result);
        setUploadStatus("Image uploaded successfully");
      };
      reader.onerror = () => {
        const errorMsg = "Failed to read the file. Please try again.";
        setError(errorMsg);
        setUploadStatus(`Error: ${errorMsg}`);
      };
      reader.readAsDataURL(file);
    },
    [onImageChange],
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setUploadStatus("Drop image here");
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadStatus("");
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
    setUploadStatus("Image removed");
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Screen reader announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {uploadStatus}
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label={preview ? "Image uploaded. Press Enter to remove" : label}
        aria-describedby="upload-instructions"
        onClick={preview ? undefined : handleClick}
        onKeyDown={(e) => {
          if (!preview && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleClick();
          }
          if (preview && (e.key === "Enter" || e.key === "Delete")) {
            e.preventDefault();
            handleRemove(e as any);
          }
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
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2",
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
            <div className="flex items-center gap-2 absolute top-2 right-2">
              <span className="bg-green-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <CheckCircle className="h-4 w-4" />
              </span>
              <button
                type="button"
                onClick={handleRemove}
                aria-label="Remove uploaded image"
                className="flex h-8 w-8 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80 focus:opacity-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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
            <p className="mt-1 text-xs text-zinc-400" id="upload-instructions">{subLabel}</p>
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
        aria-label="Choose image file"
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
