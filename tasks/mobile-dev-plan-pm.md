# RoForest Mobile App — Development Plan (PM Edition)
> Last updated: 2026-04-06
> Status: Design complete, development not started
> Stack: React Native + Expo + Firebase (same backend as web app)

---

## EXECUTIVE SUMMARY

Build a React Native mobile app for the Romanian Forest timber auction marketplace. The app connects to the existing web app backend (zero backend changes). 29 screens are designed in Pencil. The build is split into 6 sprints over ~4 weeks.

**Key metric:** First testable build (auction browsing + bidding) by end of Sprint 2 (~Day 8).

---

## WHAT EXISTS (starting assets)

| Asset | Location | Status |
|-------|----------|--------|
| Pencil designs (29 screens) | `design/RoForest.pen` + `design/exports/` | Complete |
| Design spec | `tasks/pencil-spec.md` | Complete |
| Design system tokens | `tasks/mobile-design-system.md` | Complete |
| Technical plan | `tasks/mobile-from-scratch-plan.md` | Complete |
| Design audit | `design/DESIGN-AUDIT.md` | Complete |
| Backend API (Express) | `server/routes.ts` (25+ endpoints) | Working |
| WebSocket (Socket.io) | `server/routes.ts` | Working |
| Firebase Auth | `silvador-mlp-marketplace-app` | Working |
| Shared TypeScript types | `shared/schema.ts` | Ready to copy |
| Test accounts | vlad.test2@silvador.ro / owner.test@silvador.ro | Active |

---

## SPRINT PLAN

### Sprint 1: Foundation (Days 1-3)
**Goal:** App launches, logs in, shows empty tab screens with correct theme.

| # | Task | Hours | Depends On | Acceptance Criteria |
|---|------|-------|------------|-------------------|
| 1.1 | Create Expo project (`npx create-expo-app silvador-mobile --template tabs`) | 0.5h | — | Project runs with `npx expo start` |
| 1.2 | Install dependencies (firebase, socket.io-client, react-query, reanimated, svg, gesture-handler, safe-area, date-fns) | 0.5h | 1.1 | All packages install without errors |
| 1.3 | Configure `app.json` (name: "RoForest", bundle: `ro.silvador.roforest`, scheme: `roforest`) | 0.25h | 1.1 | App name shows correctly |
| 1.4 | Set up Firebase (`lib/firebase.ts`) — copy config from web `.env` | 0.5h | 1.2 | Firebase initializes without errors |
| 1.5 | Create design system constants (`constants/colors.ts`, `constants/typography.ts`) | 1h | 1.1 | All `--rf-*` tokens available as JS constants |
| 1.6 | Copy shared types from `shared/schema.ts` to `types/index.ts` | 0.5h | 1.1 | TypeScript types compile |
| 1.7 | Copy species list (36) + regions (8) + increment ladder to `constants/` | 0.5h | 1.1 | All data constants available |
| 1.8 | Create API client (`lib/api.ts`) — fetch wrapper with Firebase token auth | 1h | 1.4 | Authenticated requests work |
| 1.9 | Create auth context (`hooks/useAuth.ts`) — Firebase auth state + token management | 1.5h | 1.4 | Login/logout works |
| 1.10 | Build root layout with auth gate (`app/_layout.tsx`) — redirect to login if no token | 1h | 1.9 | Unauthenticated users see login |
| 1.11 | Build tab bar layout (`app/(tabs)/_layout.tsx`) — 5 tabs: Licitații, Panou, Piata, Alerte, Profil | 1.5h | 1.5 | Tab bar renders with correct icons and colors |
| 1.12 | Build login screen (`app/(auth)/login.tsx`) — email + Google + Facebook | 2h | 1.8, 1.9 | Login with test account works |
| 1.13 | Test: Login with vlad.test2@silvador.ro on physical device | 0.5h | 1.12 | Token received, tabs visible |

**Sprint 1 deliverable:** App installs, authenticates with Firebase, shows themed tab bar.
**Sprint 1 total:** ~11.5 hours

**Design references:** Login (exports/iHpJa.png), Tab bar visible on all screen exports

---

### Sprint 2: Auction Feed + Detail (Days 4-8)
**Goal:** Users can browse auctions, view details, and place bids.

