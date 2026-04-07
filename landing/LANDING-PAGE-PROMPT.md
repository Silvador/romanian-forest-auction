# RoForest Landing Page — Complete Build Prompt

> Paste this entire prompt into an AI chat to recreate the landing page from scratch.

---

## Project Context

Build a landing page for **RoForest** — Romania's first zero-commission digital timber auction marketplace. The platform connects forest owners and timber buyers directly through live auctions, real-time pricing in RON (Romanian Lei), and market analytics. Target audience: Romanian forestry professionals (cherestelei, proprietari de paduri, ocoale silvice).

The design aesthetic is **"trading terminal meets forest"** — think Robinhood's data density applied to timber. Dark, premium, cinematic — like a gallery walkthrough, not a startup template. Every section should feel authored and intentional.

---

## Design System

### Color Palette (Forest-Tinted Darks)
```
Background:       #1A1D1A  (forest-tinted near-black, NOT pure black)
Surface:           #252825  (elevated panels)
Card surface:      linear-gradient(165deg, #1e211e 0%, #161816 100%)
Panel:             rgba(37, 40, 37, 0.82)
Panel border:      rgba(255, 255, 255, 0.08)
Text primary:      #f4f4f1  (warm off-white, NOT pure white)
Text muted:        rgba(255, 255, 255, 0.66)
Text strong:       rgba(255, 255, 255, 0.82)
Accent:            #CCFF00  (Electric Lime — the signature color)
Accent soft:       rgba(204, 255, 0, 0.18)
Accent deep:       #a8d600
Success:           #2ECC71
Error/Danger:      #E74C3C
Warning:           #F97316
```

**Critical rule:** The green undertone in the darks (`#1A1D1A` not `#080808`) is what gives the site its forestry identity. Pure black looks tech-generic. Every background, card, and panel should carry this forest tint.

### Typography (3-Font System)
```
Editorial:  'Playfair Display', Georgia, serif     → Hero headlines, manifesto, CTA section
Display:    'Space Grotesk', sans-serif             → Data values, metric numbers, subheadings
Body:       'Plus Jakarta Sans', Inter, sans-serif  → Navigation, body text, buttons, labels
```

**The key principle:** Serif carries emotion (hero, manifesto, CTA headline). Sans carries interface (nav, data, cards). The contrast between editorial serif and neutral sans creates premium tension. Only 20-30% of the page uses serif.

**Size scale (responsive with clamp):**
- Hero title: `clamp(2.6rem, 5.5vw, 4.8rem)` — Playfair Display, weight 600, italic on accent
- Section h2: `clamp(2rem, 4.5vw, 3.8rem)` — Space Grotesk, weight 700
- Section h3: `clamp(1.3rem, 2vw, 1.65rem)` — Space Grotesk, weight 700
- Body: `1.02-1.08rem` — Plus Jakarta Sans, weight 400
- Eyebrow: `0.92rem` — uppercase, letter-spacing 0.14em, accent color
- All headings: `letter-spacing: -0.05em`, `line-height: 1.02`

### Spacing & Radii
```
Section padding:     72px vertical (standard), 100px (showcase), 120px (CTA)
Container:           min(calc(100% - 40px), 1200px), centered
Card padding:        24-28px
Grid gaps:           8px (bento), 16px (data strip, benefits, metrics), 80px (showcase columns)
Border radius:       48px (iPhone frame), 24px (cards), 22px (bento), 18px (buttons), 14px (small)
Transition:          360ms cubic-bezier(0.22, 1, 0.36, 1)  — used everywhere
```

### Glassmorphic Card Treatment
Every card (bento, metric, benefit) should have:
```css
border: 1px solid rgba(255,255,255,0.10);
background: linear-gradient(165deg, #1e211e 0%, #161816 100%);
backdrop-filter: blur(16px);
box-shadow:
  0 0 0 1px rgba(255,255,255,0.04) inset,     /* inner edge highlight */
  0 1px 0 rgba(255,255,255,0.06) inset,         /* top inner glow */
  0 20px 60px rgba(0,0,0,0.3);                   /* outer depth shadow */
```

