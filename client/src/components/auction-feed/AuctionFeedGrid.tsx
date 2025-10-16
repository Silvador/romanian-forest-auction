import { motion, AnimatePresence } from "framer-motion";
import { AuctionCard } from "../AuctionCard";
import { Auction } from "@shared/schema";

interface AuctionFeedGridProps {
  auctions: Auction[];
}

export function AuctionFeedGrid({ auctions }: AuctionFeedGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      <AnimatePresence mode="popLayout">
        {auctions.map((auction, index) => (
          <motion.div
            key={auction.id}
            layout
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
          >
            <AuctionCard auction={auction} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Empty State */}
      {auctions.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="col-span-full flex flex-col items-center justify-center py-16 text-center"
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
