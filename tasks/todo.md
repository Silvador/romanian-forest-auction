# Design Score: B- → A Plan

## Where We Are Now (after today's fixes)

| Category | Current | Target | Gap |
|----------|---------|--------|-----|
| Visual Hierarchy | B | A | Needs stronger focal points, data density |
| Typography | C+ | A | Needs expressive font, locked scale, semantic headings |
| Color & Contrast | B+ | A | Needs semantic tokens enforced, hardcoded colors removed |
| Spacing & Layout | B | A | Needs desktop layout (not just wide mobile), consistent scale |
| Interaction States | C+ | A | Needs hover states, loading skeletons, empty states |
| Responsive | B | A | Needs true desktop layout (sidebar nav), tablet breakpoints |
| Content Quality | B- | A | Needs polished microcopy, warm empty states |
| AI Slop | A- | A | Minor: AuctionImage placeholder gradients |
| Motion | C | A | Needs 3-5 intentional animations |
| Performance Feel | A | A | Already there |

---

## Phase 1: Typography Overhaul (biggest visual impact)
**Effort: human ~2 days / CC ~30 min**

The #1 thing separating this from an A is typography. System fonts read as "developer built this." A single expressive font family transforms the feel.

### 1a. Activate Inter (already loaded but unused)
- `index.html` line 10 loads Inter from Google Fonts but the CSS uses system fonts
- Change `--font-sans` in `index.css` from system stack to `'Inter', -apple-system, sans-serif`
- Inter is a solid neutral. Not exciting, but dramatically better than raw system fonts
- Alternatively: swap Inter for **DM Sans** (more personality, similar weight range) or **Plus Jakarta Sans** (warmer, fintech-friendly)

### 1b. Lock the type scale to a ratio
Current: 24 → 18 → 16 → 14 → 12 (irregular jumps)
Target: **1.25 major third ratio** from a 16px base:
```
Display:  40px / 800  (auction detail hero price)
H1:       32px / 700  (page titles: "Live Auctions")
H2:       25px / 600  (section headers: "Market Snapshot")
H3:       20px / 600  (card titles, subsection headers)
Body:     16px / 400  (descriptions, form text)
Body-sm:  14px / 500  (metadata, labels)
Caption:  12px / 500  (timestamps, badges)
```

### 1c. Add text-wrap: balance to headings
One CSS line: `h1, h2, h3 { text-wrap: balance; }` — prevents orphaned words on line breaks.

### 1d. Use font-feature-settings for numbers
Add to global CSS: numbers in the app should use tabular lining figures everywhere, not just where we manually added `tabular-nums`.
```css
body { font-feature-settings: "tnum" 1, "lnum" 1; }
```

---

## Phase 2: Color System Enforcement
**Effort: human ~1 day / CC ~20 min**

The CSS variables are defined but bypassed in ~40 places with hardcoded Tailwind colors (`emerald-*`, `amber-*`, `red-*`).

### 2a. Add semantic color tokens
Add to `index.css` dark theme:
```css
--positive: 142 76% 40%;      /* green — gains, success, leading */
--negative: 0 84% 55%;        /* red — losses, errors, outbid */
--caution: 38 92% 50%;        /* amber — warnings, ending soon */
```
Add matching Tailwind config entries.

### 2b. Replace all hardcoded colors
Files to fix (from subagent audit):
- `MetricChip.tsx` — `emerald-500/10`, `emerald-400`, `red-500/10`, `red-400` → `positive`, `negative`
- `UrgencyPulse.tsx` — `amber-600`, `amber-400`, `red-600`, `red-400` → `caution`, `negative`
- `AuctionCard.tsx:126` — `text-emerald-600 dark:text-emerald-400` → `text-primary`
- `BidModal.tsx` — various hardcoded urgency colors

### 2c. Remove AuctionImage placeholder bloat
The 3-layer gradient + dot texture + vignette in `AuctionImage.tsx:40-59` is AI-generated design. Replace with a single clean gradient using the species color.

---

## Phase 3: Desktop Layout
**Effort: human ~3 days / CC ~45 min**

The app currently renders the same layout at all sizes, just wider. A true desktop layout needs structural changes.

### 3a. Convert bottom nav to sidebar on desktop
- Below `lg:` breakpoint (1024px): keep current bottom tab bar
- Above `lg:`: render a left sidebar (56px icon-only, or 200px expanded) with the same nav items vertically
- This is the single highest-impact responsive change

### 3b. Two-column auction detail on desktop
- Left column (60%): lot details, description, species composition, documents
- Right column (40%): sticky price card + bid controls + recent bids
- Currently everything stacks in a single column even at 1280px

