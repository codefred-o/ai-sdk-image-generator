import { ProviderKey } from "./provider-config";

export type AspectRatio = "1:1" | "16:9";

/**
 * How the reference image should influence generation.
 * - `"face"` – preserve the subject's likeness (selfie path).
 * - `"style"` – transfer visual style / mood-board (reference-image path).
 */
export type ReferenceMode = "face" | "style";

export interface GenerateImageRequest {
  prompt: string;
  provider: ProviderKey;
  modelId: string;
  /**
   * Aspect ratio of the generated image. Defaults to "16:9" on the server.
   * The route handler maps this to a per-provider `size` or `aspectRatio`
   * parameter via `getDimensionParams`.
   */
  aspectRatio?: AspectRatio;
  /**
   * Base64 data URL of the reference image supplied by the user.
   * Present only when the user has uploaded a selfie or a reference image.
   * Never stored server-side — consumed in-memory per request only.
   */
  referenceImage?: string;
  /**
   * Describes how the reference image should influence generation.
   * Required when `referenceImage` is provided.
   */
  referenceMode?: ReferenceMode;
}

export interface GenerateImageResponse {
  image?: string;
  error?: string;
}
