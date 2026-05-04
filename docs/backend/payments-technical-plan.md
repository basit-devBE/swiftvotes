# SwiftVote Payments Technical Plan

## Purpose

This document defines the plan to introduce a first-class **Payment** record alongside the existing `Vote` model, and a separate **PaymentWebhookEvent** audit log.

It supersedes the implicit "payment lives on the vote row" model that was used in the initial Paystack integration.

## Why

The current implementation conflates two domain concepts on a single row:

- **Vote** — *"this person picked this contestant"* (a domain fact)
- **Payment** — *"this much money moved through Paystack with these properties"* (a financial fact)

Today, the `Vote` table carries `transactionRef`, `amountMinor`, `currency`, and `status`. That is the *only* record of the financial side of a paid cast. Information that Paystack returns and we currently throw away includes:

- channel (`card` / `mobile_money` / `bank` / `ussd`)
- fees deducted by Paystack
- card last4, mobile number used
- gateway response message
- customer IP as Paystack saw it
- the raw `paidAt` timestamp
- the verify response payload

We also have **no log at all of webhook events received** — they are processed, idempotency is checked against the vote row, and the original payload is discarded.

The cost of this shape becomes real when:

1. An organiser asks *"what payouts should I expect from Paystack this month?"* — we can't reconcile against Paystack settlements without fee/channel data.
2. A voter disputes a charge — we have no audit trail of what Paystack told us and when.
3. A webhook arrives for an event we don't currently handle (refund, chargeback, transfer.success) — there is nowhere to record it for later processing.
4. The product evolves to *"one payment unlocks N votes"* or *"trial / promotional credits"* — the 1:1 vote-to-payment shape on a single row cannot express it.
5. We need to debug a stuck payment — we cannot reproduce what Paystack actually told us.

The longer we wait, the more painful the migration becomes. As of writing, the database contains **zero paid votes**, so this is greenfield work, not a real-money backfill.

## Scope

### In scope

- A new `Payment` Prisma model linked 1:1 with `Vote` for paid casts.
- A new `PaymentWebhookEvent` Prisma model — raw audit log of every webhook hit.
- A new `PaymentsRepository` port and Prisma implementation.
- Refactor of `CastVoteUseCase`, `ConfirmVoteUseCase`, and `HandlePaystackWebhookUseCase` to write to both tables transactionally.
- New organiser-facing endpoints to list and inspect payments.
- A "Payments" tab on the event-manage view with filters, totals, and CSV export.

### Out of scope

