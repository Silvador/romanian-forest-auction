import { useState } from "react";
import { motion } from "framer-motion";
import { LayoutGrid, LayoutList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuctionFeedList } from "./AuctionFeedList";
import { AuctionFeedGrid } from "./AuctionFeedGrid";
import { Auction } from "@shared/schema";

type ViewMode = "list" | "grid";

interface DualViewAuctionFeedProps {
  auctions: Auction[];
}

export function DualViewAuctionFeed({ auctions }: DualViewAuctionFeedProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const toggleView = () => {
    setViewMode(prev => prev === "list" ? "grid" : "list");
  };

  return (
    <div className="flex flex-col h-full">
      {/* View Toggle Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">
            Live Timber Auctions
          </h2>
          <span className="text-sm text-muted-foreground">
            {auctions.length} {auctions.length === 1 ? 'auction' : 'auctions'}
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={toggleView}
          className="gap-2 font-semibold"
          data-testid="button-toggle-view"
        >
          <motion.div
            key={viewMode}
            initial={{ rotate: 180, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {viewMode === "list" ? (
              <LayoutGrid className="w-4 h-4" />
            ) : (
              <LayoutList className="w-4 h-4" />
            )}
          </motion.div>
          <span className="hidden sm:inline">
            {viewMode === "list" ? "Grid View" : "List View"}
          </span>
        </Button>
      </div>

      {/* Feed Content with Transition */}
      <motion.div
        key={viewMode}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className="flex-1 overflow-auto"
      >
        {viewMode === "list" ? (
          <AuctionFeedList auctions={auctions} />
        ) : (
          <AuctionFeedGrid auctions={auctions} />
        )}
      </motion.div>
    </div>
  );
}
