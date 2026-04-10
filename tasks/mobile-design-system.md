# Mobile App Design System
> Companion to `mobile-from-scratch-plan.md` — visual specs for every component
> Derived from the web app's actual CSS + the prototype's best patterns

---

## 1. DESIGN PHILOSOPHY

**Robinhood-meets-forestry.** Dark trading terminal aesthetic. Neon accent on near-black. Every pixel serves urgency (auctions are time-sensitive) or clarity (money is on the line).

**Three rules:**
1. Numbers are the hero — prices, volumes, countdowns get the biggest, boldest treatment
2. Status is always triple-encoded: color + icon + text (never color alone)
3. Motion signals real events (new bid, outbid, ending soon) — never decorative

---

## 2. COLOR SYSTEM

### Core Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#080808` | Screen background |
| `bgSoft` | `#111111` | Elevated surface (modals, sheets) |
| `surface` | `#1A1A1A` | Card backgrounds |
| `surfaceElevated` | `#242424` | Input fields, raised elements |
| `border` | `rgba(255,255,255,0.08)` | Card borders, dividers |
| `borderSubtle` | `rgba(255,255,255,0.04)` | Faint separators |
| `text` | `#F4F4F1` | Primary text (off-white, slightly warm) |
| `textSecondary` | `rgba(255,255,255,0.66)` | Body copy, descriptions |
| `textMuted` | `rgba(255,255,255,0.40)` | Placeholders, disabled |
| `textStrong` | `rgba(255,255,255,0.82)` | Labels, emphasized secondary |

### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#BFFF00` | CTAs, active states, prices, winning badges |
| `primarySoft` | `rgba(191,255,0,0.10)` | Primary tinted backgrounds |
| `primaryBorder` | `rgba(191,255,0,0.15)` | Primary button outline variant |
| `primaryMuted` | `rgba(191,255,0,0.05)` | Hover overlay on cards |
| `accent` | `#EEFF35` | Landing page accent, eyebrow labels |

> Note: Web app uses `hsl(75 100% 50%)` = `#BFFF00` for in-app, and `#EEFF35` for landing. Mobile uses `#CCFF00` (between the two). **Decision: use `#CCFF00` (Electric Lime)** — it's the midpoint, tested in the prototype, reads well at all sizes.

### Semantic Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success` | `#22C55E` | Won, leading, verified, active |
| `error` | `#EF4444` | Outbid, rejected, failed, destructive |
| `warning` | `#F59E0B` | Upcoming, ending soon, caution |
| `info` | `#3B82F6` | Informational badges, links |

### Status-Specific Colors (Auction States)

| Status | Background | Text | Border |
|--------|-----------|------|--------|
| Active | `rgba(34,197,94,0.10)` | `#22C55E` | `rgba(34,197,94,0.30)` |
| Upcoming | `rgba(245,158,11,0.10)` | `#F59E0B` | `rgba(245,158,11,0.30)` |
| Ended | `rgba(255,255,255,0.05)` | `rgba(255,255,255,0.50)` | `rgba(255,255,255,0.10)` |
| Sold | `rgba(191,255,0,0.10)` | `#CCFF00` | `rgba(191,255,0,0.30)` |
| Draft | `rgba(255,255,255,0.05)` | `rgba(255,255,255,0.40)` | `rgba(255,255,255,0.08)` |

### Chart Colors (5-color palette)

| Index | Hex | Used For |
|-------|-----|----------|
| Chart 1 | `#CCFF00` | Primary species (Molid) |
| Chart 2 | `#FFA500` | Secondary (Fag) |
| Chart 3 | `#20B2AA` | Tertiary (Brad) |
| Chart 4 | `#D6AAFF` | Quaternary (Stejar) |
| Chart 5 | `#FF5F5F` | Quinary (Pin) |

### Species Colors (for species bars & tags)

