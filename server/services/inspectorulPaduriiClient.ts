/**
 * Inspectorul Pădurii API client
 * Wraps the public Romanian forestry registry API with typed DTOs and robust error handling.
 */

const IP_BASE = 'https://inspectorulpadurii.ro';
const REQUEST_TIMEOUT_MS = 10_000;
const INTER_CALL_DELAY_MS = 500;

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface PublicLocationDTO {
  nr: string;
  lat: number;
  lng: number;
  codStare: number | null;
  emiteAvize: boolean | null;
  fire?: unknown;
}

export interface PublicDetailDTO {
  nr: string;
  denumire?: string;         // APV name
  ocol?: string;             // Forest management company
  judet?: string;            // County name
  ua?: string;               // U.A. location (may contain "58A; 58A" duplicates)
  up?: string;               // U.P. number
  stare?: string;            // 'Autorizat' | 'Predat' | etc.
  codStare?: number;
  emiteAvize?: boolean;
  volumInitial?: number;
  volumActual?: number;      // current volume (after partial harvest)
  tratament?: string;        // treatment type
  natura?: string;           // natura produs
  rampePrimare?: Array<{ lat: number; lng: number }>;
  exploatari?: Array<{
    dataInceput?: string;
    dataSfarsit?: string;
    [key: string]: unknown;
  }>;
  lat?: number;
  lng?: number;
  [key: string]: unknown;   // allow unknown fields from API
}

// ─── Error types ─────────────────────────────────────────────────────────────

export type IpErrorKind =
  | 'timeout'
  | '5xx'
  | 'malformed_response'
  | 'empty_inconsistent_response'
  | 'not_found';

export class IpApiError extends Error {
  constructor(public kind: IpErrorKind, message: string) {
    super(message);
    this.name = 'IpApiError';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new IpApiError('timeout', `Request timed out after ${REQUEST_TIMEOUT_MS}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Query the IP location endpoint for a given APV number.
 * Returns null for not-found (empty array / missing coordinates).
 * Throws IpApiError for provider errors that should be retried.
 */
export async function getApvLocation(apvNumber: string): Promise<PublicLocationDTO | null> {
  const url = `${IP_BASE}/api/apv/web/locations?numarApv=${encodeURIComponent(apvNumber)}`;
  console.log(`[IP-CLIENT] GET location apv=${apvNumber}`);

  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch (err) {
    if (err instanceof IpApiError) throw err;
    throw new IpApiError('timeout', `Network error fetching location for ${apvNumber}: ${err}`);
  }

  console.log(`[IP-CLIENT] Location response status=${res.status} apv=${apvNumber}`);

  if (res.status === 404) return null;
  if (res.status >= 500) {
    throw new IpApiError('5xx', `IP API returned ${res.status} for location apv=${apvNumber}`);
  }
  if (!res.ok) {
    // 4xx other than 404 → treat as not found (API sometimes returns 400 for unknown APVs)
    return null;
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new IpApiError('malformed_response', `Could not parse location JSON for apv=${apvNumber}`);
  }

  // API returns either an array of records (old format) or a single columnar object
  // where each field is an array: {"nr":["..."],"lat":[45.4],"lng":[25.5],...}
  let record: any;
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    record = data[0];
  } else if (data && typeof data === 'object' && ('lat' in data || 'nr' in data)) {
    // Columnar format — unwrap first element of each array field
    const col = data as any;
    const rawLat = Array.isArray(col.lat) ? col.lat[0] : col.lat;
    const rawLng = Array.isArray(col.lng) ? col.lng[0] : col.lng;
    if (rawLat == null || rawLng == null) return null;
    record = {
      nr: Array.isArray(col.nr) ? col.nr[0] : col.nr,
      lat: rawLat,
      lng: rawLng,
      codStare: Array.isArray(col.codStare) ? col.codStare[0] : col.codStare,
      emiteAvize: Array.isArray(col.emiteAvize) ? col.emiteAvize[0] : col.emiteAvize,
      fire: Array.isArray(col.fire) ? col.fire[0] : col.fire,
    };
  } else {
    return null;
  }

  // Guard: if record has no coordinates, treat as not_found
  if (record.lat == null || record.lng == null) return null;

  const lat = parseFloat(record.lat);
  const lng = parseFloat(record.lng);
  if (isNaN(lat) || isNaN(lng)) return null;

  return {
    nr: String(record.nr ?? apvNumber),
    lat,
    lng,
    codStare: record.codStare != null ? Number(record.codStare) : null,
    emiteAvize: record.emiteAvize != null ? Boolean(record.emiteAvize) : null,
    fire: record.fire,
  };
}

/**
 * Query the IP detail endpoint for full APV metadata.
 * Returns null if the APV is not found.
 * Throws IpApiError for provider errors that should be retried.
 */
export async function getApvDetail(apvNumber: string): Promise<PublicDetailDTO | null> {
  // Always add the delay between location and detail calls
  await delay(INTER_CALL_DELAY_MS);

  const url = `${IP_BASE}/api/apv/${encodeURIComponent(apvNumber)}`;
  console.log(`[IP-CLIENT] GET detail apv=${apvNumber}`);

  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch (err) {
    if (err instanceof IpApiError) throw err;
    throw new IpApiError('timeout', `Network error fetching detail for ${apvNumber}: ${err}`);
  }

  console.log(`[IP-CLIENT] Detail response status=${res.status} apv=${apvNumber}`);

  if (res.status === 404) return null;
  if (res.status >= 500) {
    throw new IpApiError('5xx', `IP API returned ${res.status} for detail apv=${apvNumber}`);
  }
  if (!res.ok) return null;

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new IpApiError('malformed_response', `Could not parse detail JSON for apv=${apvNumber}`);
  }

  if (!data || typeof data !== 'object') return null;

  // Normalize field name differences between API versions:
  // numar → nr  |  naturaProdus → natura  |  volum → volumActual  |  up coerced to string
  const raw = data as any;
  return {
    ...raw,
    nr: raw.nr ?? raw.numar,
    volumActual: raw.volumActual ?? raw.volum ?? undefined,
    natura: raw.natura ?? raw.naturaProdus ?? undefined,
    up: raw.up != null ? String(raw.up) : undefined,
  } as PublicDetailDTO;
}