| # | Task | Hours | Depends On | Acceptance Criteria |
|---|------|-------|------------|-------------------|
| 2.1 | Build `useAuctions` hook — React Query, `GET /api/auctions/feed`, auto-refetch 30s | 1h | 1.8 | Feed data loads |
| 2.2 | Build AuctionCard component — title, species bar, species tags, metrics, price, progress time pill | 3h | 1.5, 2.1 | Card matches design/exports/Kn9Zf.png |
| 2.3 | Build auction feed screen (`app/(tabs)/index.tsx`) — header, search, filter pills, card list, pull-to-refresh | 3h | 2.2 | Feed scrolls, pull-to-refresh works |
| 2.4 | Build FilterSheet (bottom sheet) — species multi-select, region, price range, volume range, sort | 3h | 2.3 | Filters apply correctly |
| 2.5 | Build `useAuction` hook — single auction detail, `GET /api/auctions/:id` | 0.5h | 1.8 | Detail data loads |
| 2.6 | Build auction detail screen (`app/auction/[id].tsx`) — segmented burn ring, price block, bid banner, species section, quick bids, info grid | 4h | 2.5 | Screen matches design/exports/UR5Dd.png |
| 2.7 | Build SegmentedRing component — 24 segments, 3 color phases, burn edge glow | 2h | 1.5 | Ring renders correctly at all 3 states |
| 2.8 | Build BidModal (bottom sheet) — auction info, quick bids, proxy input, validation, submit | 3h | 2.5 | Bid places successfully via API |
| 2.9 | Build bid success + error states on BidModal | 1h | 2.8 | Success toast, error inline message |
| 2.10 | WebSocket: connect on app launch, subscribe to `watch:feed` room | 2h | 1.8 | Real-time price updates on feed cards |
| 2.11 | WebSocket: subscribe to `watch:auction` on detail page | 1h | 2.10 | Price flashes on new bids |
| 2.12 | Build watchlist toggle on cards + detail — `POST/DELETE /api/watchlist` | 1h | 2.3 | Heart icon toggles, persists |
| 2.13 | Test: Full flow — browse feed → tap card → view detail → place bid → see confirmation | 1h | All above | End-to-end bidding works |

**Sprint 2 deliverable:** Users can browse, filter, search auctions, view details, and place real bids.
**Sprint 2 total:** ~25.5 hours

**Design references:** Feed (Kn9Zf.png), Detail (UR5Dd.png), Bid Modal (BvkVK.png, WilLF.png, yNWM8.png), Warning state (tlcPw.png), Critical state (AF54k.png)

---

### Sprint 3: Dashboards + Notifications (Days 9-14)
**Goal:** Both user types have operational dashboards and receive notifications.

| # | Task | Hours | Depends On | Acceptance Criteria |
|---|------|-------|------------|-------------------|
| 3.1 | Build role detection — read `user.role` from auth context | 0.5h | 1.9 | Role available throughout app |
| 3.2 | Build Owner Dashboard (`app/(tabs)/dashboard.tsx`) — stats grid (with trends), sub-tabs (Active/Viitoare/Incheiate), auction list, FAB | 4h | 3.1 | Matches KNjAh.png |
| 3.3 | Build Buyer Dashboard (same file, conditional) — stats grid, tabs (Ofertele mele/Urmarire/Castigate), bid rows with outbid alert | 4h | 3.1 | Matches J7JVd.png |
| 3.4 | Build `useMyBids` hook — `GET /api/bids/my-bids` | 0.5h | 1.8 | User's bids load |
| 3.5 | Build `useWatchlist` hook — `GET /api/watchlist` | 0.5h | 1.8 | Watchlist loads |
| 3.6 | Build notification screen (`app/(tabs)/notifications.tsx`) — grouped by date (ASTAZI/IERI), notification cards, mark all read | 3h | 1.8 | Matches 5HRxB.png |
| 3.7 | Build notification badge on tab bar — unread count from API | 1h | 3.6 | Badge shows correct count |
| 3.8 | WebSocket: subscribe to `watch:dashboard`, refresh on updates | 1h | 2.10 | Dashboard refreshes on new bids |
| 3.9 | WebSocket: subscribe to `watch:notifications`, prepend new notifications | 1h | 2.10 | New notifications appear instantly |
| 3.10 | Test: Owner creates listing on web → sees it on mobile dashboard | 0.5h | 3.2 | Cross-platform sync works |
| 3.11 | Test: Buyer gets outbid → notification appears → taps to rebid | 0.5h | 3.6, 2.8 | Full outbid flow works |

**Sprint 3 deliverable:** Both dashboards functional, notifications working, real-time updates.
**Sprint 3 total:** ~16.5 hours

**Design references:** Owner (KNjAh.png), Buyer (J7JVd.png), Notifications (5HRxB.png)

---

### Sprint 4: Create Listing + Market Analytics (Days 15-20)
**Goal:** Sellers can create auctions, everyone can view market data.

