/**
 * APV Geolocation Resolver
 * Orchestrates: OCR data → Inspectorul Pădurii lookup → match validation → eligibility policy → Firestore persistence
 *
 * Always creates an apvGeolocations document for every resolution attempt,
 * including not_found and provider_error outcomes.
 */

import admin from 'firebase-admin';
import { getApvLocation, getApvDetail, IpApiError, PublicDetailDTO } from './inspectorulPaduriiClient';
import { compareApvData, OcrData, MatchResult } from './apvMatchEngine';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LocationResolutionStatus =
  | 'idle'
  | 'resolving'
  | 'auto_accepted'
  | 'review_required'
  | 'hard_fail'
  | 'not_found'
  | 'provider_error'
  | 'recheck_scheduled';

export type NotFoundSubtype = 'index_lag' | 'internal_state' | 'parse_risk' | 'unknown';
// Note: 'workflow_mode' is retired — ocolul-name heuristic is now an audit hint only (heuristicFlags)

export type OperationalStatus =
  | 'mapped_only'
  | 'harvest_prepared'
  | 'harvest_active_or_enabled'
  | 'withdrawn'    // RETRAS
  | 'historical'   // ISTORIC
  | 'unknown';

// ─── APV workflow status vocabulary ──────────────────────────────────────────

export type ApvWorkflowStatus =
  | 'CULES' | 'VERIFICAT' | 'APROBAT' | 'AUTORIZAT'
  | 'PREGATIT_PENTRU_PREDARE' | 'PREDAT'
  | 'PREGATIT_PENTRU_REPRIMIRE' | 'REPRIMIT'
  | 'RETRAS' | 'ISTORIC' | 'UNKNOWN';

const STATUS_SYNONYMS: Record<string, ApvWorkflowStatus> = {
  'cules': 'CULES', 'verificat': 'VERIFICAT', 'aprobat': 'APROBAT',
  'autorizat': 'AUTORIZAT',
  'pregatit pentru predare': 'PREGATIT_PENTRU_PREDARE',
  'pregatit_pentru_predare': 'PREGATIT_PENTRU_PREDARE',
  'predat': 'PREDAT',
  'pregatit pentru reprimire': 'PREGATIT_PENTRU_REPRIMIRE',
  'pregatit_pentru_reprimire': 'PREGATIT_PENTRU_REPRIMIRE',
  'reprimit': 'REPRIMIT', 'retras': 'RETRAS', 'istoric': 'ISTORIC',
};

function normalizeWorkflowStatus(raw: string | undefined | null): ApvWorkflowStatus {
  if (!raw) return 'UNKNOWN';
  const key = raw
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();
  return STATUS_SYNONYMS[key] ?? 'UNKNOWN';
}

export type ListingEligibility =
  | 'eligible'
  | 'eligible_with_warning'
  | 'review_before_publish'
  | 'blocked_by_admin';

export interface FullResolutionResult {
  // Layer 1: Location identity
  locationResolutionStatus: LocationResolutionStatus;
  notFoundSubtype: NotFoundSubtype | null;
  matchScore: number;
  matchChecks: Record<string, { result: string; ocrValue: string | null; publicValue: string | null; points: number }>;

  // Layer 2: Public operational data
  operationalStatus: OperationalStatus;

  // Layer 3: Marketplace policy
  listingEligibility: ListingEligibility;
  eligibilityReasons: string[];
  policyBasis: string[];

  // Geometry
  publicApvPoint: { lat: number; lng: number } | null;
  primaryRampPoints: Array<{ lat: number; lng: number }> | null;
  county: string | null;

