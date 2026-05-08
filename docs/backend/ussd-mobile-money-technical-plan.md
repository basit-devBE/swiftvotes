# SwiftVote USSD + Mobile Money Technical Plan

## Purpose

This document defines the implementation plan for adding a USSD voting channel to SwiftVote.

The intended provider stack is:

- **Arkesel** — shortcode and telco USSD delivery.
- **USSDK** — USSD menu orchestration and dynamic hook calls.
- **SwiftVote backend** — event, category, contestant, vote, and payment intent logic.
- **Paystack Mobile Money** — payment authorization and confirmation.

The goal is to let a voter dial a shortcode, select or enter the voting details, approve a Mobile Money charge on their phone, and have SwiftVote count the vote only after Paystack confirms payment.

## Current Payment Flow

The web voting flow currently works like this:

```text
Frontend vote modal
→ POST /v1/events/:eventId/votes
→ CastVoteUseCase
→ PaystackService.initializeTransaction()
→ POST https://api.paystack.co/transaction/initialize
→ frontend redirects to Paystack authorization_url
→ Paystack callback / webhook
→ GET /v1/events/:eventId/votes/verify?reference=...
→ ConfirmVoteUseCase verifies transaction
→ Payment becomes SUCCEEDED and Vote becomes CONFIRMED
```

Important existing implementation points:

- `PaystackService.initializeTransaction()` uses Paystack Transaction Initialize.
- `CastVoteUseCase` creates a pending `Payment` and a pending `Vote`.
- `HandlePaystackWebhookUseCase` records webhook deliveries and handles `charge.success`.
- `ConfirmVoteUseCase` verifies with Paystack before marking a vote confirmed.
- The webhook/verify path is already the right authority for counting paid votes.

The USSD flow should reuse the existing `Payment`, `Vote`, webhook audit, and confirmation logic. It should not redirect users to a web checkout.

## Product Decisions

- USSD is a voting channel, not a payment authority.
- Arkesel and USSDK collect the vote intent only.
- Paystack remains the source of truth for payment success.
- Paid votes are counted only after Paystack returns success through webhook or verification.
- A USSD session can end before payment completes; this is expected.
- The payment status must be recoverable later by reference or phone/session metadata.
- The first implementation targets paid categories through Ghana Mobile Money.
- Free USSD voting can be added later, but should still follow rate-limit/fraud rules.

## Target Flow

```text
Voter dials Arkesel shortcode
→ Arkesel forwards the USSD session to USSDK
→ USSDK renders menus and calls SwiftVote hooks
→ SwiftVote resolves live events, categories, and contestant code
→ Voter enters vote quantity and selects Mobile Money provider
→ SwiftVote creates pending Payment + pending Vote
→ SwiftVote calls Paystack /charge with mobile_money
→ Paystack sends authorization prompt to the voter phone
→ Voter approves with Mobile Money PIN / prompt
→ Paystack sends charge.success webhook to SwiftVote
→ SwiftVote verifies payment and marks Vote CONFIRMED
```

## Provider Responsibilities

### Arkesel

Arkesel provides:

- shortcode or shared shortcode
- telco routing
- USSD session delivery
- callback/forwarding configuration
- test access or simulator, if available

Arkesel should forward USSD sessions to the USSDK instance URL.

### USSDK

USSDK provides:

- menu builder
- step state
- dynamic list rendering
- hook calls to SwiftVote backend
- provider deployment target for Arkesel
- request signature headers for hook verification

USSDK should not store final payment state as the source of truth.

### SwiftVote Backend

SwiftVote owns:

- approved/live event selection
- category and contestant validation
- vote quantity and amount calculation
- pending payment/vote creation
- Paystack charge initiation
- webhook verification
- vote confirmation
- admin audit and reconciliation

### Paystack

Paystack owns:

- Mobile Money charge request
- customer authorization prompt
- charge status
- webhook delivery
- provider reference and fee data

## Paystack Mobile Money

For Ghana, the planned payment channel is Paystack **Mobile Money** through the Charge API.

```text
POST https://api.paystack.co/charge
```

Paystack's generic `ussd` Charge API object should not be used for Ghana unless Paystack explicitly enables/supports it for the merchant account. The Ghana path is `mobile_money`.

Expected Ghana provider codes:

```text
MTN MoMo       → mtn
AirtelTigo     → atl
Telecel Cash   → vod
```

