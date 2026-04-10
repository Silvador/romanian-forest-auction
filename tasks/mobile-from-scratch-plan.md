# Mobile App — From-Scratch Dev Plan
> Based on the existing Romanian Forest Auction web app backend
> Date: 2026-04-02

---

## ARCHITECTURE DECISION

### Stack: React Native + Expo (managed workflow)

**Why Expo:**
- File-based routing (Expo Router) — same mental model as the web app's page structure
- Firebase SDK works natively (auth, Firestore, Storage)
- Push notifications via expo-notifications (FCM + APNS)
- OTA updates without App Store review (expo-updates)
- Camera, file picker, location, haptics — all built-in
- Web build possible later if needed

**Why NOT Flutter/Swift/Kotlin:**
- Team already knows TypeScript from the web app
- Shared types package between web and mobile
- Firebase integrations are identical
- 90% of the UI logic ports directly

### Backend: Zero changes needed
The mobile app connects to the **exact same backend** the web app uses:
- REST API (Express) — all 25+ endpoints
- WebSocket (Socket.io) — all real-time events  
- Firebase Auth — same project, same user accounts
- Firestore — same collections
- Firebase Storage — same document bucket

**One user account works on both web and mobile.** A forest owner can create a listing on desktop and manage bids from their phone in the field.

---

## PROJECT STRUCTURE

```
silvador-mobile/
├── app/                          # Expo Router screens
│   ├── _layout.tsx               # Root layout (auth gate + providers)
│   ├── (auth)/
│   │   ├── _layout.tsx           # Auth stack layout
│   │   ├── login.tsx             # Login screen
│   │   ├── register.tsx          # Register with role selection
│   │   └── forgot-password.tsx   # Password reset
│   ├── (tabs)/
│   │   ├── _layout.tsx           # Tab bar layout (5 tabs)
│   │   ├── index.tsx             # Auction feed (home)
│   │   ├── dashboard.tsx         # My auctions / my bids
│   │   ├── market.tsx            # Market analytics
│   │   ├── notifications.tsx     # Notification center
│   │   └── profile.tsx           # Settings & account
│   ├── auction/
│   │   └── [id].tsx              # Auction detail + bidding
│   ├── create-listing.tsx        # Multi-step listing creation
│   └── bid-history/
│       └── [id].tsx              # Full bid history for auction
├── components/
│   ├── AuctionCard.tsx           # Feed card component
│   ├── BidModal.tsx              # Place bid bottom sheet
│   ├── CountdownTimer.tsx        # Animated countdown ring
│   ├── FilterSheet.tsx           # Filter bottom sheet
│   ├── SpeciesBar.tsx            # Species % breakdown bar
│   ├── StatusBadge.tsx           # Auction status pill
│   ├── StatCard.tsx              # Dashboard metric card
│   ├── DocumentCard.tsx          # Document list item
│   ├── NotificationCard.tsx      # Notification list item
│   ├── BidRow.tsx                # Bid history row
│   ├── QuickBidButton.tsx        # Inline bid on feed cards
│   ├── BufferGauge.tsx           # Proxy bid safety indicator
│   ├── Toast.tsx                 # Toast notification system
│   └── SkeletonCard.tsx          # Loading placeholder
├── lib/
│   ├── api.ts                    # REST API client (fetch wrapper)
│   ├── auth.ts                   # Firebase Auth helpers
│   ├── firebase.ts               # Firebase app initialization
│   ├── websocket.ts              # Socket.io client + room management
│   ├── notifications.ts          # Push notification registration
│   ├── storage.ts                # AsyncStorage helpers
│   ├── incrementLadder.ts        # Copy from web: species bid increments
│   └── formatters.ts             # Price, volume, date formatting (ro-RO)
├── hooks/
│   ├── useAuth.ts                # Auth state + token management
│   ├── useAuctions.ts            # React Query: auction feed
│   ├── useAuction.ts             # React Query: single auction
│   ├── useBids.ts                # React Query: bid history
│   ├── useMyBids.ts              # React Query: buyer's bids
│   ├── useWatchlist.ts           # React Query: watchlist CRUD
│   ├── useNotifications.ts       # React Query: notifications
│   ├── useMarket.ts              # React Query: analytics data
│   ├── useWebSocket.ts           # WebSocket connection + events
│   └── useCountdown.ts           # Countdown timer logic
├── constants/
│   ├── colors.ts                 # Design system colors
│   ├── species.ts                # 36 species (from web schema)
│   ├── regions.ts                # 8 regions + counties
│   └── increments.ts             # Bid increment ladder
├── types/
│   └── index.ts                  # Shared types (copy from web shared/schema.ts)
├── app.json                      # Expo config
├── package.json
└── tsconfig.json
```

---

