import { Badge } from "@/components/ui/badge";

type AuctionStatus = "draft" | "upcoming" | "active" | "ended" | "sold" | "cancelled";

interface AuctionStatusBadgeProps {
  status: AuctionStatus;
}

export function AuctionStatusBadge({ status }: AuctionStatusBadgeProps) {
  const variants = {
    draft: { variant: "secondary" as const, label: "Draft" },
    upcoming: { variant: "secondary" as const, label: "Upcoming" },
    active: { variant: "default" as const, label: "Active" },
    ended: { variant: "outline" as const, label: "Ended" },
    sold: { variant: "outline" as const, label: "Sold" },
    cancelled: { variant: "destructive" as const, label: "Cancelled" },
  };

  const config = variants[status] || variants.active;

  return (
    <Badge variant={config.variant} data-testid={`badge-status-${status}`}>
      {config.label}
    </Badge>
  );
}
