# Romanian Forest Mobile App - Design Guidelines

## Design Approach: Reference-Based (Robinhood-Inspired Trading Platform)

**Primary Reference**: Robinhood mobile app aesthetic adapted for timber auction marketplace
**Rationale**: Financial trading platforms excel at real-time data presentation, urgent calls-to-action, and hierarchy for quick decision-making—perfect for live auction environments.

---

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**
- Background Primary: 0 0% 7% (deep charcoal)
- Background Secondary: 0 0% 11% (card backgrounds)
- Background Elevated: 0 0% 14% (modals, overlays)
- Success/Brand Green: 142 76% 36% (neon green for CTAs, positive indicators)
- Critical Red: 0 84% 60% (outbid alerts, urgent timers)
- Text Primary: 0 0% 95% (white)
- Text Secondary: 0 0% 60% (gray text)
- Border/Divider: 0 0% 20% (subtle separators)

**Accent Colors**
- Forest Stejar (Oak): 30 80% 50% (warm amber for oak species tags)
- Forest Fag (Beech): 45 70% 60% (golden beech indicators)
- Forest Molid (Spruce): 120 40% 45% (deep green for spruce)

### B. Typography

**Font Family**: System fonts for performance
- iOS: -apple-system, SF Pro Display
- Android: Roboto
- Fallback: sans-serif

**Type Scale**
- Hero/Display: 32px/36px, Bold (auction titles on detail screen)
- H1 Titles: 24px/28px, Bold (screen headers)
- H2 Subtitles: 18px/22px, Semibold (card titles)
- Body Large: 16px/24px, Medium (primary content, bid amounts)
- Body: 14px/20px, Regular (descriptions)
- Caption: 12px/16px, Medium (metadata, timestamps)

**Hierarchy**: Bold numerics for prices/volumes, uppercase labels for status badges

### C. Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16 for consistent rhythm
- Card padding: p-4 (16px)
- Section gaps: gap-4 to gap-6
- Screen padding: px-4 py-6
- Button height: h-12 or h-14

**Grid System**
- Single column for mobile (primary view)
- 2-column grid for auction cards in feed (on larger phones)
- Safe area insets respected for notched devices

### D. Component Library

**Auction Cards**
- Dark elevated background with subtle border
- Top: Thumbnail image or map preview (16:9 ratio, rounded corners)
- Middle: Location badge, species tags (pill badges), volume metric
- Bottom: Current bid (large, bold, green), countdown timer (red if <1 hour)
- Tap target: Entire card clickable

**Bid Modal**
- Full-screen overlay with blur backdrop
- Central card with current bid, input field, and large "Place Bid" button
- Live bid updates animate in from top
- Haptic feedback on bid submission

**Status Badges**
- Rounded pill shapes with species icons
- Color-coded by species (amber, gold, green)
- "Live" badge pulses with subtle animation

**Buttons**
- Primary: Full-width, neon green background, bold white text, h-12
- Secondary: Outline style with green border, transparent background
- Destructive: Red background for withdrawal actions
- Icon buttons: 44x44 tap targets minimum

**Navigation**
- Bottom tab bar (5 tabs): Feed, Create, Dashboard, Market, Profile
- Icons with labels, active state uses neon green
- Floating action button for "Create Listing" on Feed screen

**Input Fields**
- Dark background with lighter border
- Focus state: Neon green border glow
- Prefix icons for currency/volume inputs
- Error states in red with helper text

**Charts**
- Line charts for market trends (green upward, red downward)
- Minimal grid lines, dark background
- Interactive tooltips on touch
- Species breakdown as horizontal bar or donut chart

### E. Animations

Use sparingly for critical feedback only:
- Live bid updates: Slide in from top with quick fade
- Countdown timers: Color shift to red when <1 hour
- Pull-to-refresh: Subtle spinner
- Page transitions: Slide left/right (iOS style)
- Bid confirmation: Success checkmark animation

---

## Screen-Specific Guidelines

**Home Feed**: Infinite scroll auction cards, sticky filter bar at top, floating "+" button for create listing

**Auction Detail**: Hero image/map at top, sticky bid button at bottom, collapsible sections for documents/species breakdown

**Create Listing**: Multi-step wizard with progress indicator, image upload with preview grid, form validation inline

**Profile Dashboard**: Split metrics cards (2 columns), list of active/past auctions below, KYC status banner at top

**Market Dashboard**: Full-screen chart with time period tabs (1W, 1M, 3M), species filter chips below

**Notifications**: List view with icons, timestamps, unread indicators, swipe actions

---

## Image Strategy

**Hero Images**: Full-width forest photos on auction detail screens (16:9 aspect ratio)

**Thumbnails**: Square or 4:3 previews on auction cards

**KYC Documents**: PDF thumbnails with file type indicators

**Empty States**: Simple illustrations (not photos) for empty auction feed or no bids

---

## Mobile-First Considerations

- Minimum 44px tap targets
- Thumb-friendly bottom navigation
- Single-handed operation where possible
- Optimized for 375px width (iPhone SE) and up
- Landscape mode disabled for consistency
- Safe area padding for notched devices