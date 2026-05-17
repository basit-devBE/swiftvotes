# SwiftVote Ticketing Technical Plan

## Purpose

This document defines the technical plan for adding ticketing events to SwiftVote.

The goal is to introduce ticketing without weakening or complicating the existing voting payment flow.

This phase introduces:

- event type support
- ticket type setup
- ticket orders
- issued tickets
- dedicated ticketing payments
- ticketing payment webhooks
- public ticket purchase flow
- organiser-facing ticket sales views

## Scope

### In scope

- Add `EventType` so events can be either voting or ticketing.
- Keep existing events as voting events.
- Add ticketing-specific Prisma models.
- Add a dedicated ticketing payment table.
- Add public ticket order creation and payment verification.
- Add Paystack initialization and verification for ticket orders.
- Add webhook handling for ticket payments.
- Add ticket confirmation email support.
- Add frontend event creation branching for voting vs ticketing.
- Add public ticketing event page and checkout flow.
- Add organiser views for ticket types and ticket orders.

### Out of scope for the first implementation

- Seat maps.
- Discount codes.
- Refund issuing.
- Partial refunds.
- Transfer of tickets between buyers.
- Multi-provider payment abstraction.
- USSD ticket purchase flow.
- Advanced check-in analytics.

## Product Decisions Locked In

- Ticketing is a separate event product, not a variation of voting.
- Existing events default to `VOTING`.
- A ticketing event still uses the existing event ownership and approval system.
- Ticketing payments must be fully separate from voting payments.
- The existing voting `Payment` table remains voting-only.
- Ticketing uses its own `TicketPayment` table.
- Ticketing does not use contestants, nominations, votes, or voting categories.
- The first provider can be Paystack.
- Tickets are only issued after payment is verified.
- Ticket inventory must not oversell.

## Current System Constraints

The current schema is voting-centered:

- `Event.votingStartAt` and `Event.votingEndAt` are required.
- `EventCategory` stores `votePriceMinor`.
- `Vote` requires `eventId`, `categoryId`, and `contestantId`.
- `Payment` requires `eventId`, `categoryId`, and `contestantId`.
- The public event page fetches contestants and renders voting or nomination flows.

Because of this, ticketing should not reuse:

- `EventCategory`
- `Vote`
- voting `Payment`
- voting callbacks
- voting ledger endpoints

Ticketing needs its own module and tables.

## Event Type

Add a new enum:

```prisma
enum EventType {
  VOTING
  TICKETING
}
```

Add to `Event`:

```prisma
eventType EventType @default(VOTING)
```

Migration note:

- Existing rows must default to `VOTING`.
- Existing API responses should include `eventType`.
- Frontend types should include `eventType: "VOTING" | "TICKETING"`.

## Event Fields

Ticketing needs event date and venue fields that are not voting-specific.

Add nullable fields to `Event`:

```prisma
eventStartAt DateTime?
eventEndAt DateTime?
venueName String?
venueAddress String?
ticketSalesStartAt DateTime?
ticketSalesEndAt DateTime?
```

Keep `votingStartAt` and `votingEndAt` required for now to avoid a large migration.

For ticketing events in the first migration, there are two possible approaches:

1. Keep `votingStartAt` and `votingEndAt` populated from ticket sales dates for compatibility.
2. Make `votingStartAt` and `votingEndAt` nullable and update all voting-only code paths.

Recommendation for first implementation:

- Keep existing required voting date fields.
- Add the new ticketing fields.
- Populate `votingStartAt` and `votingEndAt` for ticketing events as compatibility fields.
- Plan a later cleanup to rename or split schedule fields properly.

This reduces migration risk while still giving ticketing the correct public semantics.

## Data Model

### `TicketType`

Represents a sellable ticket tier for a ticketing event.

```prisma
model TicketType {
  id                String   @id @default(cuid())
  eventId           String
  name              String
  description       String?
  priceMinor        Int
  currency          String
  quantityAvailable Int?
  quantitySold      Int      @default(0)
  salesStartAt      DateTime?
  salesEndAt        DateTime?
  isActive          Boolean  @default(true)
  sortOrder         Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  orderItems TicketOrderItem[]
  issuedTickets IssuedTicket[]

  @@unique([eventId, name])
  @@index([eventId, sortOrder])
  @@index([eventId, isActive])
}
```

Notes:

- `quantityAvailable = null` means unlimited inventory.
- `quantitySold` is a denormalized counter for fast reads.
- Inventory updates must happen inside a database transaction.

### `TicketOrder`

Represents a buyer's order.

```prisma
model TicketOrder {
  id               String            @id @default(cuid())
  eventId          String
  buyerName        String
  buyerEmail       String
  buyerPhone       String?
  status           TicketOrderStatus @default(PENDING)
  totalAmountMinor Int
  currency         String
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  items TicketOrderItem[]
  payment TicketPayment?
  issuedTickets IssuedTicket[]

  @@index([eventId, status, createdAt])
  @@index([buyerEmail, createdAt])
}
```

