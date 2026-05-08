export type ProviderKey = "replicate" | "vertex" | "openai" | "fireworks";
export type ModelMode = "performance" | "quality";

export interface ModelConfig {
  id: string;
  /**
   * Whether the model supports image-to-image (img2img) generation in
   * addition to text-to-image. Used by the UI / pipeline to gate features
   * that depend on supplying a reference image.
   */
  img2img: boolean;
}

interface ProviderInfo {
  displayName: string;
  iconPath: string;
  color: string;
  /**
   * Curated set of models for this provider with capability flags.
   */
  modelConfigs: ModelConfig[];
  /**
   * Convenience flat list of model ids derived from `modelConfigs`. Kept for
   * backward compatibility with callers that just want the list of ids.
   */
  models: string[];
}

const buildProvider = (
  info: Omit<ProviderInfo, "models">
): ProviderInfo => ({
  ...info,
  models: info.modelConfigs.map((m) => m.id),
});

export const PROVIDERS: Record<ProviderKey, ProviderInfo> = {
  replicate: buildProvider({
    displayName: "Replicate",
    iconPath: "/provider-icons/replicate.svg",
    color: "from-purple-500 to-blue-500",
    // Curated to thumbnail-strong, img2img-capable models on Replicate.
    modelConfigs: [
      { id: "black-forest-labs/flux-1.1-pro", img2img: true },
      { id: "black-forest-labs/flux-schnell", img2img: true },
      { id: "black-forest-labs/flux-dev", img2img: true },
      { id: "stability-ai/stable-diffusion-3.5-large", img2img: true },
      { id: "stability-ai/stable-diffusion-3.5-large-turbo", img2img: true },
    ],
  }),
  vertex: buildProvider({
    displayName: "Vertex AI",
    iconPath: "/provider-icons/vertex.svg",
    color: "from-green-500 to-emerald-500",
    // Imagen 3 doesn't expose img2img through the standard generateImage
    // path used by this app, so flag accordingly.
    modelConfigs: [
      { id: "imagen-3.0-generate-001", img2img: false },
      { id: "imagen-3.0-fast-generate-001", img2img: false },
    ],
  }),
  openai: buildProvider({
    displayName: "OpenAI",
    iconPath: "/provider-icons/openai.svg",
    color: "from-blue-500 to-cyan-500",
    // dall-e-3 produces the strongest thumbnail-quality images on OpenAI.
    // Neither dall-e-2 nor dall-e-3 support img2img through the AI SDK
    // generateImage interface used here.
    modelConfigs: [
      { id: "dall-e-3", img2img: false },
      { id: "dall-e-2", img2img: false },
    ],
  }),
  fireworks: buildProvider({
    displayName: "Fireworks",
    iconPath: "/provider-icons/fireworks.svg",
    color: "from-orange-500 to-red-500",
    // FLUX variants on Fireworks are thumbnail-strong and support img2img.
    modelConfigs: [
      { id: "accounts/fireworks/models/flux-1-schnell-fp8", img2img: true },
      { id: "accounts/fireworks/models/flux-1-dev-fp8", img2img: true },
    ],
  }),
};

export const MODEL_CONFIGS: Record<ModelMode, Record<ProviderKey, string>> = {
  performance: {
    replicate: "stability-ai/stable-diffusion-3.5-large-turbo",
    vertex: "imagen-3.0-fast-generate-001",
    openai: "dall-e-2",
    fireworks: "accounts/fireworks/models/flux-1-schnell-fp8",
  },
  quality: {
    replicate: "stability-ai/stable-diffusion-3.5-large",
    vertex: "imagen-3.0-generate-001",
    openai: "dall-e-3",
    fireworks: "accounts/fireworks/models/flux-1-dev-fp8",
  },
};

export const PROVIDER_ORDER: ProviderKey[] = [
  "replicate",
  "vertex",
  "openai",
  "fireworks",
];

export const initializeProviderRecord = <T>(defaultValue?: T) =>
  Object.fromEntries(
    PROVIDER_ORDER.map((key) => [key, defaultValue])
  ) as Record<ProviderKey, T>;

/**
 * Returns true if the given model on the given provider supports image-to-image
 * (img2img) generation. Returns false if the model is not in the curated list.
 */
export const supportsImg2Img = (
  provider: ProviderKey,
  modelId: string
): boolean => {
  return (
    PROVIDERS[provider]?.modelConfigs.find((m) => m.id === modelId)?.img2img ??
    false
  );
};