| Species | Hex | Notes |
|---------|-----|-------|
| Molid (Spruce) | `#228B22` | Forest green |
| Brad (Fir) | `#2F4F2F` | Dark slate |
| Fag (Beech) | `#DEB887` | Burlywood |
| Stejar (Oak) | `#8B4513` | Saddle brown |
| Pin (Pine) | `#556B2F` | Dark olive |
| Gorun | `#A0522D` | Sienna |
| Carpen (Hornbeam) | `#CD853F` | Peru |
| Frasin (Ash) | `#B8B8B8` | Silver |
| Paltin (Maple) | `#FF8C00` | Dark orange |
| Tei (Linden) | `#FFD700` | Gold |
| Salcam (Acacia) | `#DAA520` | Goldenrod |
| Anin (Alder) | `#F08080` | Light coral |
| Ulm (Elm) | `#BC8F8F` | Rosy brown |
| Nuc (Walnut) | `#654321` | Dark brown |
| Mesteacan (Birch) | `#F5F5DC` | Beige |
| Plop (Poplar) | `#98FB98` | Pale green |
| Larice (Larch) | `#006400` | Dark green |
| Cires (Cherry) | `#DC143C` | Crimson |
| Tisa (Yew) | `#2E8B57` | Sea green |
| Altele (Other) | `#9CA3AF` | Gray |

### Overlay System (Elevation)

| Layer | Value | Usage |
|-------|-------|-------|
| Elevate 1 | `rgba(204,255,0,0.05)` | Card hover |
| Elevate 2 | `rgba(204,255,0,0.12)` | Card active/pressed |
| Scrim | `rgba(0,0,0,0.60)` | Modal backdrop |
| Scrim Light | `rgba(0,0,0,0.30)` | Toast backdrop |

### Light Theme (Optional — Phase 7)