```prisma
enum TicketOrderStatus {
  PENDING
  PAID
  FAILED
  ABANDONED
  CANCELLED
}
```

### `TicketOrderItem`

Represents one ticket type inside an order.

```prisma
model TicketOrderItem {
  id               String @id @default(cuid())
  orderId          String
  ticketTypeId     String
  quantity         Int
  unitPriceMinor   Int
  totalAmountMinor Int
  createdAt        DateTime @default(now())

  order TicketOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  ticketType TicketType @relation(fields: [ticketTypeId], references: [id], onDelete: Restrict)
  issuedTickets IssuedTicket[]

  @@index([orderId])
  @@index([ticketTypeId])
}
```

Phase one can support one item per order. The table should still allow multiple items later.

### `IssuedTicket`

Represents an actual ticket issued after payment.

```prisma
model IssuedTicket {
  id            String             @id @default(cuid())
  eventId       String
  orderId       String
  orderItemId   String
  ticketTypeId  String
  code          String             @unique
  status        IssuedTicketStatus @default(VALID)
  checkedInAt   DateTime?
  checkedInById String?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt

  event Event @relation(fields: [eventId], references: [id], onDelete: Cascade)
  order TicketOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderItem TicketOrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  ticketType TicketType @relation(fields: [ticketTypeId], references: [id], onDelete: Restrict)
  checkedInBy User? @relation(fields: [checkedInById], references: [id], onDelete: SetNull)

  @@index([eventId, status])
  @@index([orderId])
  @@index([ticketTypeId])
}
```

```prisma
enum IssuedTicketStatus {
  VALID
  CHECKED_IN
  CANCELLED
}
```

### `TicketPayment`

This is the dedicated ticketing payment table.

It must not reuse the voting `Payment` table.

```prisma
model TicketPayment {
  id String @id @default(cuid())

  orderId String @unique

  reference   String  @unique
  providerRef String?
  provider    String  @default("paystack")

  amountMinor     Int
  amountPaidMinor Int?
  feeMinor        Int?
  currency        String

  status        TicketPaymentStatus @default(PENDING)
  initializedAt DateTime            @default(now())
  paidAt        DateTime?
  failedAt      DateTime?
  failureReason String?

  buyerEmail   String
  buyerName    String?
  buyerPhone   String?
  channel      String?
  cardLast4    String?
  mobileNumber String?
  customerIp   String?

  rawInitResponse   Json?
  rawVerifyResponse Json?
  metadata          Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  order TicketOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  webhookEvents TicketPaymentWebhookEvent[]

  @@index([status, createdAt])
  @@index([buyerEmail, createdAt])
  @@index([providerRef])
}
```

```prisma
enum TicketPaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  ABANDONED
  REFUNDED
}
```

### `TicketPaymentWebhookEvent`

Stores webhook audit history for ticket payments.

```prisma
model TicketPaymentWebhookEvent {
  id             String   @id @default(cuid())
  ticketPaymentId String?
  provider       String   @default("paystack")
  eventType      String
  reference      String
  signatureValid Boolean
  rawPayload     Json
  receivedAt     DateTime @default(now())
  processed      Boolean  @default(false)
  processedAt    DateTime?

  ticketPayment TicketPayment? @relation(fields: [ticketPaymentId], references: [id], onDelete: SetNull)

  @@index([reference])
  @@index([receivedAt])
}
```

## Module Structure

Add:

- `modules/ticketing`

Suggested internal structure:

- `domain`
  - ticket-type
  - ticket-order
  - ticket-payment
  - issued-ticket
- `application`
  - use-cases
  - ports
- `infrastructure`
  - persistence
- `presentation`
  - http

Keep ticketing use cases separate from voting use cases.

The existing Paystack HTTP client can be reused, but it should eventually live in a shared payment infrastructure module instead of inside `votes`.

## API Surface

### Public endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/events/:eventId/ticket-types` | Public | List available ticket types |
| `POST` | `/events/:eventId/ticket-orders` | Public | Create ticket order and initialize payment |
| `GET` | `/events/:eventId/ticket-orders/verify` | Public | Verify ticket payment after provider redirect |

### Organiser endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/events/:eventId/ticket-types` | EVENT_OWNER, EVENT_ADMIN | Create ticket type |
| `PATCH` | `/events/:eventId/ticket-types/:ticketTypeId` | EVENT_OWNER, EVENT_ADMIN | Update ticket type |
| `DELETE` | `/events/:eventId/ticket-types/:ticketTypeId` | EVENT_OWNER, EVENT_ADMIN | Disable or delete ticket type |
| `GET` | `/events/:eventId/ticket-orders` | EVENT_OWNER, EVENT_ADMIN | List ticket orders |
| `GET` | `/events/:eventId/tickets` | EVENT_OWNER, EVENT_ADMIN | List issued tickets |
| `POST` | `/events/:eventId/tickets/:code/check-in` | EVENT_OWNER, EVENT_ADMIN, MODERATOR | Check in ticket |

