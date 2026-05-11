import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface ImageSkeletonProps {
  className?: string
  showTimer?: boolean
  elapsedTime?: number
}

export function ImageSkeleton({ className, showTimer, elapsedTime }: ImageSkeletonProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <Skeleton className="aspect-[16/9] w-full rounded-xl" />
      
      {/* Loading indicator */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <div className="flex gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-zinc-400" />
        </div>
        <p className="text-xs text-zinc-500">Generating image...</p>
        {showTimer && elapsedTime !== undefined && (
          <p className="text-xs text-zinc-400">{(elapsedTime / 1000).toFixed(1)}s</p>
        )}
      </div>
    </div>
  )
}