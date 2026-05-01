# SwiftVote Voting Technical Plan

## Purpose

This document defines the technical plan for SwiftVote's voting phase.

This phase builds on the existing event lifecycle, contestant, and auth foundations and introduces:

- the Vote data model
- free vote casting
- paid vote casting via Paystack
- payment webhook handling
- vote count aggregation
- a public leaderboard endpoint
- real vote counts on the contestant profile page
- vote confirmation emails to voters

## Scope

This phase covers:

- the Vote Prisma model and migration
- free vote creation without payment
- Paystack payment initiation for paid categories
- Paystack webhook to confirm paid votes
- Paystack redirect-back verification as a fallback
- vote count aggregation per contestant and category
- a public leaderboard endpoint
- vote ledger endpoint for event owners and admins
- real vote counts replacing the current placeholder
- voter confirmation email
- frontend voting UI on the public event page
- frontend payment redirect and callback handling

This phase does not yet cover:

- refund flows
- bulk vote exports in PDF or Excel
- real-time leaderboard via WebSocket or SSE
- advanced analytics dashboards
- mobile money provider options beyond Paystack
- per-voter rate limiting or duplicate vote prevention beyond basic fraud fields

## Product Decisions Locked In

- Voting is public. No SwiftVote account is required to vote.
- Voter name and email are required on every vote for audit purposes.
- Voters can cast more than one vote for the same contestant.
- Voters can vote multiple times during the same voting window.
- Each vote has a quantity. The price is `quantity × votePriceMinor`.
- Free categories skip payment. Votes are confirmed immediately.
- Paid categories require payment through Paystack before votes are recorded.
- A webhook from Paystack is the authoritative confirmation signal.
- A redirect-back verification endpoint is also supported as a secondary confirmation path.
- Votes initiated but not paid within the expiry window are considered failed.
- A confirmation email is sent to the voter after every successful vote.
- `contestantsCanViewOwnVotes` controls whether contestants see their own count.
- `contestantsCanViewLeaderboard` controls whether contestants see the ranked list.
- Both visibility flags are already stored on the Event model and do not require schema changes.

## Data Model

### New Entity: Vote

```prisma
model Vote {
  id             String     @id @default(cuid())
  eventId        String
  categoryId     String
  contestantId   String
  voterName      String
  voterEmail     String
  quantity       Int
  amountMinor    Int
  currency       String
  status         VoteStatus @default(FREE)
  transactionRef String?    @unique
  ipAddress      String?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt

  event      Event         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  category   EventCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  contestant Contestant    @relation(fields: [contestantId], references: [id], onDelete: Cascade)

  @@index([eventId, categoryId])
  @@index([contestantId])
  @@index([voterEmail])
  @@index([transactionRef])
}

enum VoteStatus {
  FREE
  PENDING_PAYMENT
  CONFIRMED
  FAILED
}
```

### Schema Changes to Existing Models

Add `votes Vote[]` relation to:
- `Event`
- `EventCategory`
- `Contestant`

No other schema changes are required.

### Vote Status Meanings

`FREE`
- category had `votePriceMinor = 0`
- votes are valid and counted immediately

`PENDING_PAYMENT`
- payment has been initiated with Paystack
- votes are not counted yet

`CONFIRMED`
- payment has been verified via webhook or redirect-back check
- votes are counted

`FAILED`
- payment was not completed within the allowed window
- or Paystack reported failure
- votes are not counted

## Module Structure

### New Module

- `modules/votes`

### Responsibilities

`votes`
- cast a free vote
- initiate a paid vote with Paystack
- handle Paystack webhook and mark vote as confirmed or failed
- verify payment on redirect-back
- aggregate vote counts per contestant and category
- return leaderboard data
- return voter-facing confirmation data
- return organiser-facing vote ledger

### Updated Modules

`contestants`
- `findWithContextByUserId` should include real vote count instead of hardcoded `0`
- `GET /contestants/me` response should reflect actual aggregated count

`notifications`
- add `sendVoteConfirmationEmail` to the notifications service interface

## Configuration

Add a new config block for Paystack:

```typescript
// core/config/paystack.config.ts
export const paystackConfig = registerAs('paystack', () => ({
  secretKey: process.env.PAYSTACK_SECRET_KEY,
  baseUrl: 'https://api.paystack.co',
}));
```

Required environment variable:

- `PAYSTACK_SECRET_KEY`

## API Surface

### Vote Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/events/:eventId/votes` | Public | Cast votes (free or initiate paid) |
| `GET` | `/events/:eventId/votes/verify` | Public | Verify payment on redirect-back |
| `POST` | `/payments/webhook` | Public (signature-verified) | Paystack webhook |
| `GET` | `/events/:eventId/leaderboard` | Public | Contestant rankings by category |
| `GET` | `/events/:eventId/votes` | EVENT_OWNER, EVENT_ADMIN | Full vote ledger |

### Leaderboard Response Shape

