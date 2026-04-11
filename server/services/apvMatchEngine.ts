/**
 * APV Match Engine
 * Compares OCR-extracted APV data against the public Inspectorul Pădurii API data.
 * Uses a two-group scoring model: core identity (gate + required checks) + corroboration.
 */

import type { PublicDetailDTO } from './inspectorulPaduriiClient';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CheckResult = 'match' | 'mismatch' | 'unknown';

export interface ValidationCheck {
  result: CheckResult;
  ocrValue: string | null;
  publicValue: string | null;
  points: number;
}

export interface MatchResult {
  gatePass: boolean;           // APV number exact match
  coreIdentityScore: number;   // max 60 (ocol +20, UA +20, volume +20)
  corroborationScore: number;  // max 40 (name +15, treatment +10, natura +10, UP +5)
  totalScore: number;
  classification: 'auto_accepted' | 'review_required' | 'hard_fail';
  checks: Record<string, ValidationCheck>;
  confidenceDowngraded: boolean; // true if OCR confidence forced a downgrade
}

export interface OcrData {
  permitCode?: string;          // 13-digit SUMAL code (primary lookup key)
  forestCompany?: string;       // ocol name
  uaLocation?: string;          // U.A.
  upLocation?: string;          // U.P.
  grossVolume?: number;
  netVolume?: number;
  treatmentType?: string;
  productType?: string;
  permitNumber?: string;        // short APV name/denomination
  ocrConfidence?: 'high' | 'medium' | 'low';
  apvWorkflowStatus?: string;   // raw OCR value — normalized to ApvWorkflowStatus enum in resolver
}

// ─── Normalization ────────────────────────────────────────────────────────────

const STRIP_PREFIXES = [
  'asociatia ocolul silvic',
  'ocolul silvic',
  'asociatia os',
  'o.s.',
  'os ',
];

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove diacritics
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeUA(s: string): string {
  // IP API sometimes returns "58A; 58A" (duplicate). Take first token.
  const first = s.split(';')[0] ?? s;
  return normalizeText(first).replace(/\s/g, '');
}

function normalizeOcol(s: string): string {
  let v = normalizeText(s);
  for (const prefix of STRIP_PREFIXES) {
    if (v.startsWith(prefix)) {
      v = v.slice(prefix.length).trim();
      break;
    }
  }
  return v;
}

function normalizeTreatment(s: string): string {
  // Bucket into broad categories to survive OCR/formatting variation
  const v = normalizeText(s);
  if (v.includes('raritu')) return 'rarituri';
  if (v.includes('curati')) return 'curatiri';
  if (v.includes('degajar')) return 'degajari';
  if (v.includes('taiere') || v.includes('taierei')) return 'taierea';
  if (v.includes('igieniz')) return 'igienizare';
  return v;
}

function normalizeNatura(s: string): string {
  const v = normalizeText(s);
  if (v.includes('principal')) return 'principale';
  if (v.includes('secundar')) return 'secundare';
  if (v.includes('accident')) return 'accidentale';
  return v;
}

// ─── Token-based fuzzy match ──────────────────────────────────────────────────

function tokenOverlap(a: string, b: string): number {
  const tokA = normalizeText(a).split(/\s+/).filter(Boolean);
  const tokBSet = new Set(normalizeText(b).split(/\s+/).filter(Boolean));
  const shared = tokA.filter(t => tokBSet.has(t)).length;
  const denom = Math.max(tokA.length, tokBSet.size);
  return denom === 0 ? 0 : shared / denom;
}

// ─── Volume comparison ────────────────────────────────────────────────────────

function volumeMatch(ocrVol: number, pubVol: number): boolean {
  if (pubVol === 0) return ocrVol === 0;
  const relativeDiff = Math.abs(ocrVol - pubVol) / pubVol;
  const absoluteDiff = Math.abs(ocrVol - pubVol);
  return relativeDiff <= 0.01 || absoluteDiff <= 0.5; // 1% relative OR ≤0.5mc
}

// ─── Core comparison ─────────────────────────────────────────────────────────

