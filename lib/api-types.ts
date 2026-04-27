import { ProviderKey } from "./provider-config";

export type AspectRatio = "1:1" | "16:9";

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
}

export interface GenerateImageResponse {
  image?: string;
  error?: string;
}
