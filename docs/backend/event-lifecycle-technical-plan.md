# SwiftVote Event Lifecycle Technical Plan

## Purpose

This document defines the technical plan for SwiftVote's event creation and lifecycle phase.

This phase builds on the existing auth and user foundation and introduces:

- event creation
- automatic owner assignment
- admin approval
- lifecycle status management
- category pricing
- nomination intake and confirmation
- scheduled nomination and voting transitions
- event media upload to S3

## Scope

This phase covers:

- authenticated event creation
- event ownership assignment
- event approval and rejection
- category setup with per-category pricing
- primary event flyer and optional banner
- nomination submission
- nomination confirmation and rejection
- scheduled lifecycle transitions for nominations and voting

This phase does not yet fully cover:

- payment provider integration
- final vote transaction flow
- advanced analytics
- event team invitation by email
- public event discovery and search
- contestant self-service onboarding

## Product Decisions Locked In

- Any normal authenticated user can create an event.
- The event creator automatically becomes the first `EVENT_OWNER`.
- Newly submitted events require `SUPER_ADMIN` approval.
- Event lifecycle uses the full status model.
- Nominations open automatically after approval.
- Nominations may also be scheduled.
- Public users and event team members can submit nominations.
- Nominations require confirmation before becoming active.
- Vote pricing is configured per category.
- A category can be free by setting its price to `0`.
- Free categories use the same vote flow but skip payment.
- Each event has one primary flyer.
- Each event may also have a banner.
- Category-level media support should exist in the schema.
- Rejected events require a stored rejection reason.
- Rejected events can be edited and resubmitted.

## Lifecycle Model

### Event Status Enum

Use this event status set:

- `DRAFT`
- `PENDING_APPROVAL`
- `REJECTED`
- `APPROVED`
- `NOMINATIONS_OPEN`
- `NOMINATIONS_CLOSED`
- `VOTING_SCHEDULED`
- `VOTING_LIVE`
- `VOTING_CLOSED`
- `ARCHIVED`

### Status Meaning

`DRAFT`
- event is still being prepared

`PENDING_APPROVAL`
- submitted and waiting for `SUPER_ADMIN` review

`REJECTED`
- rejected by `SUPER_ADMIN`
- rejection reason required

`APPROVED`
- approved, but waiting for nomination timing if needed

`NOMINATIONS_OPEN`
- nominations are currently being accepted

`NOMINATIONS_CLOSED`
- nomination intake is closed

`VOTING_SCHEDULED`
- nominations are complete and voting is waiting for start time

`VOTING_LIVE`
- voting is active

`VOTING_CLOSED`
- voting has ended

`ARCHIVED`
- event is operationally complete

### Recommended State Flow

1. `DRAFT -> PENDING_APPROVAL`
2. `PENDING_APPROVAL -> APPROVED`
3. `PENDING_APPROVAL -> REJECTED`
4. `REJECTED -> PENDING_APPROVAL` on resubmission
5. `APPROVED -> NOMINATIONS_OPEN` immediately if no future nomination start exists
6. `APPROVED -> NOMINATIONS_OPEN` at scheduled nomination start
7. `NOMINATIONS_OPEN -> NOMINATIONS_CLOSED` at nomination end
8. `NOMINATIONS_CLOSED -> VOTING_SCHEDULED`
9. `VOTING_SCHEDULED -> VOTING_LIVE` at voting start
10. `VOTING_LIVE -> VOTING_CLOSED` at voting end
11. `VOTING_CLOSED -> ARCHIVED`

## Access Model

### Platform Role

`SUPER_ADMIN`
- approves or rejects events
- reviews pending event queue
- can access all events for platform oversight

### Event Roles

Use the planned event roles:

- `EVENT_OWNER`
- `EVENT_ADMIN`
- `MODERATOR`
- `ANALYST`

### Role Usage in This Phase

`EVENT_OWNER`
- assigned automatically to event creator
- can update event draft
- can submit for approval
- can resubmit after rejection
- can manage categories
- can review and confirm nominations

`EVENT_ADMIN`
- can manage event operations
- can review and confirm nominations

`MODERATOR`
- can review and confirm nominations

`ANALYST`
- not operationally relevant in this phase

## Data Model

### Required Entities

- `Event`
- `EventCategory`
- `EventMembership`
- `Nomination`

### Event

Recommended fields:

- `id`
- `creatorUserId`
- `name`
- `slug`
- `description`
- `status`
- `primaryFlyerUrl`
- `primaryFlyerKey`
- `bannerUrl`
- `bannerKey`
- `nominationStartAt`
- `nominationEndAt`
- `votingStartAt`
- `votingEndAt`
- `submittedAt`
- `approvedAt`
- `approvedByUserId`
- `rejectedAt`
- `rejectedByUserId`
- `rejectionReason`
- `createdAt`
- `updatedAt`

