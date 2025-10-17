import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface UrgencyPulseProps {
  endTime: number;
  timeRemaining: string;
  urgencyLevel?: "normal" | "ending_soon" | "urgent";
}

export function UrgencyPulse({
  endTime,
  timeRemaining,
  urgencyLevel = "normal",
}: UrgencyPulseProps) {
  // Calculate urgency level if not provided
  const now = Date.now();
  const hoursRemaining = (endTime - now) / (1000 * 60 * 60);

  let calculatedUrgency = urgencyLevel;
  if (urgencyLevel === "normal") {
    if (hoursRemaining < 0.5) {
      // < 30 minutes
      calculatedUrgency = "urgent";
    } else if (hoursRemaining < 2) {
      // < 2 hours
      calculatedUrgency = "ending_soon";
    }
  }

  const urgencyStyles = {
    normal: "text-muted-foreground",
    ending_soon: "text-amber-600 dark:text-amber-400 countdown-ring",
    urgent: "text-red-600 dark:text-red-400 countdown-ring-fast",
  };

  const glowStyles = {
    normal: "",
    ending_soon: "glow-heat-medium",
    urgent: "glow-heat-high",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all duration-300",
        urgencyStyles[calculatedUrgency],
        glowStyles[calculatedUrgency],
        calculatedUrgency === "normal"
          ? "border-border/40 bg-muted/30"
          : calculatedUrgency === "ending_soon"
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-red-500/40 bg-red-600/15"
      )}
    >
      <Clock className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm font-bold tracking-tight whitespace-nowrap">
        {timeRemaining}
      </span>
    </div>
  );
}
