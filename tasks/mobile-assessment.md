# Mobile Prototype Assessment & Dev Plan
> Date: 2026-04-02 | Author: Claude for Vlad

---

## 1. PROTOTYPE OVERVIEW

The mobile prototype at `/Users/vladvc/Downloads/romanianforest_clone.zip` is a **React Native + Expo** app (TypeScript), not a static mockup. It's a substantial codebase with:

- **10 screens** across 5 bottom tabs + auth + detail pages
- **Real API integration** patterns (WebSocket, SSE, REST)
- **Proxy bidding** with species-based increment ladders
- **Dark theme** with Electric Lime (#CCFF00) accent — Robinhood EU aesthetic
- **Full Romanian localization** (all UI strings in Romanian)
- **Native features**: haptics, push notifications, camera/file picker, safe areas

### Tech Stack
| Layer | Choice |
|-------|--------|
| Framework | React Native + Expo |
| Language | TypeScript |
| Routing | Expo Router (file-based) |
| State | React Context + React Query |
| Real-time | WebSocket + SSE fallback |
| Animations | React Native Reanimated |
| Storage | AsyncStorage |
| Icons | Ionicons + MaterialCommunityIcons |
| Fonts | Inter + Roboto Slab |

---

## 2. FEATURE COMPARISON: MOBILE vs WEB

### Legend
- **Y** = Present and functional
- **P** = Partial / mock data
- **N** = Missing entirely

| Feature | Web App | Mobile Prototype | Gap |
|---------|---------|-----------------|-----|
| **AUTH** | | | |
| Email/password login | Y | Y | -- |
| Role-based signup (buyer/owner) | Y | Y | -- |
| Firebase auth | Y | Y | -- |
| Forgot password | Y | Y | -- |
| **AUCTION FEED** | | | |
| Auction card list | Y | Y | -- |
| Status tabs (active/upcoming/ended) | Y | Y (4 tabs: All/Active/Upcoming/Ended) | Mobile has extra "All" tab |
| Search (title, county, region, species) | Y | Y | -- |
| Filter: species (multi-select) | Y (35+ species) | Y (12 species) | **Mobile has fewer species** |
| Filter: region | Y (8 regions) | Y (8 regions) | -- |
| Filter: county (cascading) | Y | Y | -- |
| Filter: price range | Y | Y | -- |
| Filter: volume range | Y | Y | -- |
| Filter: diameter range | Y | N | **Missing on mobile** |
| Filter: treatment type | Y | N | **Missing on mobile** |
| Sort options | Y (4) | Y (5) | Mobile has extra "Largest Volume" |
| Grid/List view toggle | Y | N (list only) | Minor |
| Live countdown timer | Y | Y (animated ring) | Mobile is better |
| Heat ring urgency | Y | Y (countdown ring) | -- |
| Quick bid button on card | Y | N | **Missing on mobile** |
| Watchlist toggle on card | Y | Y | -- |
| Live pulse on active auctions | Y | Y | -- |
| Market snapshot (when <4 auctions) | Y | N | Minor |
| Pull-to-refresh | N/A (web) | Y | Mobile-native |
| Skeleton loading | Y | Y | -- |
| **AUCTION DETAIL** | | | |
| Countdown timer | Y | Y (animated ring) | -- |
| Current price display | Y | Y | -- |
| Bid count | Y | Y | -- |
| Species breakdown | Y | Y | -- |
| Volume display | Y | Y | -- |
| GPS coordinates | Y | Y | -- |
| Status badge | Y | Y | -- |
| Place bid button | Y | Y | -- |
| Quick bid buttons (1x/3x/5x) | Y | Y (1x/2x/4x) | Slightly different multipliers |
| Bid status banner (leading/outbid) | Y | Y (animated) | Mobile is better |
| Buffer gauge (proxy safety) | N | Y | **Mobile has extra feature** |
| Data freshness indicator | N | Y (Live/Updating/Stale) | **Mobile has extra feature** |
| Bid history tab | Y (table) | Y (ranked list) | -- |
| Documents tab | Y | Y | -- |
| Forest tab (species detail) | N (inline) | Y (dedicated tab) | Mobile better organized |
| APV technical data (expandable) | Y | Y | -- |
| Real-time price flash | Y | Y | -- |
| Soft-close notification | Y | Y | -- |
| Share button | N | Y | **Mobile has extra** |
| **BIDDING** | | | |
| Proxy bidding (max bid) | Y | Y | -- |
| Species-based increment ladder | Y | Y (22 species) | -- |
| Bid validation (min amount) | Y | Y | -- |
| Total value calculation | Y | Y | -- |
| Haptic feedback on bid | N/A | Y | Mobile-native |
| **DASHBOARD** | | | |
| Forest owner: my auctions list | Y | Y | -- |
| Forest owner: performance stats | Y (4 cards) | Y (4 cards) | -- |
| Forest owner: edit/delete auction | Y | Y | -- |
| Buyer: active bids tab | Y | N | **Missing on mobile** |
| Buyer: watchlist tab | Y | N | **Missing on mobile** |
| Buyer: won auctions tab | Y | N | **Missing on mobile** |
| Buyer: stats (bids, wins, volume) | Y (4 cards) | N | **Missing on mobile** |
| **MARKET ANALYTICS** | | | |
| Price trends by species (line chart) | Y | Y (SVG area chart) | -- |
| Volume by species (bar chart) | Y | P (region volume) | Different focus |
| Avg price by region (bar chart) | Y | N | **Missing** |
| Diameter distribution (histogram) | Y | N | **Missing** |
| Treatment type breakdown (donut) | Y | N | **Missing** |
| Volume vs price scatter | Y | N | **Missing** |
| Seasonal trends | Y | N | **Missing** |
| Filter presets (save/load) | Y | N | **Missing** |
| Price alerts | Y | N | **Missing** |
| **CREATE LISTING** | | | |
| Multi-step form | Y (6 steps) | Y (4-step form) | Mobile simpler |
| APV OCR extraction | Y (Claude vision) | P (mock) | **OCR is mock on mobile** |
| Document upload to GCS | Y | Y (presigned URL) | -- |
| Save as draft | Y | P | -- |
| Species breakdown editor | Y (auto-normalize) | Y | -- |
| **NOTIFICATIONS** | | | |
| Notification list | Y | Y | -- |
| 5 notification types | Y | Y (8 types) | Mobile has more types |
| Unread badge count | Y | Y | -- |
| Mark all as read | Y | N | **Missing** |
| Push notifications | N (web) | Y (expo-notifications) | Mobile-native |
| Deep linking from notification | N | Y | Mobile-native |
| **PROFILE** | | | |
| Edit name | Y | Y | -- |
| Change password | Y | Y | -- |
| KYC status display | Y | Y | -- |
| Theme toggle | N | Y | **Mobile has extra** |
| Language toggle | N | Y (ro/en) | **Mobile has extra** |
| **REAL-TIME** | | | |
| WebSocket connection | Y | Y | -- |
| Room-based subscriptions | Y | Y | -- |
| Reconnect/fallback | Y (polling) | Y (SSE fallback) | -- |
| **LANDING PAGE** | | | |
| Marketing landing with phone mockups | Y (7 iterations) | N | N/A for mobile app |

---

## 3. ASSESSMENT SUMMARY

### What the Mobile Prototype Does Well
1. **Design polish** — Dark theme with consistent color system, smooth animations, haptic feedback. Feels native.
2. **Bidding UX** — Buffer gauge, animated bid status banners, countdown rings are *better* than the web app.
3. **Romanian-first** — All strings in Romanian with proper locale formatting.
4. **Real-time architecture** — WebSocket + SSE hybrid is well-designed for auction latency needs.
5. **Data freshness indicator** — Shows Live/Updating/Stale status. Smart for auctions.
6. **Notification system** — 8 notification types with push support, deep linking, haptics.

### Critical Gaps (Must Fix)
1. **No buyer dashboard** — Buyers can't see their active bids, won auctions, or watchlist in one place. This is the #1 missing feature.
2. **Market analytics are skeletal** — Web has 7 chart types; mobile has 1 (price evolution). Missing: regional pricing, diameter distribution, scatter plot, treatment breakdown.
3. **APV OCR is mock** — The listing creation flow pretends to extract data but doesn't actually call Claude vision. This is core to the forest owner workflow.
4. **Species list incomplete** — 12 vs 35+ on web. Romanian forestry has many species; buyers filter by them.
5. **No "Mark all as read"** on notifications.
6. **No filter presets or price alerts** — Phase 3 features from web are absent.
7. **No Quick Bid on feed cards** — Web has this; reduces friction for active bidders.

### Nice-to-Have Gaps (Lower Priority)
- No grid/list view toggle (list-only is fine for mobile)
- No diameter/treatment filters (power-user features)
- No market snapshot on feed (web-specific layout)
- Landing page N/A for mobile

### Mobile-Only Wins (Keep These)
- Buffer gauge on auction detail
- Data freshness indicator
- Theme toggle (dark/light)
- Language toggle (ro/en)
- Share button
- Haptic feedback throughout
- Pull-to-refresh
- Push notifications + deep linking

---

## 4. DEV PLAN

### Phase 1: Data Parity (Week 1-2)
> Goal: Mobile shows the same data the web does.

- [ ] **1.1 Sync species list** — Update `ALL_SPECIES` from 12 to 35+ to match web's species options
- [ ] **1.2 Add diameter & treatment type filters** — Add to FilterPanel modal
- [ ] **1.3 Connect APV OCR to real endpoint** — Replace mock with `POST /api/ocr/extract-apv` (Claude vision). This is the most important backend integration.
- [ ] **1.4 Validate all API endpoints match** — Ensure mobile hits the same REST endpoints as web (auction feed, bids, notifications, watchlist, market analytics). Document any mismatches.

### Phase 2: Buyer Dashboard (Week 2-3)
> Goal: Buyers have a complete dashboard, not just the owner view.

- [ ] **2.1 Active Bids tab** — Show auctions where user has placed bids, with status (leading/outbid), current price, max proxy, time remaining
- [ ] **2.2 Watchlist tab** — Show saved auctions with quick-bid action
- [ ] **2.3 Won Auctions tab** — Show completed auctions user won, with final price and date
- [ ] **2.4 Buyer stats cards** — Active bids count, auctions won, volume purchased (m3), avg price paid (EUR/m3)
- [ ] **2.5 Role-based dashboard routing** — Detect `user.role` and show owner vs buyer dashboard layout (like web does)

### Phase 3: Market Analytics (Week 3-4)
> Goal: Mobile analytics match web's depth.

- [ ] **3.1 Average price by region** — Horizontal bar chart (fits mobile well)
- [ ] **3.2 Volume by species** — Bar chart
- [ ] **3.3 Species demand index** — Already stubbed, connect to real data
- [ ] **3.4 Diameter distribution** — Histogram or grouped bars
- [ ] **3.5 Treatment type breakdown** — Donut chart
- [ ] **3.6 Add date range filter** — 7d / 30d / 90d / 1y / All toggle for analytics
- [ ] **3.7 Price alerts** — Create/manage alerts for species/region thresholds with push notification trigger
- [ ] **3.8 Filter presets** — Save/load named filter combinations

### Phase 4: UX Polish (Week 4-5)
> Goal: Close the remaining gaps and leverage mobile-native advantages.

- [ ] **4.1 Quick Bid on feed cards** — Add inline quick-bid button like web has
- [ ] **4.2 Mark all notifications as read** — One-tap button
- [ ] **4.3 Auction creation: full 6-step flow** — Align with web's 6 steps (currently 4). Add: APV document step, supporting docs step, review & publish step.
- [ ] **4.4 Offline-first patterns** — Cache last-viewed auctions for poor connectivity in rural/forest areas (this is a mobile-specific advantage worth building)
- [ ] **4.5 GPS integration** — Use device GPS to auto-fill location when creating listing (forest owners are often on-site)
- [ ] **4.6 Map view for auctions** — Pin auctions on a map by GPS coordinates. Unique mobile advantage with native maps.

### Phase 5: Shared Backend Alignment (Week 5-6)
> Goal: One backend serves both web and mobile identically.

- [ ] **5.1 API contract validation** — Write integration tests that both web and mobile clients pass against the same endpoints
- [ ] **5.2 WebSocket event parity** — Ensure mobile subscribes to all the same room events as web
- [ ] **5.3 Push notification server** — Add FCM/APNS push from the backend (currently web uses in-app only; mobile needs server-triggered push)
- [ ] **5.4 Shared types package** — Extract TypeScript types (Auction, Bid, User, Notification) into a shared package used by both web and mobile

---

## 5. PRIORITY MATRIX

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Buyer dashboard (Phase 2) | **HIGH** — buyers are half your users | Medium (3-5 days) | **P0** |
| Real APV OCR (1.3) | **HIGH** — core owner workflow | Low (1 day, endpoint exists) | **P0** |
| Species list sync (1.1) | **HIGH** — data correctness | Low (1 hour) | **P0** |
| Market analytics depth (Phase 3) | **MEDIUM** — differentiator | Medium (5-7 days) | **P1** |
| Quick bid on cards (4.1) | **MEDIUM** — reduces bidding friction | Low (half day) | **P1** |
| Offline caching (4.4) | **MEDIUM** — rural forest use case | Medium (2-3 days) | **P1** |
| Map view (4.6) | **MEDIUM** — unique mobile play | Medium (2-3 days) | **P2** |
| Price alerts (3.7) | **LOW** — power user feature | Medium (2 days) | **P2** |
| Filter presets (3.8) | **LOW** — power user feature | Low (1 day) | **P2** |
| Shared types package (5.4) | **LOW** — dev quality | Low (1 day) | **P2** |

---

## 6. DECISION NEEDED

**Architecture question:** The mobile prototype has its own context/state layer that mirrors but doesn't share code with the web app. Two paths:

**Option A: Keep separate codebases**
- Mobile = React Native/Expo, Web = React/Vite
- Shared types package for data contracts
- Both hit same Firebase backend
- Pros: Each platform optimized independently, mobile gets native features
- Cons: Feature drift (like we're seeing now), double maintenance

**Option B: Converge on Expo (web + mobile)**
- Expo supports web builds — could replace the Vite web app
- Shared components where possible, platform-specific where needed
- Pros: One codebase, one team, features ship to both platforms simultaneously
- Cons: Web UX may regress (Expo web is good but not as flexible as pure React), migration effort

**Recommendation:** Option A for now. The web app has significant desktop-specific design work (sidebar nav, two-column auction detail) that would be painful to replicate in Expo web. Keep them separate but enforce parity through:
1. Shared TypeScript types package
2. Same Firebase backend
3. This feature comparison doc as a living checklist
