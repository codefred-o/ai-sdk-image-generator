import { NextRequest, NextResponse } from "next/server";
import { ImageModel, experimental_generateImage as generateImage } from "ai";
import { openai } from "@ai-sdk/openai";
import { fireworks } from "@ai-sdk/fireworks";
import { replicate } from "@ai-sdk/replicate";
import { vertex } from "@ai-sdk/google-vertex/edge";
import { ProviderKey } from "@/lib/provider-config";
import { AspectRatio, GenerateImageRequest } from "@/lib/api-types";

/**
 * Intended to be slightly less than the maximum execution time allowed by the
 * runtime so that we can gracefully terminate our request.
 */
const TIMEOUT_MILLIS = 55 * 1000;

/**
 * Default aspect ratio if the client doesn't specify one. We've moved away
 * from 1:1 squares for thumbnail-friendly 16:9 outputs.
 */
const DEFAULT_ASPECT_RATIO: AspectRatio = "16:9";

/**
 * Per-aspect-ratio dimensions for size-based providers (OpenAI / Replicate)
 * and aspect-ratio-based providers (Fireworks / Vertex).
 */
const SIZE_BY_ASPECT_RATIO: Record<AspectRatio, `${number}x${number}`> = {
  "1:1": "1024x1024",
  "16:9": "1280x720",
};

interface ProviderConfig {
  createImageModel: (modelId: string) => ImageModel;
  dimensionFormat: "size" | "aspectRatio";
}

const providerConfig: Record<ProviderKey, ProviderConfig> = {
  openai: {
    createImageModel: openai.image,
    dimensionFormat: "size",
  },
  fireworks: {
    createImageModel: fireworks.image,
    dimensionFormat: "aspectRatio",
  },
  replicate: {
    createImageModel: replicate.image,
    // Replicate's curated FLUX and Stable Diffusion image models accept an
    // `aspect_ratio` input (e.g. "16:9") rather than a free-form size string,
    // so we use the aspectRatio format to actually get 16:9 output at runtime.
    dimensionFormat: "aspectRatio",
  },
  vertex: {
    createImageModel: vertex.image,
    dimensionFormat: "aspectRatio",
  },
};

/**
 * Dimension parameters for `experimental_generateImage`. Either a `size`
 * (WxH string) for size-based providers, or an `aspectRatio` (W:H string)
 * for aspect-ratio-based providers.
 */
type DimensionParams =
  | { size: `${number}x${number}` }
  | { aspectRatio: `${number}:${number}` };

/**
 * Returns the correct dimension parameter shape for a given provider and
 * requested aspect ratio.
 *
 * - OpenAI: returned as `{ size: "WxH" }`.
 *   - `dall-e-3` only accepts 1024x1024, 1792x1024, or 1024x1792 — we pick
 *     1792x1024 for 16:9.
 *   - `dall-e-2` only supports squares, so it always falls back to 1024x1024.
 * - Fireworks / Vertex / Replicate: returned as `{ aspectRatio: "W:H" }`.
 *   The curated FLUX/SD models on Replicate take an `aspect_ratio` input
 *   rather than a free-form size string, so this is the only shape that
 *   actually yields 16:9 output across all three providers.
 */
const getDimensionParams = (
  provider: ProviderKey,
  modelId?: string,
  aspectRatio: AspectRatio = DEFAULT_ASPECT_RATIO
): DimensionParams => {
  const config = providerConfig[provider];
  if (config.dimensionFormat === "aspectRatio") {
    return { aspectRatio };
  }

  if (provider === "openai") {
    // dall-e-2 only supports square sizes regardless of requested aspect ratio.
    if (modelId === "dall-e-2") {
      return { size: "1024x1024" };
    }
    // dall-e-3 has a strict allow-list of sizes.
    if (modelId === "dall-e-3") {
      return { size: aspectRatio === "16:9" ? "1792x1024" : "1024x1024" };
    }
  }

  return { size: SIZE_BY_ASPECT_RATIO[aspectRatio] };
};

const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMillis: number
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), timeoutMillis)
    ),
  ]);
};

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const { prompt, provider, modelId, aspectRatio } =
    (await req.json()) as GenerateImageRequest;

  try {
    if (!prompt || !provider || !modelId || !providerConfig[provider]) {
      const error = "Invalid request parameters";
      console.error(`${error} [requestId=${requestId}]`);
      return NextResponse.json({ error }, { status: 400 });
    }

    const config = providerConfig[provider];
    const dimensionParams = getDimensionParams(provider, modelId, aspectRatio);
    const startstamp = performance.now();
    const generatePromise = generateImage({
      model: config.createImageModel(modelId),
      prompt,
      ...dimensionParams,
      ...(provider !== "openai" && {
        seed: Math.floor(Math.random() * 1000000),
      }),
      // Vertex AI only accepts a specified seed if watermark is disabled.
      providerOptions: { vertex: { addWatermark: false } },
    }).then(({ image, warnings }) => {
      if (warnings?.length > 0) {
        console.warn(
          `Warnings [requestId=${requestId}, provider=${provider}, model=${modelId}]: `,
          warnings
        );
      }
      console.log(
        `Completed image request [requestId=${requestId}, provider=${provider}, model=${modelId}, elapsed=${(
          (performance.now() - startstamp) /
          1000
        ).toFixed(1)}s].`
      );

      return {
        provider,
        image: image.base64,
      };
    });

    const result = await withTimeout(generatePromise, TIMEOUT_MILLIS);
    return NextResponse.json(result, {
      status: "image" in result ? 200 : 500,
    });
  } catch (error) {
    // Log full error detail on the server, but return a generic error message
    // to avoid leaking any sensitive information to the client.
    console.error(
      `Error generating image [requestId=${requestId}, provider=${provider}, model=${modelId}]: `,
      error
    );
    return NextResponse.json(
      {
        error: "Failed to generate image. Please try again later.",
      },
      { status: 500 }
    );
  }
}
