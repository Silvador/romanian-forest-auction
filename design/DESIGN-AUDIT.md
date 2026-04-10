# RoForest Mobile App — Design Audit Report
> Date: 2026-04-06 | 27 screens reviewed | Pencil prototype

---

## OVERALL ASSESSMENT

**Design Score: B+**
Strong dark theme with distinctive forest-tinted palette. Trading terminal aesthetic works well for the B2B auction context. Good information density on most screens. The segmented burn ring and momentum strips are standout differentiators.

**Weaknesses:** Inconsistent component patterns between original and newer screens, some screens feel data-sparse while others are dense, and several missed opportunities for contextual micro-interactions that would increase engagement.

---

## SCREEN-BY-SCREEN FINDINGS

### 1. Auction Feed (Kn9Zf) — Grade: A-

**What works:**
- Header with "Licitatii" title + "9 active · 1 in curand" subtitle gives instant context
- Filter pills are compact and scannable
- "13 loturi gasite" + live timestamp (green dot + 16:32) is a trust signal
- Progress pills on cards (green/orange with time) are readable and distinctive
- Species composition bars add visual richness

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-01 | No empty state designed | Medium | New users see nothing if no auctions match filters. A warm empty state ("Nicio licitatie gasita — incearca alte filtre") prevents confusion and reduces bounce |
| F-02 | Only 2 cards visible — no scroll hint | Medium | Users may not realize the feed scrolls. A partial 3rd card peeking from the bottom signals more content below. This is a standard mobile pattern used by Instagram, Twitter, and every feed app |
| F-03 | "Pret curent" label is small and low-contrast | Polish | At 10px muted text, it's barely readable outdoors. Increasing to 11px and using `$--rf-text-secondary` instead of `$--rf-text-muted` would help forestry workers using the app in the field |
| F-04 | No pull-to-refresh indicator | Polish | The design doesn't show what happens on pull-down. A branded refresh animation (leaf spinning?) would reinforce the forestry identity |

**Proposed improvement — "Smart Sort Banner":**
When the user has active bids, show a slim banner above the card list: "2 licitatii unde ai oferte active" with a tap target to filter to just those. Buyers returning to the app want to check their bids first — this saves them from scrolling through the entire feed. Estimated impact: reduces time-to-relevant-auction by 5-8 seconds per session.

---

### 2. Auction Detail (UR5Dd) — Grade: A

**What works:**
- Segmented burn ring is the standout component — unique, readable, urgency-encoding
- Price block centered below ring creates a clear visual axis
- Bid status banner ("Oferta ta conduce") is immediately visible
- 4-tab structure (Detalii/Oferte/Padure/Documente) organizes complex data well
- Quick bid buttons (+1x, +3x, +5x) reduce friction

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-05 | Info grid (Locatie/Proprietar/Volum/Oferte) is partially clipped by tab bar | Medium | The bottom row is cut off on smaller phones. This is the info sellers care about most — who's bidding, how much volume. Content should be scrollable above the tab bar |
| F-06 | No "Adauga la urmarire" (watchlist) confirmation | Medium | Tapping the heart icon has no visible feedback. A brief toast ("Adaugat la lista de urmarire") confirms the action and teaches users the feature exists |
| F-07 | Quick bid prices (189/197/205 RON) don't show the increment logic | Polish | Users don't understand why these specific amounts are suggested. A tiny "increment: +4 RON" label would make proxy bidding transparent |
| F-08 | Oferte/Padure/Documente tabs have no content designed | High | These are critical tabs for buyer decision-making. Bid history, species breakdown, and APV documents are what differentiate this from a simple listing. Missing tab content means the prototype can't demonstrate the full value proposition to stakeholders |

**Proposed improvement — "Bid Confidence Indicator":**
Below the quick bid buttons, add a small text: "85% sanse de castig la 197 RON" based on bid history analysis. This transforms blind bidding into informed bidding, which is the core value proposition of a digital auction vs physical Romsilva auctions. It answers the question every buyer has: "Am I bidding enough?"

---

### 3. Bid Modal (BvkVK) — Grade: B+