### Webhook endpoint

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/ticket-payments/webhook` | Public signature verified | Paystack ticket payment webhook |

Keep this separate from the voting webhook endpoint.

## DTO Direction

### Create Ticket Type DTO

```typescript
class CreateTicketTypeDto {
  name: string;
  description?: string;
  priceMinor: number;
  currency: string;
  quantityAvailable?: number | null;
  salesStartAt?: string;
  salesEndAt?: string;
  sortOrder?: number;
}
```

Validation:

- `name` required
- `priceMinor >= 50` for paid tickets in phase one
- `currency` required
- `quantityAvailable >= 1` if present
- sales start must be before sales end if both are present

### Create Ticket Order DTO

```typescript
class CreateTicketOrderDto {
  ticketTypeId: string;
  quantity: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  callbackOrigin?: string;
}
```

Validation:

- `ticketTypeId` required
- `quantity >= 1`
- buyer name required
- buyer email required and valid
- buyer phone optional in phase one

### Verify Ticket Order Query

```text
GET /events/:eventId/ticket-orders/verify?reference=swv_...
```

## Core Use Cases

### CreateTicketTypeUseCase

Steps:

1. Load event.
2. Validate event exists and `event.eventType === TICKETING`.
3. Validate actor has event owner/admin access.
4. Validate price and inventory fields.
5. Create ticket type.

### CreateTicketOrderUseCase

Input:

- event id
- ticket type id
- quantity
- buyer name
- buyer email
- buyer phone
- callback origin
- customer IP

Steps:

1. Load event.
2. Validate event type is `TICKETING`.
3. Validate event is approved or otherwise public-sale eligible.
4. Validate sales window is open.
5. Load ticket type.
6. Validate ticket type belongs to event.
7. Validate ticket type is active.
8. Validate requested quantity is available.
9. Compute total amount.
10. Initialize Paystack transaction with `/ticket/callback`.
11. In one transaction:
    - create `TicketOrder` with `PENDING`
    - create `TicketOrderItem`
    - create `TicketPayment` with `PENDING`
12. Return payment URL and order reference.

Inventory note:

- Phase one should avoid incrementing `quantitySold` before payment succeeds unless a reservation expiry system exists.
- On order creation, check availability.
- On payment success, atomically increment `quantitySold` only if enough inventory remains.
- If inventory is no longer available by the time payment succeeds, mark the order for manual review or fail issuing. This edge case should be rare but must be logged.

### ConfirmTicketOrderUseCase

Input:

- payment reference

Steps:

1. Find `TicketPayment` by reference.
2. Load linked order and items.
3. If payment already succeeded and order is paid, return existing order.
4. Verify transaction with Paystack.
5. Validate:
   - reference matches
   - amount matches
   - currency matches
6. If Paystack status is success:
   - in one transaction:
     - update `TicketPayment` to `SUCCEEDED`
     - update `TicketOrder` to `PAID`
     - increment ticket type `quantitySold`
     - create one `IssuedTicket` per purchased ticket
   - send ticket confirmation email after transaction commits
7. If Paystack status is failed or abandoned:
   - update `TicketPayment`
   - update `TicketOrder`
8. Return order confirmation data.

### HandleTicketPaymentWebhookUseCase

Steps:

1. Extract event type and reference.
2. Find ticket payment by reference if possible.
3. Record `TicketPaymentWebhookEvent` before business processing.
4. Verify Paystack signature.
5. If signature is invalid, do not process payment state.
6. For `charge.success`, call `ConfirmTicketOrderUseCase`.
7. For `charge.failed`, mark ticket payment and order failed.
8. Mark webhook event processed when processing completes.
9. Return `200` for valid webhook deliveries to avoid unnecessary retries.

## Payment Integration

### Initialize Paystack Transaction

Use the existing Paystack transaction initialization shape:

```json
{
  "email": "buyer@example.com",
  "amount": 10000,
  "currency": "GHS",
  "reference": "swv_<uuid>",
  "callback_url": "https://swiftvote.../ticket/callback?eventId=...",
  "metadata": {
    "purpose": "ticket_order",
    "eventId": "...",
    "orderId": "...",
    "ticketTypeId": "...",
    "quantity": 2,
    "buyerName": "..."
  }
}
```

### Verify Paystack Transaction

On verify, compare provider data against local records before marking paid:

- provider reference equals `TicketPayment.reference`
- provider amount equals `TicketPayment.amountMinor`
- provider currency equals `TicketPayment.currency`
- provider status is `success`

## Ticket Code Generation

Ticket codes should be unique and not guessable.

Recommended format:

```text
SWT-<EVENT_SHORT>-<RANDOM>
```

Example:

```text
SWT-AMA-8K4Q2X
```

Rules:

- enforce uniqueness at the database level
- retry on collision
- do not expose sequential IDs as ticket codes

## Email Triggers

### Ticket Confirmation Email

Trigger:

- ticket order transitions to `PAID`

Recipient:

- buyer email

Contents:

- event name
- event date and time
- venue
- ticket type
- quantity
- amount paid
- order reference
- ticket code or ticket codes

## Frontend Scope

### Event Creation

At the start of the event creation flow, add an event type selection:

- Voting Event
- Ticketing Event

For voting events, keep the current setup flow.

For ticketing events, show:

- basics
- event date and venue
- ticket sales window
- media
- ticket types
- review

### Public Event Page

Branch on event type:

```typescript
if (event.eventType === "VOTING") {
  // current voting and nomination page
}