These provider codes must be re-confirmed against Paystack docs/account settings before production rollout.

### Example Charge Request

```json
{
  "email": "voter-233241234567@swiftvote.local",
  "amount": 500,
  "currency": "GHS",
  "reference": "swv_ussd_abc123",
  "mobile_money": {
    "phone": "0241234567",
    "provider": "mtn"
  },
  "metadata": {
    "source": "ussd",
    "ussdProvider": "arkesel",
    "ussdSessionId": "session_123",
    "eventId": "event_123",
    "categoryId": "cat_456",
    "contestantId": "contestant_789",
    "quantity": 5
  }
}
```

### Expected Charge Response

Paystack may return a pending/offline authorization state:

```json
{
  "status": true,
  "message": "Charge attempted",
  "data": {
    "reference": "swv_ussd_abc123",
    "status": "pay_offline",
    "display_text": "Please complete authorization process on your mobile phone"
  }
}
```

USSDK should show the voter a short message:

```text
Payment request sent to 0241234567.
Approve it with your MoMo PIN.
Your votes count after payment is confirmed.
```

## USSD Menu Flow

Initial menu:

```text
Welcome to SwiftVote
1. Vote in an event
2. Check payment status
```

Vote flow:

```text
1. Select live event
2. Select category
3. Enter contestant code
4. Confirm contestant
5. Enter number of votes
6. Select Mobile Money provider
   1. MTN MoMo
   2. Telecel Cash
   3. AirtelTigo Money
7. Confirm amount
8. Send payment request
9. End session with payment instruction
```

Status flow:

```text
1. Enter payment reference
2. SwiftVote checks local Payment/Vote status
3. Show pending / confirmed / failed message
```

## Backend Endpoints

All USSD hook endpoints should be public from an auth perspective but protected by USSDK signature verification and optional IP allowlisting.

Suggested endpoints:

```text
POST /v1/ussd/hooks/events
POST /v1/ussd/hooks/categories
POST /v1/ussd/hooks/contestant
POST /v1/ussd/hooks/quote
POST /v1/ussd/hooks/create-payment
POST /v1/ussd/hooks/payment-status
```

### `POST /v1/ussd/hooks/events`

Returns live or eligible events for USSDK dynamic lists.

Filters:

- event status must be `VOTING_LIVE`
- event must be approved/public
- optionally limit to recently active or searchable events if the list becomes too long

### `POST /v1/ussd/hooks/categories`

Input:

```json
{
  "eventId": "event_123"
}
```

Returns categories with voting enabled.

### `POST /v1/ussd/hooks/contestant`

Input:

```json
{
  "eventId": "event_123",
  "categoryId": "cat_456",
  "contestantCode": "A01"
}
```

Validates:

- contestant exists
- contestant belongs to selected event
- contestant belongs to selected category
- voting is live for the event

### `POST /v1/ussd/hooks/quote`

Input:

```json
{
  "eventId": "event_123",
  "categoryId": "cat_456",
  "contestantId": "contestant_789",
  "quantity": 5
}
```

Returns:

```json
{
  "quantity": 5,
  "unitAmountMinor": 100,
  "amountMinor": 500,
  "currency": "GHS",
  "displayAmount": "GHS 5.00"
}
```

The backend must calculate amount server-side. USSDK values should never be trusted for price.

### `POST /v1/ussd/hooks/create-payment`

Input:

```json
{
  "sessionId": "session_123",
  "serviceCode": "*123#",
  "phoneNumber": "0241234567",
  "network": "MTN",
  "eventId": "event_123",
  "categoryId": "cat_456",
  "contestantId": "contestant_789",
  "quantity": 5,
  "mobileMoneyProvider": "mtn"
}
```

Responsibilities:

1. Verify USSDK signature.
2. Normalize the phone number.
3. Validate event, category, contestant, quantity, and voting window.
4. Calculate amount server-side.
5. Generate Paystack reference.
6. Call Paystack `/charge` with `mobile_money`.
7. Create `Payment` with status `PENDING`.
8. Create `Vote` with status `PENDING_PAYMENT`.
9. Link payment to vote.
10. Store USSD metadata on the `Payment.metadata` JSON column.
11. Return USSD-friendly response text.

Response:

```json
{
  "reference": "swv_ussd_abc123",
  "status": "PENDING",
  "message": "Payment request sent to 0241234567. Approve it with your MoMo PIN. Ref: swv_ussd_abc123"
}
```