| Token | Dark Value | Light Value |
|-------|-----------|-------------|
| `bg` | `#080808` | `#F8F8F6` |
| `surface` | `#1A1A1A` | `#FFFFFF` |
| `text` | `#F4F4F1` | `#1A1A1A` |
| `primary` | `#CCFF00` | `#2D7F4F` |
| `border` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` |

---

## 3. TYPOGRAPHY

### Font Families

| Role | Family | Fallback |
|------|--------|----------|
| Display / Headings | **Space Grotesk** 700 | system sans |
| Body / UI | **Plus Jakarta Sans** 400-800 | Inter, system sans |
| Numbers / Data | Plus Jakarta Sans (tabular figures) | system mono |

> Web app uses Space Grotesk for headings + Plus Jakarta Sans for body. The prototype used Inter + Roboto Slab. **Decision: match web** — Space Grotesk has better personality, Plus Jakarta Sans is more readable than Inter at body sizes.

### Type Scale

| Name | Size | Weight | Line Height | Letter Spacing | Usage |
|------|------|--------|-------------|---------------|-------|
| `display` | 32px | 700 (Space Grotesk) | 1.05 | -0.05em | Auction price on detail page |
| `h1` | 24px | 700 (Space Grotesk) | 1.05 | -0.05em | Screen titles |
| `h2` | 20px | 700 (Space Grotesk) | 1.1 | -0.04em | Section headings |
| `h3` | 17px | 600 (Plus Jakarta) | 1.2 | -0.02em | Card titles |
| `body` | 15px | 400 (Plus Jakarta) | 1.5 | 0 | Body text, descriptions |
| `bodySmall` | 13px | 400 (Plus Jakarta) | 1.4 | 0 | Secondary info, bid details |
| `label` | 13px | 600 (Plus Jakarta) | 1.3 | 0.02em | Input labels, section labels |
| `caption` | 11px | 500 (Plus Jakarta) | 1.3 | 0.01em | Timestamps, metadata |
| `overline` | 11px | 700 (Plus Jakarta) | 1.2 | 0.14em | Uppercase labels, eyebrows |
| `stat` | 28px | 700 (Space Grotesk) | 1.1 | -0.05em | Dashboard stat values |
| `price` | 22px | 700 (Space Grotesk) | 1.1 | -0.03em | Price on auction cards |

### Number Formatting
- All prices: tabular figures (`font-variant-numeric: tabular-nums`)
- Prices: `€` prefix, thousands separator (`.`), 2 decimal places → `€185.50`
- Volumes: suffix `m³`, thousands separator → `1.520 m³`
- Percentages: 1 decimal → `62.5%`
- Countdown: `2h 14m 32s` or `14m 32s` (drop hours when <1h)
- Dates: `dd MMM yyyy` format, Romanian locale → `02 apr 2026`
- Relative time: Romanian → `acum 5 minute`, `acum 2 ore`

---

## 4. SPACING

### Base Unit: 4px

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Icon-to-text gap, tight pairs |
| `sm` | 8px | Between related elements |
| `md` | 12px | Card internal gaps |
| `base` | 16px | Card padding, section gaps |
| `lg` | 20px | Between cards in a list |
| `xl` | 24px | Section padding (horizontal) |
| `2xl` | 32px | Between major sections |
| `3xl` | 48px | Screen top/bottom padding |

### Screen Padding
- Horizontal: 16px (both sides)
- Top: SafeArea + 8px
- Bottom: SafeArea + TabBar height + 8px
- Between list items: 12px

### Card Padding
- Outer padding: 16px all sides
- Inner section gaps: 12px
- Label-to-value gap: 4px
- Icon-text gap: 8px

---

## 5. BORDER RADIUS

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 6px | Small badges, chips |
| `md` | 10px | Buttons, inputs |
| `lg` | 16px | Cards |
| `xl` | 24px | Modal sheets, large cards |
| `2xl` | 32px | Bottom sheet handle area |
| `full` | 9999px | Avatars, status dots, pills |

---

## 6. SHADOWS

React Native shadows (iOS + Android elevation):

| Level | iOS Shadow | Android Elevation | Usage |
|-------|-----------|-------------------|-------|
| None | -- | 0 | Flat elements |
| Subtle | `0 2px 4px rgba(0,0,0,0.15)` | 2 | Cards at rest |
| Medium | `0 4px 12px rgba(0,0,0,0.25)` | 4 | Pressed cards, modals |
| Strong | `0 12px 32px rgba(0,0,0,0.40)` | 8 | Bottom sheets |
| Heavy | `0 24px 80px rgba(0,0,0,0.45)` | 12 | Floating overlays |

### Glow Effects (for urgency)

| Level | Box Shadow | When |
|-------|-----------|------|
| None | transparent | >2h remaining |
| Medium | `0 0 12px rgba(245,158,11,0.30)` | 30min-2h remaining |
| High | `0 0 16px rgba(239,68,68,0.40), 0 0 48px rgba(239,68,68,0.10)` | <30min remaining |

---

## 7. COMPONENT SPECS

### 7.1 Auction Card

```
┌─ Card ────────────────────────────────────────┐
│ padding: 16px                                  │
│ background: #1A1A1A                            │
│ border: 1px solid rgba(255,255,255,0.08)       │
│ borderRadius: 16px                             │
│ shadow: subtle                                 │
│                                                │
│ ┌─ Header Row ──────────────────────────────┐  │
│ │ [●] status dot (8px, pulsing if active)   │  │
│ │ "Hunedoara, Transilvania" — caption, muted│  │
│ │                          [♡] watchlist 24px│  │
│ └───────────────────────────────────────────┘  │
│ gap: 6px                                       │
│ ┌─ Title ───────────────────────────────────┐  │
│ │ "Lot 45 — Molid și Brad"                  │  │
│ │ h3, 17px, semibold, max 2 lines, ellipsis │  │
│ └───────────────────────────────────────────┘  │
│ gap: 8px                                       │
│ ┌─ Species Bar ─────────────────────────────┐  │
│ │ height: 6px, borderRadius: full            │  │
│ │ segments: colored by species, proportional │  │
│ │ shimmer animation if auction is active     │  │
│ └───────────────────────────────────────────┘  │
│ gap: 4px                                       │
│ ┌─ Species Tags ────────────────────────────┐  │
│ │ [Molid 60%] [Brad 25%] [+1]               │  │
│ │ pills: 6px radius, species color bg 10%   │  │
│ │ text: 11px caption, species color          │  │
│ └───────────────────────────────────────────┘  │
│ gap: 10px                                      │
│ ┌─ Metrics Row ─────────────────────────────┐  │
│ │ 📦 520 m³    👥 8 oferte    🏆 Tu conduci │  │
│ │ caption, 11px, muted   (leading = primary) │  │
│ └───────────────────────────────────────────┘  │
│ gap: 12px                                      │
│ ┌─ Footer ──── borderTop 1px subtle ────────┐  │
│ │ paddingTop: 12px                           │  │
│ │ ┌─ Price ──┐  ┌─ Timer ──┐  ┌─ Bid ────┐ │  │
│ │ │ 185      │  │ ⏱ 2h 14m │  │ [Oferta] │ │  │
│ │ │ €/m³     │  │ countdown │  │ 32x20px  │ │  │
│ │ │ price,22 │  │ ring+text │  │ primary  │ │  │
│ │ │ primary  │  │ caption   │  │ bg, 10px │ │  │
│ │ └──────────┘  └──────────┘  └──────────┘ │  │
│ └───────────────────────────────────────────┘  │
└────────────────────────────────────────────────┘