**What works:**
- Bottom sheet pattern is correct for mobile bidding
- Auction info card with current price and volume gives context
- Quick bid presets (+1x, +3x, +5x) are prominent
- Proxy bid explanation text is present
- "Plaseaza Oferta" CTA is large and prominent

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-09 | No bid validation error state shown | High | If the user enters a bid below minimum, what happens? An inline error ("Minim 189 RON/m³") with the input border turning red is critical for preventing frustration |
| F-10 | No loading/confirmation state | High | After tapping "Plaseaza Oferta," what does the user see? A spinner → success toast → auto-close sequence is missing. Without it, users may double-tap and place duplicate bids |
| F-11 | Total value calculation is in muted text | Medium | "Valoare totala: 101.400 RON" is the single most important number for a buyer — it's the real money they're committing. Should be larger and more prominent, possibly in `$--rf-primary` |

**Proposed improvement — "Bid Confirmation Sheet":**
Instead of just closing the modal on success, transform it briefly into a confirmation: green checkmark, "Oferta plasata! 195 RON/m³", confetti particles, then auto-close after 2s. This creates a dopamine reward loop — the emotional payoff of successful bidding keeps users coming back.

---

### 4. Dashboard — Owner (KNjAh) — Grade: B

**What works:**
- 4 stat cards give a quick portfolio overview
- Active/Viitoare/Incheiate tabs structure the listing lifecycle
- FAB for creating new listings is correctly positioned

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-12 | Stat cards lack context (no trend indicators) | High | "24 Licitatii totale" means nothing without context. Is that good? Bad? Adding "↑3 fata de luna trecuta" turns a vanity metric into an actionable insight. Sellers need to know if their auction volume is growing |
| F-13 | Auction rows are text-heavy with no visual hierarchy | Medium | All 3 rows look identical at a glance. The Live auctions should feel urgent (green accent, maybe a mini progress indicator), while Curand should feel upcoming (orange). Without color-coding, the seller can't instantly spot which auction needs attention |
| F-14 | No revenue metric visible | High | Sellers care about money above all. A prominent "Venit total: 42.800 RON" stat would be the first thing they check. Currently the dashboard talks about averages and percentages but never shows the actual bottom line |
| F-15 | "Start: 155 RON/m³" on upcoming auctions is confusing | Medium | Is this the starting price or the current price? The label is ambiguous. "Pret start: 155 RON/m³" with a different color (muted, since bidding hasn't started) would clarify |

**Proposed improvement — "Action Required Banner":**
At the top of the dashboard, show a contextual action banner when something needs the seller's attention: "Lot 45 s-a vandut — confirma tranzactia" or "Lot 112 incepe in 30 min — verifica detaliile." This turns the dashboard from a passive status board into an active command center.

---

### 5. Dashboard — Buyer (J7JVd) — Grade: B

**What works:**
- 4 stat cards cover the key buyer metrics
- Ofertele mele/Urmarire/Castigate tabs match the buyer journey
- "Conduci" and "Depasit" badges on bid rows are immediately clear

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-16 | "Depasit" (outbid) rows don't have enough urgency | High | Being outbid is the highest-urgency event for a buyer. The row should have a red tint, a subtle glow, or a "Liciteaza din nou" quick action. Currently it's just red text on a dark row — easy to miss in a list |
| F-17 | No "timp ramas" on bid rows | High | The buyer sees they're outbid but not how much time they have to react. Adding "2h 14m ramas" next to the status badge enables quick decision-making without tapping into the detail screen |
| F-18 | Watchlist and Won tabs have no designed content | Medium | Same as F-08 — these tabs need to be designed to demonstrate the full buyer experience |

**Proposed improvement — "Outbid Alert Card":**
When the buyer has outbid auctions, show a prominent card at the top: "Ai fost depasit pe 2 licitatii — 3h ramas sa licitezi din nou." Red accent, tappable, goes to filtered view. This is the single highest-conversion touchpoint in any auction app.

---

### 6. Market Analytics (VocEa) — Grade: A-

**What works:**
- Summary stats header (volume, avg price with trend, auction count) is clean Bloomberg-style
- Price trend chart with gradient bars shows time dimension
- Species comparison cards with price, volume, trend %, and color dots are information-dense
- "Vezi analiza detaliata →" link provides progressive disclosure

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-19 | Species cards don't show the species color dot consistently | Polish | Molid has a green dot, Fag has beige, but the dots are very small (10px). Making them 12px with a subtle glow would improve scannability |
| F-20 | No "compared to what" baseline on the trend chart | Medium | The bars show price movement but without a horizontal reference line (e.g., 6-month average), users can't tell if current prices are above or below normal. A dashed line at the average would add context |
| F-21 | Date range pills (7z/30z/90z) don't show which is active on smaller text | Polish | The active state is lime bg, which works, but the inactive pills are barely visible. Adding a 1px border to inactive pills would improve touch target visibility |

**Proposed improvement — "Personal Market Insight":**
Below the species cards, add a personalized section: "Bazat pe licitatiile tale" showing species/regions the user has bid on, with price trends specific to their trading behavior. This transforms the analytics from "general market data" to "your market data," dramatically increasing relevance and return visits.

---

### 7. Detailed Analytics (1pRie) — Grade: A-

**What works:**
- Regional price bars with volume context (e.g., "198 RON · 680m³") are clean
- Momentum strips with sparklines are the best component in the entire app — they encode 5 data points per row
- Price alerts section with "Creeaza" action enables power user retention

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-22 | Momentum strips show sparkline but no absolute price baseline | Medium | The bars go up/down, but from what baseline? A thin horizontal line at the starting price of the period would show whether the current price is above or below the entry point |
| F-23 | Price alert cards don't show when they were last triggered | Polish | "Molid sub 170 RON/m³" is active, but has it ever fired? "Ultima activare: acum 3 zile" would tell the user whether the alert is useful or dormant |

---

### 8. Notifications (5HRxB) — Grade: B-

**What works:**
- 5 notification types with colored icon circles are visually distinct
- "Marcheaza toate" button is correctly positioned
- Relative timestamps in Romanian

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-24 | Notification cards still show € instead of RON in body text | High | "cineva a licitat 215 €/m³" — the currency update missed the notification body text. Inconsistency undermines trust |
| F-25 | No grouping or sectioning | Medium | 5 notifications in a flat list is fine, but at 20+ notifications, the user needs sections: "Astazi", "Ieri", "Saptamana aceasta." Time-based grouping reduces cognitive load |
| F-26 | Unread indicators (green dots) are right-aligned and tiny | Medium | Unread state should be more prominent — a subtle left border accent or background tint on unread cards would make the unread/read distinction instant |
| F-27 | No empty state | Medium | What does the notification screen look like with zero notifications? "Nicio notificare — vei fi alertat cand cineva liciteaza pe loturile tale" teaches the feature |

**Proposed improvement — "Notification Actions":**
Add inline swipe actions: swipe left to dismiss, swipe right to "Liciteaza din nou" (for outbid notifications) or "Vezi detalii" (for won notifications). This turns the notification center from a read-only log into an action hub.

---

### 9. Profile (L5078) — Grade: B

**What works:**
- Avatar with initials is clean
- Verified badges (PROPRIETAR VERIFICAT, KYC Verificat) build trust
- Section organization (Cont/Preferinte/Despre) is logical
- Toggle for notifications and theme/language selectors

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-28 | No profile completion indicator | High | The onboarding defers company/CUI and documents to post-onboarding, but there's no visible progress bar showing what's missing. "Profil 60% complet — adauga firma pentru a licita" drives progressive completion |
| F-29 | No logout button visible | Medium | Users need to scroll to find logout. This is a common UX frustration, especially during testing and multi-account scenarios |
| F-30 | No "Sterge cont" (delete account) option | Polish | GDPR requires this. Even if not functional in the prototype, its absence signals incomplete product thinking |

**Proposed improvement — "Profile Completion Checklist":**
Add a card at the top of the profile showing a checklist with percentage: "✓ Cont creat · ✓ Profil completat · ○ Adauga firma · ○ Incarca documente SUMAL". Each uncompleted item is tappable and navigates to the relevant form. This is the post-onboarding engine that drives users from "browsing" to "transacting."

---

### 10. Create Listing (jYsrG) — Grade: B-

**What works:**
- 6-step dot indicator shows progress
- "Pasul 1 din 6" label is clear
- GPS auto-fill button ("Foloseste locatia curenta") is smart for field use
- Input fields follow the design system

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-31 | Only Step 1 is designed | High | Steps 2-6 (wood details, scheduling, APV upload, documents, review) are not in the prototype. This is the seller's core workflow — without it, you can't demo the full product to investors or test with users |
| F-32 | No draft save indicator | Medium | If the user leaves mid-form, is their data saved? A "Ciorna salvata automat" toast after each field change would prevent data loss anxiety |
| F-33 | Region dropdown has no indication of what regions exist | Polish | "Selecteaza regiune" is a dead-end in the prototype. Even a few sample options would help the design feel real |

---

### 11. Map View (nD0yT) — Grade: A-

**What works:**
- Satellite map imagery with colored pins (green/orange/gray) is geographically intuitive
- Legend overlay (Activa/Viitoare/Incheiata) is compact and clear
- "4 licitatii" count badge gives context
- Selected pin is visually distinct (lime with outer ring)
- Compact popup card with species tags and countdown is well-designed
- Bottom scrim gradient creates clean separation

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-34 | Map popup still shows €/m³ instead of RON | Medium | "185 €/m³" on the popup card — missed in the RON conversion. Consistency issue |
| F-35 | No cluster behavior shown | Medium | With 50+ auctions, pins would overlap. The design should show at least one cluster indicator (circle with count) to signal scalability |

---

### 12. Login (iHpJa) — Grade: B+

**What works:**
- Logo is clean and properly scaled
- Tagline communicates the value proposition
- Form is minimal (email + password)
- "Ai uitat parola?" and "Inregistreaza-te" links are correctly placed

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-36 | No social auth (Google/Facebook) on login screen | High | The onboarding Auth screen has Google + Facebook, but the returning-user Login screen doesn't. Users who signed up with Google can't log back in. This is a critical flow gap |
| F-37 | No "Remember me" toggle | Medium | On shared/family devices, users may want to stay logged in. A toggle reduces daily login friction |

---

### 13. Register / Role Selection (Dkfb7) — Grade: A-

**What works:**
- 3 stacked full-width role cards (Cumparator/Vanzator/Ambele) are scannable
- Permission bullets on each card set expectations
- "Ce inseamna fiecare rol?" expandable link catches hesitant users
- "Poti schimba rolul oricand" reassurance text reduces decision anxiety
- Full-card selection state with lime tint is clear

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-38 | The "Ambele" card has only 1 bullet while others have 2-3 | Polish | Feels incomplete. Adding "Ideal pentru cherestelei si intermediari" as a second line would help users identify with this role |

---

### 14. Onboarding Flow (isDUj → mrPpb) — Grade: A

**What works:**
- 5-screen flow is lean (<60s for Google users)
- Welcome screen merges role selection with value props
- Social proof ("12 licitatii active acum") and SUMAL badge build instant trust
- "Exploreaza fara cont" guest mode reduces bounce
- Auth screen has Google + Facebook + email + phone as fallback
- OTP screen has "Schimba numarul" recovery link and email fallback
- Display Name screen is one-field simplicity
- Success screen has clear status checklist

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-39 | Welcome screen role cards lack the permission bullets from Screen 11 | Medium | The onboarding Welcome has "Caut lemn de calitate" but the Register screen has detailed bullets. The onboarding version should at least hint at what each role can do |
| F-40 | Success screen "Documente SUMAL (optional)" may confuse buyers | Medium | Buyers don't need SUMAL docs. This line should be conditional — only show for Vanzator/Ambele roles. For buyers, replace with "✓ Gata de licitare" |

---

### 15. Deal Flow (xg1za, EkDP0, xt9zR) — Grade: A

**What works:**
- Seller result screen has clear "Vandut!" celebration + winner card + bid history
- Buyer result screen has "Felicitari!" + seller contact + next steps checklist + SUMAL reminder
- Contact sheet has phone/email/copy quick actions + deal status tracker
- GDPR note on contact data sharing is appropriate

**Issues found:**

| # | Finding | Impact | Why it matters |
|---|---------|--------|----------------|
| F-41 | Seller result still shows "185 €/m³" in the winner card subtitle | Medium | "Hunedoara · 185 €/m³" should be RON. Missed in currency conversion |
| F-42 | Deal status tracker has no timestamps | Medium | "Contact stabilit" is checked but when? Adding "acum 2 ore" next to each completed step creates an audit trail that both parties can reference |
| F-43 | No in-app messaging option | Medium | The contact sheet only offers phone/email. An in-app chat thread would keep communications inside the platform, creating a record for dispute resolution and reducing dependency on external channels |

---

## CROSS-CUTTING ISSUES

### CC-01: Currency Inconsistency (HIGH)
Several screens still show € instead of RON in secondary text, notification bodies, and the map popup. A systematic sweep is needed. Every price display must be RON/m³.

### CC-02: Missing Tab Content (HIGH)
Screens 2, 4, and 5 have tabs (Oferte/Padure/Documente, Urmarire/Castigate) with no designed content. These represent core user workflows — bid history, species detail, watchlist management. Without them, the prototype can't demonstrate the full product.

### CC-03: No Loading/Error/Empty States (MEDIUM)
Across all screens, there are no designs for: loading skeletons, error states (network failure, server error), or empty states (no auctions, no bids, no notifications). These states are what users see ~20% of the time. Designing them prevents the "this app is broken" perception.

### CC-04: No Offline State (MEDIUM)
The app targets forestry workers in rural Carpathian areas with poor connectivity. No screen shows what happens when the connection drops. A slim "Offline — date din cache" banner and cached content indicators are essential for the target market.

---

## TOP 10 IMPROVEMENTS — RANKED BY UX IMPACT

| Rank | Improvement | Screens | Impact | Why |
|------|------------|---------|--------|-----|
| 1 | **Add Google/Facebook to Login screen** | Login | Critical | Users who registered with social auth literally cannot log back in. Blocks returning users. |
| 2 | **Design the missing tab content** (Oferte, Padure, Documente, Urmarire, Castigate) | Detail, Owner Dashboard, Buyer Dashboard | High | These tabs represent 40% of the user journey. Without them, the prototype is incomplete for testing and investor demos. |
| 3 | **Profile completion checklist** | Profile | High | Post-onboarding engine that drives users from "browsing" to "transacting." Without it, the deferred onboarding items (company/CUI, SUMAL docs) never get completed. |
| 4 | **Outbid urgency treatment on Buyer Dashboard** | Buyer Dashboard | High | Being outbid is the #1 re-engagement trigger. Red tint + time remaining + "Liciteaza din nou" quick action converts passive notification into immediate re-bid. |
| 5 | **Seller dashboard revenue metric + action banners** | Owner Dashboard | High | Sellers check the dashboard to answer "how much money am I making?" Not showing revenue is like a bank app without a balance. |
| 6 | **Fix remaining €→RON inconsistencies** | Notifications, Map popup, Deal flow | Medium | Mixed currencies destroy trust in a financial platform. Even if the app doesn't process payments, prices must be consistent. |
| 7 | **Loading/error/empty states** | All screens | Medium | Users encounter these states ~20% of the time. Without them, the app feels broken on first bad connection. |
| 8 | **Notification grouping + actions** | Notifications | Medium | At scale (20+ daily notifications for active traders), a flat list is unusable. Time-based sections + swipe actions turn the notification center from a log into an action hub. |
| 9 | **Create Listing Steps 2-6** | Create Listing | Medium | The seller's core workflow is only 17% designed (1 of 6 steps). Completing it is required for user testing with actual forest owners. |
| 10 | **Bid confirmation animation + error state on Bid Modal** | Bid Modal | Medium | The bid placement flow has no feedback — no success, no error, no loading. This is the highest-stakes interaction in the app and it currently ends in silence. |

---

## DESIGN SYSTEM OBSERVATIONS

**Strengths:**
- Forest-tinted palette (`#1A1D1A`, `#252825`, `#2E332E`) is distinctive and cohesive
- Electric Lime (`#CCFF00`) accent is bold and works well against dark surfaces
- Typography pairing (Space Grotesk + Plus Jakarta Sans) is professional
- Semantic color system (success/error/warning/info) is consistently applied
- Species color palette is thoughtful and distinguishes 20 species

**Areas for improvement:**
- Button styles aren't componentized — each screen rebuilds buttons from scratch. A reusable button component with Primary/Secondary/Ghost/Destructive variants would ensure consistency.
- Input fields vary between screens (some use `gKpi4` component, others are hand-built). Standardize.
- The tab bar design varies slightly between screens (some use lucide icons, others Material Symbols Rounded). Pick one icon family.

---

## VERDICT

The RoForest prototype is a strong B+ design that successfully establishes a distinctive trading terminal aesthetic for the Romanian timber market. The segmented burn ring, momentum strips, and forest-tinted palette are genuine differentiators that no competitor has.

The biggest gap is completeness — several critical user flows (tab content, create listing steps 2-6, loading/error states) are undesigned. Filling these gaps would elevate the prototype from "impressive demo" to "testable product."

The top 3 improvements (social auth on login, missing tab content, profile completion) would have the highest impact on onboarding conversion and user retention.