On hover:
```css
border-color: rgba(204, 255, 0, 0.15);
box-shadow:
  0 0 0 1px rgba(204,255,0,0.06) inset,
  0 1px 0 rgba(255,255,255,0.08) inset,
  0 24px 80px rgba(0,0,0,0.4),
  0 0 40px rgba(204,255,0,0.04);               /* subtle accent glow */
transform: translateY(-6px);
```

---

## Page Structure (Top to Bottom)

### 1. Background Layers (Fixed, behind everything)

Two fixed layers covering the viewport:
- **`.page-bg`**: Subtle radial gradients — accent glow at 15%/20% position (opacity 0.06), accent glow at 85%/12% (opacity 0.05), white glow at 50%/65% (opacity 0.02), base color #1A1D1A
- **`.page-noise`**: A noise/grain texture image at 0.13 opacity, `mix-blend-mode: screen`, `filter: contrast(1.1) brightness(0.8)`. This prevents flat minimalism — the subtle grain adds depth.

### 2. Header (Sticky Navigation)

- **Position:** Sticky top, z-index 30, `backdrop-filter: blur(18px)`
- **Inner shell:** Flex row with border-radius 24px, background `rgba(14, 14, 14, 0.74)`, 1px border
- **Contents:** Logo + "Romanian Forest" (left) → Nav links: "What we do", "What we offer", "Benefits" (center) → "Join Waitlist" button (right)
- **Scroll behavior:** Background opacity increases when scrolled past 30px (JS-driven)
- **Design principle:** The header stays calm and predictable while sections change dramatically beneath it. It's the usability anchor.

### 3. Hero Section

- **Padding:** 100px top, 80px bottom
- **Background:** Rotating conic gradient glow (green/accent tones), 10s infinite rotation, blurred 100px, opacity 0.35
- **Content (centered, flex column):**
  1. **Pill link:** "Piata forestiera digitala →" — warm off-white bg (`rgba(244,244,241,0.06)`), subtle border, 100px radius
  2. **Headline (Playfair Display, 600):** "Romania's First Zero-Commission," + line break + `<span class="hero-accent">Open Forest Marketplace</span>` — accent span is Electric Lime, italic
  3. **Supporting text:** "Buy, sell, and manage forests with full transparency. No brokers. No hidden fees. Just owners and forestry companies connecting directly."
  4. **CTA button:** "Join Waitlist" — Electric Lime bg, dark text, 18px radius, icon grid + arrow animation
  5. **Scroll cue:** 1px wide, 32px tall accent line at bottom, animates `scaleY(0→1→0)` on 2.4s loop

### 4. Manifesto Statement Block

This is a Redo Media-inspired "conceptual interlude" — one powerful idea before information density increases.

- **Min-height:** 70vh, flex-centered
- **Background:** Subtle dotted-grid texture (CSS radial-gradient pattern creating tiny dots)
- **Content:** Single paragraph, Playfair Display italic, `clamp(2rem, 4.5vw, 3.8rem)`
- **Selective text de-emphasis technique:**
  - Default text color: `rgba(255,255,255,0.30)` (dim)
  - `.manifesto-bright` spans: full white, weight 600, not italic
  - `.manifesto-dim` span: starts at `rgba(255,255,255,0.15)`, animates to `#CCFF00` when scrolled into view (1.2s transition, 0.6s delay)
- **Text:** "**Piata forestiera din Romania** nu a avut niciodata **transparenta** pe care o merita. *Pana acum.*"

### 5. Showcase Sections (5 total)

Each showcase is a 2-column grid (text left, iPhone mockup right) with scroll-triggered entrance animations.

**Layout:** `grid-template-columns: 1fr 1fr`, gap 80px, center-aligned
**Padding:** 100px vertical per section

**Left column (text):**
- Eyebrow (accent, uppercase, with gradient line)
- h2 headline (max-width 16ch)
- Body text (max-width 42ch, margin-top 16px)
- Ghost link: "Join the waitlist →"
- **Animation:** Fades in from `translateX(-50px)`, 0.8s

