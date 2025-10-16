# Romanian Forest - Live Timber Auction Platform

## Overview
Romanian Forest is a mobile-first auction platform designed to connect Romanian forest owners with timber buyers. It facilitates real-time bidding for timber, aiming to streamline the timber market. The platform focuses on providing a transparent and efficient marketplace, leveraging technology to simplify the auction process for both sellers and buyers. Key capabilities include user authentication, real-time auction feeds, interactive bidding, and automated data extraction from felling permits. The project's ambition is to become the leading digital marketplace for timber in Romania.

## User Preferences
I want the agent to use simple and clear language in all communications. I prefer an iterative development approach, where changes are proposed and discussed before implementation. Please ask for confirmation before making any major changes to the codebase or architectural decisions. I appreciate detailed explanations for complex technical concepts or choices.

## System Architecture

### UI/UX Decisions
The platform features a Robinhood-inspired dark theme with neon green accents, aiming for a modern and engaging user experience. It's built with a mobile-first responsive design, incorporating a bottom navigation for ease of use on handheld devices. UI components from Shadcn/ui are utilized, and the design emphasizes clear typography with bold numerics for key information like prices and volumes. Key UI patterns include interactive auction cards with live badges and a full-screen bid modal.

### Technical Implementations
The frontend is built with React 18, TypeScript, Wouter for routing, and TanStack Query for state management. Styling is handled by Tailwind CSS. For real-time functionality and data storage, Firebase SDK (Auth, Firestore, Storage) is integrated. Recharts is used for market data visualizations.

### Feature Specifications
- **User Authentication**: Email/Password authentication with distinct roles for "Forest Owner" and "Buyer."
  - **Test Accounts**:
    - Forest Owner: marcel@gmail.com / password (varies)
    - Buyer: buyer@timber.com / Buyer_2025 (Timber Solutions company)
- **Real-time Auction Feed**: Displays live auctions with filtering capabilities (region, species, volume).
  - **Dual-View Interface**: Toggle between LIST and GRID modes for optimal viewing experience
    - **LIST Mode**: Robinhood-inspired compact table view for fast scanning, displays species, price/m³, total, bids, and time remaining in a single scannable row
    - **GRID Mode**: Premium card-based layout showcasing full APV permit details with enhanced visuals
    - Smooth framer-motion transitions between views
    - Responsive design adapts to mobile (icon-only toggle) and desktop (labeled toggle)
- **Proxy Bidding System (eBay-style)**: Advanced auction system with **€/m³ pricing**:
  - **€/m³ Pricing Model**: All bidding is in price-per-cubic-meter (€/m³) with dual display showing both per-m³ and projected total values
  - **Proxy Bidding**: Users enter starting bid and maximum proxy bid (both in €/m³), system auto-bids minimum needed to stay leader
  - **Second-Price Clearing**: Winner pays second-highest bid + minimum increment (all in €/m³)
  - **Species-Based Increments**: Dynamic minimums based on dominant species:
    - **Stejar (Oak) / Gorun**: €3/m³
    - **Fag (Beech)**: €2/m³
    - **Molid (Spruce) / Pin (Pine)**: €1/m³
    - **Default (other species)**: €2/m³
  - **Soft-Close Rule**: Bids in final 3 minutes extend auction by 3 minutes (repeatable)
  - **Activity Rule**: Only bidders who placed bids before T-15min can bid during soft-close period
  - **Anonymous Bidding**: Display bidders as BIDDER-XXXX codes for privacy
  - **Quick Bid Buttons**: Species-based increments (+€1/m³, +€2/m³, +€3/m³) that match species minimum
  - **Live Status Banners**: "YOU ARE LEADING" and "YOU WERE OUTBID" alerts with animations
  - **Dramatic UI**: Countdown timers with pulse effects, urgency messaging for auctions ending soon
  - **Dual Display Format**: Primary display in €/m³, secondary display shows projected total (€/m³ × volume)
- **Listing Creation**: Forest owners can create detailed auction listings, including species breakdown.
- **OCR APV Permit Scanning**: Utilizes OpenAI GPT-4 Vision API to automatically extract comprehensive data from felling permits (images/PDFs) to pre-fill auction details, reducing manual entry and errors. Extracts **22 complete APV fields** including:
  - **Basic Information (12 fields)**: Permit number, permit code, production unit (UP), UA location, forest company, surface area (ha), treatment type, product type, extraction method, inventory date, harvest year, inventory method, hammer mark, accessibility
  - **Tree/Forest Metrics (8 fields)**: Total volume, net/gross volumes, tree count, average height, average diameter, average age, slope percentage, starting price
  - **Volume Breakdown (7+ types)**: Dimensional sorting (G1, G2, G3, M1, M2, LS), firewood volume, bark volume
  - **Species Breakdown**: Automated calculation of species composition percentages