### EventCategory

Recommended fields:

- `id`
- `eventId`
- `name`
- `description`
- `votePriceMinor`
- `currency`
- `imageUrl`
- `imageKey`
- `sortOrder`
- `createdAt`
- `updatedAt`

Money should be stored in minor units:

- `500` means `5.00`
- `0` means free

### EventMembership

Recommended fields:

- `id`
- `eventId`
- `userId`
- `role`
- `status`
- `assignedByUserId`
- `createdAt`
- `updatedAt`

### Nomination

Recommended fields:

- `id`
- `eventId`
- `categoryId`
- `submittedByUserId`
- `submitterName`
- `submitterEmail`
- `nomineeName`
- `nomineeEmail`
- `nomineePhone`
- `nomineeImageUrl`
- `nomineeImageKey`
- `status`
- `reviewedByUserId`
- `reviewedAt`
- `rejectionReason`
- `createdAt`
- `updatedAt`

### Additional Enums

```prisma
enum EventStatus {
  DRAFT
  PENDING_APPROVAL
  REJECTED
  APPROVED
  NOMINATIONS_OPEN
  NOMINATIONS_CLOSED
  VOTING_SCHEDULED
  VOTING_LIVE
  VOTING_CLOSED
  ARCHIVED
}

enum EventRole {
  EVENT_OWNER
  EVENT_ADMIN
  MODERATOR
  ANALYST
}

enum MembershipStatus {
  ACTIVE
  REVOKED
}

enum NominationStatus {
  PENDING_REVIEW
  CONFIRMED
  REJECTED
}
```

## Media Upload Model

### Event Media Support

Phase one supports:

- one required primary flyer
- one optional banner

### Category Media Support

Schema support should exist for:

- one optional image per category

### Storage

Use S3 for media storage.

Recommended approach:

- backend generates signed upload URLs
- frontend uploads directly to S3
- backend stores resulting object keys and URLs

Recommended key patterns:

- `events/{eventId}/flyer/{uuid}.{ext}`
- `events/{eventId}/banner/{uuid}.{ext}`
- `events/{eventId}/categories/{categoryId}/{uuid}.{ext}`
- `events/{eventId}/nominations/{nominationId}/{uuid}.{ext}`

## Module Structure

### Required Backend Modules

- `modules/events`
- `modules/access-control`
- `modules/nominations`
- `modules/uploads`
- `modules/notifications`
- `modules/scheduling`

### Responsibilities

`events`
- create and update events
- create and update categories
- submit for approval
- approve or reject
- resubmit rejected events
- read owner/admin event views

`access-control`
- create first owner membership on event creation
- resolve event permissions
- guard nomination review actions

`nominations`
- create nomination
- list nominations
- confirm nomination
- reject nomination

`uploads`
- generate signed upload URLs
- validate upload intent and media metadata

`notifications`
- send pending, approved, and rejected event emails

`scheduling`
- open nominations automatically
- close nominations automatically
- activate voting automatically
- close voting automatically

## API Surface

### Event Endpoints

Creator-side:

- `POST /api/v1/events`
- `GET /api/v1/events/mine`
- `GET /api/v1/events/:eventId`
- `PATCH /api/v1/events/:eventId`
- `POST /api/v1/events/:eventId/submit`
- `POST /api/v1/events/:eventId/resubmit`

Admin-side:

- `GET /api/v1/admin/events/pending`
- `POST /api/v1/admin/events/:eventId/approve`
- `POST /api/v1/admin/events/:eventId/reject`

### Category Endpoints

- `POST /api/v1/events/:eventId/categories`
- `GET /api/v1/events/:eventId/categories`
- `PATCH /api/v1/events/:eventId/categories/:categoryId`
- `DELETE /api/v1/events/:eventId/categories/:categoryId`

### Nomination Endpoints

- `POST /api/v1/events/:eventId/nominations`
- `GET /api/v1/events/:eventId/nominations`
- `POST /api/v1/events/:eventId/nominations/:nominationId/confirm`
- `POST /api/v1/events/:eventId/nominations/:nominationId/reject`

### Upload Endpoints

- `POST /api/v1/uploads/events/flyer-url`
- `POST /api/v1/uploads/events/banner-url`
- `POST /api/v1/uploads/categories/image-url`
- `POST /api/v1/uploads/nominations/image-url`

## DTO Direction

### Create Event DTO

Required:

- `name`
- `description`
- `primaryFlyerKey`
- `primaryFlyerUrl`
- `categories`

Optional:

- `bannerKey`
- `bannerUrl`
- `nominationStartAt`
- `nominationEndAt`
- `votingStartAt`
- `votingEndAt`

Each category item should include:

- `name`
- `description`
- `votePriceMinor`
- `currency`
- `imageKey`
- `imageUrl`

