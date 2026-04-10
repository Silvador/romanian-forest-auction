# RoForest — Mobile App Spec for Pencil

## App Overview

Romanian timber auction marketplace. Mobile-first React Native app. Dark trading terminal aesthetic — Robinhood meets forestry. Users are forest owners (sell timber lots) and buyers (bid on lots). All auctions are time-sensitive with proxy bidding.

**Platform:** iOS + Android (React Native / Expo)
**Language:** Romanian-first (all UI labels in Romanian)
**Theme:** Dark mode default

---

## Design Philosophy

1. Numbers are the hero — prices, volumes, countdowns get the biggest, boldest treatment
2. Status is always triple-encoded: color + icon + text (never color alone)
3. Motion signals real events (new bid, outbid, ending soon) — never decorative

---

## Color System

### Core Palette

| Token | Hex | Usage |
|-------|-----|-------|
| bg | #080808 | Screen background |
| bgSoft | #111111 | Elevated surfaces (modals, sheets) |
| surface | #1A1A1A | Card backgrounds |
| surfaceElevated | #242424 | Input fields, raised elements |
| border | rgba(255,255,255,0.08) | Card borders, dividers |
| borderSubtle | rgba(255,255,255,0.04) | Faint separators |
| text | #F4F4F1 | Primary text (off-white, slightly warm) |
| textSecondary | rgba(255,255,255,0.66) | Body copy, descriptions |
| textMuted | rgba(255,255,255,0.40) | Placeholders, disabled |
| textStrong | rgba(255,255,255,0.82) | Labels, emphasized secondary |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| primary | #CCFF00 | CTAs, active states, prices, winning badges (Electric Lime) |
| primarySoft | rgba(204,255,0,0.10) | Primary tinted backgrounds |
| primaryBorder | rgba(204,255,0,0.15) | Primary button outline variant |
| primaryMuted | rgba(204,255,0,0.05) | Hover overlay on cards |

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| success | #22C55E | Won, leading, verified, active |
| error | #EF4444 | Outbid, rejected, failed, destructive |
| warning | #F59E0B | Upcoming, ending soon, caution |
| info | #3B82F6 | Informational badges, links |

### Status Colors (Auction States)

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| Active (Activa) | rgba(34,197,94,0.10) | #22C55E | rgba(34,197,94,0.30) |
| Upcoming (Viitoare) | rgba(245,158,11,0.10) | #F59E0B | rgba(245,158,11,0.30) |
| Ended (Incheiata) | rgba(255,255,255,0.05) | rgba(255,255,255,0.50) | rgba(255,255,255,0.10) |
| Sold (Vanduta) | rgba(204,255,0,0.10) | #CCFF00 | rgba(204,255,0,0.30) |

### Chart Colors (5-color palette)

| Index | Hex | Species Example |
|-------|-----|-----------------|
| 1 | #CCFF00 | Molid (Spruce) |
| 2 | #FFA500 | Fag (Beech) |
| 3 | #20B2AA | Brad (Fir) |
| 4 | #D6AAFF | Stejar (Oak) |
| 5 | #FF5F5F | Pin (Pine) |

### Species Colors (for tags & bars)

| Species | Hex |
|---------|-----|
| Molid (Spruce) | #228B22 |
| Brad (Fir) | #2F4F2F |
| Fag (Beech) | #DEB887 |
| Stejar (Oak) | #8B4513 |
| Pin (Pine) | #556B2F |
| Gorun | #A0522D |
| Carpen (Hornbeam) | #CD853F |
| Frasin (Ash) | #B8B8B8 |
| Paltin (Maple) | #FF8C00 |
| Tei (Linden) | #FFD700 |
| Salcam (Acacia) | #DAA520 |
| Anin (Alder) | #F08080 |
| Ulm (Elm) | #BC8F8F |
| Nuc (Walnut) | #654321 |
| Mesteacan (Birch) | #F5F5DC |
| Plop (Poplar) | #98FB98 |
| Larice (Larch) | #006400 |
| Cires (Cherry) | #DC143C |
| Tisa (Yew) | #2E8B57 |
| Altele (Other) | #9CA3AF |

### Overlay / Elevation