## PHASE 0: SCAFFOLDING (Day 1)
> Goal: Running app with navigation, Firebase connected, auth working.

### 0.1 Project Init
- [ ] `npx create-expo-app silvador-mobile --template tabs`
- [ ] Install core deps:
  ```
  expo install expo-router expo-font expo-haptics expo-notifications
  expo install @react-native-async-storage/async-storage
  npm install firebase socket.io-client @tanstack/react-query
  npm install react-native-reanimated react-native-gesture-handler
  npm install react-native-safe-area-context react-native-svg
  npm install date-fns
  ```
- [ ] Configure `app.json`: app name "RoForest", bundle ID `ro.silvador.roforest`, scheme `roforest`

### 0.2 Firebase Setup
- [ ] Copy Firebase client config from web app's `.env` into `lib/firebase.ts`
- [ ] Initialize Firebase Auth, Firestore, Storage
- [ ] Same project ID: `silvador-mlp-marketplace-app`
- [ ] Test: login with existing test account `vlad.test2@silvador.ro`

### 0.3 API Client
- [ ] Create `lib/api.ts` — fetch wrapper that:
  - Prepends base URL (same server as web app)
  - Attaches `Authorization: Bearer {firebaseToken}` header
  - Handles token refresh automatically
  - Returns typed responses
  - Error handling with user-friendly messages

### 0.4 Navigation Shell
- [ ] Root layout with auth gate (redirect to login if no token)
- [ ] Tab bar with 5 tabs: Licitatii, Panou, Piata, Alerte, Profil
- [ ] Icons: Ionicons (gavel, grid, trending-up, notifications, person)
- [ ] Dark theme colors applied globally

### 0.5 Design System Constants
- [ ] Copy color palette into `constants/colors.ts`:
  ```
  background: #1A1D1A (Forest Night)
  surface: #252825 (Deep Bark)
  surfaceElevated: #2E332E (Charcoal)
  text: #F5F5F0 (Paper White)
  textSecondary: #8A9A8A (Ash Gray)
  textMuted: #5A6A5A
  primary: #CCFF00 (Electric Lime)
  success: #2ECC71 (Canopy Green)
  error: #E74C3C (Ember Red)
  warning: #F97316 (Orange)
  ```
- [ ] Fonts: Inter (400/500/600/700) + Roboto Slab (700) via expo-font
- [ ] Copy full species list (36) from `shared/schema.ts`
- [ ] Copy 8 regions + county mapping
- [ ] Copy species increment ladder from `server/utils/incrementLadder.ts`

**Deliverable:** App launches, logs in with Firebase, shows empty tab screens with correct theme.

---

## PHASE 1: AUCTION FEED (Days 2-4)
> Goal: Browse, search, filter, and watch auctions. The buyer's main screen.

### 1.1 Auction Feed Screen — `(tabs)/index.tsx`
- [ ] Fetch auctions from `GET /api/auctions/feed`
- [ ] React Query with `useAuctions` hook: auto-refetch every 30s, pull-to-refresh
- [ ] Two tabs at top: **"Live ({count})"** and **"Incheiate ({count})"**
  - Live = status `active` + `upcoming`
  - Incheiate = status `ended` + `sold`
- [ ] Loading state: 5 skeleton cards with pulse animation
- [ ] Empty state: illustration + "Nicio licitatie disponibila"

### 1.2 Auction Card Component
- [ ] Card layout:
  ```
  ┌──────────────────────────────────────┐
  │ ● Hunedoara, Transilvania    🔖 ♡    │  ← status dot + watchlist
  │ Lot 45 — Molid și Brad              │  ← title (2 lines max)
  │ [Molid 60%] [Brad 25%] [Fag 15%]   │  ← species tags
  │ 📦 520 m³   👥 8 oferte   🏆        │  ← metrics + leading badge
  ├──────────────────────────────────────┤
  │ 185 €/m³           ⏱ 2h 14m  [Bid] │  ← price + countdown + quick bid
  └──────────────────────────────────────┘
  ```
- [ ] Status dot: green pulse (active), orange solid (upcoming), gray (ended)
- [ ] Species composition tags — color-coded, max 3 visible + "+N more"
- [ ] Watchlist heart toggle — `POST/DELETE /api/watchlist`
- [ ] Quick bid button — opens BidModal pre-filled with current + 1 increment
- [ ] Leading badge: "Tu conduci" if user is currentBidderId
- [ ] CountdownTimer ring — animated SVG circle, color transitions:
  - Green: >33% time remaining
  - Orange: 10-33% remaining
  - Red: <10% remaining
- [ ] Completed cards show: final price, "Vandut" or "Fara oferte", end date
- [ ] Press → navigate to `auction/[id]`
- [ ] Haptic feedback on press (light impact)