Press state: scale(0.98), opacity 0.9, 150ms
Hover (web): translateY(-4px), border → primaryBorder, glow shadow
```

### 7.2 Countdown Ring

```
┌──────────────────┐
│   SVG Circle     │
│   size: 44px     │
│   stroke: 3px    │
│   track: border  │
│   fill: progress │
│                  │
│   Center text:   │
│   "2h 14m"      │
│   caption, 10px  │
└──────────────────┘

Colors by time remaining:
  >33%: stroke = #22C55E (success)
  10-33%: stroke = #F59E0B (warning)
  <10%: stroke = #EF4444 (error) + pulse animation

Large variant (detail page):
  size: 120px
  stroke: 5px
  center text: 20px bold
```

### 7.3 Status Badge

```
┌──────────────────────┐
│ paddingH: 10px       │
│ paddingV: 4px        │
│ borderRadius: 6px    │
│ border: 1px          │
│ text: 11px, 600      │
│ uppercase             │
└──────────────────────┘

Variants: use Status-Specific Colors from Section 2
  Active: green bg/text/border
  Upcoming: warning bg/text/border
  Ended: muted bg/text/border
  Sold: primary bg/text/border
```

### 7.4 Bid Modal (Bottom Sheet)

```
┌─ Bottom Sheet ───────────────────────────────┐
│ background: #111111                           │
│ borderTopRadius: 24px                         │
│ padding: 24px                                 │
│ maxHeight: 85% screen                         │
│                                               │
│ ┌─ Handle ────────────────────────────────┐   │
│ │ width: 40px, height: 4px                │   │
│ │ background: rgba(255,255,255,0.20)      │   │
│ │ borderRadius: full, centered            │   │
│ │ marginBottom: 16px                      │   │
│ └─────────────────────────────────────────┘   │
│                                               │
│ ┌─ Header ────────────────────────────────┐   │
│ │ "Plasare Oferta"  h2, 20px, bold        │   │
│ │ [X] close button, 44x44 touch target    │   │
│ └─────────────────────────────────────────┘   │
│ gap: 16px                                     │
│ ┌─ Auction Info Card ─────────────────────┐   │
│ │ background: surface                      │   │
│ │ border: 1px primaryBorder                │   │
│ │ borderRadius: 12px, padding: 14px       │   │
│ │                                          │   │
│ │ Title (h3, truncated 1 line)            │   │
│ │ "Pret curent: 185 €/m³" — body, primary│   │
│ │ "Volum: 520 m³" — caption, muted        │   │
│ └─────────────────────────────────────────┘   │
│ gap: 16px                                     │
│ ┌─ Quick Bid Buttons ─────────────────────┐   │
│ │ 3 columns, gap: 8px                     │   │
│ │ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │
│ │ │ +1×     │ │ +3×     │ │ +5×     │    │   │
│ │ │ 189 €/m³│ │ 197 €/m³│ │ 205 €/m³│    │   │
│ │ │ outline │ │ outline │ │ outline │    │   │
│ │ │ primary │ │ primary │ │ primary │    │   │
│ │ │ h:48px  │ │ h:48px  │ │ h:48px  │    │   │
│ │ └─────────┘ └─────────┘ └─────────┘    │   │
│ │ text: label row + price row per button  │   │
│ └─────────────────────────────────────────┘   │
│ gap: 16px                                     │
│ ┌─ Input Section ─────────────────────────┐   │
│ │ Label: "Oferta maxima proxy (€/m³)"     │   │
│ │ label, 13px, 600                        │   │
│ │ gap: 6px                                │   │
│ │ ┌─ Input ──────────────────────────┐    │   │
│ │ │ height: 52px                      │    │   │
│ │ │ background: surfaceElevated       │    │   │
│ │ │ border: 1px border                │    │   │
│ │ │ borderRadius: 10px               │    │   │
│ │ │ text: 20px, bold                  │    │   │
│ │ │ placeholder: textMuted            │    │   │
│ │ │ focus border: primaryBorder       │    │   │
│ │ │ keyboardType: decimal-pad         │    │   │
│ │ └──────────────────────────────────┘    │   │
│ │ gap: 6px                                │   │
│ │ "Valoare totala: €96,200" — body, muted │   │
│ │ Error: "Minim 189 €/m³" — bodySmall, err│   │
│ └─────────────────────────────────────────┘   │
│ gap: 8px                                      │
│ ┌─ Info Text ─────────────────────────────┐   │
│ │ ℹ️ "Sistemul liciteaza automat..."       │   │
│ │ bodySmall, textSecondary                 │   │
│ └─────────────────────────────────────────┘   │
│ gap: 24px                                     │
│ ┌─ Submit Button ─────────────────────────┐   │
│ │ "Plaseaza Oferta"                        │   │
│ │ Primary button, full width               │   │
│ │ height: 52px                             │   │
│ │ disabled if invalid (opacity 0.5)        │   │
│ │ loading: ActivityIndicator replaces text │   │
│ └─────────────────────────────────────────┘   │
└───────────────────────────────────────────────┘

