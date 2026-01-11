# Romanian Forest Auction Platform - Implementation Plan
## Payment System + Verification + Mobile App

**Project Duration**: 16 weeks (4 months)
**Team Size**: 2-3 developers + 1 designer (optional)
**Target Launch**: Q2 2025

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Technical Architecture](#technical-architecture)
3. [Phase-by-Phase Implementation](#phase-by-phase-implementation)
4. [Database Schema Changes](#database-schema-changes)
5. [API Endpoints](#api-endpoints)
6. [Frontend Components](#frontend-components)
7. [Testing Strategy](#testing-strategy)
8. [Deployment Strategy](#deployment-strategy)
9. [Risk Mitigation](#risk-mitigation)
10. [Success Metrics](#success-metrics)

---

## Executive Summary

### Goals
1. Enable payment processing and commission collection (3% per transaction)
2. Implement buyer/seller verification to build trust
3. Launch native mobile apps (iOS + Android) for increased engagement

### Timeline Overview
- **Weeks 1-4**: Payment System + Basic Escrow
- **Weeks 5-8**: Verification System
- **Weeks 9-16**: Mobile App Development (parallel with optimization)
- **Week 16**: Launch

### Expected Outcomes
- Revenue generation: €50,000-100,000/month
- Transaction completion rate: 70% → 95%+
- User base growth: +200-300%
- Mobile user engagement: 3x higher than web

---

## Technical Architecture

### Overall System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
├──────────────────────┬──────────────────────────────────────┤
│   Web App (React)    │   Mobile Apps (React Native)         │
│   - Vite + TypeScript│   - iOS (TestFlight → App Store)    │
│   - Existing UI      │   - Android (Play Store)             │
└──────────────────────┴──────────────────────────────────────┘
                              ↓ HTTPS/REST
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                         │
│   Express.js + TypeScript                                    │
│   - Authentication Middleware (Firebase Auth)                │
│   - Request Validation (Zod)                                 │
│   - Rate Limiting                                            │
│   - Error Handling                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
├──────────────────────┬──────────────────────────────────────┤
│  Payment Service     │   Verification Service                │
│  - Stripe API        │   - CNP/CUI Validation               │
│  - Escrow Logic      │   - Document Upload                  │
│  - Commission Calc   │   - Rating System                    │
│                      │                                       │
│  Notification Svc    │   Auction Service                    │
│  - Push (FCM)        │   - Bid Processing                   │
│  - Email (SendGrid)  │   - Status Management                │
│  - SMS (Twilio)      │   - Real-time Updates                │
└──────────────────────┴──────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
├──────────────────────┬──────────────────────────────────────┤
│  Firebase Firestore  │   Firebase Storage                   │
│  - Users             │   - Verification Docs                │
│  - Auctions          │   - APV Documents                    │
│  - Bids              │   - Profile Pictures                 │
│  - Transactions      │                                       │
│  - Verifications     │   Stripe                             │
│  - Escrows           │   - Payment Intents                  │
│  - Notifications     │   - Customer Accounts                │
└──────────────────────┴──────────────────────────────────────┘
```

### Technology Stack

#### Backend Additions
- **Stripe**: Payment processing (supports Romanian lei & EUR)
- **SendGrid**: Email notifications
- **Twilio**: SMS notifications (optional)
- **Firebase Cloud Messaging (FCM)**: Push notifications
- **React Native**: Mobile app framework

#### New Dependencies
```json
{
  "stripe": "^14.x",
  "@sendgrid/mail": "^8.x",
  "twilio": "^4.x",
  "firebase-admin": "^12.x" (already have),
  "react-native": "^0.73.x",
  "expo": "^50.x" (for faster mobile dev)
}
```

---

## Phase-by-Phase Implementation

---

## 📅 PHASE 1: Payment System & Escrow (Weeks 1-4)

### Week 1: Setup & Architecture

#### Day 1-2: Stripe Account Setup
- [ ] Create Stripe account (or use existing)
- [ ] Enable Romanian market (RON currency)
- [ ] Configure webhook endpoints
- [ ] Set up test mode API keys
- [ ] Review Stripe documentation for marketplace/platform model

#### Day 3-4: Database Schema Design
- [ ] Design `transactions` collection schema
- [ ] Design `escrows` collection schema
- [ ] Design `paymentMethods` collection schema
- [ ] Design `commissions` collection schema
- [ ] Plan Firestore indexes

#### Day 5: Backend Service Architecture
- [ ] Create `PaymentService` class
- [ ] Create `EscrowService` class
- [ ] Create `CommissionService` class
- [ ] Set up service layer structure

---

### Week 2: Payment Integration

#### Backend Development (3 days)

**File: `server/services/payment.service.ts`**
```typescript
import Stripe from 'stripe';
import { db } from './firebase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class PaymentService {
  // Create Stripe customer for user
  async createCustomer(userId: string, email: string) {
    const customer = await stripe.customers.create({
      email,
      metadata: { userId }
    });

    await db.collection('users').doc(userId).update({
      stripeCustomerId: customer.id
    });

    return customer;
  }

  // Create payment intent for auction deposit
  async createDepositIntent(auctionId: string, amount: number, buyerId: string) {
    const user = await db.collection('users').doc(buyerId).get();
    const customerId = user.data()?.stripeCustomerId;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'ron',
      customer: customerId,
      metadata: {
        auctionId,
        buyerId,
        type: 'deposit'
      },
      capture_method: 'manual', // Don't capture immediately
    });

    return paymentIntent;
  }

  // Process commission after successful auction
  async processCommission(auctionId: string, totalAmount: number) {
    const commissionRate = 0.03; // 3%
    const commissionAmount = totalAmount * commissionRate;

    // Record commission
    await db.collection('commissions').add({
      auctionId,
      amount: commissionAmount,
      rate: commissionRate,
      totalAmount,
      status: 'pending',
      createdAt: Date.now()
    });

    return commissionAmount;
  }

  // Create payout to seller
  async createPayout(sellerId: string, amount: number, auctionId: string) {
    const seller = await db.collection('users').doc(sellerId).get();
    const accountId = seller.data()?.stripeConnectedAccountId;

    if (!accountId) {
      throw new Error('Seller has no connected account');
    }

    const transfer = await stripe.transfers.create({
      amount: Math.round(amount * 100),
      currency: 'ron',
      destination: accountId,
      metadata: { auctionId, sellerId }
    });

    return transfer;
  }
}
```

**File: `server/services/escrow.service.ts`**
```typescript
export class EscrowService {
  async createEscrow(auctionId: string, buyerId: string, sellerId: string, amount: number) {
    const escrowRef = await db.collection('escrows').add({
      auctionId,
      buyerId,
      sellerId,
      amount,
      status: 'held', // held, released, refunded
      createdAt: Date.now(),
      updatedAt: Date.now(),
      paymentIntentId: null,
      releaseScheduledFor: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days default
    });

    return escrowRef.id;
  }

  async releaseEscrow(escrowId: string) {
    const escrow = await db.collection('escrows').doc(escrowId).get();
    const data = escrow.data();

    if (!data) throw new Error('Escrow not found');
    if (data.status !== 'held') throw new Error('Escrow already processed');

    // Calculate amounts
    const totalAmount = data.amount;
    const commissionAmount = totalAmount * 0.03;
    const sellerAmount = totalAmount - commissionAmount;

    // Process payout to seller
    const paymentService = new PaymentService();
    await paymentService.createPayout(data.sellerId, sellerAmount, data.auctionId);

    // Update escrow status
    await db.collection('escrows').doc(escrowId).update({
      status: 'released',
      releasedAt: Date.now(),
      sellerAmount,
      commissionAmount
    });

    // Record commission
    await paymentService.processCommission(data.auctionId, totalAmount);

    return { sellerAmount, commissionAmount };
  }

  async refundEscrow(escrowId: string, reason: string) {
    const escrow = await db.collection('escrows').doc(escrowId).get();
    const data = escrow.data();

    if (!data) throw new Error('Escrow not found');
    if (data.status !== 'held') throw new Error('Escrow already processed');

    // Process refund via Stripe
    // ... refund logic

    await db.collection('escrows').doc(escrowId).update({
      status: 'refunded',
      refundedAt: Date.now(),
      refundReason: reason
    });
  }
}
```

**API Endpoints: `server/routes/payment.routes.ts`**
```typescript
import { Router } from 'express';
import { PaymentService } from '../services/payment.service';
import { EscrowService } from '../services/escrow.service';
import { authenticate } from '../middleware/auth';

const router = Router();
const paymentService = new PaymentService();
const escrowService = new EscrowService();

// Create payment intent for deposit
router.post('/payment/deposit', authenticate, async (req, res) => {
  try {
    const { auctionId, amount } = req.body;
    const buyerId = req.user!.uid;

    const paymentIntent = await paymentService.createDepositIntent(
      auctionId,
      amount,
      buyerId
    );

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stripe webhook handler
router.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Release escrow (after delivery confirmation)
router.post('/escrow/:id/release', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await escrowService.releaseEscrow(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

#### Frontend Development (2 days)

**File: `client/src/components/payment/PaymentModal.tsx`**
```typescript
import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/queryClient';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auctionId: string;
  amount: number;
  onSuccess: () => void;
}

function PaymentForm({ auctionId, amount, onSuccess }: {
  auctionId: string;
  amount: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment/success`,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Payment failed');
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Deposit Amount</h3>
        <p className="text-3xl font-bold text-primary">
          {new Intl.NumberFormat('ro-RO', {
            style: 'currency',
            currency: 'RON'
          }).format(amount)}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          10% deposit required to participate in auction
        </p>
      </div>

      <PaymentElement />

      {errorMessage && (
        <div className="text-sm text-destructive">{errorMessage}</div>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? 'Processing...' : 'Pay Deposit'}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Your deposit will be held in escrow until auction completion.
        Refunded if you don't win.
      </p>
    </form>
  );
}

export function PaymentModal({
  open,
  onOpenChange,
  auctionId,
  amount,
  onSuccess
}: PaymentModalProps) {
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    if (open) {
      // Create payment intent when modal opens
      apiRequest('POST', '/api/payment/deposit', { auctionId, amount })
        .then(({ clientSecret }) => setClientSecret(clientSecret));
    }
  }, [open, auctionId, amount]);

  const options = {
    clientSecret,
    appearance: { theme: 'stripe' },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Deposit to Bid</DialogTitle>
        </DialogHeader>
        {clientSecret && (
          <Elements stripe={stripePromise} options={options}>
            <PaymentForm
              auctionId={auctionId}
              amount={amount}
              onSuccess={onSuccess}
            />
          </Elements>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

### Week 3: Escrow Logic & Testing

#### Tasks
- [ ] Implement automatic escrow release (7 days after auction end)
- [ ] Add delivery confirmation UI
- [ ] Build seller payout dashboard
- [ ] Create commission tracking dashboard (admin)
- [ ] Test payment flows (success, failure, refund)
- [ ] Test Stripe webhooks locally (use Stripe CLI)

#### Deliverables
- Working payment deposit flow
- Escrow holding mechanism
- Basic payout system

---

### Week 4: Payment Polish & Edge Cases

#### Tasks
- [ ] Handle payment failures gracefully
- [ ] Implement retry logic for failed payments
- [ ] Add payment history page for users
- [ ] Build invoice generation system
- [ ] Add dispute resolution UI (manual escrow control)
- [ ] Security audit of payment code
- [ ] Load testing payment endpoints

#### Deliverables
- Production-ready payment system
- Invoice generation
- Payment history
- Dispute handling

---

## 📅 PHASE 2: Verification System (Weeks 5-8)

### Week 5: Verification Infrastructure

#### Database Schema

**Collection: `verifications`**
```typescript
interface Verification {
  id: string;
  userId: string;
  type: 'individual' | 'business';
  status: 'pending' | 'approved' | 'rejected';
  level: 'basic' | 'standard' | 'premium' | 'elite';

  // Individual verification
  cnp?: string; // Romanian Personal Numeric Code
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  selfieUrl?: string;

  // Business verification
  cui?: string; // Romanian Company Unique Identifier
  businessName?: string;
  businessRegistrationUrl?: string;
  businessAddressProof?: string;

  // Bank verification
  bankAccountVerified?: boolean;
  bankAccountLastFour?: string;

  // Review info
  reviewedBy?: string;
  reviewedAt?: number;
  rejectionReason?: string;

  // Metadata
  createdAt: number;
  updatedAt: number;
  expiresAt?: number; // Annual renewal
}
```

**Collection: `ratings`**
```typescript
interface Rating {
  id: string;
  fromUserId: string;
  toUserId: string;
  auctionId: string;
  rating: number; // 1-5 stars
  comment?: string;
  type: 'buyer_rating_seller' | 'seller_rating_buyer';
  createdAt: number;
}
```

#### Backend Service

**File: `server/services/verification.service.ts`**
```typescript
export class VerificationService {
  // Submit verification request
  async submitVerification(userId: string, data: VerificationData) {
    // Validate CNP/CUI format
    if (data.cnp && !this.validateCNP(data.cnp)) {
      throw new Error('Invalid CNP format');
    }

    if (data.cui && !this.validateCUI(data.cui)) {
      throw new Error('Invalid CUI format');
    }

    const verificationRef = await db.collection('verifications').add({
      userId,
      ...data,
      status: 'pending',
      level: 'basic',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    // Notify admins
    await this.notifyAdminsForReview(verificationRef.id);

    return verificationRef.id;
  }

  // Validate Romanian CNP (13 digits, checksum algorithm)
  validateCNP(cnp: string): boolean {
    if (!/^\d{13}$/.test(cnp)) return false;

    // CNP checksum validation algorithm
    const weights = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];
    let sum = 0;

    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnp[i]) * weights[i];
    }

    const checksum = sum % 11 === 10 ? 1 : sum % 11;
    return checksum === parseInt(cnp[12]);
  }

  // Validate Romanian CUI (2-10 digits)
  validateCUI(cui: string): boolean {
    // Remove RO prefix if present
    cui = cui.replace(/^RO/i, '');
    return /^\d{2,10}$/.test(cui);
  }

  // Approve verification
  async approveVerification(verificationId: string, level: string, adminId: string) {
    const verification = await db.collection('verifications').doc(verificationId).get();
    const data = verification.data();

    if (!data) throw new Error('Verification not found');

    await db.collection('verifications').doc(verificationId).update({
      status: 'approved',
      level,
      reviewedBy: adminId,
      reviewedAt: Date.now(),
      expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
    });

    // Update user profile
    await db.collection('users').doc(data.userId).update({
      verificationStatus: 'verified',
      verificationLevel: level,
      verifiedAt: Date.now()
    });

    // Send notification to user
    await this.notifyUserVerificationApproved(data.userId, level);
  }

  // Calculate user trust score
  async calculateTrustScore(userId: string): Promise<number> {
    const user = await db.collection('users').doc(userId).get();
    const userData = user.data();

    let score = 0;

    // Verification level (max 40 points)
    if (userData?.verificationLevel === 'elite') score += 40;
    else if (userData?.verificationLevel === 'premium') score += 30;
    else if (userData?.verificationLevel === 'standard') score += 20;
    else if (userData?.verificationLevel === 'basic') score += 10;

    // Rating score (max 30 points)
    const ratings = await db.collection('ratings')
      .where('toUserId', '==', userId)
      .get();

    if (!ratings.empty) {
      const avgRating = ratings.docs.reduce((sum, doc) =>
        sum + doc.data().rating, 0) / ratings.size;
      score += (avgRating / 5) * 30;
    }

    // Transaction history (max 20 points)
    const transactions = await db.collection('transactions')
      .where('buyerId', '==', userId)
      .where('status', '==', 'completed')
      .get();

    score += Math.min(transactions.size * 2, 20);

    // Account age (max 10 points)
    const accountAge = Date.now() - (userData?.createdAt || Date.now());
    const monthsOld = accountAge / (30 * 24 * 60 * 60 * 1000);
    score += Math.min(monthsOld, 10);

    return Math.round(score);
  }
}
```

---

### Week 6: Verification UI

#### Components to Build

**File: `client/src/pages/VerificationPage.tsx`**
```typescript
export default function VerificationPage() {
  const [step, setStep] = useState(1);
  const [verificationType, setVerificationType] = useState<'individual' | 'business'>('individual');

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Get Verified</h1>
      <p className="text-muted-foreground mb-8">
        Increase your trust score and unlock premium features
      </p>

      {/* Verification Level Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader>
            <Badge>Basic</Badge>
            <CardTitle>Email Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✓ Browse auctions</li>
              <li>✓ Place bids</li>
            </ul>
            <p className="text-2xl font-bold mt-4">Free</p>
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <Badge variant="default">Standard</Badge>
            <CardTitle>ID Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✓ All Basic features</li>
              <li>✓ Trust badge</li>
              <li>✓ Higher bid limits</li>
            </ul>
            <p className="text-2xl font-bold mt-4">€50</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge variant="secondary">Premium</Badge>
            <CardTitle>Business Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li>✓ All Standard features</li>
              <li>✓ Priority support</li>
              <li>✓ Lower fees</li>
            </ul>
            <p className="text-2xl font-bold mt-4">€200</p>
          </CardContent>
        </Card>
      </div>

      {/* Multi-step verification form */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Verification Type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant={verificationType === 'individual' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setVerificationType('individual')}
            >
              <User className="mr-2" />
              Individual (CNP)
            </Button>
            <Button
              variant={verificationType === 'business' ? 'default' : 'outline'}
              className="w-full justify-start"
              onClick={() => setVerificationType('business')}
            >
              <Building className="mr-2" />
              Business (CUI)
            </Button>
            <Button onClick={() => setStep(2)} className="w-full">
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && verificationType === 'individual' && (
        <IndividualVerificationForm onComplete={() => setStep(3)} />
      )}

      {step === 2 && verificationType === 'business' && (
        <BusinessVerificationForm onComplete={() => setStep(3)} />
      )}

      {step === 3 && (
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Verification Submitted</h2>
            <p className="text-muted-foreground">
              We'll review your documents within 24-48 hours and send you an email.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

**File: `client/src/components/verification/TrustBadge.tsx`**
```typescript
interface TrustBadgeProps {
  userId: string;
  level?: 'basic' | 'standard' | 'premium' | 'elite';
  trustScore?: number;
  showDetails?: boolean;
}

export function TrustBadge({ userId, level, trustScore, showDetails }: TrustBadgeProps) {
  const { data: userData } = useQuery({
    queryKey: [`/api/users/${userId}/trust`],
    enabled: showDetails
  });

  const badges = {
    elite: { icon: Crown, color: 'text-amber-500', label: 'Elite Verified' },
    premium: { icon: Shield, color: 'text-primary', label: 'Premium Verified' },
    standard: { icon: CheckCircle, color: 'text-blue-500', label: 'ID Verified' },
    basic: { icon: User, color: 'text-gray-500', label: 'Email Verified' }
  };

  const badge = badges[level || 'basic'];
  const Icon = badge.icon;

  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="flex items-center gap-1.5">
          <Icon className={`w-4 h-4 ${badge.color}`} />
          {showDetails && (
            <>
              <span className="text-sm font-medium">{badge.label}</span>
              {trustScore && (
                <Badge variant="outline" className="ml-2">
                  Trust Score: {trustScore}/100
                </Badge>
              )}
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-2">
          <p className="font-semibold">{badge.label}</p>
          {userData && (
            <>
              <p className="text-sm">Trust Score: {userData.trustScore}/100</p>
              <p className="text-sm">Member since: {new Date(userData.createdAt).toLocaleDateString()}</p>
              <p className="text-sm">Successful transactions: {userData.completedTransactions}</p>
              <p className="text-sm">Rating: {userData.avgRating}/5 ⭐</p>
            </>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
```

---

### Week 7: Rating System

#### Tasks
- [ ] Build post-transaction rating UI
- [ ] Implement rating submission
- [ ] Display user ratings on profiles
- [ ] Build reputation dashboard
- [ ] Add rating notifications

---

### Week 8: Verification Polish & Testing

#### Tasks
- [ ] Admin verification review dashboard
- [ ] Automated CNP/CUI validation
- [ ] Document upload and preview
- [ ] Security audit
- [ ] Test verification flows

---

## 📅 PHASE 3: Mobile App (Weeks 9-16)

### Week 9: Mobile Setup & Architecture

#### Choose Approach: **React Native with Expo**

**Why Expo?**
- Faster development (vs pure React Native)
- Over-the-air updates
- Easier build process
- Still allows native modules if needed

#### Setup

```bash
# Initialize Expo app
npx create-expo-app@latest timber-auction-mobile --template tabs

cd timber-auction-mobile

# Install dependencies
npx expo install react-native-gesture-handler react-native-reanimated
npx expo install expo-notifications expo-location expo-image-picker
npx expo install @react-navigation/native @react-navigation/stack
npx expo install react-native-maps
npx expo install firebase @react-native-firebase/app
```

#### Project Structure
```
timber-auction-mobile/
├── app/                    # Expo Router (file-based routing)
│   ├── (tabs)/
│   │   ├── index.tsx      # Home/Feed
│   │   ├── search.tsx     # Search
│   │   ├── auctions.tsx   # My Auctions
│   │   ├── bids.tsx       # My Bids
│   │   └── profile.tsx    # Profile
│   ├── auction/
│   │   └── [id].tsx       # Auction Detail
│   └── _layout.tsx
├── components/
│   ├── auction/
│   ├── bidding/
│   └── common/
├── services/
│   ├── api.ts             # API client (same as web)
│   ├── auth.ts            # Firebase auth
│   └── notifications.ts   # FCM setup
├── hooks/
└── utils/
```

#### Shared Code Strategy

**Option 1: Monorepo (Recommended)**
```
romanian-forest-auction/
├── apps/
│   ├── web/              # Existing web app
│   └── mobile/           # New mobile app
├── packages/
│   ├── shared/           # Shared types, schemas, utils
│   │   ├── schema.ts
│   │   ├── formatters.ts
│   │   └── incrementLadder.ts
│   └── api-client/       # Shared API logic
└── server/               # Existing backend
```

Set up with **Turborepo** or **Nx**.

---

### Week 10-11: Core Mobile Features

#### Day 1-3: Authentication
- [ ] Firebase Auth integration
- [ ] Login/Register screens
- [ ] Biometric authentication (Face ID / Fingerprint)
- [ ] Secure token storage

#### Day 4-6: Auction Feed
- [ ] Auction list view (optimized for mobile)
- [ ] Pull-to-refresh
- [ ] Infinite scroll
- [ ] Search and filters
- [ ] Map view of auctions

#### Day 7-10: Auction Detail
- [ ] Image carousel
- [ ] Bid history
- [ ] Species breakdown visualization
- [ ] Document viewer
- [ ] Quick bid actions

---

### Week 12-13: Bidding & Notifications

#### Bidding UI (3 days)
- [ ] Quick bid button (1-tap from feed)
- [ ] Bid modal with smart suggestions
- [ ] Bid confirmation
- [ ] Success animations

#### Push Notifications (4 days)

**File: `mobile/services/notifications.ts`**
```typescript
import * as Notifications from 'expo-notifications';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

export class NotificationService {
  async setupPushNotifications() {
    // Request permissions
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permissions not granted');
      return;
    }

    // Get FCM token
    const token = await Notifications.getExpoPushTokenAsync();

    // Send to backend
    await apiRequest('POST', '/api/user/fcm-token', { token: token.data });
  }

  async scheduleLocalNotification(title: string, body: string, data?: any) {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data },
      trigger: null, // Immediate
    });
  }
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
```

**Backend FCM Integration: `server/services/notification.service.ts`**
```typescript
import admin from 'firebase-admin';

export class NotificationService {
  async sendPushNotification(userId: string, title: string, body: string, data?: any) {
    const user = await db.collection('users').doc(userId).get();
    const fcmToken = user.data()?.fcmToken;

    if (!fcmToken) return;

    const message = {
      notification: { title, body },
      data,
      token: fcmToken
    };

    try {
      await admin.messaging().send(message);
    } catch (error) {
      console.error('FCM error:', error);
      // Remove invalid tokens
      if (error.code === 'messaging/invalid-registration-token') {
        await db.collection('users').doc(userId).update({ fcmToken: null });
      }
    }
  }

  async notifyAuctionEnding(auctionId: string, minutesRemaining: number) {
    const auction = await db.collection('auctions').doc(auctionId).get();
    const data = auction.data();

    // Notify all bidders
    const bids = await db.collection('bids').where('auctionId', '==', auctionId).get();
    const bidderIds = [...new Set(bids.docs.map(b => b.data().bidderId))];

    await Promise.all(bidderIds.map(bidderId =>
      this.sendPushNotification(
        bidderId,
        `Auction ending in ${minutesRemaining} minutes!`,
        `"${data?.title}" - Current price: ${data?.currentPricePerM3} RON/m³`,
        { auctionId, type: 'auction_ending' }
      )
    ));
  }
}
```

**Notification Types to Implement:**
- [ ] Auction ending (5 min, 1 hour, 1 day)
- [ ] You were outbid
- [ ] You won an auction
- [ ] New auction matching preferences
- [ ] Payment due reminder
- [ ] Delivery scheduled

---

### Week 14: Location & Maps

#### Features
- [ ] Map view of auctions (React Native Maps)
- [ ] GPS-based "Nearby Auctions"
- [ ] Driving directions to timber site
- [ ] Save favorite locations

**File: `mobile/components/AuctionMap.tsx`**
```typescript
import MapView, { Marker } from 'react-native-maps';

export function AuctionMap({ auctions }: { auctions: Auction[] }) {
  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: 45.9432, // Romania center
        longitude: 24.9668,
        latitudeDelta: 5,
        longitudeDelta: 5,
      }}
    >
      {auctions.map(auction => (
        <Marker
          key={auction.id}
          coordinate={{
            latitude: auction.latitude,
            longitude: auction.longitude
          }}
          title={auction.title}
          description={`${auction.volumeM3} m³ - ${formatPricePerM3(auction.startingPricePerM3)}`}
        />
      ))}
    </MapView>
  );
}
```

---

### Week 15: Polish & Platform-Specific Features

#### iOS-Specific
- [ ] Home screen quick actions
- [ ] Widgets (iOS 14+)
- [ ] Siri shortcuts
- [ ] Apple Pay integration
- [ ] TestFlight beta

#### Android-Specific
- [ ] Home screen widgets
- [ ] Google Pay integration
- [ ] Play Store beta track

#### Both Platforms
- [ ] Deep linking (open specific auction from notification)
- [ ] Share auctions
- [ ] Offline mode (cache auction data)
- [ ] Dark mode
- [ ] Haptic feedback

---

### Week 16: Testing, Beta & Launch

#### Testing Checklist
- [ ] Unit tests for critical functions
- [ ] Integration tests for API calls
- [ ] E2E tests with Detox
- [ ] Manual testing on real devices (iOS & Android)
- [ ] Performance testing (bundle size, startup time)
- [ ] Push notification testing

#### Beta Release
- [ ] iOS: TestFlight (up to 10,000 testers)
- [ ] Android: Play Store Closed Beta
- [ ] Gather feedback from 50-100 beta users
- [ ] Fix critical bugs

#### Production Launch
- [ ] App Store submission (7-10 day review)
- [ ] Play Store submission (2-3 day review)
- [ ] Marketing materials (screenshots, video)
- [ ] App Store Optimization (ASO)

---

## Database Schema Changes

### New Collections

#### `transactions`
```typescript
{
  id: string;
  auctionId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  commissionAmount: number;
  commissionRate: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  stripePaymentIntentId: string;
  stripeChargeId?: string;
  stripeTransferId?: string;
  createdAt: number;
  completedAt?: number;
}
```

#### `escrows`
```typescript
{
  id: string;
  auctionId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: 'held' | 'released' | 'refunded';
  paymentIntentId: string;
  releaseScheduledFor: number;
  releasedAt?: number;
  sellerAmount?: number;
  commissionAmount?: number;
  refundedAt?: number;
  refundReason?: string;
  createdAt: number;
  updatedAt: number;
}
```

#### `verifications`
```typescript
{
  id: string;
  userId: string;
  type: 'individual' | 'business';
  status: 'pending' | 'approved' | 'rejected';
  level: 'basic' | 'standard' | 'premium' | 'elite';
  cnp?: string;
  cui?: string;
  businessName?: string;
  idCardFrontUrl?: string;
  idCardBackUrl?: string;
  businessRegistrationUrl?: string;
  bankAccountVerified?: boolean;
  reviewedBy?: string;
  reviewedAt?: number;
  rejectionReason?: string;
  createdAt: number;
  expiresAt?: number;
}
```

#### `ratings`
```typescript
{
  id: string;
  fromUserId: string;
  toUserId: string;
  auctionId: string;
  rating: number; // 1-5
  comment?: string;
  type: 'buyer_rating_seller' | 'seller_rating_buyer';
  createdAt: number;
}
```

#### `commissions`
```typescript
{
  id: string;
  auctionId: string;
  amount: number;
  rate: number;
  totalAmount: number;
  status: 'pending' | 'collected' | 'failed';
  createdAt: number;
  collectedAt?: number;
}
```

### Updated Collections

#### `users` - Add fields:
```typescript
{
  // ... existing fields
  stripeCustomerId?: string;
  stripeConnectedAccountId?: string;
  verificationStatus?: 'unverified' | 'pending' | 'verified' | 'rejected';
  verificationLevel?: 'basic' | 'standard' | 'premium' | 'elite';
  verifiedAt?: number;
  trustScore?: number; // 0-100
  fcmToken?: string; // For push notifications
  notificationPreferences?: {
    push: boolean;
    email: boolean;
    sms: boolean;
    auctionEnding: boolean;
    outbid: boolean;
    wonAuction: boolean;
  };
}
```

#### `auctions` - Add fields:
```typescript
{
  // ... existing fields
  depositRequired?: number; // Amount required to bid
  depositCollected?: boolean;
  paymentStatus?: 'none' | 'deposit_paid' | 'full_payment_pending' | 'paid';
  transactionId?: string;
  escrowId?: string;
}
```

---

## API Endpoints Summary

### Payment Endpoints
```
POST   /api/payment/deposit              # Create deposit payment intent
POST   /api/payment/complete             # Complete full payment after win
GET    /api/payment/history              # User payment history
POST   /api/webhooks/stripe              # Stripe webhook handler
```

### Escrow Endpoints
```
POST   /api/escrow/create                # Create escrow (automatic)
POST   /api/escrow/:id/release           # Release escrow to seller
POST   /api/escrow/:id/refund            # Refund escrow to buyer
GET    /api/escrow/:auctionId            # Get escrow status
```

### Verification Endpoints
```
POST   /api/verification/submit          # Submit verification request
GET    /api/verification/status          # Check verification status
PUT    /api/verification/:id/approve     # Admin: Approve verification
PUT    /api/verification/:id/reject      # Admin: Reject verification
GET    /api/user/:id/trust               # Get user trust score
```

### Rating Endpoints
```
POST   /api/ratings                      # Submit rating
GET    /api/ratings/user/:id             # Get user ratings
GET    /api/ratings/auction/:id          # Get auction-related ratings
```

### Commission Endpoints (Admin)
```
GET    /api/admin/commissions            # View all commissions
GET    /api/admin/commissions/stats      # Commission statistics
```

### Mobile-Specific Endpoints
```
POST   /api/user/fcm-token               # Register FCM token
POST   /api/notifications/test           # Test push notification
GET    /api/auctions/nearby              # Get auctions near location
```

---

## Testing Strategy

### Unit Tests
- Payment calculations (commission, escrow amounts)
- CNP/CUI validation
- Trust score calculation
- Price increment logic

### Integration Tests
- Stripe payment flow
- Escrow creation and release
- Verification submission and approval
- Notification sending

### E2E Tests
- Complete auction → bid → payment → escrow → release flow
- Verification flow from submission to approval
- Mobile app critical paths (login, bid, notification)

### Load Testing
- Payment endpoint under high concurrency
- Notification sending to many users
- Mobile API response times

---

## Deployment Strategy

### Week 4: Deploy Payment System
```bash
# Backend deployment
1. Add Stripe keys to production environment
2. Set up Stripe webhooks in production
3. Deploy updated backend
4. Test with Stripe test mode
5. Switch to live mode

# Frontend deployment
1. Deploy payment UI components
2. Configure Stripe publishable key
3. Test deposit flow in production
```

### Week 8: Deploy Verification System
```bash
# Backend
1. Create Firestore indexes for verifications
2. Deploy verification services
3. Set up admin dashboard

# Frontend
1. Deploy verification pages
2. Add trust badges to user profiles
3. Update auction detail pages
```

### Week 16: Mobile App Launch
```bash
# iOS
1. Create App Store Connect app
2. Upload build via Xcode
3. Submit for review (App Store Review Guidelines)
4. Wait 7-10 days for approval

# Android
1. Create Google Play Console app
2. Upload AAB via Play Console
3. Submit for review
4. Approved in 2-3 days usually
```

---

## Risk Mitigation

### Payment System Risks

**Risk**: Stripe payment failures causing lost transactions
**Mitigation**:
- Implement retry logic with exponential backoff
- Store payment intent IDs for manual recovery
- Monitor Stripe webhooks health
- Set up alerts for failed payments

**Risk**: Escrow released to wrong party
**Mitigation**:
- Require admin approval for escrow release (initially)
- Add delivery confirmation requirement
- Implement dispute resolution flow
- Log all escrow actions

### Verification System Risks

**Risk**: Fake documents submitted
**Mitigation**:
- Manual review by trained staff
- Cross-check CNP/CUI with government databases (if API available)
- Require multiple documents
- Implement fraud detection ML model (future)

**Risk**: Verification backlog
**Mitigation**:
- Hire verification staff as volume grows
- Implement automated checks where possible
- Set SLA: 48 hours for review
- Allow basic functionality without verification

### Mobile App Risks

**Risk**: App Store/Play Store rejection
**Mitigation**:
- Review app store guidelines thoroughly
- Ensure payment flow complies with policies
- Have legal terms and privacy policy
- Test thoroughly before submission

**Risk**: Push notification delivery failures
**Mitigation**:
- Implement fallback to email notifications
- Monitor FCM delivery reports
- Handle invalid tokens gracefully
- Allow users to resend notifications

---

## Success Metrics

### Payment System
- **Transaction Success Rate**: Target 98%+
- **Average Commission**: €200-500 per auction
- **Escrow Release Time**: <7 days average
- **Payment Processing Time**: <3 seconds

### Verification System
- **Verification Completion Rate**: Target 70%+
- **Average Review Time**: <48 hours
- **Trust Score Distribution**: Bell curve with avg 60-70
- **Fraud Prevention**: <1% fraudulent accounts

### Mobile App
- **App Store Rating**: Target 4.5+ stars
- **Download → Registration**: Target 40%+
- **DAU/MAU Ratio**: Target 25%+
- **Push Notification Open Rate**: Target 40%+
- **Mobile Transaction Rate**: Target 60% of web

### Business Metrics
- **Monthly Revenue**: €50,000-100,000 (Month 4+)
- **Transaction Completion Rate**: 70% → 95%
- **User Growth**: +200-300% over 6 months
- **Average Transaction Value**: +15-25%

---

## Resource Requirements

### Development Team
- **Backend Developer**: 1 full-time (Weeks 1-16)
- **Frontend Developer**: 1 full-time (Weeks 1-16)
- **Mobile Developer**: 1 full-time (Weeks 9-16)
- **UI/UX Designer**: 0.5 (part-time, as needed)
- **QA Tester**: 0.5 (part-time, Weeks 4, 8, 16)

### External Services (Monthly Costs)
- **Stripe**: 2.9% + €0.30 per transaction (~€2,000/month at scale)
- **SendGrid**: €15-50/month for email
- **Twilio**: €20-100/month for SMS
- **Firebase**: €50-200/month (increased usage)
- **App Store**: €99/year
- **Google Play**: €25 one-time

### Infrastructure
- Existing Firebase setup (sufficient)
- May need to upgrade Firebase plan for increased usage

---

## Timeline Summary

| Week | Phase | Milestone |
|------|-------|-----------|
| 1 | Payment Setup | Stripe integration complete |
| 2 | Payment Logic | Deposit flow working |
| 3 | Escrow | Escrow system implemented |
| 4 | Payment Launch | **Payment system live** |
| 5 | Verification Setup | Infrastructure ready |
| 6 | Verification UI | Submission flow complete |
| 7 | Rating System | Trust scores working |
| 8 | Verification Launch | **Verification system live** |
| 9 | Mobile Setup | Project initialized |
| 10-11 | Mobile Core | Feed and detail pages |
| 12-13 | Mobile Bidding | Bidding + notifications |
| 14 | Mobile Maps | Location features |
| 15 | Mobile Polish | Platform-specific features |
| 16 | Mobile Launch | **Apps in stores** |

---

## Next Steps (Immediate Actions)

### Week 1, Day 1 (Tomorrow):
1. ✅ Create Stripe account (if not exists)
2. ✅ Add Stripe API keys to environment variables
3. ✅ Install Stripe npm package
4. ✅ Review this implementation plan with team
5. ✅ Set up project board (GitHub Projects or Jira)
6. ✅ Create Week 1 tasks

### Week 1, Day 2:
1. ✅ Design database schemas (transactions, escrows)
2. ✅ Create PaymentService class skeleton
3. ✅ Set up Stripe test mode
4. ✅ Test first payment intent creation

### Key Decisions Needed:
- [ ] Confirm 3% commission rate
- [ ] Decide on deposit amount (10%? 20%?)
- [ ] Choose escrow release timeframe (7 days default?)
- [ ] Verification pricing (€50 standard, €200 premium?)
- [ ] Mobile app name and branding
- [ ] App Store/Play Store developer account ownership

---

## Conclusion

This 16-week plan will transform your platform from a listing site to a complete transactional marketplace. The phased approach allows you to:

1. **Start generating revenue immediately** (Week 4)
2. **Build trust and reduce fraud** (Week 8)
3. **Scale user engagement** (Week 16)

Each phase is designed to be independently valuable, so even if mobile app development takes longer, you'll already have payment and verification systems generating revenue and building trust.

**The most critical action: Start Week 1 tomorrow. Payment system is your foundation.**

Let's build this! 🚀
