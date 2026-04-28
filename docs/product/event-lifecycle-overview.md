# SwiftVote Event Lifecycle Overview

## Purpose

This document explains, at a high level, how event creation and event progression should work in SwiftVote.

It is written as a product and operations reference, not a technical implementation guide.

The goal is to make sure everyone understands:

- how an event starts
- who approves it
- when nominations open
- how nominations are confirmed
- when voting begins
- how pricing works
- how media fits into the event setup

## The Main Idea

SwiftVote should not allow events to go live immediately after creation.

A user can create an event, but that event must first pass platform review before it becomes active.

This gives the platform:

- better quality control
- safer public event visibility
- clearer accountability
- a more reliable experience for nominations and voting

## Who Creates an Event

Any normal authenticated user can create an event.

When a user creates an event, that user automatically becomes the first `Event Owner` for that event.

That means the creator is responsible for:

- setting up the event
- adding categories
- defining vote prices
- managing event content
- overseeing nominations after approval

## Who Approves an Event

For the first phase, only the `Super Admin` can approve or reject newly created events.

This keeps governance simple and ensures all public-facing events go through a clear review step.

## Event Lifecycle

Each event moves through a full lifecycle.

The planned status model is:

- `Draft`
- `Pending Approval`
- `Rejected`
- `Approved`
- `Nominations Open`
- `Nominations Closed`
- `Voting Scheduled`
- `Voting Live`
- `Voting Closed`
- `Archived`

### Draft

The event is still being prepared by the creator.

At this stage, the creator can:

- add event details
- upload media
- add categories
- define vote prices
- set nomination and voting dates

### Pending Approval

When the creator submits the event, it moves to `Pending Approval`.

At that point:

- the event is waiting for `Super Admin` review
- the creator receives an email confirming that approval is pending

### Approved

If the `Super Admin` approves the event:

- the creator receives an approval email
- the event becomes eligible to progress into nominations automatically

### Rejected

If the `Super Admin` rejects the event:

- a rejection reason must be recorded
- the creator receives a rejection email
- the creator can edit the event and submit it again later

This is important because event creators should not have to start over from scratch.

## How Nominations Work

SwiftVote should support nominations from:

- public users
- the event team

But a nomination should not become active immediately after submission.

It must first be confirmed by someone with the right event-level authority, such as:

- `Event Owner`
- `Event Admin`
- `Moderator`

This gives the event team control over what becomes part of the official event lineup.

## When Nominations Open

Nominations should open automatically after approval.

There are two supported cases:

### Immediate opening

If the creator does not set a nomination start date, nominations open immediately once the event is approved.

### Scheduled opening

If the creator sets a nomination start date, nominations open automatically at that scheduled time after approval.

This gives organizers flexibility without needing manual intervention at launch time.

## When Voting Starts

Voting should not start manually in this phase.

Voting begins automatically on the scheduled voting date set by the event creator.

That means the event setup includes:

- voting start date
- voting end date

This keeps the flow predictable and reduces operational mistakes.

## Vote Pricing

Vote pricing is configured by the event creator at the category level.

That means:

- one event can have multiple categories
- each category can have a different vote price
- some categories can be paid
- some categories can be free

This is important because different events and categories may need different commercial models.

## Free Voting

If a category is free, SwiftVote should still use the same vote flow structure.

The difference is simply that payment is skipped.

So:

- paid category -> vote goes through payment
- free category -> vote is confirmed directly without payment

This keeps the user experience and reporting model consistent.

## Event Media

Each event should support:

- one primary flyer
- an optional banner

These should help the event feel real and presentable on the platform.

Later, categories can also have their own images.

Media uploads should support a professional presentation layer without making the first version unnecessarily complex.

## Why This Flow Matters

This lifecycle gives SwiftVote a strong structure.

It helps the platform:

- control event quality before public exposure
- support real nomination campaigns
- support scheduled voting windows
- support flexible pricing by category
- keep media organized
- allow owners to recover from rejection through resubmission

## What Success Looks Like

We will know this model is working when:

- normal users can create events cleanly
- every submitted event goes through admin approval
- creators receive clear status emails
- nominations open automatically at the right time
- nominations are reviewed before becoming active
- voting starts on schedule
- category pricing supports both paid and free voting
- event media is part of the setup from the beginning

## Summary

At a high level, SwiftVote event management should work like this:

1. user creates event
2. event is submitted for approval
3. event creator receives pending email
4. `Super Admin` approves or rejects
5. approved events move into nominations automatically
6. nominations are submitted and then confirmed by authorized event access
7. voting starts automatically on the scheduled date
8. category pricing determines whether payment is required

This gives SwiftVote a real operational lifecycle, not just a simple event form.