### Validation Rules

- event name required
- description required
- at least one category required
- each category requires a name
- `votePriceMinor >= 0`
- nomination dates must be coherent
- voting dates must be coherent
- nomination end must not exceed voting start
- event cannot be submitted for approval if required data is incomplete

### Reject Event DTO

- `reason` required
- recommended minimum length: `10`

### Submit Nomination DTO

Required:

- `categoryId`
- `submitterName`
- `submitterEmail`
- `nomineeName`

Optional:

- `nomineeEmail`
- `nomineePhone`
- `nomineeImageKey`
- `nomineeImageUrl`

### Reject Nomination DTO

- `reason` required

## Core Transactions

### Event Creation Transaction

When an authenticated user creates an event:

1. create `Event`
2. create categories
3. create `EventMembership` with creator as `EVENT_OWNER`

This must be a single database transaction.

### Submit For Approval

When creator submits event:

1. validate completeness
2. set `status = PENDING_APPROVAL`
3. set `submittedAt`
4. trigger pending-approval email

### Approve Event

When `SUPER_ADMIN` approves event:

1. set approval metadata
2. clear any old rejection metadata if needed
3. determine next status:
   - `NOMINATIONS_OPEN` if nomination window should already be open
   - otherwise remain `APPROVED` until scheduler advances it
4. trigger approval email

### Reject Event

When `SUPER_ADMIN` rejects event:

1. set `status = REJECTED`
2. store rejection metadata
3. store rejection reason
4. trigger rejection email

## Scheduling Rules

### Nominations Open

If:

- event is approved
- nomination start is null or due
- nomination end is still in the future

Then:

- transition to `NOMINATIONS_OPEN`

### Nominations Close

At nomination end:

- transition to `NOMINATIONS_CLOSED`

Then:

- if voting start is in the future, move to `VOTING_SCHEDULED`
- if voting start is already due, move directly to `VOTING_LIVE`

### Voting Open

At voting start:

- transition to `VOTING_LIVE`

### Voting Close

At voting end:

- transition to `VOTING_CLOSED`

### Scheduler Design

Recommended phase-one approach:

- run a periodic scheduler every minute
- scan for events eligible for transition
- make transitions idempotent

Avoid one-job-per-event scheduling in the first implementation.

## Email Triggers

Required emails:

### Pending Approval Email

Trigger:
- event submitted for approval

Recipient:
- event creator

### Approved Email

Trigger:
- event approved

Recipient:
- event creator

### Rejected Email

Trigger:
- event rejected

Recipient:
- event creator

Requirements:

- rejection reason included
- message should make clear that resubmission is allowed

## Frontend Scope

### Event Creation Flow

Add a protected event-creation flow for authenticated users with:

- event basics
- flyer and banner upload
- nomination schedule
- voting schedule
- categories
- per-category pricing

### Owner Event Detail

After creation:

- redirect to owner event detail/manage page
- show lifecycle status
- allow editing while draft or rejected
- show rejection reason if rejected
- allow submit or resubmit actions

### Admin Review Flow

Minimal super-admin flow should support:

- pending events list
- event review detail
- approve
- reject with reason

### Nomination Flow

When nominations are open:

- public nomination form
- event-side review queue
- confirm and reject actions

## Testing Plan

### Unit Tests

Cover:

- event creation transaction
- first owner membership creation
- date validation rules
- per-category pricing validation
- approval transition rules
- rejection reason persistence
- nomination confirmation rules
- scheduler idempotency

### E2E Tests

Cover:

1. authenticated user creates event
2. creator becomes first `EVENT_OWNER`
3. creator submits event
4. event enters `PENDING_APPROVAL`
5. pending email trigger runs
6. super admin approves
7. nominations open immediately when expected
8. scheduled nomination opening works
9. public nomination remains `PENDING_REVIEW`
10. authorized event access confirms nomination
11. scheduler opens voting at the correct time
12. rejected event stores reason and can be resubmitted

## Acceptance Criteria

This phase is complete when:

- authenticated users can create draft events
- event creator is automatically assigned as first `EVENT_OWNER`
- events must be approved by `SUPER_ADMIN`
- approval and rejection emails are triggered
- categories support independent vote prices
- free categories are supported through `votePriceMinor = 0`
- nominations can be submitted by public users or event team
- nominations require confirmation
- nominations and voting transition automatically based on schedule
- event flyer and banner upload flow is supported through S3 integration

## Suggested Implementation Order

1. Prisma schema for events, categories, memberships, nominations
2. event creation transaction with first owner assignment
3. category creation and validation
4. submit, approve, reject, and resubmit flows
5. S3 signed upload flow
6. notification service and event emails
7. scheduler transitions
8. nomination submission and review
9. frontend event creation UI
10. frontend owner and admin review screens
