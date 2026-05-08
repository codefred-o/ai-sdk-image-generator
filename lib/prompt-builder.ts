import { StylePreset, EmotionPreset } from "./provider-config";

interface PromptRequest {
  title: string;
  subject: string;
  stylePreset?: StylePreset;
  emotionPreset?: EmotionPreset;
}

/**
 * Builds a provider-optimized prompt from structured thumbnail inputs
 */
export function buildPrompt(request: PromptRequest, provider: string): string {
  const { title, subject, stylePreset, emotionPreset } = request;

  // Start with the core components
  let prompt = `${title} - ${subject}`;

  // Add style preset if provided
  if (stylePreset) {
    prompt += `, ${stylePreset} style`;
  }

  // Add emotion preset if provided
  if (emotionPreset) {
    prompt += `, ${emotionPreset} emotion`;
  }

  // Provider-specific optimizations
  switch (provider) {
    case "openai":
      // DALL-E works well with descriptive, imaginative prompts
      prompt = `A YouTube thumbnail showing: ${prompt}. High contrast, vibrant colors, eye-catching composition.`;
      break;
    case "replicate":
      // Flux models benefit from detailed descriptions
      prompt = `professional YouTube thumbnail: ${prompt}. Bold text, clear focal point, viral-worthy composition.`;
      break;
    case "vertex":
      // Imagen works well with natural language
      prompt = `Create a YouTube thumbnail featuring ${prompt}. The thumbnail should be engaging and suitable for a YouTube video.`;
      break;
    case "fireworks":
      // Playground v2 etc.
      prompt = `YouTube thumbnail style: ${prompt}. Trending on YouTube, clickbait worthy, high engagement.`;
      break;
    default:
      // Default fallback
      prompt = `YouTube thumbnail: ${prompt}.`;
  }

  return prompt;
}