| # | Task | Hours | Depends On | Acceptance Criteria |
|---|------|-------|------------|-------------------|
| 4.1 | Build create listing wizard (`app/create-listing.tsx`) — 6-step form with step indicator | 2h | 1.5 | Step navigation works |
| 4.2 | Step 1: Basic info — title, description, region dropdown, location, GPS auto-fill | 2h | 4.1 | Matches jYsrG.png |
| 4.3 | Step 2: Wood details — volume, starting price, species breakdown (dynamic list, auto-normalize to 100%) | 3h | 4.1 | Species percentages total 100% |
| 4.4 | Step 3: Scheduling — start time, duration presets, calculated end time | 2h | 4.1 | Valid datetime submitted |
| 4.5 | Step 4: APV document — camera/file picker, upload to Firebase Storage, OCR via `POST /api/ocr/extract-apv` | 3h | 4.1 | Document uploads, OCR extracts data |
| 4.6 | Step 5: Supporting documents — multi-file upload | 1.5h | 4.1 | Files upload to Storage |
| 4.7 | Step 6: Review & publish — summary cards, "Salveaza ciorna" + "Publica" | 2h | 4.1 | Auction appears in feed after publish |
| 4.8 | Build market analytics screen (`app/(tabs)/market.tsx`) — summary stats, price trend chart, species comparison cards | 4h | 1.8 | Matches VocEa.png |
| 4.9 | Build detailed analytics screen — regional bars, momentum strips, price alerts | 3h | 4.8 | Matches 1pRie.png |
| 4.10 | Test: Create listing on mobile → appears in web app feed | 1h | 4.7 | Cross-platform listing works |

**Sprint 4 deliverable:** Full listing creation + market analytics.
**Sprint 4 total:** ~23.5 hours

**Design references:** Create Listing (jYsrG.png), Analytics (VocEa.png), Detailed (1pRie.png)

---

### Sprint 5: Post-Auction + Profile + Onboarding (Days 21-25)
**Goal:** Deal completion flow, profile management, and onboarding for new users.

| # | Task | Hours | Depends On | Acceptance Criteria |
|---|------|-------|------------|-------------------|
| 5.1 | Build Deal: Seller Result screen — "Vandut!" hero, winner card, bid history, "Confirma vanzarea" | 3h | 3.2 | Matches xg1za.png |
| 5.2 | Build Deal: Buyer Result screen — "Felicitari!" hero, seller card, next steps, SUMAL reminder | 3h | 3.3 | Matches EkDP0.png |
| 5.3 | Build Deal: Contact Sheet (bottom sheet) — contact card, quick actions (call/email/copy), deal tracker | 2h | 5.1, 5.2 | Matches xt9zR.png |
| 5.4 | Build Profile screen (`app/(tabs)/profile.tsx`) — avatar, verified badges, completion checklist, settings, logout | 3h | 1.9 | Matches L5078.png |
| 5.5 | Build onboarding: Welcome + Role screen | 2h | 1.5 | Matches isDUj.png |
| 5.6 | Build onboarding: Auth screen (Google/Facebook/email) | 2h | 1.9 | Matches 4rQk3.png |
| 5.7 | Build onboarding: OTP screen (phone auth path) | 1.5h | 5.6 | Matches Wsd0d.png |
| 5.8 | Build onboarding: Display Name + Success screens | 1.5h | 5.6 | Matches huqw7.png, mrPpb.png |
| 5.9 | Build Register: Role Selection (3 cards with permission bullets) | 2h | 5.6 | Matches Dkfb7.png |
| 5.10 | Build forgot password screen | 1h | 1.9 | Matches NHRxs.png |
| 5.11 | Test: Full new user flow — welcome → register → browse → bid → win → contact seller | 1h | All above | Complete user journey works |

**Sprint 5 deliverable:** Post-auction deal flow, profile with completion checklist, full onboarding.
**Sprint 5 total:** ~22 hours

**Design references:** Deal flow (xg1za.png, EkDP0.png, xt9zR.png), Profile (L5078.png), Onboarding (isDUj.png through mrPpb.png), Register (Dkfb7.png)

---

### Sprint 6: Map + Polish + Ship (Days 26-30)
**Goal:** Map view, animations, offline support, app store ready.

