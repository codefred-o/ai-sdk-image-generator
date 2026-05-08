import { useState } from "react";
import { ArrowUp, RefreshCw } from "lucide-react";
import { getRandomSuggestions, Suggestion } from "@/lib/suggestions";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SelectTrigger, SelectValue, SelectContent, SelectItem, SelectLabel, SelectSeparator } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { buildPrompt } from "@/lib/prompt-builder";
import { StylePreset, EmotionPreset } from "@/lib/provider-config";

interface ThumbnailFormProps {
  onSubmit: (prompt: string) => void;
  isLoading?: boolean;
  showProviders: boolean;
  onToggleProviders: () => void;
  mode: "performance" | "quality";
  onModeChange: (mode: "performance" | "quality") => void;
  suggestions: Suggestion[];
}

export function ThumbnailForm({
  suggestions: initSuggestions,
  isLoading,
  onSubmit,
}: ThumbnailFormProps) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [stylePreset, setStylePreset] = useStylePreset("");
  const [emotionPreset, setEmotionPreset] = useEmotionPreset("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>(initSuggestions);
  const [isGenerating, setIsGenerating] = useState(false);

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
      setIsGenerating(true);
      const prompt = buildPrompt({
        title,
        subject,
        stylePreset: stylePreset || undefined,
        emotionPreset: emotionPreset || undefined,
      }, "replicate"); // Using replicate as default provider for now
      onSubmit(prompt);
      setIsGenerating(false);
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
      <div className="bg-zinc-50 rounded-xl p-4">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Title</label>
            <Textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter thumbnail title (e.g., 'I Built This in 24 Hours')"
              rows={2}
              className="text-base bg-transparent border-none p-0 resize-none placeholder:text-zinc-500 text-[#111111] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700">Subject</label>
            <Textarea
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the main subject or scene"
              rows={3}
              className="text-base bg-transparent border-none p-0 resize-none placeholder:text-zinc-500 text-[#111111] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Style Preset</label>
              <Select defaultValue="MrBeast/high-energy" onValueChange={setStylePreset} className="w-full">
                <SelectTrigger>
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectLabel>Style Presets</SelectLabel>
                  <SelectSeparator />
                  <SelectItem value="MrBeast/high-energy">MrBeast/high-energy</SelectItem>
                  <SelectItem value="tutorial/clean">Tutorial/Clean</SelectItem>
                  <SelectItem value="gaming/dynamic">Gaming/Dynamic</SelectItem>
                  <SelectItem value="vlog/aesthetic">Vlog/Aesthetic</SelectItem>
                  <SelectItem value="tech-explainer">Tech Explainer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Emotion Preset</label>
              <Select defaultValue="excited" onValueChange={setEmotionPreset} className="w-full">
                <SelectTrigger>
                  <SelectValue placeholder="Select an emotion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectLabel>Emotion Presets</SelectLabel>
                  <SelectSeparator />
                  <SelectItem value="shocked">Shocked</SelectItem>
                  <SelectItem value="excited">Excited</SelectItem>
                  <SelectItem value="confident">Confident</SelectItem>
                  <SelectItem value="curious">Curious</SelectItem>
                  <SelectItem value="intense">Intense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center justify-between space-x-2">
              <button
                onClick={updateSuggestions}
                className="flex items-center justify-between px-2 rounded-lg py-1 bg-background text-sm hover:opacity-70 group transition-opacity duration-200"
              >
                <RefreshCw className="w-4 h-4 text-zinc-500 group-hover:opacity-70" />
              </button>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionSelect(suggestion.prompt)}
                  className={cn(
                    "flex items-center justify-between px-2 rounded-lg py-1 bg-background text-sm hover:opacity-70 group transition-opacity duration-200",
                    index > 2 ? "hidden md:flex" : index > 1 ? "hidden sm:flex" : "",
                  )}
                >
                  <span>
                    <span className="text-black text-xs sm:text-sm">
                      {suggestion.text.toLowerCase()}
                    </span>
                  </span>
                  <ArrowUpRight className="ml-1 h-2 w-2 sm:h-3 sm:w-3 text-zinc-500 group-hover:opacity-70" />
                </button>
              ))}
            </div>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !title.trim() || !subject.trim()}
              className="h-8 w-8 rounded-full bg-black flex items-center justify-center disabled:opacity-50"
            >
              {isGenerating ? (
                <Spinner className="w-3 h-3 text-white" />
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

// Helper hooks for presets
function useStylePreset(initialValue: StylePreset | "") {
  const [value, setValue] = useState<StylePreset | "">(initialValue);
  return [value, setValue] as const;
}

function useEmotionPreset(initialValue: EmotionPreset | "") {
  const [value, setValue] = useState<EmotionPreset | "">(initialValue);
  return [value, setValue] as const;
}