```typescript
{
  categoryId: string;
  categoryName: string;
  contestants: {
    rank: number;
    id: string;
    code: string;
    name: string;
    imageUrl: string | null;
    voteCount: number;
  }[];
}[]
```

### Vote Ledger Response Shape

```typescript
{
  id: string;
  contestantId: string;
  contestantName: string;
  contestantCode: string;
  categoryId: string;
  categoryName: string;
  voterName: string;
  voterEmail: string;
  quantity: number;
  amountMinor: number;
  currency: string;
  status: VoteStatus;
  transactionRef: string | null;
  createdAt: string;
}[]
```

## DTO Direction

### Cast Vote DTO

```typescript
class CastVoteDto {
  contestantId: string;    // required
  quantity: number;        // required, min 1
  voterName: string;       // required
  voterEmail: string;      // required, valid email format
}
```

### Verify Payment Query

```
GET /events/:eventId/votes/verify?reference=PAYSTACK_REFERENCE
```

No body. The `reference` query param comes from Paystack's redirect.

### Webhook DTO

Paystack sends its own payload shape. The webhook handler should:

1. verify the `x-paystack-signature` header using HMAC-SHA512 with `PAYSTACK_SECRET_KEY`
2. reject any request that fails signature verification with `400`
3. extract `event` type and `data.reference` from the payload
4. handle `charge.success` and `charge.failed`

## Core Use Cases

### CastVoteUseCase

Input:
- `eventId`
- `contestantId`
- `quantity`
- `voterName`
- `voterEmail`
- `ipAddress`

Steps:
1. load event and validate status is `VOTING_LIVE`
2. load contestant and validate it belongs to the event
3. load category from contestant's `categoryId`
4. if `category.votePriceMinor === 0`:
   - create `Vote` with `status = FREE`, `amountMinor = 0`
   - send confirmation email
   - return `{ type: 'free', voteId }`
5. if `category.votePriceMinor > 0`:
   - compute `amountMinor = quantity × category.votePriceMinor`
   - call Paystack `initializeTransaction` with amount, email, metadata
   - store `transactionRef` from Paystack response
   - create `Vote` with `status = PENDING_PAYMENT`
   - return `{ type: 'payment', paymentUrl }`

### ConfirmVoteUseCase

Input:
- `transactionRef`

Steps:
1. find `Vote` by `transactionRef`
2. validate current status is `PENDING_PAYMENT`
3. call Paystack `verifyTransaction` with the reference
4. if Paystack reports success:
   - set `status = CONFIRMED`
   - send confirmation email
5. if Paystack reports failure or pending:
   - set `status = FAILED`

### WebhookHandlerUseCase

Input:
- raw request body (for signature check)
- `x-paystack-signature` header
- parsed payload

Steps:
1. verify HMAC-SHA512 signature against `PAYSTACK_SECRET_KEY`
2. reject if invalid
3. if event type is `charge.success`: call `ConfirmVoteUseCase`
4. if event type is `charge.failed`: mark vote as `FAILED`
5. always return `200` to Paystack even if the vote is not found, to prevent retries

### GetLeaderboardUseCase

Input:
- `eventId`
- optional `categoryId`

Steps:
1. load all categories for the event (or just the requested category)
2. for each category, query `SUM(quantity)` grouped by `contestantId` where vote `status IN (FREE, CONFIRMED)`
3. load contestant details
4. return ranked list sorted by vote count descending

### GetMyContestantProfilesUseCase (update)

Replace the hardcoded `voteCount: 0` with a real aggregate:

```typescript
const voteCount = await this.prisma.vote.aggregate({
  where: {
    contestantId: contestant.id,
    status: { in: ['FREE', 'CONFIRMED'] },
  },
  _sum: { quantity: true },
});
```

Only include this count in the response if `event.contestantsCanViewOwnVotes` is true for that profile. If the flag is off, return `null` or omit the field entirely.

## Payment Integration

### Paystack: Initialize Transaction

```
POST https://api.paystack.co/transaction/initialize
Authorization: Bearer PAYSTACK_SECRET_KEY
{
  "email": voterEmail,
  "amount": amountMinor,       // Paystack expects minor units (kobo/pesewas)
  "currency": currency,
  "reference": generatedRef,   // crypto.randomUUID()
  "callback_url": "{FRONTEND_ORIGIN}/vote/callback",
  "metadata": {
    "voteId": vote.id,
    "eventId": vote.eventId,
    "contestantId": vote.contestantId,
    "quantity": vote.quantity
  }
}
```

Response includes `data.authorization_url` — this is the `paymentUrl` returned to the frontend.

### Paystack: Verify Transaction

```
GET https://api.paystack.co/transaction/verify/:reference
Authorization: Bearer PAYSTACK_SECRET_KEY
```

Check `data.status === 'success'`.

### Webhook Signature Verification

```typescript
const hash = crypto
  .createHmac('sha512', PAYSTACK_SECRET_KEY)
  .update(rawBody)
  .digest('hex');

if (hash !== req.headers['x-paystack-signature']) {
  throw new BadRequestException('Invalid signature');
}
```