if (event.eventType === "TICKETING") {
  // ticketing event page
}
```

The ticketing page should show:

- event media
- event name
- date and venue
- ticket types
- sold out states
- checkout action

### Ticket Checkout

The checkout modal should include:

- selected ticket type
- quantity selector
- total amount
- buyer name
- buyer email
- buyer phone
- payment button

For paid tickets, the frontend redirects to Paystack using the `paymentUrl` returned by the backend.

### `/ticket/callback`

Add a separate ticket callback page.

It should:

1. Read `eventId`.
2. Read `reference` or `trxref`.
3. Call ticket verification endpoint.
4. Show loading while verifying.
5. Show ticket confirmation when paid.
6. Show failure state when payment failed.

Do not reuse `/vote/callback`.

## Admin And Organiser Reporting

Ticketing should have its own reporting screens first:

- ticket orders
- ticket payments
- ticket types
- issued tickets

Later, the admin dashboard can include combined revenue by aggregating:

- voting payments from `Payment`
- ticketing payments from `TicketPayment`

The tables should remain separate even when reporting is combined.

## Testing Plan

### Unit Tests

Cover:

- ticket type creation rejects non-ticketing events
- ticket order creation rejects inactive ticket types
- ticket order creation rejects sold-out ticket types
- ticket order creation initializes Paystack and creates pending rows
- payment verification validates amount and currency
- payment success marks order paid
- payment success issues the correct number of tickets
- payment success increments `quantitySold`
- duplicate verification is idempotent
- failed payment marks order failed
- webhook signature rejection does not update order state

### E2E Tests

Cover:

1. organiser creates a ticketing event
2. organiser adds ticket types
3. public buyer creates a ticket order
4. pending ticket payment is created
5. Paystack success verifies and issues tickets
6. callback page displays confirmation
7. webhook success confirms an order if redirect was missed
8. sold-out ticket type cannot be purchased
9. voting event behavior remains unchanged

## Suggested Implementation Order

1. Add ticketing product and technical docs.
2. Add Prisma enums and ticketing models.
3. Add event `eventType` and ticketing event fields.
4. Update backend event DTOs and responses.
5. Add ticketing repository ports and Prisma implementations.
6. Add ticket type use cases and endpoints.
7. Add ticket order creation use case.
8. Add ticket payment verification use case.
9. Add ticket payment webhook use case.
10. Add ticket confirmation email template.
11. Update frontend event creation to branch by event type.
12. Add ticketing public event view.
13. Add checkout modal and `/ticket/callback`.
14. Add organiser ticket orders screen.
15. Add tests.

## Acceptance Criteria

This phase is complete when:

- existing voting events still work
- organisers can create ticketing events
- ticketing events go through approval
- organisers can create ticket types
- public buyers can buy tickets
- Paystack checkout works for ticket orders
- ticket payments are stored in `TicketPayment`
- voting payments remain stored only in `Payment`
- tickets are issued only after verified payment
- buyers receive confirmation
- organisers can view ticket orders
- ticket inventory cannot oversell under normal concurrent use

## Open Questions

- Should phase one allow free tickets?
- Should buyer phone be required or optional?
- Should one order support multiple ticket types immediately, or should that wait?
- Should check-in ship in the first ticketing release or the second?
- Should event deletion become soft delete before ticketing goes live, since ticket orders and payments are financial records?
- Should ticketing revenue appear in the current admin dashboard immediately or remain in a ticketing-specific report first?

## Summary

Ticketing should be implemented as a separate domain beside voting.

The platform can share:

- users
- event ownership
- event approval
- event media
- access control
- notification infrastructure
- Paystack HTTP client

Ticketing must keep separate:

- ticket types
- ticket orders
- issued tickets
- ticket payments
- ticket payment webhooks

This keeps voting stable while allowing SwiftVote to grow into a broader event commerce platform.