### 1.3 Search Bar
- [ ] Sticky search bar at top of feed
- [ ] Searches across: title, county, region, species name
- [ ] Debounced 300ms — filters client-side from loaded auctions
- [ ] Clear button when text entered
- [ ] Search icon + placeholder "Cauta licitatii..."

### 1.4 Filter Sheet — `FilterSheet.tsx`
- [ ] Bottom sheet (gesture handler) — slides up from filter icon button
- [ ] **Species multi-select** — 36 species, searchable list, checkboxes
- [ ] **Region multi-select** — 8 regions, checkboxes
- [ ] **County cascading** — shows counties for selected regions
- [ ] **Price range** — min/max EUR/m3 text inputs
- [ ] **Volume range** — min/max m3 text inputs
- [ ] **Diameter range** — min/max cm text inputs (from APV data)
- [ ] **Treatment type** — text search
- [ ] **Sort by** — radio group:
  - Expira in curand (ending soon) — default for live
  - Cele mai noi (newest) — default for completed
  - Pret crescator / descrescator
  - Volum descrescator
- [ ] Active filter count badge on filter button
- [ ] "Reseteaza" (clear all) + "Aplica" buttons
- [ ] Applied filters shown as dismissible chips below search bar

### 1.5 WebSocket — Feed Updates
- [ ] Connect to Socket.io on app launch (`lib/websocket.ts`)
- [ ] Authenticate with Firebase token in handshake
- [ ] Subscribe to `watch:feed` room
- [ ] On `bid:new` event → update auction in React Query cache (price, bidCount)
- [ ] On `auction:ended` → move auction from Live to Completed tab
- [ ] On `auction:soft-close` → update endTime in cache
- [ ] Reconnect logic with exponential backoff

**Deliverable:** Full auction browsing with real-time updates, search, filters, watchlist.

---

## PHASE 2: AUCTION DETAIL + BIDDING (Days 5-8)
> Goal: View any auction in detail and place proxy bids.

### 2.1 Auction Detail Screen — `auction/[id].tsx`
- [ ] Fetch from `GET /api/auctions/:id`
- [ ] 4 tabs: **Detalii** | **Oferte** | **Padure** | **Documente**
- [ ] Subscribe to `watch:auction` WebSocket room on mount, unsubscribe on unmount

### 2.2 Details Tab
- [ ] Header: title, status badge, watchlist toggle, share button
- [ ] Large countdown ring (centered, animated)
- [ ] Data freshness indicator: "Live" / "Se actualizeaza..." / "Expirat" based on lastRefreshed
- [ ] Current price — large Electric Lime text with €/m3 unit
- [ ] Projected total value: currentPrice × volume
- [ ] Location: county, region, GPS link (opens Maps app)
- [ ] Owner name
- [ ] Bid status banner (animated spring slide-down):
  - "Oferta ta conduce" (green) if user is currentBidderId
  - "Ai fost depasit" (red) if user has bid but isn't leading
- [ ] Buffer gauge (proxy bid safety):
  - Bar showing margin between current price and user's max proxy
  - Green (safe): buffer >= 3× increment
  - Orange (warning): buffer >= 1× increment
  - Red (danger): buffer < 1× increment
- [ ] Quick bid buttons: +1x, +3x, +5x increment (open BidModal pre-filled)
- [ ] APV technical data (expandable accordion):
  - Permit number, date
  - Treatment type, extraction method
  - Surface (ha), slope (%), accessibility
  - Average age, diameter, height
  - Number of trees, volume per tree
  - Dimensional sorting breakdown

