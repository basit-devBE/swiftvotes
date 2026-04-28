# SwiftVote IAM Technical Plan

## Purpose

This document defines the technical plan for SwiftVote's first backend identity and authentication phase.

In this phase, IAM means:

- user account creation
- authentication
- account status control
- base platform access context

This phase is the foundation for later event creation, event ownership, event team roles, invitations, contestants, voting, and reporting.

## Scope

This first phase focuses on regular user account flows.

It covers:

- normal user accounts
- login
- refresh/logout flow
- account status handling
- `SUPER_ADMIN` bootstrap and oversight
- protected user/auth routes

It does not yet cover:

- event creation workflows
- event ownership assignment
- event team membership assignment
- event invite handling
- event-level authorization
- public voter registration
- contestant self-service accounts
- social login
- password reset email flows

## Product Baseline

The broader product model is:

- every authenticated person starts as a normal user
- normal users can create events
- the creator of an event becomes the first `EVENT_OWNER`

That broader model still stands.

However, event creation and event roles are intentionally deferred to the later event phase.

## Platform Decisions

- Database: `PostgreSQL`
- ORM: `Prisma`
- Backend framework: `NestJS`
- Architecture style: `Clean architecture with feature modules`

## Core Design Principle

Each person should exist once in the system as a `User`.

That user may later gain:

- one platform-level role
- zero or more event-level memberships

For this first phase, only the user account and platform-level role context are required.

## Role Model

### System Role

System roles apply across the SwiftVote platform.

Initial system roles:

- `SUPER_ADMIN`
- `NONE`

### User Status

User account status controls whether a person can authenticate and operate.

Initial statuses:

- `ACTIVE`
- `SUSPENDED`

`INVITED` can be introduced later if onboarding requires it, but it is not necessary for this first phase.

## Deferred Event Role Model

Event roles are part of the broader access model, but they are not implemented in this phase.

Planned later event roles:

- `EVENT_OWNER`
- `EVENT_ADMIN`
- `MODERATOR`
- `ANALYST`

Planned later membership statuses:

- `ACTIVE`
- `REVOKED`

## Data Model

The required persisted entities for this first phase are:

- `User`

Later event-phase entities:

- `Event`
- `EventMembership`
- `EventInvite` if needed

## Prisma Model Direction

### `User`

Fields:

- `id`
- `email`
- `passwordHash`
- `fullName`
- `systemRole`
- `status`
- `createdAt`
- `updatedAt`

## Prisma Enum Direction

```prisma
enum SystemRole {
  SUPER_ADMIN
  NONE
}

enum UserStatus {
  ACTIVE
  SUSPENDED
}
```

## Suggested Prisma Shape

```prisma
model User {
  id           String      @id @default(cuid())
  email        String      @unique
  passwordHash String
  fullName     String
  systemRole   SystemRole  @default(NONE)
  status       UserStatus  @default(ACTIVE)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}
```

## Deferred Event-Phase Shape

The later event phase will add:

- `Event`
- `EventMembership`
- event roles and event permissions
- event invitation flow

That work is intentionally out of scope here.

## Nest Module Structure

Required modules for this phase:

- `modules/users`
- `modules/auth`

Later event phase:

- `modules/access-control`
- `modules/events`

Each module should follow the same internal structure:

- `domain`
- `application`
- `infrastructure`
- `presentation`

## Module Responsibilities

### `users`

Responsible for:

- creating user accounts
- listing and fetching users
- updating user profile data
- changing user status
- loading users for auth checks

### `auth`

Responsible for:

- login
- refresh token flow
- logout
- JWT generation and validation
- password verification and hashing support

## Clean Architecture Boundaries

### `domain`

Contains:

- core entities
- enums and value objects
- business invariants

### `application`

Contains:

- use cases
- repository interfaces
- orchestration rules

### `infrastructure`

Contains:

- Prisma repositories
- hashing implementations
- JWT implementations
- database-facing adapters

### `presentation`

Contains:

- controllers
- DTOs
- decorators
- guards
- request and response mapping

## Repository Pattern

Business logic should not query Prisma directly.

Use repository interfaces in the application layer and Prisma-backed implementations in the infrastructure layer.

