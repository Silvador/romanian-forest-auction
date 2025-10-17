import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardHeatRingProps {
  children: ReactNode;
  heatScore: "low" | "medium" | "high";
  className?: string;
}

export function CardHeatRing({
  children,
  heatScore,
  className,
}: CardHeatRingProps) {
  const heatStyles = {
    low: "glow-heat-low",
    medium: "glow-heat-medium",
    high: "glow-heat-high",
  };

  return (
    <div className={cn("relative rounded-lg", heatStyles[heatScore], className)}>
      {children}
    </div>
  );
}
