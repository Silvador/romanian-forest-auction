import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuickBidButtonProps {
  onClick: () => void;
  isEndingSoon?: boolean;
  disabled?: boolean;
}

export function QuickBidButton({ onClick, isEndingSoon = false, disabled = false }: QuickBidButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        disabled={disabled}
        className={`
          font-bold gap-1.5 
          ${isEndingSoon ? 'animate-pulse bg-primary hover:bg-primary/90' : ''}
        `}
        data-testid="button-quick-bid"
      >
        <Zap className="w-4 h-4" />
        {isEndingSoon ? 'BID NOW!' : 'Quick Bid'}
      </Button>
    </motion.div>
  );
}