Backdrop: scrim (rgba(0,0,0,0.60))
Entry: spring slide-up (damping: 20, stiffness: 200)
Dismiss: swipe down or tap backdrop
```

### 7.5 Stat Card (Dashboard)

```
┌─ StatCard ───────────────────┐
│ width: (screen - 48) / 2     │
│ padding: 14px                │
│ background: surface          │
│ border: 1px border           │
│ borderRadius: 12px           │
│                              │
│ [icon 20px] — textSecondary  │
│ gap: 8px                     │
│ "12" — stat, 28px, primary   │
│ gap: 2px                     │
│ "Licitatii active"           │
│ — caption, 11px, muted       │
└──────────────────────────────┘

Layout: 2x2 grid, gap: 12px
```

### 7.6 Buffer Gauge (Proxy Bid Safety)

```
┌─ BufferGauge ────────────────────────────────┐
│ padding: 12px                                 │
│ background: surface                           │
│ border: 1px (colored by level)                │
│ borderRadius: 10px                            │
│                                               │
│ "Buffer proxy" — label, 13px                  │
│ gap: 8px                                      │
│ ┌─ Bar Track ────────────────────────────┐    │
│ │ height: 6px, borderRadius: full         │    │
│ │ background: surfaceElevated             │    │
│ │ ┌─ Bar Fill ───────────┐                │    │
│ │ │ width: proportional  │                │    │
│ │ │ borderRadius: full   │                │    │
│ │ │ color: by level      │                │    │
│ │ └──────────────────────┘                │    │
│ └─────────────────────────────────────────┘    │
│ gap: 4px                                      │
│ "Sigur ✓ — marja >= 3× increment"            │
│ — bodySmall, colored by level                 │
└───────────────────────────────────────────────┘

Levels:
  Safe (>=3x): bar = success, icon = ✓
  Warning (>=1x): bar = warning, icon = ⚠
  Danger (<1x): bar = error, icon = ●, pulse animation
```

### 7.7 Notification Card

```
┌─ NotificationCard ───────────────────────────┐
│ padding: 14px                                 │
│ background: surface (unread: surfaceElevated) │
│ borderRadius: 12px                            │
│ border: 1px border                            │
│ flexDirection: row, gap: 12px                 │
│                                               │
│ ┌─ Icon ──┐  ┌─ Content ────────────────┐    │
│ │ 36x36   │  │ "Ai fost depasit" — h3   │    │
│ │ rounded │  │ "Cineva a oferit..."      │    │
│ │ bg:tint │  │ — bodySmall, secondary    │    │
│ │ icon:wt │  │ "acum 5 minute" — caption │    │
│ └─────────┘  └──────────────────────────┘    │
│                                     [●] dot   │
│                                     if unread │
└───────────────────────────────────────────────┘

