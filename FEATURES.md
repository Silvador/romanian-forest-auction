# Romanian Forest Auction Platform - Complete Feature List

## Project Overview
A specialized online auction platform for Romanian forest timber lots with real-time bidding, APV document processing, and comprehensive auction management.

---

## 1. Authentication & User Management

### Firebase Authentication
- Email/password authentication
- Google OAuth integration
- Password reset functionality
- Email verification
- Persistent authentication state

### User Roles & Permissions
- **Forest Owners**: Create and manage auction listings
- **Buyers**: Browse auctions, place bids, track winning bids
- Role-based access control (RBAC)
- Protected routes based on user role

### User Profile Management
- Display name and email
- Profile creation timestamp
- User-specific dashboards
- Activity tracking

---

## 2. Auction Creation & Management

### Auction Creation Wizard
- Multi-step form with validation
- Draft saving functionality
- Real-time form validation with React Hook Form + Zod

### Basic Auction Information
- Title and description
- Location selection (Romanian regions)
- GPS coordinates (latitude/longitude)
- Volume in cubic meters (m³)
- Starting price per m³
- Auction timing configuration

### Timber Species Management
- Multiple species breakdown
- Percentage-based species composition
- Visual species indicators
- Automatic dominant species detection
- Species-specific pricing increments
- Support for 20+ Romanian timber species:
  - Stejar (Oak), Fag (Beech), Molid (Spruce)
  - Brad (Fir), Pin (Pine), Frasin (Ash)
  - And many more...

### Auction Timing Controls
- Start time configuration (minutes/hours from now)
- Duration settings (days/hours)
- Automatic timezone handling
- Test mode with quick timers for development

### Auction Lifecycle Management
- **Draft**: Saved but not published
- **Upcoming**: Scheduled to start
- **Active**: Currently accepting bids
- **Ended**: Bidding closed
- **Sold**: Winner determined
- Automatic status transitions based on time
- Scheduled lifecycle checks every minute
- Notification triggers on status changes

### Image Management
- Multiple image upload support
- Firebase Storage integration
- Image URL management
- Default fallback images

---

## 3. Document Upload & Management

### APV Document Processing
- **APV (Aviz de Punere in Valoare)**: Official forestry permit
- PDF upload support
- Required document validation
- Automatic OCR extraction of key information
- Document storage in Firebase Storage

### OCR Integration (OpenAI Vision API)
- Automatic extraction of:
  - Permit number
  - Permit date
  - Forest district (ocolul silvic)
  - Production unit (unitatea de productie)
  - Parcel details (parcela)
  - Species breakdown with volumes
  - Total volume verification
- Species name normalization
- Dominant species auto-detection
- Error handling for OCR failures

### Additional Document Support
- Multiple document uploads per auction
- Document metadata tracking:
  - Document ID
  - File name
  - Upload timestamp
  - File size
  - Storage path
  - APV document flag
- Document display with icons
- Document deletion capability
- Firebase Storage security rules

### CORS Configuration
- Cross-origin resource sharing setup for Firebase Storage
- Support for localhost development
- Production domain whitelisting
- Proper headers for file uploads

---

## 4. Bidding System

### Proxy Bidding System
- Automatic bid incrementing
- Maximum proxy bid setting
- Competitive bidding algorithm
- Prevents self-bidding (owner cannot bid on own auction)

### Species-Specific Increment Ladder
Dynamic bid increments based on timber species value:
- **Premium species** (Stejar, Fag, Nuc): Higher increments
- **Common species** (Molid, Brad, Pin): Medium increments
- **Mixed lots** (Amestec): Standard increments
- Price ranges with escalating increments

### Real-Time Bid Updates
- Live bid feed with 30-second auto-refresh
- Real-time countdown timer (updates every second)
- Bid history with timestamps
- Current leader indication
- Outbid notifications

### Bid Analysis & Strategy Tools
- **Bid Status Indicators**:
  - Leading bid banner with animation
  - Outbid warning with urgent styling
  - Proxy buffer analysis (safe/warning/danger)
- **Quick Action Buttons**:
  - Raise Max Proxy (with suggested amount)
  - Competitive Bid (minimum to lead)
  - Quick Bid increments based on species
- **Bid Intelligence**:
  - Buffer remaining before outbid
  - Last bid timestamp
  - Suggested competitive bid amounts
  - Buffer safety status

### Soft Close Mechanism
- Anti-sniping protection
- Automatic auction extension when bid placed near end
- Configurable soft close window
- Extension duration settings

### Bid Validation
- Minimum bid amount checks
- Increment validation
- Duplicate bid prevention
- Real-time error feedback

---

## 5. Dashboard & Analytics