| Layer | Value | Usage |
|-------|-------|-------|
| Elevate 1 | rgba(204,255,0,0.05) | Card hover |
| Elevate 2 | rgba(204,255,0,0.12) | Card active/pressed |
| Scrim | rgba(0,0,0,0.60) | Modal backdrop |

---

## Typography

### Font Families

| Role | Family |
|------|--------|
| Display / Headings | Space Grotesk 700 |
| Body / UI | Plus Jakarta Sans 400–800 |
| Numbers / Data | Plus Jakarta Sans (tabular figures) |

### Type Scale

| Name | Size | Weight | Line Height | Letter Spacing | Usage |
|------|------|--------|-------------|---------------|-------|
| display | 32px | 700 Space Grotesk | 1.05 | -0.05em | Auction price on detail page |
| h1 | 24px | 700 Space Grotesk | 1.05 | -0.05em | Screen titles |
| h2 | 20px | 700 Space Grotesk | 1.1 | -0.04em | Section headings |
| h3 | 17px | 600 Plus Jakarta | 1.2 | -0.02em | Card titles |
| body | 15px | 400 Plus Jakarta | 1.5 | 0 | Body text, descriptions |
| bodySmall | 13px | 400 Plus Jakarta | 1.4 | 0 | Secondary info, bid details |
| label | 13px | 600 Plus Jakarta | 1.3 | 0.02em | Input labels, section labels |
| caption | 11px | 500 Plus Jakarta | 1.3 | 0.01em | Timestamps, metadata |
| overline | 11px | 700 Plus Jakarta | 1.2 | 0.14em | Uppercase labels |
| stat | 28px | 700 Space Grotesk | 1.1 | -0.05em | Dashboard stat values |
| price | 22px | 700 Space Grotesk | 1.1 | -0.03em | Price on auction cards |

### Number Formatting

- Prices: tabular figures, € prefix, dot thousands separator, 2 decimals → €185.50
- Volumes: suffix m³, dot thousands → 1.520 m³
- Percentages: 1 decimal → 62.5%
- Countdown: 2h 14m 32s (drop hours when <1h)
- Dates: dd MMM yyyy, Romanian → 02 apr 2026
- Relative time: Romanian → acum 5 minute, acum 2 ore

---

## Spacing

### Base Unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-text gap |
| sm | 8px | Between related elements |
| md | 12px | Card internal gaps |
| base | 16px | Card padding, section gaps |
| lg | 20px | Between cards in a list |
| xl | 24px | Section padding (horizontal) |
| 2xl | 32px | Between major sections |
| 3xl | 48px | Screen top/bottom padding |

### Screen Padding
- Horizontal: 16px both sides
- Top: SafeArea + 8px
- Bottom: SafeArea + TabBar height + 8px
- Between list items: 12px

### Card Padding
- Outer: 16px all sides
- Inner section gaps: 12px
- Label-to-value gap: 4px
- Icon-text gap: 8px

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| sm | 6px | Small badges, chips |
| md | 10px | Buttons, inputs |
| lg | 16px | Cards |
| xl | 24px | Modal sheets |
| full | 9999px | Avatars, status dots, pills |

---

## Shadows

| Level | Shadow | Usage |
|-------|--------|-------|
| Subtle | 0 2px 4px rgba(0,0,0,0.15) | Cards at rest |
| Medium | 0 4px 12px rgba(0,0,0,0.25) | Pressed cards, modals |
| Strong | 0 12px 32px rgba(0,0,0,0.40) | Bottom sheets |
| Heavy | 0 24px 80px rgba(0,0,0,0.45) | Floating overlays |

### Urgency Glow

| Level | Shadow | When |
|-------|--------|------|
| None | transparent | >2h remaining |
| Medium | 0 0 12px rgba(245,158,11,0.30) | 30min–2h remaining |
| High | 0 0 16px rgba(239,68,68,0.40) | <30min remaining |

---

## Navigation — 5 Bottom Tabs

| Tab | Label | Icon (Ionicons) | Active Icon |
|-----|-------|-----------------|-------------|
| 1 | Licitații | hammer-outline | hammer |
| 2 | Panou | grid-outline | grid |
| 3 | Piata | trending-up-outline | trending-up |
| 4 | Alerte | notifications-outline | notifications |
| 5 | Profil | person-outline | person |

