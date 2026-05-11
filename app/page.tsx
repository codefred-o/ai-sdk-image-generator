import { ImagePlayground } from "@/components/ImagePlayground";
import { getRandomSuggestions } from "@/lib/suggestions";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Thumbnail Generator - Create YouTube Thumbnails with AI",
  description: "Generate professional YouTube thumbnails using AI. Compare multiple AI models side-by-side and create eye-catching thumbnails in seconds.",
};

export default function Page() {
  return <ImagePlayground suggestions={getRandomSuggestions()} />;
}
