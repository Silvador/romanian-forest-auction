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
