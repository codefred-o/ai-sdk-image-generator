import { useState, useEffect } from "react";
import { ArrowUp, ArrowUpRight, RefreshCw } from "lucide-react";
import { getRandomSuggestions, Suggestion } from "@/lib/suggestions";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { buildPrompt } from "@/lib/prompt-builder";
import { StylePreset, EmotionPreset } from "@/lib/prompt-builder";

interface ThumbnailFormProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
  showProviders: boolean;
  onToggleProviders: () => void;
  mode: "performance" | "quality";
  onModeChange: (mode: "performance" | "quality") => void;
  suggestions: Suggestion[];
  /**
   * Optional pre-filled values provided by an entry-point (YouTube URL fetch
   * or title inference). When this prop changes the form fields are updated
   * so the user can review and edit before generating.
   */
  prefillValues?: {
    title?: string;
    subject?: string;
    stylePreset?: StylePreset;
    emotionPreset?: EmotionPreset;
    overlayText?: string;
  };
}

export function ThumbnailForm({
  suggestions: initSuggestions,
  isLoading,
  onSubmit,
  prefillValues,
}: ThumbnailFormProps) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [stylePreset, setStylePreset] = useState<StylePreset | "">("");
  const [emotionPreset, setEmotionPreset] = useState<EmotionPreset | "">("");
  const [overlayText, setOverlayText] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initSuggestions);
  const [isGenerating, setIsGenerating] = useState(false);

  // Apply pre-filled values whenever the prefillValues prop changes.
  useEffect(() => {
    if (!prefillValues) return;
    if (prefillValues.title !== undefined) setTitle(prefillValues.title);
    if (prefillValues.subject !== undefined) setSubject(prefillValues.subject);
    if (prefillValues.stylePreset !== undefined) setStylePreset(prefillValues.stylePreset);
    if (prefillValues.emotionPreset !== undefined) setEmotionPreset(prefillValues.emotionPreset);
    if (prefillValues.overlayText !== undefined) setOverlayText(prefillValues.overlayText);
  }, [prefillValues]);

  const updateSuggestions = () => {
    setSuggestions(getRandomSuggestions());
  };

  const handleSuggestionSelect = (prompt: string) => {
    // For suggestions, we'll parse them back into form fields (simplified)
    setTitle(prompt.split(" - ")[0] || prompt);
    setSubject(prompt);
  };

  const handleSubmit = () => {
    if (!isLoading && title.trim() && subject.trim()) {
      // Set loading state immediately for instant feedback
      setIsGenerating(true);
      
      // Use setTimeout to ensure the state update happens immediately
      setTimeout(() => {
        const prompt = buildPrompt({
          title,
          subject,
          stylePreset: stylePreset || undefined,
          emotionPreset: emotionPreset || undefined,
        }, "replicate"); // Using replicate as default provider for now
        onSubmit(prompt);
        
        // Reset after a small delay to show the spinner animation
        setTimeout(() => {
          setIsGenerating(false);
        }, 200);
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && title.trim() && subject.trim()) {
        handleSubmit();
      }
    }
  };

  return (
    <div className="w-full mb-8">
      <div className="bg-zinc-50 rounded-xl p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="space-y-2">
            <label htmlFor="thumbnail-title" className="text-sm font-medium text-zinc-700">Title</label>
            <Textarea
              id="thumbnail-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter thumbnail title (e.g., 'I Built This in 24 Hours')"
              rows={2}
              aria-label="Thumbnail title"
              aria-describedby="title-description"
              className="text-sm sm:text-base bg-transparent border-none p-0 resize-none placeholder:text-zinc-500 text-[#111111] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <span id="title-description" className="sr-only">
              Enter a compelling title for your YouTube thumbnail
            </span>
          </div>
          
          <div className="space-y-2">
            <label htmlFor="thumbnail-subject" className="text-sm font-medium text-zinc-700">Subject</label>
            <Textarea
              id="thumbnail-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the main subject or scene"
              rows={3}
              aria-label="Thumbnail subject"
              aria-describedby="subject-description"
              className="text-sm sm:text-base bg-transparent border-none p-0 resize-none placeholder:text-zinc-500 text-[#111111] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <span id="subject-description" className="sr-only">
              Describe what should appear in the thumbnail image
            </span>
          </div>

          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="style-preset" className="text-sm font-medium text-zinc-700">Style Preset</label>
              <Select 
                value={stylePreset || "MrBeast/high-energy"} 
                onValueChange={(v) => setStylePreset(v as StylePreset)}
              >
                <SelectTrigger id="style-preset" className="h-10 sm:h-9">
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="MrBeast/high-energy">MrBeast / High Energy</SelectItem>
                    <SelectItem value="tutorial/clean">Tutorial / Clean</SelectItem>
                    <SelectItem value="gaming/dynamic">Gaming / Dynamic</SelectItem>
                    <SelectItem value="vlog/aesthetic">Vlog / Aesthetic</SelectItem>
                    <SelectItem value="tech-explainer">Tech Explainer</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="emotion-preset" className="text-sm font-medium text-zinc-700">Emotion Preset</label>
              <Select 
                value={emotionPreset || "excited"} 
                onValueChange={(v) => setEmotionPreset(v as EmotionPreset)}
              >
                <SelectTrigger id="emotion-preset" className="h-10 sm:h-9">
                  <SelectValue placeholder="Select an emotion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="shocked">Shocked</SelectItem>
                    <SelectItem value="excited">Excited</SelectItem>
                    <SelectItem value="confident">Confident</SelectItem>
                    <SelectItem value="curious">Curious</SelectItem>
                    <SelectItem value="intense">Intense</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="overlay-text" className="text-sm font-medium text-zinc-700">
              Overlay Text{" "}
              <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <Textarea
              id="overlay-text"
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Short punchy text to overlay on the thumbnail"
              rows={1}
              aria-label="Overlay text"
              aria-describedby="overlay-description"
              className="text-sm sm:text-base bg-transparent border-none p-0 resize-none placeholder:text-zinc-500 text-[#111111] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <span id="overlay-description" className="sr-only">
              Optional text that will be displayed on top of the thumbnail image
            </span>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <button
                onClick={updateSuggestions}
                className="flex items-center justify-center min-w-[44px] h-[44px] sm:min-w-[36px] sm:h-[36px] rounded-lg bg-background hover:bg-zinc-100 transition-colors"
                aria-label="Refresh suggestions"
              >
                <RefreshCw className="w-4 h-4 text-zinc-500" />
              </button>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionSelect(suggestion.prompt)}
                  className={cn(
                    "flex items-center justify-between px-2.5 sm:px-2 rounded-lg py-2.5 sm:py-1.5 bg-background hover:bg-zinc-100 transition-colors min-h-[44px] sm:min-h-[36px]",
                    index > 2 ? "hidden lg:flex" : index > 1 ? "hidden sm:flex" : "",
                  )}
                  aria-label={`Use suggestion: ${suggestion.text}`}
                >
                  <span>
                    <span className="text-black text-xs">
                      {suggestion.text.toLowerCase()}
                    </span>
                  </span>
                  <ArrowUpRight className="ml-1.5 h-3 w-3 text-zinc-500 flex-shrink-0" />
                </button>
              ))}
            </div>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !title.trim() || !subject.trim()}
              className="min-w-[48px] h-[48px] sm:min-w-[36px] sm:h-[36px] rounded-full bg-black flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-colors"
              aria-label="Generate thumbnail"
              aria-disabled={isLoading || !title.trim() || !subject.trim()}
            >
              {isGenerating ? (
                <Spinner className="w-4 h-4 sm:w-3 sm:h-3 text-white" />
              ) : (
                <ArrowUp className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}