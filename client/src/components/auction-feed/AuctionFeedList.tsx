import { motion, AnimatePresence } from "framer-motion";
import { AuctionRow } from "./AuctionRow";
import { useLocation } from "wouter";
import { Auction } from "@shared/schema";

interface AuctionFeedListProps {
  auctions: Auction[];
}

export function AuctionFeedList({ auctions }: AuctionFeedListProps) {
  const [, setLocation] = useLocation();

  const handleAuctionClick = (auctionId: string) => {
    setLocation(`/auction/${auctionId}`);
  };

  return (
    <div className="flex flex-col">
      {/* Header Row */}
      <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-border bg-muted/30 sticky top-0 z-10">
        <div className="col-span-4 text-xs font-semibold text-muted-foreground uppercase">
          Auction
        </div>
        <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">
          Price/m³
        </div>
        <div className="col-span-2 text-xs font-semibold text-muted-foreground uppercase">
          Total Value
        </div>
        <div className="col-span-1 text-xs font-semibold text-muted-foreground uppercase text-center">
          Bids
        </div>
        <div className="col-span-3 text-xs font-semibold text-muted-foreground uppercase text-right">
          Time Left
        </div>
      </div>

      {/* Auction Rows */}
      <AnimatePresence mode="popLayout">
        {auctions.map((auction) => (
          <AuctionRow
            key={auction.id}
            auction={auction}
            onClick={() => handleAuctionClick(auction.id)}
          />
        ))}
      </AnimatePresence>

      {/* Empty State */}
      {auctions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <p className="text-lg text-muted-foreground">No auctions available</p>
          <p className="text-sm text-muted-foreground mt-2">
            Check back soon for new timber listings
          </p>
        </motion.div>
      )}
    </div>
  );
}
