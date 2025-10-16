import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface WatchlistButtonProps {
  auctionId: string;
  size?: "sm" | "default" | "lg" | "icon";
  variant?: "default" | "ghost" | "outline";
}

export function WatchlistButton({ auctionId, size = "icon", variant = "ghost" }: WatchlistButtonProps) {
  const { userData } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get watchlist to check if this auction is in it
  const { data: watchlist } = useQuery<any[]>({
    queryKey: ["/api/watchlist"],
    enabled: userData?.role === "buyer",
  });

  const isInWatchlist = watchlist?.some((auction: any) => auction.id === auctionId) || false;

  // Add to watchlist mutation
  const addToWatchlist = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/watchlist", { auctionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Added to watchlist",
        description: "You can view this auction in your dashboard",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add to watchlist",
        variant: "destructive",
      });
    },
  });

  // Remove from watchlist mutation
  const removeFromWatchlist = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/watchlist/${auctionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Removed from watchlist",
        description: "Auction removed from your watchlist",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove from watchlist",
        variant: "destructive",
      });
    },
  });

  // Only show for buyers
  if (userData?.role !== "buyer") {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isInWatchlist) {
      removeFromWatchlist.mutate();
    } else {
      addToWatchlist.mutate();
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={addToWatchlist.isPending || removeFromWatchlist.isPending}
      className={`gap-2 ${isInWatchlist ? 'text-destructive hover:text-destructive' : ''}`}
      data-testid={`button-watchlist-${auctionId}`}
    >
      <Heart 
        className={`w-4 h-4 ${isInWatchlist ? 'fill-current' : ''}`}
        data-testid={`icon-watchlist-${isInWatchlist ? 'filled' : 'empty'}`}
      />
      {size !== "icon" && (isInWatchlist ? "Saved" : "Save")}
    </Button>
  );
}