  // Reference
  geolocationDocId: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(dateStr: string): number {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
}

interface NotFoundClassification {
  subtype: NotFoundSubtype;
  heuristicFlags: string[]; // low-confidence signals stored for audit only — do not drive business logic
}

function classifyNotFound(parsedOcr: OcrData, issueDate?: string): NotFoundClassification {
  if (parsedOcr.ocrConfidence === 'low') {
    return { subtype: 'parse_risk', heuristicFlags: [] };
  }

  // Strong evidence: explicit APV workflow status extracted from document
  const docStatus = normalizeWorkflowStatus(parsedOcr.apvWorkflowStatus);
  if (docStatus === 'CULES' || docStatus === 'VERIFICAT') {
    return { subtype: 'internal_state', heuristicFlags: [] };
  }

  if (issueDate && daysSince(issueDate) < 14) {
    return { subtype: 'index_lag', heuristicFlags: [] };
  }

  // Weak heuristic: ocolul name contains 'CULES' — advisory only, does not change subtype
  const ocolName = parsedOcr.forestCompany ?? '';
  const heuristicFlags = ocolName.toUpperCase().includes('CULES') ? ['ocol_name_cules'] : [];

  return { subtype: 'unknown', heuristicFlags };
}

// ─── Operational status decision table ───────────────────────────────────────

function assessOperationalStatus(detail: PublicDetailDTO): OperationalStatus {
  const codStare = detail.codStare;
  const emiteAvize = detail.emiteAvize ?? false;
  const volInitial = detail.volumInitial ?? 0;
  const volActual = detail.volumActual ?? volInitial;
  const volDelta = volInitial - volActual;
  const hasVolDelta = volDelta > 1;

  // Check if any exploitation window is currently active
  const now = Date.now();
  const hasActiveWindow = (detail.exploatari ?? []).some((e: any) => {
    if (!e.dataInceput || !e.dataSfarsit) return false;
    const start = new Date(e.dataInceput).getTime();
    const end = new Date(e.dataSfarsit).getTime();
    return now >= start && now <= end;
  });

  // Explicit state checks first (normalizeWorkflowStatus handles diacritics + casing)
  const normalizedStare = normalizeWorkflowStatus(detail.stare);
  if (normalizedStare === 'RETRAS') return 'withdrawn';
  if (normalizedStare === 'ISTORIC') return 'historical';

  if (codStare === 4) {
    // Autorizat
    if (!emiteAvize) return 'mapped_only';
    return 'harvest_prepared';
  }
  if (codStare === 5) {
    // Predat
    if (emiteAvize || hasActiveWindow || hasVolDelta) return 'harvest_active_or_enabled';
    return 'harvest_prepared';
  }
  return 'unknown';
}

// ─── Marketplace risk/eligibility engine ─────────────────────────────────────

interface EligibilityResult {
  listingEligibility: ListingEligibility;
  eligibilityReasons: string[];
  policyBasis: string[];
}

const SAFE_STATES = new Set([4]); // Autorizat

function assessEligibility(detail: PublicDetailDTO): EligibilityResult {
  // Direct-return branches for clearly exceptional states (business rules stable across threshold changes)
  const normalizedStare = normalizeWorkflowStatus(detail.stare);

  if (normalizedStare === 'RETRAS') {
    return {
      listingEligibility: 'review_before_publish',
      eligibilityReasons: ['APV retras — listarea necesită verificare manuală'],
      policyBasis: ['apv_withdrawn'],
    };
  }
  if (normalizedStare === 'ISTORIC') {
    return {
      listingEligibility: 'review_before_publish',
      eligibilityReasons: ['APV în stare Istorică — posibil inactiv'],
      policyBasis: ['apv_historical'],
    };
  }
  if (normalizedStare === 'REPRIMIT' || normalizedStare === 'PREGATIT_PENTRU_REPRIMIRE') {
    return {
      listingEligibility: 'review_before_publish',
      eligibilityReasons: ['APV reprimit sau pregătit pentru reprimire — stare neobișnuită'],
      policyBasis: ['apv_returned_state'],
    };
  }

  // Risk-accumulation scoring for all other states
  let risk = 0;
  const reasons: string[] = [];
  const policyBasis: string[] = [];

  const emiteAvize = detail.emiteAvize ?? false;
  const codStare = detail.codStare;
  const volInitial = detail.volumInitial ?? 0;
  const volActual = detail.volumActual ?? volInitial;
  const volDelta = volInitial - volActual;

  const now = Date.now();
  const hasActiveWindow = (detail.exploatari ?? []).some((e: any) => {
    if (!e.dataInceput || !e.dataSfarsit) return false;
    const start = new Date(e.dataInceput).getTime();
    const end = new Date(e.dataSfarsit).getTime();
    return now >= start && now <= end;
  });

  if (emiteAvize) {
    risk += 2;
    reasons.push('APV emite avize de transport active');
    policyBasis.push('avize_active');
  }

  if (volDelta > 1) {
    risk += 3;
    reasons.push(`Volum redus cu ${volDelta.toFixed(1)} mc față de cel inițial`);
    policyBasis.push('volume_delta_detected');
  }

  if (normalizedStare === 'PREDAT') {
    risk += 1;
    reasons.push('APV în stare Predat');
    policyBasis.push('apv_in_handover_state');
  }

  if (codStare != null && !SAFE_STATES.has(codStare)) {
    risk += 1;
    reasons.push(`Cod stare necunoscut: ${codStare}`);
    policyBasis.push('unknown_status_code');
  }

  if (hasActiveWindow) {
    risk += 1;
    reasons.push('Fereastră de exploatare activă');
    policyBasis.push('harvest_window_open');
  }

  let listingEligibility: ListingEligibility;
  if (risk === 0) {
    listingEligibility = 'eligible';
  } else if (risk <= 2) {
    listingEligibility = 'eligible_with_warning';
  } else {
    listingEligibility = 'review_before_publish';
  }

  return { listingEligibility, eligibilityReasons: reasons, policyBasis };
}

// ─── Firestore persistence ────────────────────────────────────────────────────

async function persistGeolocationDoc(
  db: admin.firestore.Firestore,
  auctionId: string,
  apvNumber: string,
  locationStatus: LocationResolutionStatus,
  notFoundSubtype: NotFoundSubtype | null,
  matchResult: MatchResult | null,
  eligibility: EligibilityResult,
  opStatus: OperationalStatus,
  publicApvPoint: { lat: number; lng: number } | null,
  primaryRampPoints: Array<{ lat: number; lng: number }> | null,
  county: string | null,
  locationSnapshot: unknown,
  detailSnapshot: unknown,
  retryConfig: {
    retryReason?: string;
    nextRetryAt?: admin.firestore.Timestamp | null;
    retryExpiresAt?: admin.firestore.Timestamp | null;
    maxRetries?: number | null;
  },
  ocrConfidence: 'high' | 'medium' | 'low' | null,
  auditMeta: {
    previousRetryCount: number;
    heuristicFlags: string[];
    rawWorkflowStatus: string | null;
  } = { previousRetryCount: 0, heuristicFlags: [], rawWorkflowStatus: null },
): Promise<string> {
  const now = admin.firestore.Timestamp.now();
  const freshUntil = admin.firestore.Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000);

