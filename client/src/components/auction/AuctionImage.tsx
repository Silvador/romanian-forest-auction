import { useState } from "react";
import { getSpeciesVisual } from "@/utils/speciesVisuals";
import { Badge } from "@/components/ui/badge";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuctionImageProps {
  imageUrl?: string;
  dominantSpecies?: string;
  title: string;
  status?: string;
  showPlaceholderBadge?: boolean;
  className?: string;
}

export function AuctionImage({
  imageUrl,
  dominantSpecies,
  title,
  status,
  showPlaceholderBadge = true,
  className
}: AuctionImageProps) {
  const [imageError, setImageError] = useState(false);
  const isPlaceholder = !imageUrl || imageError;

  // Get species-specific visual configuration
  const speciesVisual = getSpeciesVisual(dominantSpecies);
  const Icon = speciesVisual.icon;

  if (isPlaceholder) {
    return (
      <div
        className={cn(
          "relative w-full h-full overflow-hidden group",
          className
        )}
      >
        {/* Gradient Background */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br",
            speciesVisual.gradient,
            "transition-all duration-700 group-hover:scale-105"
          )}
        />

        {/* Subtle texture overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
                             radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />

        {/* Vignette effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />

        {/* Content Container - Centered */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
          {/* Species Name - Large and Prominent */}
          <h3 className="text-white text-3xl md:text-4xl lg:text-5xl font-bold mb-2 drop-shadow-lg">
            {dominantSpecies || "Mixed Forest"}
          </h3>

          {/* English Description */}
          <p className="text-white/90 text-base md:text-lg font-medium drop-shadow-md">
            {speciesVisual.description}
          </p>

          {/* Small icon badge at bottom */}
          <div className="mt-6 flex items-center justify-center gap-2 text-white/80">
            <Icon className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-sm font-medium">No photos available</span>
          </div>
        </div>

        {/* Generated badge - Top right */}
        {showPlaceholderBadge && (
          <Badge
            variant="secondary"
            className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm text-white border-white/20 text-xs"
          >
            <ImageIcon className="w-3 h-3 mr-1" />
            Generated
          </Badge>
        )}

        {/* Status badge (if provided) */}
        {status === "active" && (
          <Badge className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm animate-pulse z-10">
            <div className="w-2 h-2 bg-primary-foreground rounded-full mr-1.5 animate-pulse" />
            LIVE
          </Badge>
        )}
      </div>
    );
  }

  // Real image display
  return (
    <div className={cn("relative w-full h-full overflow-hidden", className)}>
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        onError={() => setImageError(true)}
        loading="lazy"
      />

      {/* Status badge (if provided) */}
      {status === "active" && (
        <Badge className="absolute top-4 left-4 bg-primary/90 backdrop-blur-sm animate-pulse z-10">
          <div className="w-2 h-2 bg-primary-foreground rounded-full mr-1.5 animate-pulse" />
          LIVE
        </Badge>
      )}
    </div>
  );
}