Unread dot: 8px circle, primary color, absolute top-right
Icon background tint matches notification type color at 10% opacity
```

### 7.8 Filter Sheet

```
┌─ FilterSheet (Bottom Sheet) ─────────────────┐
│ background: bgSoft                            │
│ borderTopRadius: 24px                         │
│ maxHeight: 80% screen                         │
│ padding: 20px                                 │
│                                               │
│ Handle bar (40x4px, centered)                 │
│ gap: 16px                                     │
│ "Filtre" h2 + active count badge + [X] close │
│ gap: 16px                                     │
│ ┌─ ScrollView ───────────────────────────┐    │
│ │                                         │    │
│ │ Section: "Specii" — label               │    │
│ │ Searchable multi-select list            │    │
│ │ Chips for selected items                │    │
│ │ gap: 16px                               │    │
│ │                                         │    │
│ │ Section: "Regiuni" — label              │    │
│ │ Checkbox list (8 items)                 │    │
│ │ gap: 16px                               │    │
│ │                                         │    │
│ │ Section: "Pret (€/m³)" — label         │    │
│ │ [Min ___] — [Max ___] row              │    │
│ │ gap: 16px                               │    │
│ │                                         │    │
│ │ Section: "Volum (m³)" — label           │    │
│ │ [Min ___] — [Max ___] row              │    │
│ │ gap: 16px                               │    │
│ │                                         │    │
│ │ Section: "Sortare" — label              │    │
│ │ Radio group (5 options)                 │    │
│ │                                         │    │
│ └─────────────────────────────────────────┘    │
│ gap: 16px                                     │
│ ┌─ Action Row ───────────────────────────┐    │
│ │ "Reseteaza" (ghost btn) + "Aplica" (primary)│
│ │ sticky bottom, safe area padding        │    │
│ └─────────────────────────────────────────┘    │
└───────────────────────────────────────────────┘
```

### 7.9 Buttons

#### Primary Button
```
height: 48px (default), 52px (large), 36px (small)
paddingH: 20px
background: #CCFF00 (Electric Lime)
text: #080808 (near-black)
font: 15px, weight 700 (Plus Jakarta)
borderRadius: 10px
shadow: 0 4px 12px rgba(0,0,0,0.25)

Pressed: opacity 0.85, scale(0.98)
Disabled: opacity 0.5
Loading: ActivityIndicator (dark) replaces text
```

#### Secondary / Outline Button
```
height: 48px
paddingH: 20px
background: transparent
border: 1px solid rgba(204,255,0,0.15)
text: #CCFF00
font: 15px, weight 600
borderRadius: 10px

Pressed: background rgba(204,255,0,0.10)
```

#### Ghost Button
```
height: 44px
paddingH: 16px
background: transparent
border: none
text: textSecondary
font: 14px, weight 500

Pressed: opacity 0.7
```

#### Destructive Button
```
Same as Primary but:
background: #EF4444
text: #FFFFFF
```

#### Quick Bid Button (Compact)
```
height: 32px
paddingH: 12px
background: rgba(204,255,0,0.10)
border: 1px solid rgba(204,255,0,0.20)
text: #CCFF00, 12px, 600
borderRadius: 8px

Pressed: background rgba(204,255,0,0.20)
```

### 7.10 Input Fields

```
height: 48px (default), 52px (large/bid)
paddingH: 14px
background: #242424 (surfaceElevated)
border: 1px solid rgba(255,255,255,0.08)
borderRadius: 10px
text: #F4F4F1, 15px, 400
placeholder: rgba(255,255,255,0.40)