### `POST /v1/ussd/hooks/payment-status`

Input:

```json
{
  "reference": "swv_ussd_abc123",
  "phoneNumber": "0241234567"
}
```

Returns:

```json
{
  "status": "CONFIRMED",
  "message": "Payment confirmed. 5 votes have been counted for Ama Mensah."
}
```

If still pending, the endpoint may call Paystack verify once before returning the local state.

## Backend Code Changes

### Paystack Service

Add a new method:

```ts
chargeMobileMoney(input: ChargeMobileMoneyInput): Promise<ChargeMobileMoneyResult>
```

Suggested input:

```ts
type ChargeMobileMoneyInput = {
  email: string;
  amountMinor: number;
  currency: string;
  reference: string;
  phone: string;
  provider: "mtn" | "atl" | "vod";
  metadata?: Record<string, unknown>;
};
```

Suggested result:

```ts
type ChargeMobileMoneyResult = {
  reference: string;
  status: string;
  displayText: string | null;
  raw: Record<string, unknown>;
};
```

Implementation details:

- use `POST ${PAYSTACK_BASE_URL}/charge`
- send `Authorization: Bearer PAYSTACK_SECRET_KEY`
- send `mobile_money.phone`
- send `mobile_money.provider`
- preserve full raw response in `Payment.rawInitResponse`

### USSD Module

Add a dedicated module:

```text
backend/src/modules/ussd
```

Suggested structure:

```text
ussd/
  application/
    use-cases/
      list-ussd-events.use-case.ts
      list-ussd-categories.use-case.ts
      resolve-ussd-contestant.use-case.ts
      quote-ussd-vote.use-case.ts
      create-ussd-mobile-money-payment.use-case.ts
      get-ussd-payment-status.use-case.ts
  infrastructure/
    ussdk-signature.service.ts
  presentation/
    http/
      ussd-hooks.controller.ts
      dto/
```

The USSD module can depend on existing repositories from:

- events
- contestants
- votes
- payments

Do not duplicate voting/payment rules inside the controller.

### Reuse or Refactor CastVoteUseCase

The current `CastVoteUseCase` is web-oriented because it:

- requires voter email
- builds a callback URL
- calls `transaction/initialize`
- returns `paymentUrl`

For USSD, avoid forcing this use case directly into the flow. Instead:

1. Extract shared validation/quote logic into a small domain service or helper.
2. Create a USSD-specific use case for Mobile Money charge initiation.
3. Reuse `PaymentsRepository`, `VotesRepository`, and `ConfirmVoteUseCase`.

This keeps the web redirect flow stable while adding the USSD prompt flow cleanly.

## Data Model Additions

The existing `Payment.metadata` JSON field can hold USSD-specific data initially:

```json
{
  "source": "ussd",
  "ussdProvider": "arkesel",
  "ussdOrchestrator": "ussdk",
  "ussdSessionId": "session_123",
  "serviceCode": "*123#",
  "network": "MTN",
  "mobileMoneyProvider": "mtn",
  "phoneNumber": "0241234567"
}
```

If USSD becomes a core reporting dimension, promote these to columns later:

- `source`
- `ussdProvider`
- `ussdSessionId`
- `serviceCode`
- `payerPhone`
- `mobileMoneyProvider`

For the first implementation, metadata is enough if admin filtering is not required immediately.

## Webhook Handling

Existing webhook endpoint:

```text
POST /v1/payments/webhook
```

Keep this endpoint as the final confirmation path.

When Paystack sends `charge.success`:

1. Record `PaymentWebhookEvent`.
2. Verify Paystack signature.
3. Find payment by reference.
4. Call `ConfirmVoteUseCase.execute(reference)`.
5. Verify reference, amount, and currency.
6. Mark payment `SUCCEEDED`.
7. Mark vote `CONFIRMED`.
8. Send confirmation email if a real email exists.

For USSD-generated pseudo emails, confirmation email may be skipped or redirected to SMS in a later phase.

## Security

### USSDK Hook Verification

Every USSDK hook request should be verified before processing.

Requirements:

- store `USSDK_APP_SECRET`
- verify `X-USSDK-Signature` or the exact header specified by USSDK
- reject invalid signatures
- log rejected requests without writing payment/vote rows

### Paystack Verification

Never count votes from the immediate `/charge` response.

Only count votes after:

- Paystack webhook signature is valid
- Paystack verify confirms success
- reference matches local payment
- amount matches local payment and vote
- currency matches local payment and vote
- vote is still `PENDING_PAYMENT`

### Idempotency

The system must tolerate:

- duplicate USSD payment hook calls
- duplicate Paystack webhooks
- voter retrying the status check
- Paystack verify returning pending before success

Recommended idempotency key for USSD payment creation:

```text
ussdSessionId + eventId + contestantId + quantity + phoneNumber
```

For the first implementation, prefer generating one payment per explicit confirmation step. If USSDK can retry the same hook automatically, store the session id in metadata and check for an existing pending payment before creating another.

## Admin Surface

The existing admin payments page can display these payments immediately because they are normal `Payment` rows.

Later improvements:

- show source: `web` / `ussd`
- filter by Mobile Money provider
- show USSD session id
- show payer phone
- show pending USSD payments separately
- export USSD metadata in CSV

## Testing Plan

### Unit Tests

- provider mapping: MTN/Telecel/AirtelTigo to `mtn`/`vod`/`atl`
- phone normalization
- quote calculation
- invalid contestant code
- category/event mismatch
- voting not live
- invalid USSDK signature
- Paystack charge rejected

### Integration Tests

- create USSD Mobile Money payment creates `Payment` + `Vote`
- duplicate hook call does not double-create when session id matches
- `charge.success` webhook confirms the vote
- webhook duplicate is idempotent
- amount mismatch marks payment/vote failed
- payment status hook returns pending/confirmed/failed messages

### Manual Test Mode

Before live rollout:

1. Confirm Paystack test account supports Ghana Mobile Money Charge API.
2. Confirm provider codes in test mode.
3. Confirm webhook delivery for `charge.success`.
4. Confirm Arkesel forwards sessions to USSDK.
5. Confirm USSDK hook signature verification works.
6. Run a full shortcode test on MTN, Telecel, and AirtelTigo if available.

## Environment Variables

Existing:

```text
PAYSTACK_SECRET_KEY
PAYSTACK_BASE_URL
PAYSTACK_WEBHOOK_SECRET / secret key used for signature verification
```

Add:

```text
USSDK_APP_SECRET
USSD_PROVIDER=arkesel
USSD_ORCHESTRATOR=ussdk
```

Optional:

```text
USSD_ALLOWED_IPS=
USSD_DEFAULT_COUNTRY_CODE=GH
```

## Rollout Plan

### Phase 1 — Backend Foundation

- Add `PaystackService.chargeMobileMoney()`.
- Add USSD module and hook controller.
- Add quote, contestant resolve, create payment, and status use cases.
- Store USSD metadata on `Payment`.
- Reuse existing Paystack webhook and vote confirmation path.

### Phase 2 — USSDK Menu

- Build USSDK menu steps.
- Connect dynamic list hooks.
- Configure Arkesel provider deployment.
- Add test shortcode/session.

### Phase 3 — Admin Visibility

- Add `source` and Mobile Money provider display in payment tables.
- Add filters if metadata query is not too expensive.
- Add CSV export columns for USSD fields.

### Phase 4 — Production Readiness

- Confirm Paystack Ghana Mobile Money charge behavior on live account.
- Confirm webhook reliability.
- Confirm Arkesel telco behavior and timeout windows.
- Add monitoring for pending payments older than expected.
- Add a scheduled sweeper to verify or expire stale pending USSD payments.

## Open Questions

- Does the active Paystack Ghana account have Charge API Mobile Money enabled?
- Does Paystack test mode simulate real Ghana Mobile Money prompts or only return fake statuses?
- Will Arkesel route directly into USSDK, or must it call SwiftVote first?
- What exact signature header and signing algorithm does USSDK use for hooks?
- Should USSD voters be required to enter a name, or should phone number be enough?
- Should confirmation be sent by SMS through Arkesel after Paystack success?
- How long should pending USSD payments remain retryable before being marked failed?

## Implementation Notes

- Do not modify the existing web payment endpoint for the first USSD implementation.
- Do not count votes from USSD session completion.
- Do not count votes from Paystack `/charge` immediate response.
- Keep the `Payment.reference` as the shared identifier across USSDK, SwiftVote, and Paystack.
- Store full Paystack charge response in `rawInitResponse`.
- Store full Paystack verify response in `rawVerifyResponse`.
- Keep all money in minor units.
- Keep `GHS` uppercase.