- Refund flow (recording refund webhooks is in scope; *issuing* refunds is not).
- Multi-vote-per-payment or promotional credits (the schema will allow it, but we won't build the UX).
- Real-time payment dashboards, alerting, multi-provider abstraction beyond Paystack.
- Migrating away from Paystack.

## Data model

### `Payment`

```prisma
model Payment {
  id                String         @id @default(cuid())

  // Identifiers
  reference         String         @unique          // swv_<uuid> we generate
  providerRef       String?                          // paystack's data.id from verify
  provider          String         @default("paystack")

  // Money
  amountMinor       Int                              // what we asked Paystack to charge
  amountPaidMinor   Int?                             // what Paystack actually charged (verify.data.amount)
  feeMinor          Int?                             // paystack's cut (verify.data.fees)
  currency          String

  // Lifecycle
  status            PaymentStatus  @default(PENDING) // PENDING | SUCCEEDED | FAILED | ABANDONED | REFUNDED
  initializedAt     DateTime       @default(now())
  paidAt            DateTime?
  failedAt          DateTime?
  failureReason     String?

  // Customer / context (snapshot at payment time)
  voterEmail        String
  voterName         String?
  channel           String?                          // card | mobile_money | bank | ussd | qr
  cardLast4         String?
  mobileNumber      String?
  customerIp        String?

  // Domain links
  eventId           String
  categoryId        String
  contestantId      String
  voteId            String?        @unique           // 1:1 with the vote it unlocked

  // Audit
  rawInitResponse   Json?
  rawVerifyResponse Json?
  metadata          Json?

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  vote              Vote?                  @relation(fields: [voteId], references: [id])
  event             Event                  @relation(fields: [eventId], references: [id], onDelete: Cascade)
  webhookEvents     PaymentWebhookEvent[]

  @@index([eventId, status, createdAt])
  @@index([voterEmail, createdAt])
  @@index([providerRef])
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  ABANDONED                                          // user closed Paystack popup
  REFUNDED
}
```

**Notes on each section:**

- **Identifiers** — `reference` is *our* `swv_<uuid>` (already used on `Vote.transactionRef`). `providerRef` is Paystack's internal id (`data.id`), useful for cross-referencing in their dashboard.
- **Money** — store *all three* of `amountMinor` (requested), `amountPaidMinor` (actually charged), `feeMinor` (deducted). Reconciliation requires all three.
- **Lifecycle** — explicit timestamps per state transition. `failureReason` is a short human-readable string; the full payload lives in `rawVerifyResponse`.
- **Customer / context** — denormalised snapshot. Voters change emails, contestants get deleted; we do not want a payment record to lose its identity over time.
- **Domain links** — `voteId` is `@unique`, enforcing 1:1. Until the vote is created (or if the user abandons mid-flow), it is null.
- **Audit** — `rawInitResponse` and `rawVerifyResponse` are full JSON payloads. We promote frequently-queried fields out of them into real columns; everything else stays in JSON for forensic use.

### `PaymentWebhookEvent`

```prisma
model PaymentWebhookEvent {
  id             String    @id @default(cuid())
  paymentId      String?
  provider       String    @default("paystack")
  eventType      String                            // charge.success | charge.failed | refund.processed | ...
  reference      String
  signatureValid Boolean
  rawPayload     Json
  receivedAt     DateTime  @default(now())
  processed      Boolean   @default(false)
  processedAt    DateTime?

  payment        Payment?  @relation(fields: [paymentId], references: [id], onDelete: SetNull)

  @@index([reference])
  @@index([receivedAt])
}
```

This is what gives us the audit trail. Every webhook hit is recorded **before any business logic runs**, including hits with invalid signatures (so we can detect spoofing attempts). After processing, `processed` flips to true and `processedAt` is stamped.

`paymentId` is nullable because a webhook may arrive for a `reference` we've never seen (replay, attack, Paystack bug). We still want to record it.

## Phase 1 — write-side parallel writes

**Goal**: fully populate `Payment` and `PaymentWebhookEvent` on every paid flow, without changing the API contract or the frontend.

### Migration

- One Prisma migration adds both tables and the `PaymentStatus` enum.
- The migration also adds a `payments` back-relation on `Event` (since `Payment.eventId` references it).
- No data backfill needed — zero paid votes exist.

### Code changes

1. **`PaymentsRepository`** port + Prisma implementation:
   - `createPending(input)` — used during cast.
   - `findByReference(reference)` — used during confirm/webhook.
   - `markSucceeded(input)` / `markFailed(input)` — lifecycle transitions.
   - `recordWebhookEvent(input)` — append-only.
   - `linkVote(paymentId, voteId)` — set the 1:1 link after vote creation.

2. **`CastVoteUseCase` paid path**:
   - Wrap `Payment.create` (PENDING) and `Vote.create` (PENDING_PAYMENT) in `prisma.$transaction([...])` so both succeed or both fail.
   - Persist `rawInitResponse` (the Paystack initialize result) into the payment row.
   - Snapshot voter email/name and IP onto the payment.

3. **`ConfirmVoteUseCase`**:
   - On verify success: in one transaction, update `Payment` (status → SUCCEEDED, set `paidAt`, `amountPaidMinor`, `feeMinor`, `channel`, `cardLast4`, `mobileNumber`, `rawVerifyResponse`) and `Vote` (status → CONFIRMED).
   - On verify failure: payment → FAILED with `failureReason`, vote → FAILED.
   - Provisioning (contestant account, confirmation email) keeps its current behaviour and is dispatched after the transaction commits.

4. **`HandlePaystackWebhookUseCase`**:
   - **First action**: insert a `PaymentWebhookEvent` row with `processed=false` and the raw payload, regardless of signature validity.
   - Then: validate signature → look up `Payment` by `reference` → branch on `eventType` (`charge.success` / `charge.failed` for now) → apply same updates as `ConfirmVoteUseCase` would → mark webhook event `processed=true`.
   - Idempotency: if `payment.status` is already `SUCCEEDED` or `FAILED`, no-op.

5. **`Vote` keeps `transactionRef`, `amountMinor`, `currency`** for now. They become denormalised reads. Phase 3 will revisit.

### What does *not* change in Phase 1

- HTTP API request/response shapes — `CastVoteResponseDto`, `VerifyVoteResponseDto` keep their current fields.
- Frontend — no changes at all.
- Existing migrations — none altered.

### Done criteria for Phase 1

- A successful paid cast produces both a `Vote` and a `Payment` row with `voteId` linked, status `SUCCEEDED`, all Paystack metadata populated.
- A failed paid cast produces a `Payment` with status `FAILED` and a `Vote` with status `FAILED`.
- An abandoned cast (user closes Paystack tab) leaves `Payment` PENDING and `Vote` PENDING_PAYMENT — to be cleaned up by a future scheduled sweeper or expired by webhook.
- A `charge.success` webhook hits `PaymentWebhookEvent` (one row per delivery, including duplicates), and re-delivery does not double-confirm.
- Backend type-checks; backend boots; existing free-vote flow is untouched.

### Estimate

1–2 focused days of implementation + manual end-to-end test against Paystack test mode.

## Phase 2 — organiser surface

**Goal**: give organisers visibility into payments and a path to reconcile against Paystack.

### Endpoints

- `GET /events/:eventId/payments?status=&from=&to=&page=&pageSize=` — paginated list, organiser/admin only.
  - Default sort: `createdAt DESC`.
  - Returns: id, reference, voterName, voterEmail, contestant, category, amountPaidMinor, feeMinor, currency, channel, status, paidAt.
- `GET /payments/:paymentId` — detail with the linked vote, contestant, and webhook events sub-list.
- `GET /events/:eventId/payments.csv` — CSV export of the same shape as the list endpoint, no pagination, organiser-only.

### Frontend

- New "Payments" tab on `/events/[eventId]/manage`.
- Table with columns: voter, contestant, amount, fee, channel, status, paid at, reference.
- Filter bar: status, date range.
- Top strip showing totals: gross collected, fees, net.
- "Export CSV" button.
- Click-through to a payment detail drawer showing the webhook event timeline.

### Done criteria for Phase 2

- An organiser can see every payment for their event, paginated.
- They can filter by status and date range.
- They can export a CSV that they could hand to an accountant.
- They can drill into a payment and see the webhook events that came in for it.

### Estimate

1–2 focused days for backend + frontend.

## Phase 3 — cleanup (later, optional)

- Drop `Vote.transactionRef`, `Vote.amountMinor`, `Vote.currency` once nothing reads them. Replace with a join through `Payment` where needed. Only do this when query callers are audited.
- Add explicit handling for `refund.processed` webhook — flip `Payment.status` to `REFUNDED`, record `refundedAt`, optionally flip the linked `Vote` to `REFUNDED` too.
- A scheduled sweeper that ages stale `PENDING` payments (older than e.g. 1 hour) into `ABANDONED`, so the organiser dashboard reflects reality without waiting on a webhook.

## Tradeoffs and known risks

- **Hot path slows marginally** — paid casts now do two inserts in a transaction instead of one. Expected impact: a few ms per cast. Negligible at projected volume.
- **More moving parts** — every paid-flow change has to consider both tables. Mitigated by routing all writes through `PaymentsRepository` and `VotesRepository` rather than calling Prisma directly from use-cases.
- **JSON columns will grow** — Paystack verify payloads are 1–2 KB. At 100k payments that is ~200 MB of JSON, well within Postgres comfort. We accept the storage cost for forensic value.
- **Temptation to query JSON columns** — resist. If a field is queried, promote it to a real column.
- **Idempotency is now spread across two tables** — webhook handling must always check `Payment.status`, not the existence of a webhook event row. The webhook event is an audit log, not the source of truth.
- **Schema permissive of multi-vote-per-payment** — we add `voteId` as `@unique` to keep 1:1 enforced at the DB level. If/when we need many-to-one, we drop the unique constraint and introduce a join table; not solving that now.

## Open questions

- Should `Payment.eventId` cascade-delete or `SetNull`? Current draft is `Cascade`, matching `Vote`. Worth confirming — losing financial records when an event is deleted is a real concern. Likely we should make event deletion soft, but that is out of scope here.
- Should we attempt to capture Paystack's `customer.id` for repeat voters? Probably yes in Phase 2, low cost.
- Do we want a dedicated `Refund` model, or fold refunds onto `Payment` with `refundedAt` / `refundAmountMinor`? Current draft folds; a dedicated model is cleaner if we ever support partial refunds.

## Sequencing

1. This document committed.
2. Phase 1 implemented behind no flag — it's purely additive on the write side.
3. Phase 1 verified end-to-end against Paystack test mode.
4. Phase 2 implemented.
5. Phase 3 considered after the first event with real payments has happened.
