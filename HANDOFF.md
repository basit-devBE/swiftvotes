# SwiftVote — Admin Dashboard Handoff

_Generated 2026-05-08. Branch: `feat/auth` · last commit: `a5ca4ed`._

This document captures the current state of the **admin dashboard** workstream so it can be picked up cleanly in a future session. It assumes the reader has the repo open but no prior conversation context.

---

## 1. Where we are

**Goal of this workstream:** ship a real, visual admin dashboard that gives a SUPER_ADMIN platform-wide visibility (events, payments, votes, users) without granting them the ability to mutate data they don't own. Admins approve/reject events, soft-delete (later), and view everything — but they don't edit other people's content.

**Originally agreed plan (4 PRs, sequenced):**

| PR | Scope | Status |
|---|---|---|
| PR1 | Admin dashboard metrics endpoints + augment existing `/admin` page with charts | ✅ Done — in `a5ca4ed` |
| PR2 | Cross-event payments page (`/admin/payments`) + sidebar nav | ✅ Done — in `a5ca4ed` |
| PR3 | Soft-delete + restore + trash UI on `/admin/events`, with 7-day TTL recycle-bin and cron sweep | ⏳ Not started |
| PR4 | Polish — KPI columns on events list, status donut, period delta refinements | ⏳ Not started |

PR1 + PR2 were committed together as one PR rather than two, since they share `recharts` + sidebar additions and review effort scales sub-linearly when bundled. The next two should be split into separate PRs.

**Parked work** (deferred from earlier in the session):
- **Team invitations** — backend has `EventRole` (`EVENT_OWNER`, `EVENT_ADMIN`, `MODERATOR`, `ANALYST`) and `EventMembership` wired, plus role-guarded endpoints (e.g. `GET /events/:eventId/votes/leaderboard`), but **no UI to invite members or grant roles**. Today only the event creator can ever satisfy those guards. After PR4 lands, team invitations is the next major feature.
- **Admin Leaderboard tab** in `event-manage-view.tsx` (per-event) — was built in the previous session and rolled into the same commit as PR1+2. It uses the role-gated `/events/:eventId/votes/leaderboard` endpoint and recharts.

---

## 2. What shipped in `a5ca4ed`

The single commit `a5ca4ed feat: add admin metrics and payments management` contains three coherent slices:

### 2.1 Admin metrics module (PR1, backend)

New module at `backend/src/modules/admin/`. Clean-architecture layout matching the rest of the codebase.

**Files:**
```
backend/src/modules/admin/
├── admin.module.ts
├── application/
│   ├── admin.tokens.ts              # ADMIN_METRICS_REPOSITORY symbol
│   ├── period.ts                    # PeriodKey + parsePeriod + periodToRange + previousPeriodOf
│   ├── ports/
│   │   └── admin-metrics.repository.ts   # Interface + DTO types
│   └── use-cases/
│       ├── get-overview-metrics.use-case.ts
│       ├── get-timeseries-metrics.use-case.ts
│       ├── get-top-events.use-case.ts
│       └── get-top-categories.use-case.ts
├── infrastructure/
│   └── persistence/
│       └── prisma-admin-metrics.repository.ts    # Prisma groupBy + raw SQL aggregations
└── presentation/
    └── http/
        ├── admin-metrics.controller.ts
        └── responses/
            └── admin-metrics.response.dto.ts
```

`AdminModule` is registered in `app.module.ts`.