Raw body must be preserved. Use `RawBodyMiddleware` or set `rawBody: true` in NestJS bootstrap.

## Email Triggers

### Vote Confirmation Email

Trigger:
- vote status transitions to `FREE` or `CONFIRMED`

Recipient:
- voter email

Contents:
- event name
- contestant name and code
- category name
- number of votes cast
- amount paid (or "Free" if no charge)
- date and time

## Leaderboard Visibility Rules

The `GET /events/:eventId/leaderboard` endpoint is always public.

However, the contestant profile page (`GET /contestants/me`) must respect visibility flags:

- `voteCount` is included only if `contestantsCanViewOwnVotes` is true
- the leaderboard fetch on the profile page should be skipped client-side if `contestantsCanViewLeaderboard` is false

The backend leaderboard endpoint itself does not check these flags — they are a UI concern for the contestant profile page only. Public event pages may always show the leaderboard.

## Frontend Scope

### Public Event Page Updates

- contestant cards should show a Vote button during `VOTING_LIVE`
- clicking Vote opens a Vote Modal

### Vote Modal

- contestant photo, name, and code at the top
- quantity selector: preset buttons (1, 5, 10, 20, 50) plus a custom input
- for paid categories: live price summary (`5 votes × GHS 2.00 = GHS 10.00`)
- for free categories: no price shown, just a quantity selector
- voter name and email fields (pre-filled if logged in)
- primary action button: Cast Vote (free) or Pay GHS X.XX (paid)
- loading state while waiting for the backend response

### Payment Redirect

For paid votes, after the backend returns a `paymentUrl`:
- redirect the browser to the Paystack payment page
- do not show a new page — let the browser navigate

### `/vote/callback` Page

Paystack redirects back here with a `reference` query parameter.

This page should:
1. call `GET /events/:eventId/votes/verify?reference=xxx` on load
2. show a loading spinner while verifying
3. on success: show a confirmation panel with contestant name, votes cast, amount, and a link back to the event
4. on failure: show an error message with a link to try again

The `eventId` should be passed either in the callback URL or read from the vote record returned by the verify endpoint.

### My Profile Page Updates

- replace the hardcoded `0` with the real `voteCount` from the API
- if `contestantsCanViewOwnVotes` is false, hide the votes section entirely rather than showing 0

## Testing Plan

### Unit Tests

Cover:

- `CastVoteUseCase` for free categories records vote with status `FREE`
- `CastVoteUseCase` for paid categories creates `PENDING_PAYMENT` vote and returns payment URL
- `ConfirmVoteUseCase` transitions status to `CONFIRMED` on Paystack success
- `ConfirmVoteUseCase` transitions status to `FAILED` on Paystack failure
- `WebhookHandlerUseCase` rejects requests with invalid HMAC signature
- `GetLeaderboardUseCase` only counts votes with status `FREE` or `CONFIRMED`
- vote casting is rejected when event status is not `VOTING_LIVE`
- vote casting is rejected when contestant does not belong to the event

### E2E Tests

Cover:

1. visitor casts a free vote — vote is created with status `FREE` and counted in leaderboard
2. visitor initiates a paid vote — vote is created with status `PENDING_PAYMENT`, payment URL returned
3. Paystack webhook arrives with `charge.success` — vote is confirmed and email is sent
4. Paystack webhook arrives with an invalid signature — request is rejected
5. redirect-back verification with a valid reference — vote is confirmed
6. redirect-back verification with an unknown reference — returns error
7. leaderboard reflects correct rankings after multiple votes
8. vote casting is rejected outside the `VOTING_LIVE` window

## Suggested Implementation Order

1. Prisma `Vote` model and migration
2. `paystackConfig` and environment variable setup
3. `PaystackService` (initialize, verify)
4. `CastVoteUseCase` — free path only, fully testable without Paystack
5. `GetLeaderboardUseCase` and endpoint
6. Wire real vote counts into `GetMyContestantProfilesUseCase`
7. `ConfirmVoteUseCase`
8. `CastVoteUseCase` — paid path using `PaystackService`
9. Webhook handler with HMAC verification
10. Vote confirmation email template and trigger
11. Frontend vote modal — free flow
12. Frontend vote modal — paid flow and Paystack redirect
13. `/vote/callback` page
14. My Profile page real vote count
15. Vote ledger endpoint for organisers

## Acceptance Criteria

This phase is complete when:

- public visitors can cast free votes without an account
- public visitors can cast paid votes through Paystack
- votes are only counted after payment confirmation
- abandoned or failed payments do not result in counted votes
- voters receive a confirmation email after every successful vote
- the leaderboard returns accurate contestant rankings per category
- organisers can view a full voting ledger for their event
- contestants see their real vote count when `contestantsCanViewOwnVotes` is enabled
- contestants see the ranked leaderboard when `contestantsCanViewLeaderboard` is enabled
- the Paystack webhook is signature-verified before any vote is confirmed
- all vote transactions are traceable through a stored `transactionRef`
