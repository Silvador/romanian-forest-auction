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
    positive: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
    negative: "bg-red-500/10 text-red-400 border border-red-500/30",
    urgent: "bg-red-600/20 text-red-300 border border-red-500/40 animate-pulse-soft",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-200",
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