### 3c. Dashboard 2-column layout
- Left: stats cards and auction management table
- Right: notifications feed or activity log
- Currently uses responsive grid but could be denser on desktop

---

## Phase 4: Interaction States & Motion
**Effort: human ~2 days / CC ~30 min**

Zero running animations on the page right now. A trading platform should feel alive.

### 4a. Entrance animations
- Auction rows: stagger fade-in on page load (framer-motion is already installed)
- Market Snapshot cards: slide up with 50ms stagger
- Page transitions: cross-fade between routes (200ms)

### 4b. Live indicator animation
- The "Live" badge on auctions should pulse (subtle opacity oscillation)
- The countdown timer should tick visually (already has urgency styles, just needs the animation to run)
- Price updates should flash briefly (the code exists in AuctionCard but there's no real-time data flowing)

### 4c. Hover depth effects
- Auction cards: subtle `translateY(-2px)` + shadow increase on hover
- Buttons: slight scale (1.02) on hover, scale(0.98) on active
- Bottom nav items: background highlight on hover

### 4d. Loading skeletons
- Replace the basic skeleton rectangles with content-shaped skeletons that match the real layout
- Shimmer animation on skeletons (already exists in the codebase for species bar)

### 4e. Empty state warmth
- "No auctions found" needs an illustration or icon + warmer copy + suggested action
- "Insufficient data for predictions" on Market page needs a more helpful message

---

## Phase 5: Content & Microcopy Polish
**Effort: human ~1 day / CC ~15 min**

### 5a. Button labels
- "Grid View" / "List View" → just icons (the toggle is self-explanatory)
- "Create Listing" → "List Timber" (more specific to the domain)
- "Place Bid" → "Bid Now" (shorter, more urgent)
- "Quick Raise" → "Raise" (shorter)

### 5b. Section headings
- "Live Timber Auctions" → just "Live" or remove (redundant with page title)
- "BASIC INFORMATION" / "TREE & FOREST METRICS" → title case, not all-caps screaming

### 5c. Number formatting consistency
- Decide: European format (dots for thousands) everywhere, or no separators for small numbers
- Currently: "2501m³" in list, "2.501 m³" in grid, "2,501 m³" in some places
- Rule: always use dots for thousands (Romanian/European convention), always include space before unit

### 5d. Accessibility labels
- Add `aria-label` to notification bell, filter toggle, view toggle
- Add `aria-live="polite"` to countdown timer (screen readers announce changes)
- Add `role="table"` and proper `role="row"` / `role="cell"` to the auction list

---

## Phase 6: Final Polish
**Effort: human ~1 day / CC ~15 min**

### 6a. Favicon and PWA
- Add a proper favicon (tree icon in neon green)
- Add `manifest.json` for PWA install on mobile
- Add `apple-touch-icon` for iOS home screen

### 6b. OG meta tags
- Add `og:title`, `og:description`, `og:image` for link previews
- Generate a clean OG image (dark background, logo, tagline)

### 6c. Print stylesheet
- Hide nav, show full content, use black text on white background
- Useful for: printing auction details for offline review

---

## Priority Order (what moves the needle most)

| # | Phase | Impact on Score | Effort (CC) |
|---|-------|----------------|-------------|
| 1 | Typography (1a+1b) | C+ → B+ | 15 min |
| 2 | Interaction Motion (4a+4b+4c) | C → B+ | 20 min |
| 3 | Color Enforcement (2a+2b+2c) | B+ → A- | 20 min |
| 4 | Desktop Layout (3a) | B → A- | 30 min |
| 5 | Content Polish (5a+5b+5c+5d) | B- → A- | 15 min |
| 6 | Desktop Auction Detail (3b) | B → A | 20 min |
| 7 | Final Polish (6a+6b) | A- → A | 10 min |

**Total estimated CC time: ~2.5 hours for full A score.**

Phases 1-3 are the 80/20. Typography + motion + color enforcement gets you from B- to a solid B+/A-. Desktop layout is the stretch to A.

---

## What an A Looks Like

An A score means someone opens the app and thinks "this was designed by a professional." Specifically:

1. **Typography has a point of view.** Not system fonts. A chosen font with a locked ratio.
2. **Color is systematic.** Every green, red, amber maps to a semantic token. No one-off hex codes.
3. **Desktop is designed, not stretched.** Sidebar nav. Two-column layouts. Content-width constraints.
4. **Motion communicates.** Entrance animations, live indicators, hover depth. The app feels alive.
5. **Content is crafted.** No "BASIC INFORMATION" screaming headers. No generic empty states.
6. **Accessibility is complete.** ARIA labels, live regions, semantic HTML. Not just focus-visible.