### Forest Owner Dashboard
- My Listings overview
- Auction status breakdown (draft/active/sold)
- Performance statistics:
  - Total auctions created
  - Active auction count
  - Total volume sold (m³)
  - Average price per m³
  - Success rate
  - Total revenue
- Quick actions (create new listing)
- Auction management controls

### Buyer Dashboard
- Active auctions feed
- My Bids tracking
- Winning bids highlight
- Outbid alerts
- Watchlist functionality
- Bid history

### Auction Feed
- Filterable auction listings
- Sort by: newest, ending soon, price, volume
- Status filters (active, upcoming, ended)
- Search functionality
- Infinite scroll pagination
- Real-time status updates

---

## 6. Auction Detail Page

### Comprehensive Auction Information Display
- High-quality image gallery
- Live status badge (for active auctions)
- Countdown timer with urgent styling (< 5 minutes)
- Current price per m³ + projected total
- Starting price reference
- Bid count indicator
- Data freshness indicator (live/updating/stale)

### Detailed Specifications
- Volume in cubic meters
- Location with map pin
- Forest district information
- Species breakdown with percentages
- Visual species indicators
- Parcel information (from APV)

### Document Section
- APV document download
- Additional documents display
- Document metadata (size, upload date)
- Secure document access

### Bid History
- Chronological bid list
- Bidder anonymization (for privacy)
- Timestamp with relative time
- Bid amount per m³ and total

### Interactive Bidding Interface
- Sticky bottom bid bar (mobile-optimized)
- Current price display
- Projected total calculation
- Place Bid modal with:
  - Bid amount input with validation
  - Maximum proxy bid setting
  - Quick bid increment buttons
  - Real-time validation feedback
  - Countdown timer in modal
- Pre-filled forms for quick raises
- User bid status tracking

---

## 7. Real-Time Features & Notifications

### Notification System
- Firebase Firestore real-time listeners
- Notification bell with unread count
- Notification types:
  - Auction started
  - Auction ending soon
  - You were outbid
  - You won an auction
  - New bid on your auction
- Mark as read functionality
- Notification history

### Live Data Updates
- 30-second auto-refresh for auction data
- Real-time bid updates
- Status change detection
- Countdown timer updates (every second)
- Data freshness indicators

### Scheduled Tasks
- Lifecycle checker (every 1 minute)
- Status transition automation
- Summary reports (every 5 minutes)
- Notification triggers
- Database cleanup

---

## 8. UI/UX Features

### Modern Design System
- Shadcn UI components
- Tailwind CSS styling
- Responsive design (mobile-first)
- Dark mode support
- Consistent color palette
- Smooth animations and transitions

### Trading Terminal-Style Interface
- Bloomberg/TradingView-inspired design
- Real-time price updates
- Live countdown displays
- Status indicators
- Quick action buttons
- Professional data visualization

### Form Components
- React Hook Form integration
- Zod schema validation
- Real-time error feedback
- Field-level validation
- Custom form controls:
  - Species selector with percentages
  - Date/time pickers
  - Location selectors
  - File upload with drag & drop

### Loading States & Skeletons
- Skeleton loaders for async content
- Loading spinners
- Optimistic UI updates
- Error boundaries

### Toast Notifications
- Success messages
- Error alerts
- Info notifications
- Action confirmations

### Responsive Navigation
- Mobile bottom navigation bar
- Desktop sidebar
- Role-based menu items
- Active route highlighting
- Notification indicators

---

## 9. Backend & Infrastructure

### Express.js API Server
- RESTful API endpoints
- JWT/Firebase token authentication
- Request validation middleware
- Error handling
- CORS configuration
- Comprehensive logging

### API Endpoints

#### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/user/me` - Get current user

#### Auctions
- `POST /api/auctions` - Create new auction
- `POST /api/auctions/draft` - Create draft auction
- `PUT /api/auctions/:id` - Update auction
- `GET /api/auctions/:id` - Get auction details
- `GET /api/auctions/feed` - Get auction feed
- `GET /api/auctions/my-listings` - Get owner's auctions
- `GET /api/auctions/performance-stats` - Get performance metrics

#### Bidding
- `POST /api/bids` - Place a bid
- `GET /api/bids/:auctionId` - Get auction bids

#### Documents
- `POST /api/ocr/extract-apv` - OCR extraction from APV
- File upload via Firebase Storage SDK

#### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark as read

### Firebase Firestore Database
- Collections:
  - `users` - User profiles
  - `auctions` - Auction listings
  - `bids` - Bid records
  - `notifications` - User notifications
- Real-time listeners
- Compound indexes for queries
- Security rules

### Firebase Storage
- Document storage
- Image storage
- CORS-enabled buckets
- Secure download URLs
- File metadata tracking

### Environment Configuration
- Development/Production environments
- Environment variable management
- Firebase configuration
- OpenAI API integration
- Database URLs