Tab bar: bg #080808, borderTop 1px rgba(255,255,255,0.06), height 56px + safeArea, icon 24px, label 10px 500. Active = primary color. Inactive = textMuted. Notification badge: 18px red circle with white count.

---

## Screen 1: Auction Feed (Tab 1 — Licitații)

### Layout
- Sticky search bar at top
- Filter button with active filter count badge
- Two segment tabs: "Live ({count})" | "Incheiate ({count})"
- Scrollable card list, 12px gap between cards
- Pull-to-refresh
- Loading: 5 skeleton cards with pulse animation
- Empty state: illustration + "Nicio licitatie disponibila"

### Search Bar
- Sticky top, full width minus 16px margins
- Height 44px, bg surfaceElevated, radius 10px
- Search icon left, placeholder "Cauta licitatii..."
- Clear button when text entered
- Debounced 300ms

### Filter Chips
- Below search bar when filters active
- Dismissible pill chips, 6px radius
- species color bg at 10% opacity

### Auction Card (Live)

```
┌─────────────────────────────────────────┐
│ ● Hunedoara, Transilvania         🔖 ♡ │ ← green pulse dot + location caption + watchlist heart
│ Lot 45 — Molid și Brad                 │ ← h3, 17px semibold, max 2 lines
│ [======species bar======]              │ ← 6px tall, colored segments by species %
│ [Molid 60%] [Brad 25%] [+1]           │ ← species tags, 11px
│ 📦 520 m³   👥 8 oferte   🏆 Tu conduci│ ← metrics row, 11px caption
├─────────────────────────────────────────┤
│ 185 €/m³       ⏱ 2h 14m      [Oferta] │ ← price (22px primary) + countdown ring + bid button
└─────────────────────────────────────────┘
```

Card specs: bg #1A1A1A, border 1px rgba(255,255,255,0.08), radius 16px, padding 16px, shadow subtle. Press: scale 0.98, opacity 0.9, 150ms.

Status dot: 8px circle, green pulsing (active), orange solid (upcoming), gray (ended).
Species bar: 6px tall, full radius, proportional colored segments, shimmer animation on active auctions.
Species tags: pills with 6px radius, species color bg at 10%, text in species color, 11px.
Watchlist heart: 22px, outline when unwatched, filled primary when watched.
Quick bid button: 32px tall, 12px paddingH, primary bg at 10%, primary border at 20%, primary text 12px 600.

### Auction Card (Completed)
Same layout but:
- No countdown ring — show end date instead
- No quick bid button
- Price shows final price
- Badge: "Vandut" (primary bg) or "Fara oferte" (muted)
- Status dot: gray, no pulse

### Countdown Ring (on card)
SVG circle, 44px, stroke 3px. Track: border color. Fill: progress stroke.
Center text: "2h 14m", caption 10px.
Colors: >33% remaining = #22C55E (green), 10-33% = #F59E0B (orange), <10% = #EF4444 (red) + pulse.

### Filter Sheet (Bottom Sheet)
Slides up from bottom, bg #111111, borderTopRadius 24px, maxHeight 80%.
Handle bar: 40x4px centered, rgba(255,255,255,0.20).

Sections:
1. **Specii** — searchable multi-select, 36 species with checkboxes
2. **Regiuni** — 8 regions with checkboxes
3. **Judete** — cascading from selected regions
4. **Pret (€/m³)** — min/max inputs side by side
5. **Volum (m³)** — min/max inputs side by side
6. **Diametru (cm)** — min/max inputs side by side
7. **Sortare** — radio group: Expira in curand, Cele mai noi, Pret crescator, Pret descrescator, Volum descrescator

Footer: "Reseteaza" ghost button + "Aplica" primary button, sticky bottom.

---

## Screen 2: Auction Detail (auction/[id])

### Header
- Back chevron + title (truncated 1 line) + watchlist heart + share icon
- Status badge pill (Active/Upcoming/Ended/Sold — see status colors)

### 4 Tabs: Detalii | Oferte | Padure | Documente

### Tab: Detalii

Large countdown ring centered: 120px, stroke 5px, center text 20px bold.

Data freshness indicator: "Live" (green dot) / "Se actualizeaza..." (orange) / "Expirat" (gray).

