import { TreeDeciduous } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getSpeciesColorMap } from "@/utils/formatters";
import { cn } from "@/lib/utils";

interface SpeciesSegment {
  species: string;
  volume: number;
}

interface SpeciesCompositionBarProps {
  breakdown: SpeciesSegment[];
  totalVolume?: number;
  live?: boolean; // Applies shimmer animation when auction is active
}

export function SpeciesCompositionBar({
  breakdown,
  totalVolume,
  live = false,
}: SpeciesCompositionBarProps) {
  const speciesColors = getSpeciesColorMap();

  // Calculate total volume if not provided
  const total = totalVolume ?? breakdown.reduce((sum, seg) => sum + seg.volume, 0);

  // Calculate percentages and sort by volume descending for visual hierarchy
  const segments = breakdown
    .map((seg) => ({
      ...seg,
      percentage: total > 0 ? (seg.volume / total) * 100 : 0,
    }))
    .sort((a, b) => b.volume - a.volume);

  // Edge case: no data
  if (segments.length === 0 || total === 0) {
    return (
      <div className="w-full h-6 flex items-center justify-center rounded-md border border-border/40 bg-muted/30 text-muted-foreground text-xs">
        No species data
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          "relative w-full h-6 flex rounded-md overflow-hidden border border-border/40 shadow-sm",
          live && "species-bar-live animate-shimmer"
        )}
      >
        {segments.map((segment, index) => {
          const color = speciesColors[segment.species] || speciesColors.default;

          return (
            <Tooltip key={`${segment.species}-${index}`}>
              <TooltipTrigger asChild>
                <div
                  className="relative transition-all duration-200 hover:brightness-110 cursor-pointer flex items-center justify-center"
                  style={{
                    width: `${segment.percentage}%`,
                    backgroundColor: color,
                  }}
                  data-testid={`species-bar-${segment.species}`}
                >
                  {/* Show percentage label only if segment is wide enough (>12%) */}
                  {segment.percentage > 12 && (
                    <span className="text-[10px] font-bold text-white drop-shadow-md tracking-tight">
                      {segment.percentage.toFixed(0)}%
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="bg-popover/95 backdrop-blur-sm border-border px-3 py-2"
              >
                <div className="text-sm font-medium">
                  <div className="flex items-center gap-2 mb-1">
                    <TreeDeciduous className="w-3.5 h-3.5" style={{ color }} />
                    <span className="font-semibold">{segment.species}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>{segment.volume.toFixed(2)} m³</div>
                    <div className="font-medium">{segment.percentage.toFixed(1)}%</div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
