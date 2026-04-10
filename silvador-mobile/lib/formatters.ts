import { formatDistanceToNow, format, differenceInSeconds } from 'date-fns';
import { ro } from 'date-fns/locale';

const PLACEHOLDER = '—';

function isValidNumber(n: unknown): n is number {
  return typeof n === 'number' && !isNaN(n) && isFinite(n);
}

// Price per m³: 185 → "185 RON/m³", 185.5 → "185,50 RON/m³"
// Whole numbers drop the decimals to match the Pencil designs.
export function formatPrice(price: number | null | undefined): string {
  if (!isValidNumber(price)) return PLACEHOLDER;
  const isWhole = Number.isInteger(price);
  return price.toLocaleString('ro-RO', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  }) + ' RON/m³';
}

// Total amount in RON: 185 → "185 RON", 185.50 → "185,50 RON"
export function formatRon(price: number | null | undefined): string {
  if (!isValidNumber(price)) return PLACEHOLDER;
  const isWhole = Number.isInteger(price);
  return price.toLocaleString('ro-RO', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  }) + ' RON';
}

// Backwards-compat alias — kept so older imports keep compiling.
// New code should use `formatRon`.
export const formatEuro = formatRon;

// Volume: 1520 → "1.520 m³"
export function formatVolume(volume: number | null | undefined): string {
  if (!isValidNumber(volume)) return PLACEHOLDER;
  return volume.toLocaleString('ro-RO') + ' m³';
}

// Percentage: 62.5 → "62,5%"
export function formatPercent(value: number | null | undefined): string {
  if (!isValidNumber(value)) return PLACEHOLDER;
  return value.toLocaleString('ro-RO', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }) + '%';
}

// Date: timestamp → "02 apr 2026"
export function formatDate(timestamp: number | null | undefined): string {
  if (!isValidNumber(timestamp)) return PLACEHOLDER;
  try {
    return format(new Date(timestamp), 'dd MMM yyyy', { locale: ro });
  } catch {
    return PLACEHOLDER;
  }
}

// Relative time: timestamp → "acum 5 minute"
export function formatRelative(timestamp: number | null | undefined): string {
  if (!isValidNumber(timestamp)) return PLACEHOLDER;
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ro });
  } catch {
    return PLACEHOLDER;
  }
}

// Countdown: seconds → "2h 14m 32s" or "14m 32s" or "32s"
export function formatCountdown(endTime: number | null | undefined): string {
  if (!isValidNumber(endTime)) return PLACEHOLDER;
  const now = Date.now();
  const totalSeconds = Math.max(0, differenceInSeconds(new Date(endTime), new Date(now)));

  if (totalSeconds <= 0) return 'Expirat';

  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}z ${hours}h`;          // e.g. "23z 4h"
  if (hours > 0) return `${hours}h ${minutes}m`;       // e.g. "3h 14m"
  if (minutes > 0) return `${minutes}m ${seconds}s`;   // e.g. "14m 32s"
  return `${seconds}s`;
}

// File size: bytes → "1.5 MB"
export function formatFileSize(bytes: number | null | undefined): string {
  if (!isValidNumber(bytes)) return PLACEHOLDER;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Bid count: 8 → "8 oferte"
export function formatBidCount(count: number | null | undefined): string {
  if (!isValidNumber(count) || count === 0) return 'Nicio oferta';
  if (count === 1) return '1 oferta';
  return `${count} oferte`;
}
