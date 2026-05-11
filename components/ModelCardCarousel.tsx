"use client";

import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ModelSelect } from "./ModelSelect";
import { cn } from "@/lib/utils";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { ProviderKey } from "@/lib/provider-config";
import { ProviderTiming } from "@/lib/image-types";

interface ModelCardCarouselProps {
  models: Array<{
    label: string;
    models: string[];
    iconPath: string;
    color: string;
    value: string;
    providerKey: ProviderKey;
    enabled?: boolean;
    onToggle?: (enabled: boolean) => void;
    onChange: (value: string, providerKey: ProviderKey) => void;
    image: string | null | undefined;
    timing?: ProviderTiming;
    failed?: boolean;
    modelId: string;
    onRetry?: () => void;
  }>;
}

export function ModelCardCarousel({ models }: ModelCardCarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [api, setApi] = useState<CarouselApi>();
  const initialized = useRef(false);

  useLayoutEffect(() => {
    if (!api || initialized.current) return;

    // Force scroll in multiple ways
    api.scrollTo(0, false);
    api.scrollPrev(); // Reset any potential offset
    api.scrollTo(0, false);

    initialized.current = true;
    setCurrentSlide(0);
  }, [api]);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrentSlide(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
      return;
    };
  }, [api]);

  return (
    <div className="relative w-full mb-12">
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          dragFree: false,
          containScroll: "trimSnaps",
          loop: true,
          watchDrag: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {models.map((model, i) => (
            <CarouselItem key={model.label} className="pl-2 md:pl-4">
              <ModelSelect
                {...model}
                onChange={(value, providerKey) =>
                  model.onChange(value, providerKey)
                }
              />
              <div className="text-center text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4">
                {i + 1} of {models.length}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious 
          className="left-2 sm:left-0 h-10 w-10 sm:h-8 sm:w-8 bg-background/90 backdrop-blur-sm border-2 hover:bg-background"
          aria-label="Previous model" 
        />
        <CarouselNext 
          className="right-2 sm:right-0 h-10 w-10 sm:h-8 sm:w-8 bg-background/90 backdrop-blur-sm border-2 hover:bg-background"
          aria-label="Next model"
        />
      </Carousel>

      {/* Dot Indicators */}
      <div className="absolute -bottom-8 left-0 right-0">
        <div className="flex justify-center gap-1.5 sm:gap-1">
          {models.map((_, index) => (
            <button
              key={index}
              className={cn(
                "h-2 sm:h-1.5 rounded-full transition-all duration-200",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2",
                index === currentSlide
                  ? "w-5 sm:w-4 bg-primary"
                  : "w-2 sm:w-1.5 bg-primary/30 hover:bg-primary/50",
              )}
              onClick={() => api?.scrollTo(index)}
              aria-label={`Go to model ${index + 1} of ${models.length}`}
              aria-current={index === currentSlide ? "true" : "false"}
            >
              <span className="sr-only">
                {models[index]?.label || `Model ${index + 1}`}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
