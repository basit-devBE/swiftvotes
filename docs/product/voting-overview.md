# SwiftVote Voting Overview

## Purpose

This document explains, at a high level, how voting should work in SwiftVote.

It is written as a product and operations reference, not a technical implementation guide.

The goal is to make sure everyone understands:

- who can vote
- how a vote is placed
- how payment works for paid categories
- how free categories are handled
- what confirmation voters receive
- what contestants and organizers can see
- how the system keeps results trustworthy

## The Main Idea

Voting in SwiftVote is the central commercial and engagement activity of the platform.

When voting opens for an event, members of the public should be able to visit the event page, browse contestants by category, and cast votes for the contestant of their choice.

Some categories are free. Some categories require payment per vote.

In both cases, the flow should feel simple and fast.

SwiftVote is designed around the pageantry voting model, where:

- a voter can cast more than one vote for the same contestant
- a voter can vote multiple times across the same voting window
- each vote has a quantity, so a voter can buy five or ten votes at once
- the total price is quantity multiplied by the category vote price

This makes the platform suitable for fundraising-style pageantry events where voting revenue supports the event.

## Who Can Vote

Any person visiting an event page during the voting window should be able to vote.

Voters do not need a SwiftVote account.

However, voters should provide:

- their name
- their email address

This allows:

- vote confirmation emails to be sent
- organizers to review voting records if needed
- the platform to avoid fully anonymous votes

If a user is already logged in, their name and email can be pre-filled from their account.

## When Voting Is Available

Voting only becomes available when an event enters the `Voting Live` status.

This happens automatically based on the voting start date set by the event creator.

Voting is no longer available once the event enters `Voting Closed`.

If a voter visits an event before voting opens, the platform should show when voting will begin.

If a voter visits an event after voting has closed, the platform should show that voting has ended.

## The Voting Flow

### Step 1 — Browse Contestants

The voter visits the public event page.

Contestants are organised by category.

Each contestant card shows the contestant's name, photo, and code.

### Step 2 — Choose a Contestant

The voter clicks the Vote button on the contestant they want to support.

A voting panel or modal opens.

### Step 3 — Select a Quantity

The voter selects how many votes they want to cast.

Common options should be easy to tap or click, for example:

- 1 vote
- 5 votes
- 10 votes
- 20 votes
- 50 votes

A custom quantity input should also be available.

For paid categories, the total price updates automatically as the quantity changes.

For free categories, the quantity selector is still shown but no price is displayed.

### Step 4 — Provide Contact Details

The voter enters:

- their name
- their email address

If the voter is logged in, these fields are pre-filled.

### Step 5 — Pay or Confirm

For free categories:

- the voter taps or clicks Cast Vote
- the votes are recorded immediately
- a success message is shown
- a confirmation email is sent

For paid categories:

- the voter taps or clicks Pay and Vote
- the voter is taken to the payment provider to complete payment
- once payment is successful, the voter is returned to the event page
- the votes are recorded
- a success message is shown
- a confirmation email is sent

### Step 6 — Confirmation

After a successful vote, the voter sees a confirmation screen showing:

- the contestant they voted for
- the quantity of votes cast
- the amount paid, if applicable
- a note that a receipt has been sent to their email

## Payment

SwiftVote should support mobile money and card payment.

For the first implementation, Paystack is the recommended payment provider because it supports both card and mobile money across West Africa.

The payment flow should be:

1. SwiftVote initiates a payment session with Paystack
2. the voter is redirected to the Paystack payment page
3. the voter completes payment using their preferred method
4. the voter is redirected back to SwiftVote
5. SwiftVote confirms the payment and records the votes

A payment webhook should also be supported as a fallback.

This means that even if the voter closes their browser after paying but before being redirected back, the vote is still recorded once Paystack notifies SwiftVote.

## Free Categories

If a category has a vote price of zero, the voting flow is exactly the same except payment is skipped.

The voter still selects a quantity, enters their contact details, and confirms.

The votes are recorded immediately without going to a payment provider.

This keeps the experience consistent across categories regardless of pricing.

## Vote Confirmation Email

After a successful vote, the voter should receive an email containing:

- the name of the event
- the name of the contestant they voted for
- the category
- the number of votes cast
- the amount paid, if applicable
- the date and time of the vote

This email serves as a receipt and a trust signal.

## What Organisers Can See

Event owners and admins should be able to:

- view total votes per contestant
- view total votes per category
- view a full voting ledger showing individual vote records with voter name, email, quantity, amount, and timestamp
- see which contestants are leading in each category

This information is for operational oversight, not for public display.

## What Contestants Can See

Whether contestants can see vote-related information is controlled by two settings the organiser configures per event:

- `contestantsCanViewOwnVotes` — if enabled, the contestant can see their own vote count on their profile page
- `contestantsCanViewLeaderboard` — if enabled, the contestant can see a ranked list of all contestants in their category

Both settings can be toggled at any time, including while voting is live.

## Keeping Results Trustworthy

To keep the voting process reliable:

- each vote record stores a payment reference so any disputed vote can be traced back to a transaction
- votes are only confirmed after payment is verified
- a vote initiated but not paid within a reasonable window should be considered failed and not counted
- voter email is required so there is a contact trail for every vote

SwiftVote does not need to implement strict one-vote-per-person limits in the first phase, because the pageantry model intentionally allows multiple votes per voter.

However, the system should store enough information to support auditing and fraud investigation if needed.

## What Success Looks Like

We will know this model is working when:

- public visitors can browse contestants on an event page
- voting opens and closes automatically on the scheduled dates
- free votes are cast instantly without any payment step
- paid votes complete through Paystack and are only recorded after payment confirmation
- voters receive a confirmation email after every successful vote
- organisers can view full voting activity for their event
- contestants can see their own votes and the leaderboard if the organiser has enabled visibility
- a failed or abandoned payment does not result in votes being counted

## Summary

At a high level, SwiftVote voting should work like this:

1. voting opens automatically on the scheduled date
2. public visitor browses contestants by category on the event page
3. visitor selects a contestant and quantity
4. for free categories, votes are confirmed immediately
5. for paid categories, visitor pays through Paystack and votes are confirmed after payment
6. voter receives a confirmation email
7. organiser can view full voting records and category totals
8. contestants can optionally see their own vote count and leaderboard, based on organiser settings
9. voting closes automatically on the scheduled end date