**Right column (iPhone mockup):**
- Realistic iPhone frame: 290px wide, border-radius 48px, 6px padding, gradient titanium body
- Dynamic Island notch (90px wide, 26px tall, with camera dot)
- Screen area: border-radius 44px, contains a real screenshot image (`<img>`)
- Home indicator bar at bottom (110px × 4px, white at 20% opacity)
- Side buttons (volume, power)
- **Animation:** Fades in from `translateX(80px) scale(0.92) rotateY(-4deg)`, 0.9s with 0.15s delay

**Section mood shifts:** Each showcase gets a unique ambient `radial-gradient` via `::before` pseudo-element at different positions (top-right, center, bottom-left, etc.) — creates the feeling of "chapters" not uniform blocks.

**The 5 showcases:**
| # | ID | Eyebrow | Headline | Screenshot |
|---|---|---|---|---|
| 1 | showcase-auctions | Licitatii in Timp Real | Live auctions with transparent bidding | Auction feed with species bars, countdown pills |
| 2 | showcase-detail | Liciteaza cu Incredere | The burn ring shows exactly how much time is left | Auction detail with 24-segment burn ring |
| 3 | showcase-market | Cunoaste Piata | Real prices. Real data. No guessing. | Market analytics with price trends, species comparison |
| 4 | showcase-map | Licitatii Langa Mine | Find timber near you on the map | Satellite map with colored auction pins |
| 5 | showcase-dashboard | Panoul Tau | See your revenue grow in real-time | Owner dashboard with revenue metrics |

### 6. Data Strip (Live Market Stats)

A 4-column grid of stat cards styled like the mobile app's summary bar.

```
┌─────────────┬──────────────────┬─────────────┬─────────────┐
│     9       │   187 RON        │   4,280     │     0%      │
│ licitatii   │ pret mediu/m³    │ m³ vanduti  │  comision   │
│  active     │     ↑ 4.2%       │             │ pe tranzactii│
└─────────────┴──────────────────┴─────────────┴─────────────┘
```

- Cards start invisible (`opacity: 0, translateY(20px)`) and stagger in left-to-right with 100ms delay on scroll
- The RON price card gets an accent border variant
- Values use Space Grotesk, 2rem, bold, accent color
- Trend indicator: `#2ECC71` (green, ↑4.2%)

### 7. "What We Do" Section

Simple centered section:
- Eyebrow: "What we do"
- Headline: "A zero-commission digital marketplace for Romania's forests"
- Body text + CTA button

### 8. Problem Section ("Why the Market Feels Broken")

**Layout:** Full-width copy on top, then 3-column metric cards below (NOT side-by-side — that makes cards too narrow).

**Copy block (max-width 720px):**
- Eyebrow: "De ce piata forestiera pare stricata"
- Headline (Playfair Display): "Tranzactiile se fac *offline*, vizibilitatea e *limitata*, iar valoarea **se pierde la intermediari.**"
  - `<em>` tags for italic emphasis on key words
  - `.problem-leak` span starts dim (`rgba(255,255,255,0.35)`) and animates to **red** (`#E74C3C`) on scroll — the "leak" is visually encoded as danger
- Body text below with `--muted-strong` color

**3 Metric cards (full-width 3-column grid, gap 16px):**

| Metric | Title | Description |
|--------|-------|-------------|
| **28%** | Romania e acoperita de paduri | Una dintre cele mai mari resurse forestiere din Europa... |
| **Offline** | Majoritatea tranzactiilor ocolesc piata | Intermediarii iau marje de 15-30%... |
| **In crestere** | Cererea depaseste transparenta | Conformitate EUDR, credite de carbon, FSC... |

- Metric numbers: Space Grotesk, `clamp(1.8rem, 3vw, 2.4rem)`, bold, accent color
- Cards use the standard glassmorphic treatment
- h3: 1.05rem, bold, white. Body: 0.88rem, 0.45 opacity

### 9. Bento Grid ("Ce Oferim" — What We Offer)

**This is the showcase section.** An asymmetric grid inspired by Leo Hale's portfolio bento — mixed card heights, atmospheric imagery, interactive elements.

