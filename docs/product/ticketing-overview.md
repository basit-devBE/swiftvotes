# SwiftVote Ticketing Overview

## Purpose

This document explains, at a high level, how ticketing should work in SwiftVote.

It is written as a product and operations reference, not a technical implementation guide.

The goal is to make sure everyone understands:

- what a ticketing event is
- how ticketing differs from voting
- how tickets are created and sold
- how public buyers purchase tickets
- what confirmation buyers receive
- what organisers and admins can see
- how ticket payments should be handled

## The Main Idea

SwiftVote currently supports voting events.

Ticketing adds a second event product: an organiser can create an event where the public buys tickets instead of voting for contestants.

This should not be treated as a variation of voting.

Voting events are built around:

- nominations
- categories
- contestants
- votes
- voting windows
- vote pricing per category

Ticketing events are built around:

- event date and venue
- ticket types
- ticket inventory
- ticket orders
- buyer details
- ticket confirmation
- optional check-in

Both products can share the same event approval, media, ownership, and public event foundation, but the commercial records should remain separate.

## Event Types

SwiftVote should support two event types:

- `Voting Event`
- `Ticketing Event`

When an organiser creates an event, they should choose the event type at the beginning.

That choice determines the setup flow and the public event experience.

For existing events, the default type should be `Voting Event` so current behavior does not change.

## What A Ticketing Event Contains

A ticketing event should include:

- event name
- description
- primary flyer
- optional banner
- event date and time
- optional event end date and time
- venue name
- venue address or location description
- ticket sales start date
- ticket sales end date
- one or more ticket types

Ticketing events should continue to go through the existing platform approval process before they become publicly available.

## Ticket Types

Each ticketing event can have one or more ticket types.

Examples:

- Regular
- VIP
- VVIP
- Early Bird
- Student
- Table for 5

Each ticket type should store:

- name
- optional description
- price
- currency
- optional quantity available
- active or inactive state
- sort order

If a ticket type has no quantity limit, the organiser can sell unlimited tickets of that type.

If a ticket type has a quantity limit, SwiftVote must stop selling that type once it is sold out.

## Who Can Buy Tickets

Any public visitor should be able to buy tickets.

Buyers do not need a SwiftVote account.

A buyer should provide:

- full name
- email address
- phone number, if required by the event or useful for support

The buyer email is required because it is used for:

- payment receipt
- ticket confirmation
- ticket lookup
- support and dispute resolution

## When Tickets Are Available

Tickets should be available when all of the following are true:

- the event has been approved
- the ticket sales window is open
- the selected ticket type is active
- the selected ticket type still has available inventory, if inventory is limited

If sales have not opened yet, the public page should show when ticket sales begin.

If sales have ended, the public page should show that ticket sales are closed.

If a ticket type is sold out, that ticket type should be clearly marked as sold out.

## The Ticket Purchase Flow

### Step 1 - Browse Ticketing Event

The buyer visits the public event page.

The page shows:

- event flyer or banner
- event name
- event description
- event date and time
- venue details
- available ticket types

### Step 2 - Choose Tickets

The buyer selects a ticket type and quantity.

The total price updates immediately.

For example:

- 2 Regular tickets x GHS 50.00 = GHS 100.00
- 1 VIP ticket x GHS 150.00 = GHS 150.00

The first version can support buying one ticket type per order.

Later, SwiftVote can support a basket with multiple ticket types in one checkout.

### Step 3 - Provide Buyer Details

The buyer enters:

- full name
- email address
- phone number, if enabled or required

If the buyer is logged in, their name and email can be pre-filled.

### Step 4 - Pay

The buyer clicks the payment button.

SwiftVote creates a pending ticket order and initializes payment with the payment provider.

The buyer is redirected to the provider checkout page.

### Step 5 - Confirm Payment

After payment succeeds:

- the buyer is returned to SwiftVote
- SwiftVote verifies the payment
- the ticket order is marked as paid
- the purchased tickets are issued
- the buyer sees a confirmation page
- a ticket confirmation email is sent

If the buyer closes the checkout page after paying, the webhook should still confirm the order.

If the payment fails or is abandoned, no tickets should be issued.

## Ticket Confirmation

After a successful purchase, the buyer should receive a confirmation showing:

- event name
- event date
- venue
- ticket type
- quantity
- amount paid
- order reference
- ticket code or ticket codes

The confirmation email should contain the same information.

In a later phase, the email can include QR codes for check-in.

## Check-In

Check-in does not have to be part of the first ticketing release, but the data model should support it.

When check-in is enabled, organisers should be able to:

- search for a ticket by code
- scan a QR code
- mark a ticket as checked in
- prevent the same ticket from being checked in twice

Ticket status should make this clear:

- valid
- checked in
- cancelled

## What Organisers Can See

Event owners and admins should be able to:

- create and edit ticket types
- view ticket sales
- view ticket orders
- see buyer name, email, phone, ticket type, quantity, amount, and status
- see sold and remaining quantities per ticket type
- export ticket orders
- check in tickets when check-in is supported

This should live inside the event management area, separate from voting ledgers.

## What Super Admins Can See

Super admins should be able to:

- review and approve ticketing events
- reject ticketing events with a reason
- view all ticketing events
- view ticketing payment activity
- support organisers when payment or order issues happen

Super admins should not need to enter voting-specific screens to support ticketing events.

## Payment

Ticketing payments should be fully separate from voting payments.

Voting payments are tied to:

- votes
- contestants
- voting categories

Ticketing payments are tied to:

- ticket orders
- ticket types
- issued tickets

Because of this, ticketing should have its own payment records instead of reusing the voting payment table.

The first provider can still be Paystack, but the database records should remain separate so ticketing can evolve without risking the voting payment flow.

## Free Tickets

Free ticket support can be added, but it should be a deliberate product decision.

If free tickets are supported:

- payment should be skipped
- the ticket order should be marked as paid or completed immediately
- tickets should be issued immediately
- inventory rules should still apply

For the first commercial release, it is acceptable to focus on paid tickets only.

## Keeping Ticket Sales Trustworthy

To keep ticketing reliable:

- tickets are only issued after payment is verified
- inventory is reserved or checked atomically during order creation/payment confirmation
- ticket codes are unique
- payment references are unique
- payment provider responses are stored for audit
- webhook events are recorded
- buyers receive confirmation by email
- organisers can reconcile orders against provider payments

## What Success Looks Like

We will know ticketing is working when:

- organisers can create a ticketing event
- organisers can add ticket types and prices
- ticketing events still go through admin approval
- public visitors can view the ticketing event page
- public visitors can buy tickets through Paystack
- tickets are only issued after payment confirmation
- buyers receive confirmation
- organisers can view ticket orders
- ticket inventory cannot oversell
- voting events continue to work exactly as before

## Summary

At a high level, SwiftVote ticketing should work like this:

1. organiser chooses `Ticketing Event`
2. organiser adds event details, media, venue, dates, and ticket types
3. event is submitted for admin approval
4. approved event becomes publicly visible when appropriate
5. public buyer selects tickets and enters contact details
6. buyer pays through Paystack
7. SwiftVote verifies payment
8. SwiftVote issues tickets
9. buyer receives confirmation
10. organiser can view sales and orders

Ticketing should share SwiftVote's event foundation, but it should have its own ticket order and payment records.
