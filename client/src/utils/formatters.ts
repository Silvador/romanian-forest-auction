export function formatPrice(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
  }
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatVolume(volume: number): string {
  return `${volume.toLocaleString('ro-RO')} m³`;
}

export function formatPricePerM3(price: number | undefined | null): string {
  if (price === undefined || price === null || isNaN(price)) {
    return '0 €/m³';
  }
  return `${price.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €/m³`;
}

export function formatTimeRemaining(endTime: number): string {
  const now = Date.now();
  const diff = endTime - now;
  
  if (diff <= 0) return "Ended";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function isAuctionEndingSoon(endTime: number): boolean {
  const diff = endTime - Date.now();
  return diff > 0 && diff < 3600000; // Less than 1 hour
}

export function getRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export function getSpeciesColor(species: string): string {
  const colors: Record<string, string> = {
    Stejar: "hsl(30 80% 50%)",
    Fag: "hsl(45 70% 60%)",
    Molid: "hsl(120 40% 45%)",
    Paltin: "hsl(25 70% 55%)",
    Frasin: "hsl(40 65% 52%)",
  };
  return colors[species] || "hsl(var(--muted))";
}

// Comprehensive species color map for all Romanian timber species
export function getSpeciesColorMap(): Record<string, string> {
  return {
    // Hardwood species - Oak family (Browns/Tans)
    "Stejar pedunculat": "#8B4513", // Saddle brown
    "Stejar brumăriu": "#A0522D", // Sienna
    "Gorun": "#CD853F", // Peru
    "Cer": "#D2691E", // Chocolate

    // Beech (Light browns/Beige)
    "Fag": "#DEB887", // Burlywood

    // Hornbeam/Ash (Grays/Silver)
    "Carpen": "#708090", // Slate gray
    "Frasin": "#B8B8B8", // Light gray
    "Jugastru": "#A9A9A9", // Dark gray

    // Maple (Orange/Amber)
    "Paltin de câmp": "#FF8C00", // Dark orange
    "Paltin de munte": "#FFA500", // Orange

    // Linden (Yellow/Gold)
    "Tei argintiu": "#FFD700", // Gold
    "Tei cu frunze mari": "#F0E68C", // Khaki

    // Elm (Brown/Tan)
    "Ulm de câmp": "#BC8F8F", // Rosy brown
    "Ulm de munte": "#CD5C5C", // Indian red

    // Alder (Reddish)
    "Anin alb": "#F08080", // Light coral
    "Anin negru": "#CD5555", // Firebrick3

    // Birch (White/Cream)
    "Mesteacăn": "#F5F5DC", // Beige

    // Poplar (Light green/Yellow)
    "Plop tremurător": "#98FB98", // Pale green
    "Plop alb": "#F0FFF0", // Honeydew
    "Plop negru": "#90EE90", // Light green

    // Willow (Green/Yellow)
    "Salcie albă": "#ADFF2F", // Green yellow
    "Salcâm": "#9ACD32", // Yellow green

    // Fruit trees (Pink/Red)
    "Cireș sălbatic": "#FFB6C1", // Light pink
    "Măr sălbatic": "#FF69B4", // Hot pink
    "Păr sălbatic": "#FFC0CB", // Pink
    "Sorb de munte": "#DB7093", // Pale violet red

    // Walnut/Chestnut (Dark brown)
    "Nuc": "#654321", // Dark brown
    "Castanul": "#8B7355", // Burlywood4

    // Coniferous species (Greens)
    "Molid": "#228B22", // Forest green
    "Brad": "#2F4F2F", // Dark slate gray
    "Pin silvestru": "#556B2F", // Dark olive green
    "Pin negru": "#006400", // Dark green
    "Larice": "#32CD32", // Lime green
    "Zâmbru": "#3CB371", // Medium sea green
    "Tisă": "#2E8B57", // Sea green

    // Other
    "Altele": "#808080", // Gray

    // Default fallback
    "default": "#A0AEC0", // Neutral gray
  };
}

// Price change calculation and direction
export interface PriceChange {
  value: number; // Absolute change
  percentage: number; // Percentage change
  direction: "up" | "down" | "flat";
}

export function calculatePriceChange(
  startingPrice: number,
  currentPrice: number
): PriceChange {
  const value = currentPrice - startingPrice;
  const percentage = startingPrice > 0 ? (value / startingPrice) * 100 : 0;

  let direction: "up" | "down" | "flat" = "flat";
  if (Math.abs(percentage) < 0.01) {
    direction = "flat";
  } else if (value > 0) {
    direction = "up";
  } else {
    direction = "down";
  }

  return {
    value: Math.abs(value),
    percentage: Math.abs(percentage),
    direction,
  };
}

// Format trend with arrows and colors
export function formatTrend(change: PriceChange): {
  text: string;
  className: string;
  arrow: string;
} {
  if (change.direction === "flat") {
    return {
      text: "—",
      className: "text-muted-foreground",
      arrow: "—",
    };
  }

  const arrow = change.direction === "up" ? "▲" : "▼";
  const className = change.direction === "up"
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";
  const sign = change.direction === "up" ? "+" : "-";
  const text = `${sign}${change.percentage.toFixed(1)}%`;

  return {
    text,
    className,
    arrow,
  };
}

// Calculate auction heat score based on bid activity and time pressure
export function calculateHeat(
  bidCount: number,
  endTime: number
): "low" | "medium" | "high" {
  const now = Date.now();
  const hoursRemaining = (endTime - now) / (1000 * 60 * 60);

  // High heat: Many bids OR very close to ending
  if (bidCount > 10 || hoursRemaining < 2) {
    return "high";
  }

  // Medium heat: Moderate bids OR ending soon
  if (bidCount >= 5 || hoursRemaining < 12) {
    return "medium";
  }

  // Low heat: Few bids AND plenty of time
  return "low";
}