- **Role-based Dashboards**: Comprehensive dashboard system with tailored views for each user role:
  - **Forest Owner Dashboard**:
    - Performance stats: Total auctions, average bids/auction, average price/m³, success rate
    - Tabbed interface: Active, Upcoming, Completed auctions
    - Auction management: View details, view bids for each listing
    - Real-time bid count and pricing updates
  - **Buyer Dashboard**:
    - Bidding analytics: Active bids, auctions won, win rate, volume purchased, average price paid
    - Tabbed interface: Active Bids, Watchlist, Won Auctions
    - Active bids table: Shows current position (leading/outbid), max proxy bid, time remaining
    - Won auctions: Final price, total paid, purchase history
    - **Watchlist Feature**: Save auctions for later with heart icon toggle, view in dedicated tab
- **In-app Notifications**: Alerts for bid activities (outbid, won, new bid).
- **Market Dashboard**: Visualizes price trends by species.

### System Design Choices
Due to Replit's environment limitations blocking standard Firebase transports, a **Backend API Proxy Pattern** is implemented. The client-side uses only Firebase Auth, while all Firestore operations are routed through a custom Express.js backend server. This backend acts as a proxy, using a custom Firestore REST API client with OAuth2 service account authentication to communicate with Firestore Native. This ensures secure and functional access to Firestore. Firebase Authentication handles user authentication, and Firebase Storage is planned for file uploads.

### Data Integrity & Error Handling
All dashboard price calculations and formatters implement **defensive programming patterns** to prevent NaN/undefined display bugs:
- **Price Formatters**: `formatPrice()` and `formatPricePerM3()` accept `undefined | null` and return fallback values ('0 EUR', '0 €/m³')
- **Calculation Fallbacks**: All `pricePerM3` calculations use triple nullish coalescing: `auction.currentPricePerM3 ?? auction.startingPricePerM3 ?? 0`
- **Total Value Safety**: `totalValue` calculations protect against undefined volumes: `pricePerM3 * (auction.volumeM3 || 0)`
- **Status Badge Robustness**: Handles all backend status values (draft, upcoming, active, ended, sold, cancelled) with fallback to outline variant

### Firestore Collections Structure
- `users`: Stores user profiles, roles, and KYC status.
- `auctions`: Contains detailed auction information, including APV permit fields extracted via OCR, plus **€/m³ proxy bidding fields**:
  - **€/m³ Pricing Fields**:
    - `startingPricePerM3` (€/m³ starting price)
    - `currentPricePerM3` (€/m³ current price)
    - `secondHighestPricePerM3` (€/m³ second-highest bid for clearing)
    - `highestMaxProxyPerM3` (€/m³ winner's maximum proxy bid)
    - `projectedTotalValue` (calculated: pricePerM3 × volumeM3)
    - `dominantSpecies` (determines increment: Stejar/Gorun/Fag/Molid/Pin)
  - **Proxy Bidding Control**:
    - `currentBidderAnonymousId` (BIDDER-XXXX format)
    - `softCloseActive` (boolean flag for soft-close period)
    - `originalEndTime`, `activityWindowCutoff` (T-15min timestamp)
  - **Legacy fields** (`currentBid`, `startingPrice`) maintained for backward compatibility with fallback logic
- `bids`: Records all bids with **€/m³ proxy bidding details**:
  - `amountPerM3` (€/m³ actual bid placed)
  - `maxProxyPerM3` (€/m³ user's maximum willing to pay)
  - `isProxyBid` (whether auto-placed by system)
  - `bidderAnonymousId` (BIDDER-XXXX format)
  - **Legacy fields** (`amount`, `maxProxyBid`) maintained for backward compatibility
- `notifications`: Manages in-app notifications for users.
- `watchlist`: Buyer's saved auctions for tracking:
  - `userId` (buyer ID)
  - `auctionId` (reference to auction)
  - `addedAt` (timestamp)

## External Dependencies
- **Firebase**:
    - **Authentication**: For user sign-up and login.
    - **Firestore Native**: Primary database for all application data (users, auctions, bids, notifications).
    - **Storage**: Planned for storing forest photos and KYC documents.
- **OpenAI GPT-4 Vision API**: Used for OCR capabilities to extract data from APV felling permits.
- **Recharts**: A charting library for displaying market data visualizations.
- **Wouter**: A small routing library for React applications.
- **TanStack Query**: For data fetching, caching, and state management.
- **Tailwind CSS**: A utility-first CSS framework for styling.
- **Shadcn/ui**: Component library for pre-built UI components.