**Header:** Centered, eyebrow "Ce oferim", h2, body text

**Grid layout (3 columns):**
```
┌──────────────┬──────────┬──────────────┐
│  LICITATII   │VERIFICATI│   PRETURI    │
│  (tall,      │(standard)│  (tall,      │
│   2 rows)    │──────────│   2 rows)    │
│  burn ring   │  ZERO    │  sparklines  │
│  animation   │ COMISION │  + marquee   │
│              │ (metric) │              │
├──────────────┼──────────┼──────────────┤
│    HARTA     │ ANALIZA  │  INSCRIE-TE  │
│  (wide, 2col)│(standard)│  (small CTA) │
└──────────────┴──────────┴──────────────┘
```

**Card details:**

**A. Licitații live (tall, spans 2 rows, min-height 460px):**
- Background: Faded auction detail screenshot (0.5 opacity, Ken Burns `scale(1.05)` on hover)
- Label: "✦ Licitații ✦" (sparkle stars flanking, rotate 90° on hover)
- **Animated burn ring SVG:** 16 arc segments in a circle (160px diameter). CSS animation cycles segments from green (#2ECC71) → orange (#F97316) → red (#E74C3C) with staggered delays. Time "2:14:32" in center (Space Grotesk). Price "185 RON/m³" below in accent.
- Bottom: title + description

**B. Vânzători verificați (standard, text-only):**
- No background image — clean glass surface. Let the text breathe.
- Label: "✦ Încredere ✦"
- Title + description about KYC verification

**C. Prețuri vizibile (tall, spans 2 rows):**
- Label: "✦ Transparență ✦"
- **4 sparkline rows:** Each shows species dot (colored) + name + inline SVG sparkline (60×20px polyline) + current price in RON + trend percentage (green ↑ or red ↓)
  - Molid: #2ECC71, 178 RON, ↑5.3%
  - Fag: #D4A574, 210 RON, ↑2.1%
  - Brad: #4A7C59, 165 RON, ↓1.8%
  - Stejar: #8B6914, 245 RON, ↑8.7%
- **Species marquee:** Auto-scrolling horizontal strip of glassmorphic pills with species names and colored dots. Infinite loop (25s), pauses on hover. Uses duplicate set for seamless scroll + mask-image fade at edges.
- Bottom: title + description

**D. Zero comision (standard, hero metric):**
- Background: Faded auction feed screenshot
- Label: "✦ Valoare ✦"
- **"0%"** in massive type: `clamp(4rem, 8vw, 6.5rem)`, accent color, Space Grotesk
- Subtext: "comision pe fiecare tranzactie" (13px, 0.4 opacity)

**E. Harta licitatiilor (wide, spans 2 columns):**
- **Full-bleed** map screenshot (mask fades to top, not to left)
- Label: "✦ Localizare ✦"
- Title + description about satellite pins

**F. Inscrie-te (small CTA card, min-height 140px):**
- Label: "✦ Inscrie-te ✦"
- **Oversized diagonal arrow** (48×48 SVG) — muted color, animates to accent + `translate(4px, -4px)` on hover
- "Lista de asteptare" text below

**Bento interactive effects (JS-driven, desktop only):**
1. **Spotlight:** Radial gradient follows cursor (CSS custom properties --mx, --my)
2. **Border glow:** Edge highlight tracks cursor using mask-composite
3. **Tilt:** 3D perspective rotate (6° Y, 3° X) with lerp smoothing (0.08 factor)
4. **Magnetism:** 3px X, 2px Y translate toward cursor
5. **Ripple:** Click creates expanding radial gradient (650ms)
6. **Particles:** 8 floating dots per card with random drift animation (2.5-4.5s cycles)
- All effects respect `prefers-reduced-motion` and disable on touch devices

### 10. Benefits Section

6 glassmorphic cards in a 3-column grid. All in Romanian:
- Pastrezi 100% din valoare
- Ajungi direct la cumparatori
- Preturi reale, in RON
- Listeaza in 2 minute
- Instrumente de management
- Trasabilitate EUDR

### 11. CTA Section (Waitlist)

- Eyebrow: "Fii printre primii"
- Headline (Playfair Display): "Viitorul pietei forestiere din Romania — deschis, corect, sustenabil."
- Body + email input + "Join Waitlist" button
- Accent ambient glow via `::before` pseudo

### 12. Footer

Minimal: "© 2026 Romanian Forest. Toate drepturile rezervate." + "Construit in Romania pentru padurile Romaniei."

---

## Animation System

### Scroll Reveal (IntersectionObserver)
- All `.reveal` elements start `opacity: 0; transform: translateY(28px)`
- Observer: threshold 0.16, rootMargin `0px 0px -8% 0px`
- On intersect: add `.is-visible` class with staggered delay (max 280ms)
- Variants: `.reveal-right` (translateX 40px), `.reveal-down` (translateY -18px)
- Unobserves after triggering (one-shot)

### Lenis Smooth Scroll
```js
const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: true,
});
```
- RAF loop drives it. Skip init if `prefers-reduced-motion: reduce`.
- CSS: `html.lenis, html.lenis body { height: auto }` and `.lenis.lenis-smooth { scroll-behavior: auto }`

### Key CSS Animations
- **hero-glow:** Conic gradient rotates 360° in 10s (infinite)
- **scroll-cue-pulse:** scaleY 0→1→0, 2.4s infinite
- **arrow-nudge:** Button arrow shifts 4px/-4px with opacity fade, 3s infinite
- **segment-burn:** Burn ring segments cycle green→orange→red, 10s per segment with staggered delays
- **marquee-scroll:** Species pills translateX 0→-50%, 25s linear infinite
- **bento-drift:** Particle dots float via --dx/--dy CSS variables
- **bento-ripple:** Scale 0→1 with opacity fade, 650ms

### Showcase Entrance
- Left column: `translateX(-50px)` → origin, 0.8s
- Right column: `translateX(80px) scale(0.92) rotateY(-4deg)` → origin, 0.9s with 0.15s delay

---

## Responsive Behavior

**1100px breakpoint:**
- Two-column layouts → single column
- Bento: 3 columns → 2 columns, wide cards lose span
- Showcases: 50px padding, phone moves above text
- iPhone frame: 240px width
- CTA/footer/nav: stack vertically

**820px breakpoint:**
- All grids → single column
- Data strip: 2 columns
- Section padding: 42px
- h1 max-width: 10ch

**560px breakpoint:**
- Container: calc(100% - 24px)
- Buttons: full-width
- Various small-screen refinements

---

## Technical Notes

- **No build system** — static HTML/CSS/JS. Single page.
- **External dependency:** Lenis v1 via CDN (`unpkg.com/lenis@1/dist/lenis.min.js`)
- **Google Fonts:** Playfair Display (ital 400/600), Plus Jakarta Sans (400-800), Space Grotesk (400/500/700)
- **All prices in RON** (Romanian Lei), never EUR
- **Language:** Primarily Romanian with diacritics where possible. Some English kept for international appeal (hero headline, showcase h2s)
- **Screenshots:** Real @2x PNG exports from Pencil design tool. Stored in `assets/` folder.
- **Accessibility:** All animations respect `prefers-reduced-motion`. ARIA labels on interactive elements. Semantic HTML.

---

## Content Reference

### Species & Prices (Romanian timber)
| Species | Romanian | Color | Price/m³ | Trend |
|---------|----------|-------|----------|-------|
| Spruce | Molid | #2ECC71 | 178 RON | ↑5.3% |
| Beech | Fag | #D4A574 | 210 RON | ↑2.1% |
| Fir | Brad | #4A7C59 | 165 RON | ↓1.8% |
| Oak | Stejar | #8B6914 | 245 RON | ↑8.7% |
| Maple | Paltin | #9B59B6 | — | — |
| Hornbeam | Carpen | #E67E22 | — | — |

### Key Value Props
- Zero commission on every sale
- Direct connection between forest owners and buyers
- Real-time auction with countdown (burn ring)
- Market analytics by species and region
- Map-based discovery ("Licitatii langa mine")
- EUDR compliance and traceability
- All in RON, all in Romanian