Examples:

- `UsersRepository`

This keeps use cases testable and avoids binding core application logic directly to Prisma APIs.

## Authentication Design

Authentication should use a short-lived access token plus a refresh JWT stored in an httpOnly cookie.

### Access Token

Short-lived token used for protected API access.

Payload should be minimal:

- `sub`
- `email`
- `systemRole`

Do not include:

- password hash
- sensitive profile fields
- raw permission lists

### Refresh Cookie

Used to renew access tokens without forcing frequent re-login.

Recommended approach:

- issue a signed refresh JWT
- store it in a secure, httpOnly cookie
- send it automatically with refresh requests
- verify it on the backend using the refresh secret
- re-check the user record before issuing a new access token

Recommended refresh payload:

- `sub`
- `email`

`sub` should remain the primary identity field. Email alone is not enough because email may change later.

## Guard Strategy

Use guards, not manual controller checks.

Required for phase one:

- `JwtAuthGuard`
- `SystemRoleGuard` where needed

### `JwtAuthGuard`

Responsibilities:

- extract bearer token
- verify token
- attach authenticated user context
- reject unauthenticated requests

### `SystemRoleGuard`

Responsibilities:

- enforce platform-level role checks
- allow `SUPER_ADMIN`-only routes where necessary

## Decorator Strategy

Recommended decorators for this phase:

- `@Public()`
- `@CurrentUser()`
- `@SystemRoles(...)`

This keeps controllers declarative and readable.

## API Surface

### Auth Endpoints

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`

### User Endpoints

- `POST /api/v1/users`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id`
- `PATCH /api/v1/users/:id/status`

## DTO and Response Strategy

Every write endpoint should use request DTOs with validation.

Examples:

- `CreateUserDto`
- `UpdateUserDto`
- `ChangeUserStatusDto`
- `LoginDto`

Response DTOs must never expose:

- `passwordHash`
- internal security metadata

Recommended response DTOs:

- `UserResponseDto`
- `AuthTokensResponseDto`
- `AuthenticatedUserResponseDto`

## Business Rules

The first implementation must enforce these rules:

1. there is one bootstrap `SUPER_ADMIN`
2. user email must be unique
3. suspended users cannot authenticate
4. no API response returns password hashes
5. refresh requests must verify the refresh JWT and re-check the user in the database
6. logout clears the refresh cookie on the client response

## Seed and Bootstrap Strategy

The system needs an initial `SUPER_ADMIN`.

Recommended approach:

- environment-driven seed command
- create the first super admin only if one does not already exist
- store bootstrap credentials securely outside source control

This should be done through Prisma seeding or a controlled bootstrap script.

## Testing Plan

### Unit Tests

Cover:

- create user
- duplicate email rejection
- suspend user
- login success
- login failure
- refresh JWT validation
- logout cookie clearing behavior

### E2E Tests

Cover:

- super admin creates a user
- user logs in successfully
- anonymous request is rejected from protected routes
- suspended user cannot authenticate
- refresh works correctly
- logout clears the cookie and prevents normal refresh flow from the client

## Implementation Order

1. add Prisma and Postgres integration
2. create `schema.prisma`
3. add first migration
4. add Prisma service and module
5. implement `users` module
6. implement `auth` module
7. add seed/bootstrap for first super admin
8. add unit and e2e tests
9. wire first protected auth and user routes

## Later Event-Phase Work

After this phase, the next access-related work should include:

1. event creation flow so creator becomes `EVENT_OWNER`
2. `access-control` module
3. event membership APIs
4. event-role guards and permissions
5. invitation flow for assigning roles by email

## Initial Assumptions

This plan assumes:

1. every account starts as a normal user
2. `SUPER_ADMIN` is the only platform-wide role needed in the first version
3. event roles are part of a later phase
4. refresh is stateless and cookie-based in phase one
5. authorization decisions should stay guard-based and policy-based, not manual in controllers

## Outcome

When this phase is complete, SwiftVote should have:

- a secure user account model
- one platform-level super admin
- JWT-based authentication
- stateless refresh-cookie support
- protected backend routes
- a clean identity foundation for later event-role work