| # | Task | Hours | Depends On | Acceptance Criteria |
|---|------|-------|------------|-------------------|
| 6.1 | Build Map View (`app/map.tsx`) — react-native-maps, colored pins, legend, popup card, "Licitatii langa mine" | 4h | 2.1 | Matches nD0yT.png |
| 6.2 | Implement Ember Cascade ring animation (React Native Reanimated) — segment burn flash, shimmer sweep, heartbeat pulse | 4h | 2.7 | Animation matches keyframe exports |
| 6.3 | Build progress time pill animations on feed cards | 1h | 2.2 | Pills animate smoothly |
| 6.4 | Implement haptic feedback system — light (taps), medium (bids), success (confirmations), warning (outbid) | 1h | 2.8 | Haptics fire correctly |
| 6.5 | Offline caching — React Query persistence, cached auctions banner | 2h | 2.1 | App shows cached data offline |
| 6.6 | Error boundaries — per-screen error fallback with retry | 1.5h | All | Errors show friendly Romanian message |
| 6.7 | Empty states — all lists have warm empty state with primary action | 2h | All | No blank screens anywhere |
| 6.8 | Performance — FlatList virtualization, image caching, lazy chart loading | 2h | All | Smooth 60fps scrolling |
| 6.9 | App icon + splash screen (forest/lime theme) | 1h | 1.3 | Branded launch experience |
| 6.10 | EAS Build config for iOS + Android | 1h | 1.3 | Builds succeed on both platforms |
| 6.11 | TestFlight / Internal testing track submission | 1h | 6.10 | Installable on test devices |
| 6.12 | Full QA pass — every screen, every flow, both roles | 3h | All | No blocking bugs |

**Sprint 6 deliverable:** Map view, polished animations, offline support, app store ready build.
**Sprint 6 total:** ~24 hours

**Design references:** Map (nD0yT.png), Animation keyframes (tKLjs.png, MeooX.png, ykcAP.png)

---

## TOTAL EFFORT SUMMARY

| Sprint | Focus | Hours | Days |
|--------|-------|-------|------|
| 1 | Foundation | 11.5h | 1-3 |
| 2 | Feed + Detail + Bidding | 25.5h | 4-8 |
| 3 | Dashboards + Notifications | 16.5h | 9-14 |
| 4 | Create Listing + Analytics | 23.5h | 15-20 |
| 5 | Deal Flow + Profile + Onboarding | 22h | 21-25 |
| 6 | Map + Polish + Ship | 24h | 26-30 |
| **Total** | | **123h** | **30 days** |

---

## MILESTONES (for PM tracking)

| Milestone | When | What to verify |
|-----------|------|----------------|
| **M1: App boots** | Day 3 | Login works, tab bar renders, theme correct |
| **M2: First bid** | Day 8 | Browse → detail → bid → confirmation — full flow |
| **M3: Both dashboards** | Day 14 | Seller sees listings, buyer sees bids, notifications arrive |
| **M4: Seller can list** | Day 20 | Create listing → appears in feed, analytics show data |
| **M5: Complete flows** | Day 25 | Win auction → see deal result → contact counterparty |
| **M6: Ship-ready** | Day 30 | TestFlight/Internal testing, no blocking bugs |

---

## RISK REGISTER

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Firebase auth issues on Android | High | Medium | Test on physical Android device by Day 3 |
| WebSocket drops in rural areas | High | High | Implement reconnect with exponential backoff + polling fallback |
| OCR endpoint slow on mobile | Medium | Medium | Show loading state, allow manual entry fallback |
| Expo build issues (native deps) | Medium | Low | Use managed workflow, avoid bare native modules |
| Map performance with many pins | Medium | Medium | Implement pin clustering above 50 pins |
| App Store rejection (missing privacy policy) | High | Medium | Create privacy policy URL before Sprint 6 |

---

## DAILY STANDUP TEMPLATE

```
Yesterday: [completed tasks by number, e.g., "2.1, 2.2, started 2.3"]
Today: [planned tasks]
Blockers: [any, or "none"]
Screenshot: [attached — current state of the screen being built]
```

---

## DEFINITION OF DONE (per task)

- [ ] Screen matches the Pencil export visually (side-by-side comparison)
- [ ] All text uses Romanian language
- [ ] All prices display in RON/m³
- [ ] Uses `$--rf-*` design tokens (no hardcoded colors)
- [ ] Works on both iOS and Android
- [ ] Dark theme only (no light mode for MVP)
- [ ] Handles loading state (skeleton or spinner)
- [ ] Handles error state (friendly message + retry)
- [ ] Tested with real API data (not mocks)

---

## HOW TO START (for next Claude session)

Say: **"Start building the RoForest mobile app — Sprint 1, Task 1.1"**

Claude has full context saved in memory:
- Project state, all file locations, design tokens
- Backend API endpoints, Firebase config
- Test accounts, design references
- Every spec document location

The first command will be:
```bash
cd ~/Desktop/romanian-forest-auction
npx create-expo-app silvador-mobile --template tabs
```