**Endpoints** (all `@SystemRoles(SystemRole.SUPER_ADMIN)`):

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/metrics/overview?period=7d\|30d\|90d\|all` | Totals + period stats + previous-period stats + status counts |
| GET | `/admin/metrics/timeseries?metric=votes\|revenue\|events&period=7d\|30d\|90d` | Daily buckets, gap-filled with zeros. **`all` is rejected** (BadRequest). |
| GET | `/admin/metrics/top-events?by=votes\|revenue&period=…&limit=10` | Top events for the period (limit clamped to [1, 50]) |
| GET | `/admin/metrics/top-categories?by=votes\|revenue&period=…&limit=10` | Top categories |

**Implementation notes:**
- **Vote totals** sum `quantity`, not row count, and only count `FREE` + `CONFIRMED` rows (matches existing `prisma-votes.repository.ts:14`).
- **Revenue** groups by **currency**, returning a `RevenueBucket[]` per period. The frontend picks the dominant currency for headline display. The platform mostly uses one currency in practice but the backend is multi-currency-safe.
- **Time-series** uses raw `$queryRaw` with `date_trunc('day', ...)` and `Prisma.sql` for safe interpolation. Days are filled to zero in JS via `fillDailyBuckets`.
- **Top events/categories** use raw SQL for the JOIN to event/category names. **Note:** the SQL uses `e.status::text AS "eventStatus"` — relies on Prisma's PascalCase column names + Postgres enum cast.
- `BigInt`s from `SUM(...)::bigint` are converted with `Number(…)` on the way out. Safe within int53 for any realistic vote/revenue total.

### 2.2 Cross-event payments (PR2, backend)

Added to the existing `votes` module rather than a new admin module — payment data already lives there and the controllers can coexist.

**Repository changes** (`backend/src/modules/votes/`):
- `application/ports/payments.repository.ts` — added `PaymentWithFullContext` (extends `PaymentWithContext` with `eventName`), `ListAllPaymentsFilters`, `ListAllPaymentsInput`, `ListAllPaymentsResult`. Added `listAll(...)` and `summarizeAll(...)` methods to the interface.
- `infrastructure/persistence/prisma-payments.repository.ts` — implementations. `listAll` does the Payment.findMany with `include: { event: { select: { name: true } } }`, then a separate batch fetch for categories + contestants (because `Payment` model has no direct `category`/`contestant` relations — only `event` and `vote`).

**New use case:** `application/use-cases/list-all-payments.use-case.ts` — thin: forwards to repo, runs list + summary in `Promise.all`.

**New endpoints** on existing `PaymentsController`, both `@SystemRoles(SystemRole.SUPER_ADMIN)`:

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/payments` | Paginated cross-event payment list with filters: `status`, `eventId`, `from`, `to`, `search`, `page`, `pageSize` |
| GET | `/admin/payments.csv` | Same filters minus pagination, returns CSV with `eventId` + `eventName` columns added vs the per-event CSV |

`search` matches `voterEmail`, `reference`, or `providerRef` (case-insensitive `contains`).

