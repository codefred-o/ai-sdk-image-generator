"use client";

import { useState } from "react";
import { ModelSelect } from "@/components/ModelSelect";
import { ThumbnailForm } from "@/components/ThumbnailForm";
import { ModelCardCarousel } from "@/components/ModelCardCarousel";
import { InputRouter, ReferenceImage, FormPrefillValues } from "@/components/InputRouter";
import {
  MODEL_CONFIGS,
  PROVIDERS,
  PROVIDER_ORDER,
  ProviderKey,
  ModelMode,
  initializeProviderRecord,
} from "@/lib/provider-config";
import { Suggestion } from "@/lib/suggestions";
import { useImageGeneration } from "@/hooks/use-image-generation";
import { Header } from "./Header";

export function ImagePlayground({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  const {
    images,
    timings,
    failedProviders,
    isLoading,
    startGeneration,
    activePrompt,
  } = useImageGeneration();

  const [showProviders, setShowProviders] = useState(true);
  const [selectedModels, setSelectedModels] = useState<
    Record<ProviderKey, string>
  >(MODEL_CONFIGS.performance);
  const [enabledProviders, setEnabledProviders] = useState(
    initializeProviderRecord(true),
  );
  const [mode, setMode] = useState<ModelMode>("performance");

  /** Reference image supplied via the InputRouter (selfie or mood-board). */
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(
    null,
  );

  /**
   * Pre-fill values pushed by the YouTube URL or title-inference entry points.
   * A new object reference triggers ThumbnailForm's useEffect to apply them.
   */
  const [formPrefillValues, setFormPrefillValues] =
    useState<FormPrefillValues | undefined>(undefined);

  const toggleView = () => {
    setShowProviders((prev) => !prev);
  };

  const handleModeChange = (newMode: ModelMode) => {
    setMode(newMode);
    setSelectedModels(MODEL_CONFIGS[newMode]);
    setShowProviders(true);
  };

  const handleModelChange = (providerKey: ProviderKey, model: string) => {
    setSelectedModels((prev) => ({ ...prev, [providerKey]: model }));
  };

  const handleProviderToggle = (provider: string, enabled: boolean) => {
    setEnabledProviders((prev) => ({
      ...prev,
      [provider]: enabled,
    }));
  };

  const providerToModel = {
    replicate: selectedModels.replicate,
    vertex: selectedModels.vertex,
    openai: selectedModels.openai,
    fireworks: selectedModels.fireworks,
  };

  /**
   * ThumbnailForm already calls buildPrompt internally and passes the
   * fully-formed, provider-optimised prompt string here. Forward it
   * directly to all active providers, together with any reference image the
   * user has uploaded via the InputRouter.
   */
  const handlePromptSubmit = (prompt: string) => {
    const activeProviders = PROVIDER_ORDER.filter((p) => enabledProviders[p]);
    if (activeProviders.length > 0) {
      startGeneration(
        prompt,
        activeProviders,
        providerToModel,
        undefined,
        referenceImage,
      );
    }
    setShowProviders(false);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <Header />

        {/* Input mode selector: selfie, reference image, YouTube URL, title inference, and stub entry points */}
        <InputRouter
          referenceImage={referenceImage}
          onReferenceImageChange={setReferenceImage}
          onFormPrefill={(values) =>
            // Spread into a new object so React always sees a reference change,
            // which triggers ThumbnailForm's useEffect even for repeated prefills.
            setFormPrefillValues({ ...values })
          }
          className="mb-6"
        />

        <ThumbnailForm
          onSubmit={handlePromptSubmit}
          isLoading={isLoading}
          showProviders={showProviders}
          onToggleProviders={toggleView}
          mode={mode}
          onModeChange={handleModeChange}
          suggestions={suggestions}
          prefillValues={formPrefillValues}
        />
        <>
          {(() => {
            const getModelProps = () =>
              (Object.keys(PROVIDERS) as ProviderKey[]).map((key) => {
                const provider = PROVIDERS[key];
                const imageItem = images.find((img) => img.provider === key);
                const imageData = imageItem?.image;
                const modelId = imageItem?.modelId ?? "N/A";
                const timing = timings[key];

                return {
                  label: provider.displayName,
                  models: provider.models,
                  value: selectedModels[key],
                  providerKey: key,
                  onChange: (model: string, providerKey: ProviderKey) =>
                    handleModelChange(providerKey, model),
                  iconPath: provider.iconPath,
                  color: provider.color,
                  enabled: enabledProviders[key],
                  onToggle: (enabled: boolean) =>
                    handleProviderToggle(key, enabled),
                  image: imageData,
                  modelId,
                  timing,
                  failed: failedProviders.includes(key),
                };
              });

            return (
              <>
                <div className="md:hidden">
                  <ModelCardCarousel models={getModelProps()} />
                </div>
                <div className="hidden md:grid md:grid-cols-2 2xl:grid-cols-4 gap-8">
                  {getModelProps().map((props) => (
                    <ModelSelect key={props.label} {...props} />
                  ))}
                </div>
                {activePrompt && activePrompt.length > 0 && (
                  <div className="text-center mt-4 text-muted-foreground text-sm">
                    {activePrompt}
                  </div>
                )}
              </>
            );
          })()}
        </>
      </div>
    </div>
  );
}