### 2.3 Bids Tab
- [ ] Fetch from `GET /api/bids/:auctionId` (latest 10)
- [ ] Ranked list (#1, #2, etc.)
- [ ] Each row: rank, avatar (initials circle), anonymous bidder ID, amount €/m3, timestamp
- [ ] #1 row: gold crown icon, green background, "Lider" badge
- [ ] Proxy badge (orange) on auto-placed bids
- [ ] Real-time: new bids appear at top on `auction:update` event
- [ ] "Vezi toate" link → `bid-history/[id]` for full history

### 2.4 Forest Tab
- [ ] Species breakdown table:
  - Species name | Volume (m3) | Percentage (%)
  - Color dot matching species tag color
- [ ] Dominant species highlighted
- [ ] Total volume row at bottom
- [ ] If APV data exists: additional columns for diameter, height per species

### 2.5 Documents Tab
- [ ] Fetch documents from auction.documents array
- [ ] Each document: icon (PDF/image), filename, size (formatted), upload date
- [ ] Tap to download/view (open in native viewer)
- [ ] APV document flagged with special badge
- [ ] Forest owner only: upload button (+) opens file picker
  - Supported: PDF, JPG, PNG
  - Upload flow: pick file → `POST /api/ocr/extract-apv` (if APV) → save metadata
  - Progress indicator during upload

### 2.6 Bid Modal — `BidModal.tsx`
- [ ] Bottom sheet presentation (slides up, dark backdrop)
- [ ] Shows:
  - Auction title
  - Current price (€/m3)
  - Total volume (m3)
  - Minimum bid: current + species increment
- [ ] Input: "Oferta maxima proxy" (€/m3) — numeric keyboard
- [ ] Real-time calculation: bid × volume = total value (€)
- [ ] Validation:
  - Must be >= current + increment
  - Show error message if below minimum
  - Disable submit if invalid
- [ ] Submit: `POST /api/bids` with `{ auctionId, amountPerM3, maxProxyPerM3 }`
- [ ] Loading spinner during submission
- [ ] Success: haptic (success), toast "Oferta plasata!", close modal
- [ ] Error: haptic (error), toast with error message
- [ ] Info text explaining proxy bidding: "Sistemul liciteaza automat pana la suma ta maxima"

### 2.7 Real-time on Detail Page
- [ ] `auction:update` → flash price animation (scale 1→1.08→1), update all fields
- [ ] `bid:outbid` → show outbid banner, haptic warning
- [ ] `auction:soft-close` → update endTime, show "+3 minute" toast
- [ ] `auction:ended` → disable bidding, show final result

**Deliverable:** Complete auction viewing and bidding flow with real-time updates.

---

## PHASE 3: DASHBOARDS (Days 9-12)
> Goal: Both forest owners and buyers have complete dashboards.

### 3.1 Role Detection
- [ ] `dashboard.tsx` reads `user.role` from auth context
- [ ] Renders `OwnerDashboard` or `BuyerDashboard` component accordingly

### 3.2 Forest Owner Dashboard
- [ ] **Stats row (4 cards):**
  - Licitatii totale (total + active count)
  - Oferte medii/licitatie (avg bids per auction)
  - Pret mediu/m3 (avg final price, completed only)
  - Rata de succes (sold / total %)
  - Data: `GET /api/auctions/performance-stats`

- [ ] **My Auctions list** — 3 sub-tabs: Active | Viitoare | Incheiate
  - Data: `GET /api/auctions/my-listings`
  - Each card shows: title, status, current price, volume, bid count, time remaining
  - Active/Upcoming: tap to view detail
  - Upcoming: edit/delete actions (swipe or long-press menu)
  - Completed: final price, winner anonymous ID, date

- [ ] **Create Listing FAB** — floating action button → `create-listing.tsx`

- [ ] **Empty state:** "Nicio licitatie publicata" + "Creeaza prima ta licitatie" button

- [ ] **WebSocket:** subscribe to `watch:dashboard`, refresh on `dashboard:update`

### 3.3 Buyer Dashboard
- [ ] **Stats row (4 cards):**
  - Oferte active (count of auctions with active bids)
  - Licitatii castigate (won count + win rate %)
  - Volum achizitionat (total m3 from won auctions)
  - Pret mediu platit (€/m3 weighted average)
  - Data: computed from `GET /api/bids/my-bids` + `GET /api/auctions/won`

- [ ] **Tab 1: Ofertele mele (My Bids)**
  - Data: `GET /api/bids/my-bids`
  - Each row:
    - Auction title + dominant species
    - Your bid: X €/m3 | Max proxy: Y €/m3
    - Current price: Z €/m3
    - Status badge: "Conduci" (green) or "Depasit" (red)
    - Time remaining
    - Tap → auction detail
  - Sort by: status (outbid first), then ending soon

- [ ] **Tab 2: Lista de urmarire (Watchlist)**
  - Data: `GET /api/watchlist`
  - Same card format as feed
  - "Liciteaza" quick action button
  - Swipe to remove from watchlist
  - Empty state: "Nu urmaresti nicio licitatie" + "Exploreaza piata" button

- [ ] **Tab 3: Castigate (Won)**
  - Data: `GET /api/auctions/won`
  - Each row:
    - Auction title
    - Final price (€/m3) + total value (€)
    - Volume (m3)
    - Date won
    - "Castigator" badge
  - Empty state: "Nicio licitatie castigata inca"

- [ ] **WebSocket:** subscribe to `watch:dashboard`
  - `bid:outbid` → refetch my-bids, show toast
  - `dashboard:update` → refetch relevant tab

**Deliverable:** Both user types have full operational dashboards.

---

## PHASE 4: CREATE LISTING (Days 13-15)
> Goal: Forest owners can create auction listings with APV extraction.

### 4.1 Multi-Step Form — `create-listing.tsx`
- [ ] Step indicator at top (6 dots, current highlighted in Electric Lime)
- [ ] Swipe or "Inainte"/"Inapoi" buttons to navigate steps
- [ ] Form state persisted in component (not lost on step navigation)
- [ ] "Salveaza ciorna" available from any step

### 4.2 Step 1: Informatii de baza
- [ ] Title (text input, min 5 chars)
- [ ] Description (multiline, min 20 chars)
- [ ] Region (dropdown: 8 regions)
- [ ] Location (text input, min 3 chars)
- [ ] GPS Coordinates (optional):
  - Manual: lat/lng inputs
  - Auto: "Foloseste locatia curenta" button → `expo-location`
  - Requires permission prompt
- [ ] Validation errors shown inline below each field

### 4.3 Step 2: Detalii lemn
- [ ] Volume total (m3, numeric input, min 1)
- [ ] Pret de pornire (€/m3, numeric input, min 0.1)
- [ ] Species breakdown (dynamic list):
  - Each row: species dropdown (36 options) + percentage input
  - "Adauga specie" button
  - Swipe to remove species
  - Running total shown: "Total: 95%" — must reach 100%
  - Auto-normalize option if sum != 100%
- [ ] Dominant species auto-calculated (highest %)

### 4.4 Step 3: Programare licitatie
- [ ] Start time selector:
  - "Incepe in X minute" slider (1-60 min) for quick start
  - Or date/time picker for scheduled start
- [ ] Duration selector:
  - Number input + unit dropdown (minute/ore/zile)
  - Presets: 1 ora, 4 ore, 24 ore, 3 zile, 7 zile
- [ ] Calculated end time display
- [ ] Soft-close info text: "Licitatia se prelungeste automat cu 3 minute daca se plaseaza o oferta in ultimele 15 minute"

### 4.5 Step 4: Document APV
- [ ] "Incarca APV" button → camera or file picker
- [ ] Supported: PDF, JPG, PNG (APV permit scan)
- [ ] On upload: show progress → send to `POST /api/ocr/extract-apv`
- [ ] OCR response pre-fills fields:
  - Permit number, date
  - Location (UP/UA), forest company
  - Volume per species (cross-reference with Step 2)
  - Average diameter, height, age
  - Treatment type, extraction method
  - Surface (ha), slope (%), accessibility
  - Dimensional sorting breakdown
- [ ] User can edit any pre-filled field
- [ ] "Completare manuala" fallback if OCR fails
- [ ] Show extracted data in a review card before proceeding

### 4.6 Step 5: Documente suport
- [ ] Upload additional documents (forestry reports, photos, maps)
- [ ] File picker (multi-select)
- [ ] Document card list with: name, size, type icon, delete button
- [ ] Upload to Firebase Storage → save metadata
- [ ] Optional step — "Sari peste" (skip) button

### 4.7 Step 6: Verificare si publicare
- [ ] Summary of all entered data in read-only cards:
  - Basic info card
  - Timber details card (species breakdown table)
  - Timing card (start, end, duration)
  - APV data card (if uploaded)
  - Documents card (count + names)
- [ ] Projected total value: starting price × volume
- [ ] Two actions:
  - "Salveaza ciorna" → `POST /api/auctions/draft` (status: draft)
  - "Publica licitatia" → `POST /api/auctions` (status: upcoming)
- [ ] Success: haptic, toast, navigate to dashboard

### 4.8 Draft Flow
- [ ] On Step 4 (APV upload), create draft first to get auction ID: `POST /api/auctions/draft`
- [ ] Upload documents against that auction ID
- [ ] On publish: `PUT /api/auctions/:id` with full data (status → upcoming)

**Deliverable:** Forest owners can create complete listings with APV OCR from their phone.

---

## PHASE 5: NOTIFICATIONS (Days 16-17)
> Goal: Push notifications + in-app notification center.

### 5.1 Push Notification Registration
- [ ] On login: request notification permissions via `expo-notifications`
- [ ] Get Expo push token
- [ ] Send token to backend: `POST /api/users/push-token` (new endpoint needed on backend)
- [ ] Handle token refresh

### 5.2 Notification Screen — `(tabs)/notifications.tsx`
- [ ] Fetch from `GET /api/notifications` (last 50)
- [ ] Pull-to-refresh
- [ ] "Marcheaza toate ca citite" button at top (when unread exist)

### 5.3 Notification Cards
- [ ] Each notification type has icon + color:
  | Type | Icon | Color | Romanian Title |
  |------|------|-------|---------------|
  | `outbid` | arrow-up-circle | Red | Ai fost depasit |
  | `won` | trophy | Green | Felicitari! Ai castigat |
  | `sold` | cash | Green | Licitatia ta s-a vandut |
  | `new_bid` | hammer | Lime | Oferta noua pe lotul tau |
  | `auction_ending` | time | Orange | Licitatie se incheie curand |
- [ ] Shows: icon, title, message body, relative time (in Romanian)
- [ ] Unread: bold text + blue dot indicator
- [ ] Tap → mark as read (`PATCH /api/notifications/:id/read`) + navigate to auction

### 5.4 Badge Count
- [ ] Tab bar badge on Alerte tab showing unread count
- [ ] App badge (iOS) updated via expo-notifications
- [ ] Clear badge when notifications screen opened

### 5.5 Real-time Notifications
- [ ] Subscribe to `watch:notifications` WebSocket room
- [ ] On `notification:new` → prepend to list, increment badge, show toast
- [ ] Toast: slide down from top with notification preview, auto-dismiss 4s
- [ ] Tap toast → navigate to auction

### 5.6 Backend Addition (Required)
- [ ] New endpoint: `POST /api/users/push-token` — stores Expo push token per user
- [ ] Modify notification creation logic in `routes.ts` to also send push via `expo-server-sdk`:
  ```
  On outbid → push to previous bidder
  On won → push to winner
  On sold → push to owner
  On new_bid → push to owner
  On auction_ending → push to all watchers
  ```
- [ ] Handle invalid/expired tokens gracefully

**Deliverable:** Users get push notifications for bids, wins, and auction events.

---

## PHASE 6: MARKET ANALYTICS (Days 18-21)
> Goal: Match the web app's analytics depth, optimized for mobile.

### 6.1 Market Screen Layout — `(tabs)/market.tsx`
- [ ] Scrollable vertical layout
- [ ] Date range toggle at top: 7z | 30z | 90z | 1an | Tot
- [ ] All charts respond to selected date range
- [ ] Data: `GET /api/market/analytics` with date range param

### 6.2 Price Evolution Chart (Area/Line)
- [ ] Multi-line chart: price over time by species
- [ ] X-axis: months (IAN, FEB, MAR...)
- [ ] Y-axis: €/m3
- [ ] Up to 5 species lines, color-coded
- [ ] Gradient fill beneath each line
- [ ] Tap point → tooltip with exact value
- [ ] Legend: toggleable species list below chart
- [ ] Implementation: react-native-svg (custom) or victory-native

### 6.3 Average Price by Region (Horizontal Bars)
- [ ] 8 horizontal bars, one per region
- [ ] Sorted by price descending
- [ ] Label: region name + €/m3 value
- [ ] Bar color: Electric Lime with opacity gradient
- [ ] Good for mobile — reads naturally top-to-bottom

### 6.4 Volume by Species (Vertical Bars)
- [ ] Top 10 species by total volume
- [ ] Scrollable horizontal if >6 bars
- [ ] Each bar: species name below, m3 value above
- [ ] Color-coded matching species palette

### 6.5 Diameter Distribution (Histogram)
- [ ] Diameter classes: 10-15, 15-20, 20-25, 25-30, 30-35, 35-40, 40+ cm
- [ ] Bar height = number of auctions in that class
- [ ] Label above each bar: count + avg €/m3
- [ ] Helps buyers find timber matching their processing capability

### 6.6 Treatment Type Breakdown (Donut)
- [ ] Donut chart in center
- [ ] Slices: each treatment type as % of total auctions
- [ ] Center text: total auction count
- [ ] Legend below: treatment name + count + avg price
- [ ] Implementation: react-native-svg arc paths

### 6.7 Species Demand Index
- [ ] Ranked list of species by demand score
- [ ] Each row: rank, species name, demand bar, lot count
- [ ] Tappable → could filter feed by that species

### 6.8 Price Alerts
- [ ] Section at bottom of market screen: "Alerte de pret"
- [ ] "Creeaza alerta" button → modal:
  - Species dropdown (optional)
  - Region dropdown (optional)
  - Direction: "Sub" (below) / "Peste" (above)
  - Threshold: €/m3 input
  - "Salveaza" button
- [ ] Active alerts list:
  - Species + region + direction + threshold
  - Active/inactive toggle
  - Swipe to delete
- [ ] Backend: `POST/GET/PATCH/DELETE /api/market/alerts`
- [ ] When triggered → push notification

### 6.9 Filter Presets
- [ ] "Salveaza filtrele curente" button in FilterSheet
- [ ] Name input modal
- [ ] Saved presets dropdown on feed screen: tap to apply
- [ ] Backend: `POST/GET/DELETE /api/market/watchlist/presets`

**Deliverable:** Full market analytics with 6 chart types, price alerts, filter presets.

---

## PHASE 7: PROFILE & SETTINGS (Days 22-23)
> Goal: Account management, preferences, and app settings.

### 7.1 Profile Screen — `(tabs)/profile.tsx`
- [ ] Header: avatar (initials circle), name, email, role badge
- [ ] KYC status indicator: pending (orange), verified (green), rejected (red)

### 7.2 Account Section
- [ ] **Editare nume** — tap opens inline edit or modal, saves via API
- [ ] **Schimbare parola** — modal with: current password, new password, confirm
  - Validation: min 6 chars, must match
  - Firebase Auth `updatePassword()`
- [ ] **Email** — display only (not editable, linked to Firebase Auth)

### 7.3 Preferences Section
- [ ] **Notificari** — toggle push notifications on/off
- [ ] **Tema** — Dark / Light / System (store in AsyncStorage)
  - Dark theme = current design
  - Light theme = inverted palette (white bg, dark text, green accents)
- [ ] **Limba** — Romana / English toggle
  - All UI strings in a `strings.ts` file with ro/en variants
  - Store preference in AsyncStorage
  - Reload strings on change

### 7.4 App Info Section
- [ ] App version
- [ ] "Despre RoForest" link
- [ ] "Termeni si conditii" link
- [ ] "Politica de confidentialitate" link

### 7.5 Logout
- [ ] "Deconectare" button (red)
- [ ] Confirmation alert
- [ ] Firebase Auth signOut → clear AsyncStorage → navigate to login

**Deliverable:** Complete profile management with theme, language, and notification preferences.

---

## PHASE 8: AUTH SCREENS (Day 24)
> Goal: Polished login/register/forgot-password flows.

### 8.1 Login Screen — `(auth)/login.tsx`
- [ ] Hero section: RoForest logo + forest gradient background
- [ ] Email input
- [ ] Password input (with show/hide toggle)
- [ ] "Conecteaza-te" primary button
- [ ] "Ai uitat parola?" link → forgot-password
- [ ] "Nu ai cont? Inregistreaza-te" link → register
- [ ] Loading state during auth
- [ ] Error messages (wrong password, account not found, etc.)
- [ ] Firebase Auth `signInWithEmailAndPassword()`

### 8.2 Register Screen — `(auth)/register.tsx`
- [ ] **Step 1: Role selection**
  - Two large cards: "Cumparator" (buyer) / "Proprietar padure" (forest owner)
  - Icon + description for each role
  - Tap to select → next step
- [ ] **Step 2: Account details**
  - Name input
  - Email input
  - Password input (min 6 chars)
  - Confirm password
  - "Creeaza cont" button
- [ ] Firebase Auth `createUserWithEmailAndPassword()` → `POST /api/users` (create Firestore doc with role)
- [ ] Auto-login after registration

### 8.3 Forgot Password — `(auth)/forgot-password.tsx`
- [ ] Email input
- [ ] "Trimite link de resetare" button
- [ ] Firebase Auth `sendPasswordResetEmail()`
- [ ] Success screen: "Verifica email-ul" message
- [ ] "Inapoi la conectare" link

**Deliverable:** Complete auth flow matching web app, with role-based registration.

---

## PHASE 9: OFFLINE & MOBILE-NATIVE FEATURES (Days 25-27)
> Goal: Leverage mobile advantages the web app can't have.

### 9.1 Offline Caching
- [ ] Cache last 50 viewed auctions in AsyncStorage via React Query persistence
- [ ] Show cached data when offline with banner: "Offline — ultima actualizare acum X"
- [ ] Queue bid attempts while offline:
  - Store pending bids in AsyncStorage
  - On reconnect: submit queued bids in order
  - Show "Oferta in asteptare" status on queued bids
  - Handle conflicts (auction ended, price changed) with user notification
- [ ] Cache market analytics for offline viewing
- [ ] Critical for forest areas with poor connectivity

### 9.2 Map View
- [ ] New view toggle on feed: "Lista" | "Harta"
- [ ] `react-native-maps` (Google Maps on Android, Apple Maps on iOS)
- [ ] Pin each auction by GPS coordinates
- [ ] Pin color = status:
  - Green = active
  - Orange = upcoming
  - Gray = ended/sold
- [ ] Tap pin → mini card popup with: title, price, volume, "Vezi detalii" button
- [ ] Cluster nearby pins at low zoom levels
- [ ] "Auctions near me" — uses device location to center map

### 9.3 GPS Auto-Fill for Listings
- [ ] In create-listing Step 1: "Foloseste locatia curenta" button
- [ ] `expo-location` permission request
- [ ] Auto-fills lat/lng fields
- [ ] Shows pin on mini-map preview
- [ ] Useful: forest owners often create listings while on-site

### 9.4 Camera Integration for APV
- [ ] In create-listing Step 4: "Fotografiaza APV" option alongside file picker
- [ ] Opens camera directly for quick document capture
- [ ] Auto-crop/enhance for OCR quality
- [ ] Send directly to `POST /api/ocr/extract-apv`

### 9.5 Haptic Feedback System
- [ ] Light impact: button presses, card taps, tab switches
- [ ] Medium impact: bid placed, filter applied
- [ ] Success notification: bid confirmed, listing published
- [ ] Error notification: bid failed, validation error
- [ ] Warning: outbid alert, auction ending soon

**Deliverable:** Offline support, map view, camera, GPS — features the web can't match.

---

## PHASE 10: POLISH & SHIP (Days 28-30)
> Goal: Production-ready quality.

### 10.1 Animation & Motion
- [ ] Page transitions: slide left/right (Expo Router default)
- [ ] Bottom sheets: spring animation (damping 15, stiffness 150)
- [ ] Auction card: press scale (0.98), release spring
- [ ] Price flash: scale pulse 1→1.08→1 on new bid (300ms)
- [ ] Countdown ring: smooth stroke animation
- [ ] Live dot: pulse animation (scale 1→1.8→1, loop)
- [ ] Skeleton: opacity pulse (0.3→0.7→0.3, loop)
- [ ] Toast: slide in from top (spring), fade out (300ms)
- [ ] Tab bar: icon bounce on select

### 10.2 Error Handling
- [ ] Error boundary wrapping each screen
- [ ] Fallback UI: "Ceva nu a mers bine" + "Reincearca" button
- [ ] Network error detection: show offline banner
- [ ] API error toast messages (user-friendly Romanian text)
- [ ] Token expiry: auto-refresh, if fails → redirect to login

### 10.3 Performance
- [ ] FlatList for all auction lists (virtualized rendering)
- [ ] Image caching with expo-image
- [ ] React Query staleTime: 30s for feed, 10s for detail, 5min for analytics
- [ ] Memoize expensive components (cards, charts)
- [ ] Lazy load chart components (don't load SVG charts until market tab visited)

### 10.4 Accessibility
- [ ] All interactive elements: min 44×44pt touch targets
- [ ] Status never communicated by color alone (always icon + color + text)
- [ ] Screen reader labels on all buttons and inputs
- [ ] Keyboard navigation support

### 10.5 App Store Prep
- [ ] App icon (forest/timber theme with Electric Lime accent)
- [ ] Splash screen (RoForest logo, dark background)
- [ ] Screenshots for App Store/Play Store (5 screens)
- [ ] Privacy policy URL
- [ ] EAS Build configuration for iOS + Android
- [ ] TestFlight / Internal testing track for initial distribution

### 10.6 Backend Additions Summary
These are the only backend changes needed (everything else uses existing endpoints):
- [ ] `POST /api/users/push-token` — store Expo push token
- [ ] Push notification sending logic (expo-server-sdk) in notification creation flow
- [ ] Handle push token refresh/invalidation

**Deliverable:** App Store-ready build for both iOS and Android.

---

## TIMELINE SUMMARY

| Phase | What | Days | Running Total |
|-------|------|------|---------------|
| 0 | Scaffolding (nav, auth, Firebase, theme) | 1 | 1 |
| 1 | Auction Feed (cards, search, filters, WebSocket) | 3 | 4 |
| 2 | Auction Detail + Bidding (proxy bids, real-time) | 4 | 8 |
| 3 | Dashboards (owner + buyer) | 4 | 12 |
| 4 | Create Listing (6-step form + APV OCR) | 3 | 15 |
| 5 | Notifications (push + in-app) | 2 | 17 |
| 6 | Market Analytics (6 charts + alerts) | 4 | 21 |
| 7 | Profile & Settings | 2 | 23 |
| 8 | Auth Screens | 1 | 24 |
| 9 | Offline + Mobile-Native (map, GPS, camera) | 3 | 27 |
| 10 | Polish & Ship | 3 | 30 |
| **Total** | | **30 days** | |

---

## WHAT'S DIFFERENT FROM THE EXISTING PROTOTYPE

The existing prototype was built independently and drifted from the web app. This plan:

1. **Starts from the actual API** — every screen maps to a real endpoint, not mock data
2. **Buyer dashboard exists from day 1** — the prototype's biggest gap
3. **Full species list (36)** — not the 12 in the prototype
4. **6-step listing creation** — matches web exactly, with real OCR
5. **6 chart types in analytics** — not just 1
6. **Offline-first** — designed for forest areas with bad connectivity
7. **Map view** — unique mobile advantage, uses GPS data already in auctions
8. **Shared types** — copy from web's `shared/schema.ts`, prevent drift
9. **Same design language** — dark theme with Electric Lime, but keep the prototype's best ideas (buffer gauge, countdown ring, data freshness indicator)

### What to Keep from the Prototype
- Buffer gauge component (proxy bid safety visualization)
- Data freshness indicator (Live/Updating/Stale)
- Countdown ring animation (better than web's text timer)
- 8 notification types (web only has 5 — the extras are useful)
- Haptic feedback patterns
- Dark theme color palette
- Share button on auction detail
- Theme + language toggles in settings