**DTO change:** `PaymentResponseDto.eventName` added — always present in admin responses, returns null for the per-event endpoints (those don't fetch event). The existing `fromDomain` accepts all three context shapes via `"eventName" in payment` runtime check.

### 2.3 Frontend dashboard rebuild + payments page

**`frontend/app/admin/page.tsx`** — rewritten (kept the structure of the original 196-line page, expanded to ~700 lines):
- Period selector chip group at top right (7d / 30d / 90d / all)
- KPI strip with delta arrows ("▲ 12.3%" / "▼ 4.1%") computed against previous period
- Time-series area chart with metric toggle (votes / revenue / new events). Hidden when period === "all".
- Top events horizontal bar chart with `votes`/`revenue` toggle
- Top categories horizontal bar chart with `votes`/`revenue` toggle
- Pending review queue (preserved from old page) — top 4 with link to `/admin/events`
- Events-by-status grid (now driven by `overview.eventsByStatus`)

**`frontend/app/admin/payments/page.tsx`** — new (~760 lines, the visual showpiece):
- **Aggregate panel** ("broadsheet" aesthetic) — large serif gross number using `font-display` (Iowan Old Style), hairline rule, 3 subordinate metrics (net / fees / successful count), right column has a stacked **status mix bar** with per-status colored segments and a legend showing % + count
- **Filter strip** — search box (debounced 300ms, matches voter email + reference + providerRef), event dropdown, two date inputs, status chips with counts. Reset button clears all.
- **Ledger table** — small-caps tracked headers, alternating row tint (`bg-white` / `bg-[#fbfcff]`), monospace right-aligned amounts, status pills with per-status color treatments
- **Drill-in drawer** — slides in from right, shows full payment metadata + event/category/contestant context. Reuses the `getEventPayment(eventId, paymentId)` endpoint since admin rows include `eventId`.
- **CSV export** — "Export CSV" button in header; downloads via Blob

**Background atmospherics on aggregate panel:** layered radial gradients (primary blue top-right, accent red bottom-left at 6%) + subtle 32px ledger grid at 3% opacity. Matches the body bg-image language already in `globals.css`.

**Status color palette** (consistent across pill, dot, stacked-bar):
- `SUCCEEDED` → `#0f4cdb` (primary blue)
- `PENDING` → `#e0a311` amber on `#fffbeb`
- `FAILED` → `#b40f17` accent red
- `ABANDONED` → `#94a3b8` slate
- `REFUNDED` → `#7c3aed` purple

**Other frontend additions:**
- `lib/api/admin-metrics.ts` — client + types for the four metrics endpoints
- `lib/api/admin-payments.ts` — `listAllAdminPayments` + `exportAllAdminPaymentsCsv`
- `lib/api/types.ts` — added `eventName` field to `PaymentResponse`
- `components/admin/admin-shell.tsx` — added "Payments" item to sidebar nav between Events and Users
- `components/events/event-manage-view.tsx` — admin Leaderboard tab from the previous session (recharts bar chart per category, top-10 with full standings + vote share %). Uses `getAdminLeaderboard()` against `/events/:eventId/votes/leaderboard`.

### 2.4 Dependencies
- `recharts ^3.8.1` added to `frontend/package.json` (used by both the admin dashboard and the per-event leaderboard tab).

---

## 3. Verification snapshot

When the commit was made:
- `npx tsc --noEmit` clean on **both** backend and frontend
- `npx eslint` clean on changed frontend files
- `npx nest build` succeeds
- `npx jest --silent` — **6 suites, 14 tests, all passing**
- Backend has no eslint config (intentional — only frontend lints)

What I **did not** do:
- ❌ Open the dashboard in a browser
- ❌ Hit any new endpoint with curl/postman against real data
- ❌ Verify the `recharts` charts actually render with realistic-shaped data
- ❌ Test the CSV export download flow
- ❌ Check sidebar nav active states for `/admin/payments`

These are smoke-test items for the next session before declaring "done".

---

## 4. Ops note — inotify watcher limit

`npm run start:dev` (nest --watch) hit `ENOSPC: System limit for number of file watchers reached` on this machine. Default Linux limits: 65536 watches / 128 instances; SwiftVote needs more.

**Permanent fix** — create `/etc/sysctl.d/90-inotify.conf`:
```
fs.inotify.max_user_watches=524288
fs.inotify.max_user_instances=512
```
Then `sudo sysctl --system`.

**Temporary fix** for current session: `sudo sysctl fs.inotify.max_user_watches=524288 fs.inotify.max_user_instances=512`.

This is unrelated to the code; just an environment requirement.

---

## 5. PR3 plan — soft delete + recycle bin (next up)

Agreed during planning:
- Admins can soft-delete events that are **NOT** in `VOTING_LIVE` status **AND** have no `SUCCEEDED` payments (refunds should happen first)
- Soft delete sets `deletedAt`. Item disappears from all listings except a Trash view.
- Admin can **Restore** within a 7-day window (recycle-bin pattern)
- After 7 days, a daily cron hard-deletes the row (cascades nominations / contestants / categories / votes / payments via existing FK cascades)

**Concrete next steps:**

1. **Schema migration** (additive, safe for existing rows):
   ```prisma
   model Event {
     ...
     deletedAt DateTime?
     @@index([deletedAt])
   }
   ```
   Generate via `prisma migrate dev --name add_event_soft_delete`. The migration SQL should be a single `ALTER TABLE "Event" ADD COLUMN "deletedAt" TIMESTAMP(3);` plus the index. **Confirmed safe** for existing rows since it's nullable with no default backfill.

2. **Domain + repo port** updates:
   - Add `deletedAt: Date | null` to `Event` domain type
   - Add to `EventsRepository` interface: `findTrash()`, `findExpiredTrash(cutoff: Date)`, `softDelete(eventId)`, `restore(eventId)`, `hardDelete(eventId)`, `countSucceededPayments(eventId)`. Filter `deletedAt: null` in **all existing list methods** (`findAll`, `findApproved`, `findPendingApproval`, `findMine`, `findLifecycleCandidates`, `findById`, `findBySlug`).

3. **Use cases** (under `events/application/use-cases/`):
   - `SoftDeleteEventUseCase` — checks `status !== VOTING_LIVE` + `countSucceededPayments === 0`, throws if either; sets `deletedAt = new Date()`. Gated SUPER_ADMIN.
   - `RestoreEventUseCase` — clears `deletedAt`. Gated SUPER_ADMIN.
   - `ListTrashedEventsUseCase` — for the Trash UI.
   - `PurgeExpiredTrashUseCase` — deletes events where `deletedAt < now - 7d`.

4. **Controller endpoints** on `EventsController`:
   - `DELETE /events/admin/:eventId` — soft delete
   - `POST /events/admin/:eventId/restore`
   - `GET /events/admin/trash`

5. **Cron** — extend `backend/src/modules/scheduling/lifecycle-scheduler.service.ts`:
   ```ts
   @Cron("0 3 * * *")  // 03:00 daily
   async purgeExpiredTrash() {
     const purged = await this.purgeExpiredTrashUseCase.execute();
     if (purged > 0) this.logger.log(`Purged ${purged} expired trashed event(s).`);
   }
   ```

6. **Frontend** (`/admin/events` page):
   - Add **Delete** button on each row, disabled with tooltip when `status === VOTING_LIVE` or `successCount > 0`. Confirm via modal that requires typing the event name.
   - Add a **Trash** tab next to Pending / All Events. Each trashed row shows `deletedAt` + days-remaining + Restore button.

**Open questions for PR3:**
- Should the trash view show payments info (e.g. "0 successful payments") to confirm why deletion was allowed? Probably yes.
- Should restore be allowed even on day 7? Yes (until the cron fires; cron runs at 03:00).
- Should we email the event creator on soft-delete? My instinct: yes, with the 7-day restoration window mentioned.

---

## 6. Outstanding gaps in the platform (broader context)

Non-blocking but worth knowing — surfaced during the planning survey on 2026-05-07:

| Area | State | Severity |
|---|---|---|
| **Refunds** | `PaymentStatus.REFUNDED` is a dead enum. No webhook handler for `charge.refund`, no admin trigger, no reconciliation. Counted in summaries but unreachable. | Medium — financial risk if a Paystack refund event arrives |
| **Voting endgame** | `VOTING_CLOSED` and `ARCHIVED` are statuses but trigger no action. No "declare winners", no results email, no publication flow. | Medium — closes a major UX gap |
| **Team invitations** | Roles enforced in API (`EVENT_OWNER`, `EVENT_ADMIN`, `MODERATOR`, `ANALYST`); zero UI to grant them. Every role-guarded endpoint we ship benefits exactly one user per event. | High — visibly incomplete |
| **Notifications coverage** | 7 templates exist. Missing: voting opens, voting closes, results published, payment failed, refund processed, team invite. | Medium |
| **Health endpoint** | Shallow — uptime/version/env only. No DB / SMTP / S3 / Paystack probes. | Low (until prod) |
| **Test coverage** | Backend ~5% (6 suites, 14 tests). Frontend zero. | Low (recognized debt) |

After PR3 + PR4, the user has indicated **team invitations** is next.

---

## 7. Architectural decisions worth remembering

### Why a separate `admin` module instead of spreading admin endpoints across existing modules?
Admin metrics aggregate across **multiple** domains (events, users, votes, payments). Putting them in any one of those modules creates awkward cross-module coupling. A dedicated read-model module that talks to Prisma directly (CQRS-lite) is cleaner.

### Why are admin payments in the `votes` module instead of `admin`?
Payments live in `votes` and the `PaymentsController` already handles per-event payments. Adding `/admin/payments` as a couple more methods on the same controller — gated by `@SystemRoles` instead of `@EventRoles` — is more cohesive than splitting Payment data across two modules. Per-method guards override class-level decorators in NestJS.

### Why does `getTimeseries` reject `period=all`?
A daily series across all time could be thousands of buckets, most of them zero. Forcing a bounded period keeps the chart sensible and the response small. The use case throws `BadRequestException`; the frontend hides the chart when `period === "all"`.

### Why not enforce a single currency platform-wide?
Paystack supports multi-currency and the schema doesn't constrain this. The aggregator returns `revenueByCurrency: RevenueBucket[]`. The dashboard picks the dominant currency for headline numbers. If a second currency ever sees real volume, we can extend the UI.

### Why does `Aggregate` panel use the serif `font-display`?
The site's display font is Iowan Old Style / Palatino — distinctive editorial serif. Big serif numbers on a financial summary read like a printed balance sheet, deliberately differentiating from generic SaaS. This was an intentional design commitment, not an oversight.

### `@SystemRoles(SystemRole.SUPER_ADMIN)` vs `@EventRoles(...)`
- `SystemRole` is a binary on `User` (`SUPER_ADMIN | NONE`), guards platform-wide actions
- `EventRole` is per-event membership (`EVENT_OWNER` / `EVENT_ADMIN` / `MODERATOR` / `ANALYST`), guards per-event actions
- The existing event edit/visibility endpoints are gated with `@EventRoles` only — meaning **a SUPER_ADMIN cannot mutate someone else's event content via the existing API**. Approve/reject is the only admin-side mutation today. This is the deliberate "admin can see but not tweak" rule the user asked for. **Don't break this** when adding admin features.

---

## 8. Files changed by this session (cumulative)

```
backend/src/app.module.ts                                                   |   2 +
backend/src/main.ts                                                         |   2 +-
backend/src/modules/admin/admin.module.ts                                   |  24 +
backend/src/modules/admin/application/admin.tokens.ts                       |   1 +
backend/src/modules/admin/application/period.ts                             |  31 +
backend/src/modules/admin/application/ports/admin-metrics.repository.ts     |  93 +++
backend/src/modules/admin/application/use-cases/get-overview-metrics...     |  20 +
backend/src/modules/admin/application/use-cases/get-timeseries-metrics...   |  32 +
backend/src/modules/admin/application/use-cases/get-top-categories...       |  29 +
backend/src/modules/admin/application/use-cases/get-top-events...           |  29 +
backend/src/modules/admin/infrastructure/persistence/prisma-admin-...       | 455 +++++
backend/src/modules/admin/presentation/http/admin-metrics.controller.ts     | 111 +++
backend/src/modules/admin/presentation/http/responses/admin-metrics...      |  95 +++
backend/src/modules/votes/application/ports/payments.repository.ts          |  29 +
backend/src/modules/votes/application/use-cases/get-leaderboard.use-case.ts |   7 +-
backend/src/modules/votes/application/use-cases/list-all-payments...        |  70 ++
backend/src/modules/votes/infrastructure/persistence/prisma-payments...     | 149 ++++
backend/src/modules/votes/presentation/http/payments.controller.ts          | 129 ++++
backend/src/modules/votes/presentation/http/responses/payment.response.dto  |  20 +-
backend/src/modules/votes/votes.module.ts                                   |   2 +
frontend/app/admin/page.tsx                                                 | 697 ++++++++++---
frontend/app/admin/payments/page.tsx                                        | 763 +++++++++++++++
frontend/components/admin/admin-shell.tsx                                   |  12 +
frontend/components/events/event-manage-view.tsx                            | 295 ++++++-
frontend/lib/api/admin-metrics.ts                                           | 101 +++
frontend/lib/api/admin-payments.ts                                          |  39 ++
frontend/lib/api/types.ts                                                   |   1 +
frontend/lib/api/votes.ts                                                   |   8 +
frontend/package.json                                                       |   3 +-
```

31 files, +3,536 / −124. Single commit `a5ca4ed`.

---

## 9. Resuming the work — first 30 minutes

1. **Smoke-test what shipped** before adding more code:
   - Bump inotify watchers per §4
   - Start backend + frontend; navigate to `/admin` (dashboard) and `/admin/payments`
   - Verify charts render with real data, KPI deltas show, CSV downloads, drill-in drawer opens
   - Cycle through period selector and metric toggles

2. **Start PR3** per §5. First file: the Prisma migration. Do NOT bundle PR3 with PR4 — keep them as separate PRs as originally scoped.

3. If anything from §3 ("did not do") fails in smoke test, fix in a follow-up commit on `feat/auth` before opening PR3.

---

_End of handoff._
