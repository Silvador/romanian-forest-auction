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
    ending_soon: "text-caution countdown-ring",
    urgent: "text-negative countdown-ring-fast",
  };

  const glowStyles = {
    normal: "",
    ending_soon: "glow-heat-medium",
    urgent: "glow-heat-high",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors duration-300",
        urgencyStyles[calculatedUrgency],
        glowStyles[calculatedUrgency],
        calculatedUrgency === "normal"
          ? "border-border/40 bg-muted/30"
          : calculatedUrgency === "ending_soon"
          ? "border-caution/40 bg-caution/10"
          : "border-negative/40 bg-negative/15"
      )}
    >
      <Clock className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="text-sm font-bold tracking-tight whitespace-nowrap" aria-live="polite" aria-label={`Time remaining: ${timeRemaining}`}>
        {timeRemaining}
      </span>
    </div>
  );
}
