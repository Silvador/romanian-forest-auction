import { cn } from "@/lib/utils";

interface StatusDotProps {
  status?: "live" | "upcoming" | "ended";
  size?: number; // Size in pixels, default 8
  className?: string;
}

export function StatusDot({
  status = "live",
  size = 8,
  className,
}: StatusDotProps) {
  // Status color mapping (Bloomberg/TradingView style)
  const statusStyles = {
    live: "bg-positive status-pulse",
    upcoming: "bg-caution animate-pulse-soft",
    ended: "bg-muted-foreground/40", // Muted gray for ended (no animation)
  };

  const statusLabels = {
    live: "Live auction",
    upcoming: "Starting soon",
    ended: "Auction ended",
  };

  return (
    <div
      className={cn("rounded-full", statusStyles[status], className)}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
      aria-label={statusLabels[status]}
      title={statusLabels[status]}
    />
  );
}