Current price block:
- Price: display size 32px, primary color (#CCFF00), bold
- "€/m³" unit label below, caption
- Projected total: price × volume, bodySmall muted

Bid status banner (animated spring slide-down):
- Leading: "Oferta ta conduce" — green bg at 10%, green text, checkmark icon
- Outbid: "Ai fost depasit" — red bg at 10%, red text, arrow-up icon

Buffer gauge (proxy bid safety):
- Bar track: 6px tall, surfaceElevated bg
- Bar fill: proportional width, colored by level
- Safe (>=3x increment): success green, "Sigur ✓"
- Warning (>=1x): warning orange, "Atentie ⚠"
- Danger (<1x): error red, pulse animation

Quick bid row: 3 buttons side by side — +1×, +3×, +5× increment. Each shows calculated price.

Info cards:
- Location: county + region + GPS link (opens maps)
- Owner name
- Volume: X m³
- Bid count: X oferte

APV technical data (expandable accordion):
- Permit number, date
- Treatment type, extraction method
- Surface (ha), slope (%), accessibility
- Average age, diameter, height
- Number of trees, volume per tree

### Tab: Oferte (Bid History)
Ranked list, latest 10 bids.
Each row: rank number, initials avatar circle (36px), anonymous bidder ID, amount €/m³, timestamp.
#1 row: gold crown icon, green bg tint, "Lider" badge.
Proxy bids: orange "Auto" badge.
"Vezi toate" link at bottom → full bid history screen.

### Tab: Padure (Forest)
Species breakdown table:
- Species color dot + name | Volume (m³) | Percentage (%)
- Dominant species row highlighted
- Total row at bottom with bold text

### Tab: Documente
Document list:
- Each item: file type icon (PDF/image), filename, file size, upload date
- Tap to open/download
- APV document flagged with special badge
- Forest owner only: "+" upload button

---

## Screen 3: Bid Modal (Bottom Sheet)

Slides up over auction detail. Scrim backdrop rgba(0,0,0,0.60).

```
┌─ Bottom Sheet ────────────────────────────────┐
│ bg: #111111, borderTopRadius: 24px, pad: 24px │
│                                               │
│ [handle bar 40×4px]                           │
│                                               │
│ "Plasare Oferta" h2          [X] close button │
│                                               │
│ ┌─ Auction Info ─────────────────────────┐    │
│ │ bg: surface, border: primaryBorder     │    │
│ │ radius: 12px, pad: 14px               │    │
│ │ Title (h3, 1 line)                    │    │
│ │ "Pret curent: 185 €/m³" — primary    │    │
│ │ "Volum: 520 m³" — muted              │    │
│ └─────────────────────────────────────────┘    │
│                                               │
│ ┌─ Quick Bids ── 3 columns, gap 8px ────┐    │
│ │ [+1× / 189€] [+3× / 197€] [+5× / 205€]   │
│ │ outline buttons, 48px tall, primary border  │
│ └─────────────────────────────────────────┘    │
│                                               │
│ Label: "Oferta maxima proxy (€/m³)"           │
│ ┌─ Input ────────────────────────────────┐    │
│ │ 52px tall, bg: surfaceElevated         │    │
│ │ text: 20px bold, numeric keyboard      │    │
│ │ focus border: primaryBorder            │    │
│ └─────────────────────────────────────────┘    │
│ "Valoare totala: €96,200" — muted             │
│ Error: "Minim 189 €/m³" — error red           │
│                                               │
│ ℹ "Sistemul liciteaza automat pana la         │
│    suma ta maxima" — bodySmall secondary       │
│                                               │
│ [══════ Plaseaza Oferta ══════]               │
│ Primary button, full width, 52px tall          │
│ Disabled: opacity 0.5 if invalid              │
└───────────────────────────────────────────────┘
```

Success: haptic feedback, toast "Oferta plasata!", close modal.
Error: haptic error, toast with error message.

---

## Screen 4: Dashboard — Forest Owner (Tab 2 — Panou)

### Stats Row (2×2 grid, gap 12px)
4 stat cards, each: bg surface, border, radius 12px, padding 14px.
- Icon 20px (textSecondary) → stat value 28px bold primary → label 11px muted

| Stat | Icon | Label |
|------|------|-------|
| Total auctions | list-outline | Licitatii totale |
| Avg bids/auction | people-outline | Oferte medii/licitatie |
| Avg price/m³ | trending-up | Pret mediu/m³ |
| Success rate | checkmark-circle | Rata de succes |

### My Auctions — 3 sub-tabs: Active | Viitoare | Incheiate
Each auction row: title, status badge, current price, volume, bid count, time remaining.
Upcoming: swipe for edit/delete actions.
Completed: final price, winner ID, date.

### Create Listing FAB
Floating action button, bottom-right, 56px circle, primary bg, "+" icon in dark.

### Empty State
"Nicio licitatie publicata" + "Creeaza prima ta licitatie" primary button.

---

## Screen 5: Dashboard — Buyer (Tab 2 — Panou)

### Stats Row (2×2 grid)

| Stat | Label |
|------|-------|
| Active bids count | Oferte active |
| Auctions won + win rate % | Licitatii castigate |
| Total m³ purchased | Volum achizitionat |
| Weighted avg €/m³ paid | Pret mediu platit |

### Tab 1: Ofertele mele (My Bids)
Each row:
- Auction title + dominant species
- Your bid: X €/m³ | Max proxy: Y €/m³
- Current price: Z €/m³
- Status: "Conduci" green badge or "Depasit" red badge
- Time remaining
- Tap → auction detail
Sorted: outbid first, then ending soon.

### Tab 2: Lista de urmarire (Watchlist)
Same card format as feed cards. "Liciteaza" quick action. Swipe to remove.
Empty: "Nu urmaresti nicio licitatie" + "Exploreaza piata" button.

### Tab 3: Castigate (Won)
Each row: title, final price €/m³, total value €, volume m³, date won, "Castigator" badge.
Empty: "Nicio licitatie castigata inca"

---

## Screen 6: Market Analytics (Tab 3 — Piata)

### Layout
Scrollable vertical. Date range toggle at top: 7z | 30z | 90z | 1an | Tot (pill selector).

### Chart 1: Price Evolution (Area/Line)
Multi-line chart, up to 5 species, color-coded (chart palette).
X-axis: months (IAN, FEB, MAR...). Y-axis: €/m³.
Gradient fill beneath each line. Tap point → tooltip with exact value.
Toggleable species legend below chart.

### Chart 2: Average Price by Region (Horizontal Bars)
8 horizontal bars, sorted by price descending.
Label: region name + €/m³ value. Bar: Electric Lime with opacity gradient.

### Chart 3: Volume by Species (Vertical Bars)
Top 10 species by total volume. Horizontal scroll if >6.
Species name below, m³ value above. Color-coded.

### Chart 4: Diameter Distribution (Histogram)
Diameter classes: 10-15, 15-20, 20-25, 25-30, 30-35, 35-40, 40+ cm.
Bar height = auction count. Label: count + avg €/m³.

### Chart 5: Treatment Type Breakdown (Donut)
Center text: total auction count. Slices by treatment type %.
Legend below: name + count + avg price.

### Chart 6: Species Demand Index
Ranked list: rank, species name, demand bar (horizontal), lot count.
Tappable → filters feed by that species.

### Price Alerts Section
"Alerte de pret" heading. "Creeaza alerta" button opens modal:
- Species dropdown (optional)
- Region dropdown (optional)
- Direction: "Sub" / "Peste"
- Threshold: €/m³ input
Active alerts list with toggle and swipe-to-delete.

---

## Screen 7: Notifications (Tab 4 — Alerte)

### Header
"Notificari" h1 + "Marcheaza toate ca citite" button (when unread exist).

### Notification Cards
Each card: bg surface (unread: surfaceElevated), radius 12px, padding 14px.
Row layout: icon circle (36px, tinted bg) + content + unread dot (8px primary).

| Type | Icon | Color | Title |
|------|------|-------|-------|
| outbid | arrow-up-circle | error red | Ai fost depasit |
| won | trophy | success green | Felicitari! Ai castigat |
| sold | cash-outline | success green | Licitatia ta s-a vandut |
| new_bid | hammer | primary lime | Oferta noua pe lotul tau |
| auction_ending | time | warning orange | Licitatie se incheie curand |

Each shows: title (bold if unread), message body (bodySmall secondary), relative time (caption).
Tap → mark as read + navigate to auction.

### Toast (in-app notification)
Slides from top, auto-dismiss 4s. Position: safeArea + 8px.
bg surfaceElevated, border colored by type, radius 12px, shadow strong.
Row: icon + title + body + close button.

---

## Screen 8: Profile (Tab 5 — Profil)

### Header
Initials avatar circle (64px, primary bg, dark text) + name + email + role badge.
KYC status: pending (orange), verified (green), rejected (red).

### Sections

**Cont:**
- Editare nume → inline edit
- Schimbare parola → modal (current + new + confirm)
- Email (display only)

**Preferinte:**
- Notificari — toggle push on/off
- Tema — Dark / Light / System
- Limba — Romana / English

**Despre:**
- App version
- Termeni si conditii
- Politica de confidentialitate

**Footer:**
- "Deconectare" destructive button (red), with confirmation alert

---

## Screen 9: Create Listing (Multi-step form)

### Step Indicator
6 dots at top, current dot = primary, completed = primary filled, upcoming = muted.
"Inainte" / "Inapoi" navigation buttons.

### Step 1: Informatii de baza
- Titlu (text, min 5 chars)
- Descriere (multiline, min 20 chars)
- Regiune (dropdown, 8 options)
- Locatie (text, min 3 chars)
- Coordonate GPS: manual lat/lng inputs + "Foloseste locatia curenta" button
- Inline validation errors below each field

### Step 2: Detalii lemn
- Volum total (m³, numeric)
- Pret de pornire (€/m³, numeric)
- Species breakdown (dynamic list):
  - Each row: species dropdown (36 options) + percentage input
  - "Adauga specie" button
  - Swipe to remove
  - Running total: "Total: 95%" — must reach 100%
  - Auto-normalize option

### Step 3: Programare licitatie
- Start: "Incepe in X minute" slider (1-60) OR date/time picker
- Duration: number + unit (minute/ore/zile)
- Presets: 1 ora, 4 ore, 24 ore, 3 zile, 7 zile
- Calculated end time display
- Info text about soft-close (+3 min extension rule)

### Step 4: Document APV
- "Incarca APV" button → camera or file picker
- Upload progress indicator
- OCR extracts: permit number, date, species volumes, diameter, height, treatment type, surface, slope
- Extracted data shown in review card (editable)
- "Completare manuala" fallback

### Step 5: Documente suport
- Multi-file upload (PDF, JPG, PNG)
- Document card list: name, size, type icon, delete button
- "Sari peste" skip button

### Step 6: Verificare si publicare
- Summary cards (read-only) for all entered data
- Projected total value: starting price × volume
- Two actions: "Salveaza ciorna" (outline) + "Publica licitatia" (primary)

---

## Screen 10: Auth — Login

- Hero: RoForest logo + dark forest gradient background
- Email input
- Password input (show/hide toggle)
- "Conecteaza-te" primary button, full width
- "Ai uitat parola?" text link
- "Nu ai cont? Inregistreaza-te" text link
- Loading spinner during auth
- Error messages inline

---

## Screen 11: Auth — Register

### Step 1: Role Selection
Two large cards side by side:
- "Cumparator" (buyer) — icon + description
- "Proprietar padure" (forest owner) — icon + description
Tap to select, highlighted with primary border.

### Step 2: Account Details
- Nume (text)
- Email (text)
- Parola (min 6 chars, show/hide)
- Confirma parola
- "Creeaza cont" primary button

---

## Screen 12: Auth — Forgot Password

- Email input
- "Trimite link de resetare" primary button
- Success: "Verifica email-ul" message + check icon
- "Inapoi la conectare" link

---

## Screen 13: Map View (Feed alternate view)

Toggle on feed: "Lista" | "Harta" segment control.
Full-screen map with auction pins:
- Green pin = active
- Orange pin = upcoming
- Gray pin = ended/sold
Tap pin → mini card popup: title, price, volume, "Vezi detalii" button.
Cluster nearby pins at low zoom.
"Licitatii langa mine" button uses device GPS to center map.

---

## Component Reference

### Buttons

**Primary:** 48px tall, bg #CCFF00, text #080808, 15px 700, radius 10px. Pressed: opacity 0.85, scale 0.98. Disabled: opacity 0.5. Large variant: 52px.

**Outline:** 48px tall, transparent bg, border 1px rgba(204,255,0,0.15), text #CCFF00, 15px 600, radius 10px. Pressed: bg rgba(204,255,0,0.10).

**Ghost:** 44px tall, no border, text textSecondary, 14px 500. Pressed: opacity 0.7.

**Destructive:** Same as primary but bg #EF4444, text white.

**Quick Bid (Compact):** 32px tall, bg rgba(204,255,0,0.10), border rgba(204,255,0,0.20), text #CCFF00 12px 600, radius 8px.

### Input Fields
48px tall (52px for bid input), bg #242424, border 1px rgba(255,255,255,0.08), radius 10px, text 15px.
Focus: border → rgba(204,255,0,0.30). Error: border → rgba(239,68,68,0.50) + error text 12px below.

### Status Badge
Pill: paddingH 10px, paddingV 4px, radius 6px, border 1px, text 11px 600 uppercase.
Colors per status (see Status Colors table above).

### Species Composition Bar
Height 6px (card) / 10px (detail). Full radius. Colored segments proportional to species %. Min segment width 2px. Active auctions: shimmer animation (gradient sweep, 8s loop).

### Glass Card (premium surfaces)
bg: linear-gradient(180deg, rgba(28,28,28,0.88), rgba(18,18,18,0.92)).
border: 1px rgba(255,255,255,0.08). radius: 24px. shadow: heavy.
Subtle light reflection gradient at top edge.

### Background Atmosphere
Radial glow top-left: rgba(204,255,0,0.05), 28% spread.
Radial glow top-right: rgba(204,255,0,0.04), 20% spread.
Fixed layer, no pointer events.

---

## Animations

| Animation | Spec | Trigger |
|-----------|------|---------|
| Card press | scale 1→0.98, opacity 0.9, 150ms | Touch down |
| Card release | scale back to 1, spring | Touch up |
| Price flash | scale 1→1.08→1, 600ms | New bid received |
| Live pulse dot | scale 1→1.8→1, opacity loop, 2s | Active auction |
| Skeleton pulse | opacity 0.3→0.7→0.3, 800ms loop | Loading |
| Countdown ring | smooth strokeDashoffset | Every second |
| Urgency glow | boxShadow pulse, 2s loop | <30min remaining |
| Bid banner slide | translateY spring | Status change |
| Toast enter | translateY from -100%, 300ms spring | New toast |
| Bottom sheet | translateY from 100%, spring | Sheet open |
| Shimmer bar | translateX sweep, 8s loop | Active species bar |

Springs: damping 20, stiffness 200 (sheets/modals). damping 15, stiffness 150 (cards).

---

## Responsive Breakpoints

| Width | Adjustments |
|-------|-------------|
| < 380px | Card price 18px instead of 22px. Stat grid: 1 column. |
| 380–428px | Default layout. 2-column stat grid. |
| > 428px | 20px screen edges. |
| > 768px (tablet) | 2-column auction cards. 4-column stats. Side-by-side charts. |

---

## Accessibility

- All touch targets: minimum 44×44pt
- Color contrast: 4.5:1 minimum (WCAG AA)
- Status: always color + icon + text
- Screen reader labels on all buttons, images, icons
- Reduced motion: disable looping animations, simplify springs
- Dynamic Type support up to 1.5×
- Focus indicator: 2px primary ring

---

## Iconography (Ionicons)

| Context | Icon |
|---------|------|
| Tab Auctions | hammer-outline / hammer |
| Tab Dashboard | grid-outline / grid |
| Tab Market | trending-up-outline / trending-up |
| Tab Notifications | notifications-outline / notifications |
| Tab Profile | person-outline / person |
| Volume | cube-outline |
| Bids | people-outline |
| Leading | trophy |
| Watchlist | heart-outline / heart |
| Share | share-outline |
| Location | location-outline |
| Timer | time-outline |
| Outbid notif | arrow-up-circle |
| Won notif | trophy |
| New bid notif | hammer |
| Ending notif | time |
| Sold notif | cash-outline |
| Back | chevron-back |
| Close | close |
| Filter | options-outline |
| Search | search |
| Add | add |
| PDF | document-text-outline |
| Image | image-outline |
| Edit | create-outline |
| Password | lock-closed-outline |
| Logout | log-out-outline |

Supplementary (MaterialCommunityIcons): tree, pine-tree, slope-uphill, camera, map-marker.