  const isTerminalWithLocation = ['auto_accepted', 'review_required'].includes(locationStatus);
  const locationReviewRequired = locationStatus === 'review_required';
  const policyReviewRequired = eligibility.listingEligibility === 'review_before_publish';

  // Check if a previous active doc exists — if so, deactivate it.
  // Query only by auctionId (single-field, no composite index needed), filter isActive in JS.
  const existingQuery = await db.collection('apvGeolocations')
    .where('auctionId', '==', auctionId)
    .get();

  let version = 1;
  const batch = db.batch();

  for (const existingDoc of existingQuery.docs) {
    const existingData = existingDoc.data();
    if (!existingData.isActive) continue;
    version = Math.max(version, (existingData.version ?? 0) + 1);
    batch.update(existingDoc.ref, { isActive: false });
  }

  const newDocRef = db.collection('apvGeolocations').doc();

  const reviewInputs = matchResult ? {
    extractedFields: Object.fromEntries(
      Object.entries(matchResult.checks).map(([k, v]) => [k, v.ocrValue ?? ''])
    ),
    publicFields: Object.fromEntries(
      Object.entries(matchResult.checks).map(([k, v]) => [k, v.publicValue ?? ''])
    ),
    scoreBreakdown: Object.fromEntries(
      Object.entries(matchResult.checks).map(([k, v]) => [k, v.points])
    ),
  } : null;