export function compareApvData(ocrData: OcrData, publicDetail: PublicDetailDTO): MatchResult {
  const checks: Record<string, ValidationCheck> = {};
  const confidence = ocrData.ocrConfidence ?? 'medium';

  // ── Gate: APV number exact match ──────────────────────────────────────────
  const apvNr = publicDetail.nr ?? '';
  const ocrCode = ocrData.permitCode ?? '';
  const gatePass = ocrCode.replace(/\s/g, '') === apvNr.replace(/\s/g, '') && ocrCode.length > 0;

  checks['apvNumber'] = {
    result: ocrCode.length === 0 ? 'unknown' : (gatePass ? 'match' : 'mismatch'),
    ocrValue: ocrCode || null,
    publicValue: apvNr || null,
    points: gatePass ? 0 : 0, // gate doesn't add points — it's a pass/fail guard
  };

  if (!gatePass) {
    return {
      gatePass: false,
      coreIdentityScore: 0,
      corroborationScore: 0,
      totalScore: 0,
      classification: 'hard_fail',
      checks,
      confidenceDowngraded: false,
    };
  }

  // ── Core identity checks ──────────────────────────────────────────────────

  let coreScore = 0;

  // Ocol (forest company) — +20
  const ocrOcol = ocrData.forestCompany;
  const pubOcol = publicDetail.ocol;
  if (!ocrOcol || !pubOcol || confidence === 'low') {
    checks['ocol'] = { result: 'unknown', ocrValue: ocrOcol ?? null, publicValue: pubOcol ?? null, points: 0 };
  } else {
    const match = normalizeOcol(ocrOcol) === normalizeOcol(pubOcol);
    checks['ocol'] = { result: match ? 'match' : 'mismatch', ocrValue: ocrOcol, publicValue: pubOcol, points: match ? 20 : 0 };
    if (match) coreScore += 20;
  }

  // UA location — +20
  const ocrUA = ocrData.uaLocation;
  const pubUA = publicDetail.ua;
  if (!ocrUA || !pubUA || confidence === 'low') {
    checks['ua'] = { result: 'unknown', ocrValue: ocrUA ?? null, publicValue: pubUA ?? null, points: 0 };
  } else {
    const match = normalizeUA(ocrUA) === normalizeUA(pubUA);
    checks['ua'] = { result: match ? 'match' : 'mismatch', ocrValue: ocrUA, publicValue: pubUA, points: match ? 20 : 0 };
    if (match) coreScore += 20;
  }

  // Volume — +20 (use grossVolume, fall back to netVolume)
  const ocrVol = ocrData.grossVolume ?? ocrData.netVolume;
  const pubVol = publicDetail.volumInitial ?? publicDetail.volumActual;
  if (ocrVol == null || pubVol == null || confidence === 'low') {
    checks['volume'] = {
      result: 'unknown',
      ocrValue: ocrVol != null ? String(ocrVol) : null,
      publicValue: pubVol != null ? String(pubVol) : null,
      points: 0,
    };
  } else {
    const match = volumeMatch(ocrVol, pubVol);
    checks['volume'] = {
      result: match ? 'match' : 'mismatch',
      ocrValue: String(ocrVol),
      publicValue: String(pubVol),
      points: match ? 20 : 0,
    };
    if (match) coreScore += 20;
  }

  // ── Corroboration checks ──────────────────────────────────────────────────

  let corrobScore = 0;

  // APV name fuzzy match — +15 (≥85% token overlap)
  const ocrName = ocrData.permitNumber;
  const pubName = publicDetail.denumire;
  if (!ocrName || !pubName) {
    checks['name'] = { result: 'unknown', ocrValue: ocrName ?? null, publicValue: pubName ?? null, points: 0 };
  } else {
    const overlap = tokenOverlap(ocrName, pubName);
    const match = overlap >= 0.85;
    checks['name'] = { result: match ? 'match' : 'mismatch', ocrValue: ocrName, publicValue: pubName, points: match ? 15 : 0 };
    if (match) corrobScore += 15;
  }

  // Treatment type — +10
  const ocrTreatment = ocrData.treatmentType;
  const pubTreatment = publicDetail.tratament;
  if (!ocrTreatment || !pubTreatment) {
    checks['treatment'] = { result: 'unknown', ocrValue: ocrTreatment ?? null, publicValue: pubTreatment ?? null, points: 0 };
  } else {
    const match = normalizeTreatment(ocrTreatment) === normalizeTreatment(pubTreatment);
    checks['treatment'] = { result: match ? 'match' : 'mismatch', ocrValue: ocrTreatment, publicValue: pubTreatment, points: match ? 10 : 0 };
    if (match) corrobScore += 10;
  }

  // Natura produs — +10
  const ocrNatura = ocrData.productType;
  const pubNatura = publicDetail.natura;
  if (!ocrNatura || !pubNatura) {
    checks['natura'] = { result: 'unknown', ocrValue: ocrNatura ?? null, publicValue: pubNatura ?? null, points: 0 };
  } else {
    const match = normalizeNatura(ocrNatura) === normalizeNatura(pubNatura);
    checks['natura'] = { result: match ? 'match' : 'mismatch', ocrValue: ocrNatura, publicValue: pubNatura, points: match ? 10 : 0 };
    if (match) corrobScore += 10;
  }

  // UP bonus — +5
  const ocrUP = ocrData.upLocation;
  const pubUP = publicDetail.up;
  if (!ocrUP || !pubUP) {
    checks['up'] = { result: 'unknown', ocrValue: ocrUP ?? null, publicValue: pubUP ?? null, points: 0 };
  } else {
    const match = normalizeText(ocrUP) === normalizeText(pubUP);
    checks['up'] = { result: match ? 'match' : 'mismatch', ocrValue: ocrUP, publicValue: pubUP, points: match ? 5 : 0 };
    if (match) corrobScore += 5;
  }

  // ── Classification ────────────────────────────────────────────────────────

  const totalScore = coreScore + corrobScore;
  let classification: MatchResult['classification'];

  if (coreScore >= 40) {
    classification = 'auto_accepted'; // ≥2 of 3 core checks pass
  } else if (coreScore >= 20) {
    classification = 'review_required'; // 1 of 3 core checks passes
  } else {
    classification = 'hard_fail'; // 0 core checks pass
  }

  // Confidence downgrade: low APV number confidence → cap at review_required
  let confidenceDowngraded = false;
  if (confidence === 'low' && classification === 'auto_accepted') {
    classification = 'review_required';
    confidenceDowngraded = true;
  }

  return {
    gatePass,
    coreIdentityScore: coreScore,
    corroborationScore: corrobScore,
    totalScore,
    classification,
    checks,
    confidenceDowngraded,
  };
}