Focus: border → rgba(204,255,0,0.30)
Error: border → rgba(239,68,68,0.50)
Error text below: 12px, #EF4444
```

### 7.11 Tab Bar (Bottom Navigation)

```
┌─ TabBar ─────────────────────────────────────┐
│ position: absolute bottom                     │
│ background: #080808                           │
│ borderTop: 1px solid rgba(255,255,255,0.06)  │
│ paddingBottom: safeArea                       │
│ paddingTop: 8px                              │
│ height: 56px + safeArea                      │
│                                               │
│  [icon]   [icon]   [icon]   [icon]   [icon]  │
│  Licitații Panou   Piata   Alerte   Profil   │
│                                               │
│ Active: icon primary, label primary, 600      │
│ Inactive: icon textMuted, label textMuted     │
│ Icon size: 24px                               │
│ Label: 10px, 500                              │
│ Badge (notifications): 18px circle, error bg  │
│ Touch target: 44x44 minimum per tab           │
└───────────────────────────────────────────────┘
```

### 7.12 Toast Notification

```
┌─ Toast ──────────────────────────────────────┐
│ position: absolute top, safeArea + 8px       │
│ marginH: 16px                                │
│ padding: 14px                                │
│ background: surfaceElevated                  │
│ border: 1px (colored by type)                │
│ borderRadius: 12px                           │
│ shadow: strong                               │
│ flexDirection: row, gap: 10px                │
│                                               │
│ [icon 20px]  Title — bodySmall, bold         │
│              Body — caption, secondary        │
│                                     [X] 24px │
└───────────────────────────────────────────────┘

Entry: translateY(-100%) → 0, spring 300ms
Exit: fade out 200ms
Auto-dismiss: 4 seconds
Stack: max 3 visible, newer pushes older up

Colors by type:
  success: border success, icon success
  error: border error, icon error
  warning: border warning, icon warning
  info: border info, icon info
```

### 7.13 Species Composition Bar

```
height: 6px (card), 10px (detail page)
borderRadius: full
overflow: hidden
flexDirection: row

Each segment:
  width: proportional to species percentage
  background: species color (see species colors table)
  minWidth: 2px (so tiny percentages still show)

Active auction shimmer:
  animated gradient overlay
  linear-gradient 90deg: transparent → rgba(255,255,255,0.15) → transparent
  translates left-to-right, 8s loop
```

---

## 8. ANIMATIONS & MOTION

### Easing Curves

| Name | Value | Usage |
|------|-------|-------|
| `standard` | `cubic-bezier(0.22, 1, 0.36, 1)` | Default for all transitions |
| `spring` | `{ damping: 20, stiffness: 200 }` | Bottom sheets, modals |
| `springLight` | `{ damping: 15, stiffness: 150 }` | Card press/release |
| `easeOut` | `cubic-bezier(0, 0, 0.2, 1)` | Exit animations |

### Duration Scale

| Name | Value | Usage |
|------|-------|-------|
| `instant` | 100ms | Color changes, opacity |
| `fast` | 200ms | Button press, tab switch |
| `normal` | 300ms | Card transitions, toasts |
| `slow` | 500ms | Page transitions |
| `glacial` | 800ms | Loading skeleton cycle |

### Animation Catalog

| Animation | Spec | Trigger |
|-----------|------|---------|
| **Card press** | scale 1→0.98, opacity 1→0.9, 150ms | Finger down on card |
| **Card release** | scale 0.98→1, springLight | Finger up |
| **Price flash** | scale 1→1.08→1, bg flash green/red, 600ms | New bid received |
| **Price shake** | translateX ±2px, 200ms | Large price jump (>10%) |
| **Live pulse dot** | scale 1→1.8→1, opacity 1→0→1, 2s loop | Active auction indicator |
| **Skeleton pulse** | opacity 0.3→0.7→0.3, 800ms loop | Loading state |
| **Countdown ring** | strokeDashoffset animates smoothly | Every second |
| **Urgency glow** | boxShadow pulse, 2s loop | <30min remaining |
| **Bid banner slide** | translateY -50→0, spring | Outbid/leading status change |
| **Toast enter** | translateY -100%→0, spring 300ms | New toast |
| **Toast exit** | opacity 1→0, 200ms | Auto-dismiss or swipe |
| **Bottom sheet** | translateY 100%→0, spring | Sheet open |
| **Tab indicator** | translateX animated, 200ms | Tab switch |
| **Shimmer bar** | translateX -100%→100%, 8s loop | Active auction species bar |

### Reduced Motion
- Check `AccessibilityInfo.isReduceMotionEnabled()`
- If true: disable all looping animations, replace springs with 200ms ease-out, keep functional animations (sheet open/close) but simplify

---

## 9. ICONOGRAPHY

### Icon Set: Ionicons (via `@expo/vector-icons`)

| Context | Icon Name | Size |
|---------|-----------|------|
| Tab: Auctions | `hammer-outline` / `hammer` | 24px |
| Tab: Dashboard | `grid-outline` / `grid` | 24px |
| Tab: Market | `trending-up-outline` / `trending-up` | 24px |
| Tab: Notifications | `notifications-outline` / `notifications` | 24px |
| Tab: Profile | `person-outline` / `person` | 24px |
| Card: Volume | `cube-outline` | 14px |
| Card: Bids | `people-outline` | 14px |
| Card: Leading | `trophy` | 14px |
| Card: Watchlist | `heart-outline` / `heart` | 22px |
| Detail: Share | `share-outline` | 22px |
| Detail: Location | `location-outline` | 16px |
| Detail: Timer | `time-outline` | 16px |
| Notif: Outbid | `arrow-up-circle` | 20px |
| Notif: Won | `trophy` | 20px |
| Notif: New bid | `hammer` | 20px |
| Notif: Ending | `time` | 20px |
| Notif: Sold | `cash-outline` | 20px |
| Action: Back | `chevron-back` | 24px |
| Action: Close | `close` | 24px |
| Action: Filter | `options-outline` | 20px |
| Action: Search | `search` | 20px |
| Action: Add | `add` | 24px |
| Status: Success | `checkmark-circle` | 16px |
| Status: Warning | `alert-circle` | 16px |
| Status: Error | `close-circle` | 16px |
| Doc: PDF | `document-text-outline` | 20px |
| Doc: Image | `image-outline` | 20px |
| Profile: Edit | `create-outline` | 20px |
| Profile: Password | `lock-closed-outline` | 20px |
| Profile: Logout | `log-out-outline` | 20px |

### Supplementary: MaterialCommunityIcons

| Context | Icon Name | Size |
|---------|-----------|------|
| Species: Tree | `tree` | 16px |
| Detail: Forest area | `pine-tree` | 16px |
| Detail: Slope | `slope-uphill` | 16px |
| Create: Camera | `camera` | 24px |
| Map: Pin | `map-marker` | 24px |

---

## 10. GLASS MORPHISM (for premium surfaces)

### Glass Card (use sparingly — modals, featured cards)

```
background: linear-gradient(
  180deg,
  rgba(28, 28, 28, 0.88),
  rgba(18, 18, 18, 0.92)
)
border: 1px solid rgba(255, 255, 255, 0.08)
borderRadius: 24px
shadow: 0 24px 80px rgba(0, 0, 0, 0.45)