  const docData: Record<string, unknown> = {
    // Identity
    auctionId,
    apvNumber,
    isActive: true,
    version,

    // Layer 1: Location evidence
    locationResolutionStatus: locationStatus,
    notFoundSubtype,
    matchScore: matchResult?.totalScore ?? 0,
    matchClassification: matchResult?.classification ?? locationStatus,
    validationChecks: matchResult?.checks
      ? Object.fromEntries(
          Object.entries(matchResult.checks).map(([k, v]) => [k, v.result === 'match'])
        )
      : {},
    ocrConfidenceSummary: ocrConfidence,
    publicLocationSnapshot: locationSnapshot ?? null,
    publicDetailSnapshot: detailSnapshot ?? null,

    // Layer 2: Operational
    apvStatus: (detailSnapshot as any)?.stare ?? null,
    apvStatusCode: (detailSnapshot as any)?.codStare ?? null,
    emiteAvize: (detailSnapshot as any)?.emiteAvize ?? null,
    volumInitial: (detailSnapshot as any)?.volumInitial ?? null,
    volumCurrent: (detailSnapshot as any)?.volumActual ?? null,
    exploatari: (detailSnapshot as any)?.exploatari ?? null,
    operationalStatus: opStatus,

    // Layer 3: Policy
    listingEligibility: eligibility.listingEligibility,
    eligibilityReasons: eligibility.eligibilityReasons,
    policyBasis: eligibility.policyBasis,
    eligibilityConfidence: 'determined',
    sellerConfirmedRights: false,
    sellerAttestation: null,

    // Geometry
    publicApvPoint,
    primaryRampPoints,
    county,

    // Workflow status audit layer (document evidence, not public registry outcome)
    documentWorkflowStatusRaw: auditMeta.rawWorkflowStatus,
    normalizedWorkflowStatus: normalizeWorkflowStatus(auditMeta.rawWorkflowStatus ?? undefined),
    documentVisibilityExpectation: (() => {
      const s = normalizeWorkflowStatus(auditMeta.rawWorkflowStatus ?? undefined);
      if (s === 'CULES') return 'not_expected';
      if (s === 'VERIFICAT') return 'likely_not_expected';
      if (s === 'ISTORIC') return 'historical';
      if (['APROBAT','AUTORIZAT','PREGATIT_PENTRU_PREDARE','PREDAT','REPRIMIT','RETRAS'].includes(s)) return 'expected';
      return 'unknown';
    })(),
    heuristicFlags: auditMeta.heuristicFlags,

    // Operational resilience
    retrievedAt: now,
    savedAt: now,
    dataFreshUntil: isTerminalWithLocation ? freshUntil : null,
    resolutionAttemptCount: auditMeta.previousRetryCount + 1,
    resolutionLastError: null,
    retryCount: auditMeta.previousRetryCount + 1,
    retryReason: retryConfig.retryReason ?? null,
    nextRetryAt: retryConfig.nextRetryAt ?? null,
    retryExpiresAt: retryConfig.retryExpiresAt ?? null,
    maxRetries: retryConfig.maxRetries ?? null,

    // Review queue flags
    locationReviewRequired,
    policyReviewRequired,

    // Review data (pre-populated for reviewers)
    review: locationReviewRequired
      ? {
          reviewReason: `Match score ${matchResult?.totalScore ?? 0}/100 — core identity score ${matchResult?.coreIdentityScore ?? 0}/60`,
          reviewInputs,
          reviewRecommendation: null,
          reviewDecision: null,
          overrideJustification: null,
          reviewedBy: null,
          reviewedAt: null,
          reviewNotes: null,
        }
      : null,
  };

