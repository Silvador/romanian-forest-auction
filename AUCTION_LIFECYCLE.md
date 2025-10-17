# Auction Lifecycle Automation

This document describes the automated auction lifecycle management system implemented for the Romanian Forest Auction platform.

## Overview

The auction lifecycle automation system handles the automatic transitions of auctions through their various states and manages winner settlement and notifications. This makes the marketplace fully self-operating without requiring manual intervention.

## Auction Status Flow

```
draft → upcoming → active → ended → sold
```

### Status Definitions

- **draft**: Auction created but not yet published (not automatically transitioned)
- **upcoming**: Auction scheduled to start at a future time
- **active**: Auction is live and accepting bids
- **ended**: Auction time has expired, winner being settled
- **sold**: Auction completed with winner determined

## Components

### 1. AuctionLifecycleManager (`server/services/auctionLifecycleManager.ts`)

The core service that handles status transitions and business logic.

**Key Methods:**
- `processAuctionLifecycles()`: Checks all auctions and performs necessary transitions
- `processAuctionTransition()`: Handles individual auction status changes
- `settleAuctionWinner()`: Determines winner and sends notifications
- `getAuctionsSummary()`: Returns count of auctions by status

**Transition Logic:**
- `upcoming → active`: When `Date.now() >= startTime`
- `active → ended`: When `Date.now() >= endTime`
- `ended → sold`: When auction has a winner (`currentBidderId` exists)

### 2. AuctionScheduler (`server/services/auctionScheduler.ts`)

Manages periodic execution of lifecycle checks using cron jobs.

**Cron Jobs:**
- **Every 1 minute**: Check for auction status transitions
- **Every 5 minutes**: Log auction summary for monitoring

**Key Methods:**
- `start()`: Starts all scheduled jobs and runs immediate check
- `stop()`: Stops all scheduled jobs
- `triggerLifecycleCheck()`: Manually trigger a lifecycle check
- `isActive()`: Check if scheduler is running

### 3. Integration (`server/routes.ts`)

The scheduler is automatically initialized when the server starts (if Firebase Admin is configured).

**Admin Endpoints:**
- `POST /api/admin/lifecycle/trigger`: Manually trigger lifecycle check
- `GET /api/admin/lifecycle/status`: Get scheduler status and auction summary

## Notifications

The system automatically sends notifications at key lifecycle events:

### When Auction Becomes Active (`upcoming → active`)
- **To**: Forest Owner (auction creator)
- **Type**: `auction_ending` (reused)
- **Message**: "Your auction is now live!"

### When Auction Ends (`active → ended`)

#### Winner Exists:
- **To Winner** (`won`): "Congratulations! You won the auction at €X/m³"
- **To Owner** (`sold`): "Your auction sold to [buyer] for €X/m³"
- **To Losing Bidders** (`auction_ending`): "Auction ended. Winning bid was €X/m³"

#### No Winner (No Bids):
- **To Owner** (`sold`): "Your auction ended without any bids"

### When Auction Marked as Sold (`ended → sold`)
- No additional notifications (already sent during `ended` phase)

## Technical Details

### Timestamp-Based Transitions

All transitions are based on comparing `Date.now()` with auction timestamp fields:
- `startTime`: When auction should become active
- `endTime`: When auction should end (can be extended by soft-close)
- `originalEndTime`: Original end time (before soft-close extensions)

### Winner Settlement

When an auction transitions to `ended` status:

1. Check if `currentBidderId` exists
2. If yes:
   - Notify winner with final price
   - Notify owner with sale details
   - Query all bids to find losing bidders
   - Notify all losing bidders
   - Next cycle will transition to `sold`
3. If no:
   - Notify owner auction ended without bids
   - Auction stays in `ended` status

### Error Handling

- All errors are logged with `[LIFECYCLE]` prefix
- Errors in one auction don't block processing of others
- Scheduler continues running even if individual checks fail

## Installation

The system is automatically installed and started when the server boots up. Dependencies are managed via npm:

```json
{
  "dependencies": {
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/node-cron": "^3.0.11"
  }
}
```

## Configuration

### Scheduler Intervals

Currently hardcoded in `auctionScheduler.ts`:
- Lifecycle check: `"* * * * *"` (every minute)
- Summary report: `"*/5 * * * *"` (every 5 minutes)

To change intervals, modify the cron expressions in `AuctionScheduler.start()`.

### Firebase Admin Requirement

The lifecycle automation **requires Firebase Admin SDK** to be properly configured. It will not run if:
- `FIREBASE_PROJECT_ID` is not set
- `FIREBASE_CLIENT_EMAIL` is not set
- `FIREBASE_PRIVATE_KEY` is not set

## Monitoring

### Console Logs

All lifecycle events are logged with timestamps and details:

```
[SCHEDULER] Starting auction lifecycle scheduler...
[LIFECYCLE] Starting auction lifecycle check at 2025-10-16T18:00:00.000Z
[LIFECYCLE] Found 15 total auctions to check
[LIFECYCLE] Auction abc123 should transition: upcoming → active
[LIFECYCLE] Updated auction abc123 status to "active"
[LIFECYCLE] Sent auction started notification to owner xyz789
[LIFECYCLE] Completed 1 transitions: abc123: upcoming → active
[SCHEDULER] Auction summary: {draft: 2, upcoming: 5, active: 8, ended: 3, sold: 12}
```

