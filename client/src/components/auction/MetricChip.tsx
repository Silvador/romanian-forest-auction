import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MetricChipProps {
  icon: ReactNode;
  label: string;
  tone?: "neutral" | "positive" | "negative" | "urgent";
  className?: string;
}

export function MetricChip({
  icon,
  label,
  tone = "neutral",
  className,
}: MetricChipProps) {
  const toneStyles = {
    neutral: "bg-muted/40 text-muted-foreground border border-border/40",
    positive: "bg-positive/10 text-positive border border-positive/30",
    negative: "bg-negative/10 text-negative border border-negative/30",
    urgent: "bg-negative/20 text-negative border border-negative/40 animate-pulse-soft",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors duration-200",
        toneStyles[tone],
        className
      )}
    >
      <span className="flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">
        {icon}
      </span>
      <span className="whitespace-nowrap font-semibold">{label}</span>
    </div>
  );
}