  batch.set(newDocRef, docData);
  await batch.commit();

  return newDocRef.id;
}

// ─── Retry scheduling helpers ─────────────────────────────────────────────────

type RetryConfig = {
  retryReason: string;
  nextRetryAt: admin.firestore.Timestamp;
  retryExpiresAt: admin.firestore.Timestamp;
  maxRetries: number;
};

function scheduleRetry(
  reason: 'provider_error' | 'index_lag' | 'internal_state',
  opts: { issueDate?: string; previousRetryCount?: number } = {},
): RetryConfig {
  const T = admin.firestore.Timestamp;
  const D = Date.now;

  if (reason === 'index_lag' && opts.issueDate) {
    const issuedAt = new Date(opts.issueDate).getTime();
    const firstWindowMs = issuedAt + 14 * 24 * 60 * 60 * 1000;
    const expiryMs = issuedAt + 60 * 24 * 60 * 60 * 1000; // issueDate + 60d

    // Fix: after day 14 passes, follow-up retries use 7d from now — not from issueDate
    // This prevents the schedule collapsing to now+60s on subsequent retries.
    const isFirstAttempt = (opts.previousRetryCount ?? 0) === 0;
    const nextRetryMs = (isFirstAttempt && firstWindowMs > D())
      ? firstWindowMs
      : D() + 7 * 24 * 60 * 60 * 1000; // 7d from now on all follow-ups

    return {
      retryReason: 'index_lag',
      nextRetryAt: T.fromMillis(nextRetryMs),
      retryExpiresAt: T.fromMillis(expiryMs),
      maxRetries: 4,
    };
  }

  if (reason === 'internal_state') {
    // APV in CULES/VERIFICAT — retry weekly for up to 42 days
    return {
      retryReason: 'internal_state',
      nextRetryAt: T.fromMillis(D() + 7 * 24 * 60 * 60 * 1000),
      retryExpiresAt: T.fromMillis(D() + 42 * 24 * 60 * 60 * 1000),
      maxRetries: 6,
    };
  }

  // provider_error: 1h retry, 24h expiry
  return {
    retryReason: 'provider_error',
    nextRetryAt: T.fromMillis(D() + 60 * 60 * 1000),
    retryExpiresAt: T.fromMillis(D() + 24 * 60 * 60 * 1000),
    maxRetries: 3,
  };
}

// ─── Main resolver ────────────────────────────────────────────────────────────
//
// Precedence rule: public registry data always wins for current visibility.
// documentWorkflowStatus is stored as evidence only and is only consulted in classifyNotFound()
// when locationDTO === null (public lookup returned nothing). If the public API returns a record,
// it proceeds normally regardless of OCR-extracted workflow status.