### Vite Development Server
- Hot Module Replacement (HMR)
- Fast refresh
- TypeScript support
- Middleware mode integration
- Production build optimization

---

## 10. Data Validation & Type Safety

### Zod Schema Validation
- Shared schema definitions
- Runtime type checking
- Form validation
- API request validation
- Error message generation

### TypeScript Integration
- Full type safety
- Shared types between client/server
- Interface definitions
- Type inference
- Compile-time checks

### Data Models
- User model with role types
- Auction model with status types
- Bid model with proxy logic
- Document metadata model
- Notification model
- Species breakdown model

---

## 11. Testing & Development Tools

### Development Features
- Test timer controls for auctions
- Quick start times (1 minute)
- Short durations (minutes instead of days)
- Mock data generators
- Debug logging

### Error Handling
- Comprehensive error messages
- User-friendly error displays
- Console logging for debugging
- Fallback UI components
- API error tracking

### Logging System
- Request/response logging
- Lifecycle event logging
- OCR process logging
- Bid activity logging
- Error tracking

---

## 12. Security Features

### Authentication & Authorization
- Firebase Authentication
- JWT token validation
- Role-based access control
- Protected API endpoints
- Secure password handling

### Data Security
- Firebase Security Rules
- Input sanitization
- XSS prevention
- CSRF protection
- Secure file uploads

### API Security
- Request validation
- Rate limiting considerations
- Error message sanitization
- Secure token handling

---

## 13. Performance Optimizations

### Frontend Optimization
- React Query for data caching
- Optimistic UI updates
- Lazy loading components
- Image optimization
- Code splitting

### Backend Optimization
- Efficient Firestore queries
- Indexed database fields
- Scheduled task batching
- Response caching
- Connection pooling

### Data Fetching
- 30-second stale time
- Auto-refresh for live data
- Conditional refetching
- Query invalidation
- Parallel requests

---

## 14. Romanian Forestry Specifics

### Species Support (20+ species)
Complete Romanian timber species taxonomy with proper naming:
- Conifers: Molid, Brad, Pin silvester, Larice
- Hardwoods: Stejar, Fag, Gorun, Carpen, Frasin
- Valuable species: Nuc, Paltin, Cireș
- Special designations: (L) for light quality

### Regional Coverage
Complete Romanian region support:
- Muntenia, Transilvania, Banat, Oltenia
- Moldova, Crișana-Maramureș, Dobrogea, Bucovina

### APV Document Standards
- Romanian forestry permit format
- Official nomenclature
- Volume calculations (m³)
- Parcel identification system
- Production unit codes

---

## 15. Recent Additions & Fixes

### Document Upload Implementation
- Firebase Storage integration with CORS
- APV document upload with OCR
- Additional documents support
- Document management UI

### Auction Creation Flow Fix
- Fixed publish button to actually submit form
- Added empty species row filtering
- Improved form validation feedback
- Fixed route redirect (plural to singular)

### Enhanced Bidding UI
- Real-time countdown timer
- Bid analysis and suggestions
- Quick action buttons
- Buffer status indicators
- Competitive bid recommendations

### API Improvements
- Comprehensive error logging
- Better response handling
- Improved authentication flow
- Enhanced debugging capabilities

---

## Technology Stack

### Frontend
- React 18 with TypeScript
- Vite build tool
- Tailwind CSS
- Shadcn UI components
- React Hook Form + Zod
- TanStack Query (React Query)
- Wouter (routing)
- Lucide React (icons)

### Backend
- Node.js with Express
- TypeScript
- Firebase Admin SDK
- Firestore database
- Firebase Storage
- OpenAI API (Vision)

### Infrastructure
- Firebase Authentication
- Firebase Firestore
- Firebase Storage
- Google Cloud SDK (gsutil)
- Vercel/Firebase Hosting ready

### Development Tools
- TypeScript
- ESLint
- Prettier
- Git/GitHub
- tsx (TypeScript execution)
- Chocolatey (Windows package manager)

---

## Deployment Readiness

### Production Configuration
- Environment variables properly configured
- Firebase production project setup
- CORS configuration applied
- Storage security rules
- Database indexes created

### Build Process
- Vite production build
- TypeScript compilation
- Asset optimization
- Static file serving

---

## Future Enhancement Opportunities

### Potential Features
- Email notifications
- SMS alerts for ending auctions
- Advanced search and filtering
- Auction analytics dashboard
- Export auction data (CSV/PDF)
- Payment integration
- Contract generation
- Multi-language support (Romanian/English)
- Mobile app (React Native)
- Admin panel
- Auction reporting tools
- Bidder verification system
- Escrow service integration

---

**Last Updated**: October 29, 2025
**Version**: 1.0.0
**Commit**: b9fd11e