### Admin Endpoints

Check system status via API:

```bash
# Get scheduler status and auction counts
GET /api/admin/lifecycle/status
Authorization: Bearer <firebase-token>

# Response:
{
  "schedulerActive": true,
  "auctionsSummary": {
    "draft": 2,
    "upcoming": 5,
    "active": 8,
    "ended": 3,
    "sold": 12
  },
  "timestamp": 1697472000000
}

# Manually trigger a lifecycle check
POST /api/admin/lifecycle/trigger
Authorization: Bearer <firebase-token>

# Response:
{
  "success": true,
  "message": "Lifecycle check triggered successfully"
}
```

## Testing

### Manual Testing

1. Create an auction with:
   - `startTime`: 1 minute in the future
   - `endTime`: 2 minutes in the future
   - `status`: "upcoming"

2. Wait and observe logs:
   - After 1 minute: Should transition to "active"
   - After 2 minutes: Should transition to "ended"
   - After 3 minutes: Should transition to "sold" (if bids exist)

3. Check notifications in Firestore `notifications` collection

### Immediate Trigger

Use the admin endpoint to trigger lifecycle check immediately:

```bash
curl -X POST http://localhost:5000/api/admin/lifecycle/trigger \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

### Auction Summary

Check current state of all auctions:

```bash
curl http://localhost:5000/api/admin/lifecycle/status \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

## Troubleshooting

### Scheduler Not Starting

**Symptom**: No `[SCHEDULER]` logs on server startup

**Causes**:
- Firebase Admin not configured (missing env variables)
- Error during Firebase initialization

**Solution**: Check that all required environment variables are set:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Auctions Not Transitioning

**Symptom**: Auctions stuck in `upcoming` or `active` status past their time

**Debug Steps**:
1. Check scheduler is running: `GET /api/admin/lifecycle/status`
2. Check server logs for `[LIFECYCLE]` errors
3. Manually trigger: `POST /api/admin/lifecycle/trigger`
4. Verify auction timestamps are correct (not in milliseconds if expecting seconds)

### Notifications Not Sent

**Symptom**: Status transitions work but no notifications appear

**Debug Steps**:
1. Check Firestore security rules allow writes to `notifications` collection
2. Check server logs for `[LIFECYCLE]` notification errors
3. Verify `userId` fields match actual user IDs in Firestore
4. Check that `currentBidderId` is set correctly on auction

## Future Enhancements

Potential improvements to consider:

1. **Configurable Intervals**: Move cron expressions to environment variables
2. **Email Notifications**: Send emails in addition to in-app notifications
3. **SMS Alerts**: Send SMS for critical events (auction ending soon, won auction)
4. **Slack/Discord Webhooks**: Post events to team channels for monitoring
5. **Metrics & Analytics**: Track transition counts, average auction duration, etc.
6. **Retry Logic**: Retry failed notifications with exponential backoff
7. **Dead Letter Queue**: Store failed operations for manual review
8. **Auction Reminders**: Notify users 15 minutes before auction ends
9. **Bid History Archive**: Archive old bids after auction completes
10. **Performance Optimization**: Use Firestore queries with status filters

## Architecture Decisions

### Why Node-Cron?

- **Simple**: Easy to understand cron syntax
- **Reliable**: Mature library with good test coverage
- **Lightweight**: No external dependencies (Redis, PostgreSQL)
- **Sufficient**: 1-minute granularity is adequate for auction marketplace

### Why Not Cloud Functions?

- **Cost**: Scheduled functions run even with no auctions
- **Complexity**: Requires additional infrastructure setup
- **Development**: Harder to test locally
- **Deployment**: Separate deployment process

For production at scale, consider moving to:
- **Cloud Scheduler + Cloud Functions** (Google Cloud)
- **EventBridge + Lambda** (AWS)
- **Azure Functions + Timer Triggers** (Azure)

### Why Single-Process Scheduler?

- **MVP Simplicity**: Single server instance sufficient for initial launch
- **Lower Latency**: Direct database access, no queuing overhead
- **Easier Debugging**: All logs in one place

For production with multiple servers, consider:
- **Leader Election**: Use Redis or Firestore to elect single scheduler
- **Distributed Locking**: Prevent duplicate processing with locks
- **Queue-Based**: Use Bull, BullMQ, or RabbitMQ for job distribution

## Security Considerations

- Admin endpoints (`/api/admin/*`) require Firebase authentication
- Consider adding role-based access control (admin-only)
- Rate limiting on manual trigger endpoint to prevent abuse
- Audit logging for all lifecycle transitions

## Performance Considerations

- Current implementation scans ALL auctions every minute
- For large scale (>10,000 auctions), consider:
  - Query only auctions with specific statuses
  - Index on `status` + `startTime` / `endTime`
  - Batch processing with cursors
  - Separate schedulers for different auction pools

## Compliance & Audit Trail

All lifecycle transitions can be reconstructed from:
1. Server logs (timestamped transitions)
2. Firestore audit logs (if enabled)
3. Notification records (side effects of transitions)
4. Bid history (who won, when)

Consider adding explicit `auctions/{id}/history` collection to store transition events for compliance.

---

**Last Updated**: 2025-10-16
**Version**: 1.0.0
**Author**: Claude Code