export async function resolveApvGeolocation(
  db: admin.firestore.Firestore,
  auctionId: string,
  ocrData: OcrData,
  issueDate?: string,
  opts: { previousRetryCount?: number } = {},
): Promise<FullResolutionResult> {
  const apvNumber = ocrData.permitCode?.replace(/\s/g, '') ?? '';
  const ocrConfidence = ocrData.ocrConfidence ?? 'medium';
  const previousRetryCount = opts.previousRetryCount ?? 0;
  const rawWorkflowStatus = ocrData.apvWorkflowStatus ?? null;

  // 1. Validate APV number present
  if (!apvNumber) {
    const subtype: NotFoundSubtype = 'parse_risk';
    const eligibility = { listingEligibility: 'eligible_with_warning' as ListingEligibility, eligibilityReasons: ['APV nu a putut fi extras din document'], policyBasis: ['missing_apv_number'] };

    const docId = await persistGeolocationDoc(
      db, auctionId, '', 'not_found', subtype, null,
      eligibility, 'unknown', null, null, null, null, null,
      {}, ocrConfidence,
      { previousRetryCount, heuristicFlags: [], rawWorkflowStatus },
    );

    return {
      locationResolutionStatus: 'not_found',
      notFoundSubtype: subtype,
      matchScore: 0,
      matchChecks: {},
      operationalStatus: 'unknown',
      ...eligibility,
      publicApvPoint: null,
      primaryRampPoints: null,
      county: null,
      geolocationDocId: docId,
    };
  }

  // 2. Call location endpoint (with inline retry: 3× with backoff 1s, 4s, 16s)
  let locationDTO = null;
  let locationError: IpApiError | null = null;
  const backoffMs = [1000, 4000, 16000];

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      locationDTO = await getApvLocation(apvNumber);
      locationError = null;
      break;
    } catch (err) {
      if (err instanceof IpApiError && (err.kind === 'timeout' || err.kind === '5xx' || err.kind === 'malformed_response')) {
        locationError = err;
        console.warn(`[RESOLVER] Location attempt ${attempt + 1} failed: ${err.message}`);
        if (attempt < 2) await new Promise(r => setTimeout(r, backoffMs[attempt]));
      } else {
        throw err;
      }
    }
  }

  if (locationError) {
    const retryConfig = scheduleRetry('provider_error');
    const eligibility = { listingEligibility: 'eligible' as ListingEligibility, eligibilityReasons: [], policyBasis: [] };
    const docId = await persistGeolocationDoc(
      db, auctionId, apvNumber, 'provider_error', null, null,
      eligibility, 'unknown', null, null, null, null, null,
      retryConfig, ocrConfidence,
      { previousRetryCount, heuristicFlags: [], rawWorkflowStatus },
    );
    return {
      locationResolutionStatus: 'provider_error',
      notFoundSubtype: null,
      matchScore: 0,
      matchChecks: {},
      operationalStatus: 'unknown',
      ...eligibility,
      publicApvPoint: null,
      primaryRampPoints: null,
      county: null,
      geolocationDocId: docId,
    };
  }

  // 3. Handle not_found
  if (!locationDTO) {
    const { subtype, heuristicFlags } = classifyNotFound(ocrData, issueDate);
    const retryConfig =
      subtype === 'index_lag'    ? scheduleRetry('index_lag', { issueDate, previousRetryCount })
      : subtype === 'internal_state' ? scheduleRetry('internal_state')
      : {};
    const eligibility = { listingEligibility: 'eligible' as ListingEligibility, eligibilityReasons: [], policyBasis: [] };

    const docId = await persistGeolocationDoc(
      db, auctionId, apvNumber, 'not_found', subtype, null,
      eligibility, 'unknown', null, null, null, null, null,
      retryConfig, ocrConfidence,
      { previousRetryCount, heuristicFlags, rawWorkflowStatus },
    );

    return {
      locationResolutionStatus: 'not_found',
      notFoundSubtype: subtype,
      matchScore: 0,
      matchChecks: {},
      operationalStatus: 'unknown',
      ...eligibility,
      publicApvPoint: null,
      primaryRampPoints: null,
      county: null,
      geolocationDocId: docId,
    };
  }

  const publicApvPoint = { lat: locationDTO.lat, lng: locationDTO.lng };
  const locationSnapshot = locationDTO;

  // 4. Call detail endpoint (with inline retry)
  let detailDTO: PublicDetailDTO | null = null;
  let detailError: IpApiError | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      detailDTO = await getApvDetail(apvNumber);
      detailError = null;
      break;
    } catch (err) {
      if (err instanceof IpApiError && (err.kind === 'timeout' || err.kind === '5xx' || err.kind === 'malformed_response')) {
        detailError = err;
        console.warn(`[RESOLVER] Detail attempt ${attempt + 1} failed: ${err.message}`);
        if (attempt < 2) await new Promise(r => setTimeout(r, backoffMs[attempt]));
      } else {
        throw err;
      }
    }
  }

  if (detailError || !detailDTO) {
    const retryConfig = scheduleRetry('provider_error');
    const eligibility = { listingEligibility: 'eligible' as ListingEligibility, eligibilityReasons: [], policyBasis: [] };
    const docId = await persistGeolocationDoc(
      db, auctionId, apvNumber, 'provider_error', null, null,
      eligibility, 'unknown', publicApvPoint, null, null, locationSnapshot, null,
      retryConfig, ocrConfidence,
      { previousRetryCount, heuristicFlags: [], rawWorkflowStatus },
    );
    return {
      locationResolutionStatus: 'provider_error',
      notFoundSubtype: null,
      matchScore: 0,
      matchChecks: {},
      operationalStatus: 'unknown',
      ...eligibility,
      publicApvPoint,
      primaryRampPoints: null,
      county: null,
      geolocationDocId: docId,
    };
  }

  // Enrich detailDTO with codStare/emiteAvize from location response if not present
  if (detailDTO.codStare == null && locationDTO.codStare != null) {
    detailDTO.codStare = locationDTO.codStare;
  }
  if (detailDTO.emiteAvize == null && locationDTO.emiteAvize != null) {
    detailDTO.emiteAvize = locationDTO.emiteAvize;
  }

  // 5. Run match engine
  const matchResult = compareApvData(ocrData, detailDTO);

  // 6. Map match classification to locationResolutionStatus
  const locationStatus: LocationResolutionStatus =
    matchResult.classification === 'auto_accepted' ? 'auto_accepted'
    : matchResult.classification === 'review_required' ? 'review_required'
    : 'hard_fail';

  // 7. Assess operational status and eligibility
  const opStatus = assessOperationalStatus(detailDTO);
  const eligibility = assessEligibility(detailDTO);

  // Extract ramp points
  const ramps = (detailDTO.rampePrimare ?? []).filter(
    (r: any) => r.lat != null && r.lng != null
  ).map((r: any) => ({ lat: Number(r.lat), lng: Number(r.lng) }));

  const county = detailDTO.judet ?? null;

  // 8. Persist
  const docId = await persistGeolocationDoc(
    db, auctionId, apvNumber, locationStatus, null,
    matchResult, eligibility, opStatus,
    publicApvPoint, ramps.length > 0 ? ramps : null, county,
    locationSnapshot, detailDTO,
    {}, ocrConfidence,
    { previousRetryCount, heuristicFlags: [], rawWorkflowStatus },
  );

  // 9. If auto_accepted, update auction document with public point
  if (locationStatus === 'auto_accepted') {
    try {
      await db.collection('auctions').doc(auctionId).update({
        publicApvPoint,
        gpsCoordinates: publicApvPoint,   // populates AuctionMap and auction detail screen
        displayLocationSource: 'public_apv_point',
        apvLocationResolutionStatus: locationStatus,
        apvListingEligibility: eligibility.listingEligibility,
        apvGeolocationId: docId,
        resolutionLockId: admin.firestore.FieldValue.delete(),
        apvResolutionStartedAt: admin.firestore.FieldValue.delete(),
      });
    } catch (err) {
      console.error('[RESOLVER] Failed to update auction after auto_accept:', err);
    }
  } else {
    try {
      await db.collection('auctions').doc(auctionId).update({
        apvLocationResolutionStatus: locationStatus,
        apvListingEligibility: eligibility.listingEligibility,
        apvGeolocationId: docId,
        resolutionLockId: admin.firestore.FieldValue.delete(),
        apvResolutionStartedAt: admin.firestore.FieldValue.delete(),
      });
    } catch (err) {
      console.error('[RESOLVER] Failed to update auction status:', err);
    }
  }

  return {
    locationResolutionStatus: locationStatus,
    notFoundSubtype: null,
    matchScore: matchResult.totalScore,
    matchChecks: matchResult.checks,
    operationalStatus: opStatus,
    ...eligibility,
    publicApvPoint: locationStatus !== 'hard_fail' ? publicApvPoint : null,
    primaryRampPoints: ramps.length > 0 ? ramps : null,
    county,
    geolocationDocId: docId,
  };
}