Overlay (pseudo-element or gradient layer):
  linear-gradient(180deg, rgba(255,255,255,0.04), transparent 35%)
  Creates subtle light reflection at top edge

Hover/Press:
  border → rgba(204, 255, 0, 0.14)
  shadow intensifies
```

### Background Atmosphere (root screen)
```
Radial glow at top-left:
  radial-gradient(circle at 15% 20%, rgba(204,255,0,0.05), transparent 28%)
Radial glow at top-right:
  radial-gradient(circle at 85% 12%, rgba(204,255,0,0.04), transparent 20%)

Creates a subtle warm glow in the upper portion of the screen.
Implement as a fixed-position View with pointerEvents: none.
```

---

## 11. RESPONSIVE CONSIDERATIONS

The app is mobile-first, but should also look good on tablets:

| Breakpoint | Layout Change |
|-----------|---------------|
| < 380px (small phones) | Card price text: 18px instead of 22px. Stat grid: 1 column. |
| 380-428px (standard phones) | Default layout. 2-column stat grid. |
| > 428px (large phones) | Slightly more padding (20px screen edges). |
| > 768px (tablets) | 2-column auction card grid. 4-column stat grid. Side-by-side chart pairs. |

---

## 12. ACCESSIBILITY

| Rule | Implementation |
|------|---------------|
| Touch targets | Minimum 44x44pt for all interactive elements |
| Color contrast | Text on dark: minimum 4.5:1 ratio (WCAG AA) |
| Triple encoding | Status = color + icon + text label |
| Haptics | Confirm interactions for hearing/vision impairment |
| Screen reader | accessibilityLabel on all buttons, images, icons |
| Reduced motion | Check system setting, disable decorative animations |
| Font scaling | Support Dynamic Type (iOS) up to 1.5x |
| Focus indicators | 2px primary ring on focused elements (keyboard nav) |
