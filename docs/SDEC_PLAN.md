# SDEC — Student Digital Election Commission
### Product spec + build plan (Next.js · Supabase · Vercel)

> **For Claude Code:** This is the source of truth for the rebuild. Read it fully before starting any phase. Build **one phase at a time**, in order, and stop at the end of each phase for review. The old implementation lives in `client/` (React + Vite) and `server/` (Express + MySQL). Use it **only as reference** for flows and seed data. Do not port its architecture.

---

## 1. The idea in one paragraph

SDEC is a secure, mobile-first web app for running student elections at a college, such as student council, class representatives, club office-bearers and department reps. The election commission (admins/officers) uploads the official voter roll, builds an election with positions and candidates, and schedules it. Eligible students sign in with their roll number and a one-time code, vote once, and get a **receipt code** that proves their ballot was counted **without revealing who they voted for**. Results are published once voting closes. The whole thing should feel as calm and trustworthy as a bank app: clear, quiet and impossible to get wrong.

---

## 2. What changes from the current build (and why)

The half-built version has the right flows (register → OTP → ballot → confirm → receipt → results → admin). Its foundations need changing:

| # | Problem in current build | What we do instead |
|---|---|---|
| 1 | **Anyone can register with any roll number.** There's no check against an official list. | **Voter roll.** Admin imports the official student list (CSV). Only roll numbers on the roll can sign in. |
| 2 | **Votes aren't secret.** The `votes` table stores `student_id` next to `candidate_id`, so anyone with DB access can see how each student voted. | **Split "who voted" from "what was voted".** `voter_participation` records *that* a student voted. `ballots` and `ballot_selections` store the choices with **no voter id, no timestamp and a random UUID**. |
| 3 | Receipt ID is a random number that's never stored, so it can't be verified and it can collide. | A 12-char receipt code whose **SHA-256 hash is stored on the anonymous ballot**. A public `/verify` page confirms "your ballot is in the count" without showing the choices. |
| 4 | Live results update on every vote. Watching the tally change right after a friend votes reveals their vote. | A per-election **results visibility** setting: `after_close` (default), `manual`, or `live`. During voting, only **turnout** is live. |
| 5 | The turnout denominator is "all students", not eligible voters. | **Eligibility rules** per election and per position (department / year / section). Turnout is computed against eligible voters. |
| 6 | `max_winners` exists, but the ballot only allows one pick. | `seats` + `max_choices` per position (e.g. pick up to 3 class reps), plus an optional **NOTA**. |
| 7 | One shared admin password in `.env`, with no audit trail. | Real accounts with roles (`admin`, `officer`, `student`) and an **audit log** of every admin action. |
| 8 | OTP compared in plain text with unlimited attempts. | **Supabase Auth** email OTP, with its built-in expiry and rate limits, plus our own per-roll-number throttle. |
| 9 | `node-cron` + Socket.IO need an always-on server, which Vercel doesn't provide. | **No cron needed.** Election phase is *derived from timestamps*. Live updates use **Supabase Realtime**. |
| 10 | `DATETIME` without a timezone. | `timestamptz` everywhere. Display in `Asia/Kolkata`. |

### New features (the "improved idea")
- **Voter roll import** with CSV preview, validation errors per row, and upsert.
- **Nominations window** (Phase 6): students apply for a position with a photo and manifesto, and officers approve or reject.
- **Public election page** per election: candidates, manifestos, schedule and countdown. Shareable on WhatsApp/Instagram with a proper OG image.
- **Receipt verification** page.
- **Results page** with winners, ties flagged, per-position bars and a turnout ring, plus an admin CSV export.
- **Election controls:** schedule, pause, close early, cancel, publish results. Every action is written to the audit log.
- **Mobile-first ballot**: one position per step, a sticky progress bar, and a review sheet before the final submit.

---

## 3. Users & roles

| Role | Can do |
|---|---|
| **Student** (on the voter roll) | Sign in, see the elections they're eligible for, read candidates, vote once per election, keep and verify a receipt, view published results, apply for nomination. |
| **Officer** (election commission member) | Everything admin can do *for elections*: build, schedule, pause/close, approve nominations, view turnout, publish results. Cannot manage officers or wipe the roll. |
| **Admin** | Everything, plus manage the voter roll, officers and settings, and view the audit log. |
| **Public** (not signed in) | Landing page, public election pages, published results, receipt verification. |

Roles live in `profiles.role`. The first admin is created by a seed script or a SQL snippet in the README.

---

## 4. Tech stack

- **Next.js** (latest stable, App Router, TypeScript, Server Components + Server Actions)
- **Supabase**: Postgres, Auth (email OTP), Storage (candidate photos), Realtime (turnout)
- **@supabase/ssr** for cookie-based auth in Next.js
- **Tailwind CSS** + **shadcn/ui** (Radix-based components)
- **Zod** for validating every form and server action
- **react-hook-form** for admin forms
- **motion** (Framer Motion) for small, purposeful animation
- **papaparse** for CSV import
- **Vercel** for hosting. Preview deployments per branch, production on `main`.
- **Supabase CLI** for local dev + migrations (`supabase/migrations/*.sql`). Generated types in `src/lib/database.types.ts`.
- Testing: **Vitest** (unit), **Playwright** (key flows), SQL tests for `cast_ballot` (pgTAP via `supabase test db`).

---

## 5. Authentication design

**Student sign-in (no passwords):**
1. `/login` → student enters **roll number**.
2. A server action looks the roll number up in `voters` (via a `SECURITY DEFINER` RPC, rate-limited). If it's missing, show "Not on the voter roll. Contact the election commission."
3. If it's found, call `supabase.auth.signInWithOtp({ email: voter.email })` and show the masked email (`k•••••@gmail.com`).
4. The student enters the 6-digit code → `verifyOtp`. On first sign-in, a trigger links `auth.users.id` to `voters.user_id` by matching email and creates the `profiles` row.
5. Sessions persist (refresh tokens), so a student who signs in during the week before the election doesn't need a new OTP on voting day.

**Admins/officers:** same OTP flow, entering their email directly on `/admin/login`.

**Setup notes:**
- Edit the Supabase email template so it sends the **code** (`{{ .Token }}`) instead of a magic link.
- Supabase's built-in email sender is for testing only and heavily rate-limited. Configure **custom SMTP** (e.g. Resend or Brevo) before real use, and check that provider's daily sending limit against the number of students.
- Phone/SMS OTP is a later option (Supabase supports SMS providers), but it costs per message, so email comes first.

---

## 6. Data model (Postgres)

> A sketch for Claude Code to turn into proper migrations. All ids are `uuid default gen_random_uuid()`. All times are `timestamptz`.

```sql
-- enums
create type app_role as enum ('student','officer','admin');
create type results_visibility as enum ('after_close','manual','live');
create type election_override as enum ('paused','closed_early','cancelled');
create type candidate_status as enum ('pending','approved','rejected','withdrawn');

-- official voter roll (imported by admin)
create table voters (
  id uuid primary key default gen_random_uuid(),
  roll_number text not null unique,          -- store UPPERCASE, trimmed
  full_name text not null,
  email text not null unique,
  phone text,
  department text not null,                  -- e.g. 'CSE','ECE'
  year smallint not null check (year between 1 and 5),
  section text,
  is_active boolean not null default true,
  user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'student',
  voter_id uuid unique references voters(id),
  display_name text,
  created_at timestamptz not null default now()
);

create table elections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  cover_path text,                           -- storage path
  nominations_open_at timestamptz,
  nominations_close_at timestamptz,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  is_published boolean not null default false,   -- false = draft, hidden from students
  override election_override,                     -- null = follow schedule
  results_visibility results_visibility not null default 'after_close',
  results_published_at timestamptz,
  allow_nota boolean not null default false,
  eligibility jsonb not null default '{}'::jsonb, -- {"departments":["CSE"],"years":[2,3]} ; empty = everyone
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table positions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(id) on delete cascade,
  title text not null,
  description text,
  seats smallint not null default 1 check (seats >= 1),
  max_choices smallint not null default 1 check (max_choices >= 1),
  eligibility jsonb not null default '{}'::jsonb, -- narrows the election's eligibility (e.g. CSE rep)
  sort_order int not null default 0
);

create table candidates (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references positions(id) on delete cascade,
  voter_id uuid references voters(id),       -- the student standing (null if added manually)
  display_name text not null,
  tagline text,                              -- one line, shown on ballot card
  manifesto text,                            -- markdown, shown on detail sheet
  photo_path text,
  status candidate_status not null default 'approved',
  sort_order int not null default 0
);

-- WHO voted (never what)
create table voter_participation (
  election_id uuid not null references elections(id) on delete cascade,
  voter_id uuid not null references voters(id),
  voted_at timestamptz not null default now(),
  primary key (election_id, voter_id)
);

-- WHAT was voted (never who). No timestamps, random ids.
create table ballots (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(id) on delete cascade,
  receipt_hash text not null unique          -- sha256(receipt_code)
);

create table ballot_selections (
  ballot_id uuid not null references ballots(id) on delete cascade,
  position_id uuid not null references positions(id),
  candidate_id uuid references candidates(id),   -- null when is_nota
  is_nota boolean not null default false,
  check ((candidate_id is null) = is_nota)
);

-- cached counters for cheap reads + realtime
create table election_turnout (
  election_id uuid primary key references elections(id) on delete cascade,
  votes_cast int not null default 0,
  updated_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id),
  action text not null,                      -- 'election.create','election.close_early','voters.import',...
  entity text,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

### Derived election phase (no cron)
A SQL function `election_phase(e elections) returns text`:
- `draft` if not `is_published`
- `cancelled` / `paused` if `override` says so
- `nominations` if now is inside the nomination window
- `scheduled` if now < `starts_at`
- `live` if `starts_at` <= now < `ends_at` and not closed early
- `ended` if past `ends_at` or `closed_early`, and results not published
- `results` if `results_published_at` is set

The same logic is mirrored in `src/lib/election-phase.ts` for the UI, with unit tests that must agree with the SQL.

### Key database functions (`SECURITY DEFINER`, `search_path` pinned)
- **`cast_ballot(p_election uuid, p_selections jsonb) returns text`**. This is the only way to vote. In a single transaction it:
  1. resolves `auth.uid()` → profile → voter (must be active)
  2. checks the phase is `live`
  3. checks the voter is eligible for the election
  4. validates selections: every eligible position is answered, each has between 1 and `max_choices` picks, candidates are `approved` and belong to that position, NOTA only if allowed and not combined with a candidate
  5. inserts into `voter_participation` (the PK blocks double voting)
  6. generates a receipt code (12 chars, unambiguous alphabet, from `gen_random_bytes`), then inserts the `ballot` with its hash and the selections
  7. increments `election_turnout`
  8. returns the plain receipt code, which is shown once and never stored in plain text
- **`get_results(p_election uuid)`**: aggregate counts per candidate. Returns data only when visibility allows (`live`, or `after_close` and ended, or published). Officers/admins can read after close even before publishing.
- **`get_turnout(p_election uuid)`**: eligible voter count, votes cast and a per-department breakdown. Fine to show live.
- **`verify_receipt(p_code text)`**: returns `{ found, election_title }`.
- **`lookup_voter_for_login(p_roll text)`**: returns the masked email only. Throttle it.
- **`is_eligible(voter, eligibility jsonb)`**: helper.

### Row Level Security (turn it on for every table)
- `voters`: students read **their own** row. Officers/admins read everything. Only admins write.
- `profiles`: users read their own. Admins read and write everything.
- `elections`, `positions`, `candidates (approved)`: anyone can read where `is_published`. Officers/admins have full access.
- `voter_participation`: students read their own rows (for "you've voted"). Officers/admins read counts only via functions.
- `ballots`, `ballot_selections`: **no direct select for anyone**. Access only through `get_results` / `verify_receipt`.
- `election_turnout`: public read where the election is published. Enable Realtime on this table.
- `audit_log`: admins read. Inserts only via server-side code / functions.

### Storage
Bucket `candidate-photos`: public read. Upload by officers, and by the student themselves for nominations (path `nominations/{voter_id}/...`). Compress to about 600×600 WebP on the client before upload.

---

## 7. Pages & routes

```
src/app/
  (public)/
    page.tsx                      Landing: what SDEC is, live/upcoming elections, countdowns
    elections/[slug]/page.tsx     Public election page: schedule, positions, candidates, manifestos
    results/[slug]/page.tsx       Published results
    verify/page.tsx               Receipt verification
    login/page.tsx                Roll number → OTP
  (student)/                      requires student session
    dashboard/page.tsx            My elections: eligible, voted ✓, upcoming, results
    vote/[slug]/page.tsx          Ballot stepper (one position per step)
    vote/[slug]/review/page.tsx   Review all choices → Confirm
    vote/[slug]/done/page.tsx     Receipt screen
    nominate/[slug]/page.tsx      (Phase 6) Apply as a candidate
    profile/page.tsx              My details from the roll, sign out
  admin/                          requires officer/admin
    login/page.tsx
    page.tsx                      Overview: active elections, turnout cards, recent audit entries
    elections/page.tsx            List with phase badges
    elections/new/page.tsx        Create draft
    elections/[id]/page.tsx       Tabs: Details · Positions & candidates · Eligibility ·
                                  Nominations · Turnout (live) · Results & publish
    voters/page.tsx               Roll: search, filter, CSV import, deactivate
    team/page.tsx                 Officers & admins (admin only)
    audit/page.tsx                Audit log (admin only)
  api/og/[slug]/route.tsx         OG image for sharing an election
middleware.ts                     Supabase session refresh + route guards
```

---

## 8. Design system: "calm civic, light"

Mood: a well-designed government service crossed with a modern fintech app. It's light, spacious and quiet, with one confident accent. Nothing flashy on the ballot, where trust matters more than delight. Delight goes on the receipt and results screens.

Carry over the teal + navy identity from the existing mockup (`design-handoff/`), made lighter and warmer.

### Color tokens (CSS variables → Tailwind theme)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#F7F7F4` | App background (warm off-white) |
| `--surface` | `#FFFFFF` | Cards, sheets |
| `--surface-2` | `#F0F0EB` | Subtle fills, table stripes, input bg |
| `--border` | `#E4E3DD` | Hairlines |
| `--ink` | `#14171F` | Primary text |
| `--ink-2` | `#4A5060` | Secondary text |
| `--muted` | `#7A808C` | Captions, placeholders |
| `--navy` | `#1F2A4D` | Headings on hero, primary buttons |
| `--teal` | `#0E8C7A` | Accent: selection, progress, "live", success |
| `--teal-tint` | `#E3F4F0` | Selected card bg, badges |
| `--amber` | `#B7791F` / tint `#FBF3E2` | Scheduled / nominations |
| `--red` | `#C2362F` / tint `#FCEBEA` | Errors, cancelled, destructive |

Every text/background pair must meet **WCAG AA** contrast. Light mode is the only mode in v1.

### Type
- UI: **Geist Sans** (via `next/font`), with 15px base on mobile and 16px on desktop.
- Display: **Fraunces** (serif), used *sparingly* for election titles, the big receipt code and hero numbers.
- Numbers: `font-variant-numeric: tabular-nums` for counts, timers and percentages.

### Shape, depth, spacing
- Radius: 16px cards, 12px inputs/buttons, full for pills/avatars.
- Shadow: `0 1px 2px rgb(20 23 31 / .04), 0 8px 24px rgb(20 23 31 / .06)`, used only on raised elements such as sheets and the sticky ballot bar.
- 4px spacing grid. Generous padding (cards 20–24px). Max content width 1120px, reading width 680px.

### Signature components
- **Phase badge**: a pill with a dot. Green pulsing dot = Live, amber = Scheduled/Nominations, grey = Ended, navy = Results out.
- **Countdown**: `2d 04h 12m` in tabular numbers. Switches to seconds in the last hour.
- **Candidate card** (ballot): photo (64px, rounded-2xl), name, one-line tagline, a "Read manifesto" link that opens a bottom sheet. When selected: teal border (2px), `--teal-tint` fill, a check badge top-right and a gentle scale-in. The whole card is the tap target (≥ 56px tall).
- **Ballot stepper**: progress bar at top ("Position 2 of 4 · Vice President"), one position per screen, and a sticky bottom bar with Back / Next. On the last step, Next becomes "Review".
- **Review sheet**: a list of position → chosen candidate(s) with an "Edit" link each. The final button reads "Cast my vote" with a hold-to-confirm or two-step confirm. The text says, plainly: *"Votes are final and secret. No one, including the commission, can see who you voted for."*
- **Receipt screen**: an animated check, the receipt code in Fraunces with letter-spacing, Copy / Save-as-image buttons, and a "Verify anytime at sdec…/verify" note. Light confetti, only once.
- **Results**: a winner card per position (photo, name, votes, %, "Elected" badge), with horizontal bars for the rest. Ties are clearly flagged "Tie: commission to resolve". There's also a turnout ring and department bars.
- **Admin shell**: a left sidebar on desktop and a top bar + drawer on mobile. Content uses shadcn Tables, Tabs, Dialogs and Sheets. It's dense but still airy.

### States
Every screen has designed **loading** (skeletons, not spinners), **empty** (friendly line + action), **error** (what happened + what to do) and **not-eligible / already-voted** states.

### Motion & accessibility
- 150–250ms ease-out transitions. Respect `prefers-reduced-motion`.
- The full ballot must work by keyboard: radio/checkbox semantics under the cards, visible focus rings (2px teal offset).
- `lang="en"`, labels on every input, and `aria-live` for OTP errors and countdown milestones.

---

## 9. Folder structure

```
sdec-web/
  src/
    app/ ...                  (see §7)
    components/
      ui/                     shadcn primitives
      election/               PhaseBadge, Countdown, CandidateCard, BallotStepper, ReviewSheet, ReceiptCard, ResultBars
      admin/                  AdminShell, ElectionForm, PositionEditor, CandidateEditor, VoterImport, AuditTable
    lib/
      supabase/{server.ts,client.ts,middleware.ts}
      election-phase.ts
      validators/             zod schemas
      database.types.ts       generated
      utils.ts
    actions/                  server actions grouped by domain (auth, elections, voters, ballots)
  supabase/
    migrations/
    seed.sql
    tests/                    pgTAP tests
  tests/e2e/                  Playwright
```

---

## 10. Build phases

Each phase ends with: the app builds, lint + typecheck pass, tests for that phase pass, and a short summary of what was done and anything left open. **Stop after each phase for review.**

### Phase 0: Foundation & design system
**Goal:** An empty but beautiful shell, deployed.
- Create `sdec-web/` with Next.js (App Router, TS, ESLint), Tailwind, shadcn/ui, Geist + Fraunces fonts.
- Add the design tokens from §8 to the Tailwind theme and CSS variables.
- Build base components: Button, Input, OTP input, Card, Badge/PhaseBadge, Countdown, Sheet, Dialog, Skeleton, Toast, EmptyState, AppHeader, AdminShell.
- Add a `/dev/ui` page showing every component in every state (dev-only, excluded in production).
- Set up the Supabase CLI locally (`supabase init`, `supabase start`), `.env.local.example` and Supabase clients via `@supabase/ssr`, plus middleware session refresh.
- Connect the Vercel project, deploy the placeholder landing page and set up preview deploys.

**Done when:** `/dev/ui` looks polished on a 375px phone and a 1440px desktop, and the Vercel URL is live.

### Phase 1: Database, security & seed
**Goal:** A correct, locked-down database.
- Migrations for all tables, enums, indexes, `election_phase`, `is_eligible`, `cast_ballot`, `get_results`, `get_turnout`, `verify_receipt` and `lookup_voter_for_login` (§6).
- RLS policies exactly as in §6. Enable Realtime on `election_turnout`.
- `seed.sql`: 1 admin, 1 officer, ~40 voters across CSE/ECE/EEE/MECH and years 1–4, one **live** election (President, Vice President, Secretary, Treasurer, CSE Class Rep with `max_choices=2` and CSE-only eligibility), one **scheduled** election and one **ended** election with published results. Candidate names and manifestos can come from `server/db/seed.js` and the design mockup.
- pgTAP tests: can't vote twice; can't vote outside `live`; can't vote if ineligible; can't pick more than `max_choices`; can't pick a candidate from another position; NOTA rules; ballots contain no voter reference; a student can't `select` from `ballots`; `get_results` hides results before close when set to `after_close`.
- Generate TS types.

**Done when:** `supabase db reset` seeds cleanly and `supabase test db` passes.

### Phase 2: Auth & voter roll
**Goal:** Only people on the roll can get in, and admins can manage the roll.
- `/login`: roll number → masked email → OTP input (6 boxes, paste support, resend with a 60s cooldown) → redirect to `/dashboard`.
- First-login trigger links the auth user ↔ voter and creates the profile.
- `/admin/login` with email OTP. Middleware guards `(student)` and `admin/` by role. Unknown or deactivated users get a clear message.
- `/admin/voters`: searchable, paginated table with filters (dept/year/section/active).
- **CSV import** (columns: roll_number, full_name, email, phone, department, year, section): parse in the browser, show a preview with per-row errors (bad email, duplicate roll, missing field), then confirm → upsert via a server action → audit log entry.
- `/admin/team` (admin only): promote a voter/email to officer/admin.
- Throttle `lookup_voter_for_login` + OTP requests per roll number and per IP (a simple table-based limiter in Postgres is enough).

**Done when:** a seeded student can sign in end-to-end locally (Supabase local Inbucket/Mailpit shows the code), and an off-roll roll number is refused.

### Phase 3: Admin election builder
**Goal:** Officers can create and run an election without touching SQL.
- `/admin/elections`: a list with phase badges and turnout.
- **Create/edit** (draft): title (auto slug), description, cover image, schedule (IST pickers, stored as UTC), results visibility, allow NOTA, eligibility (multi-select depts/years/sections with a live "N eligible voters" count).
- **Positions & candidates editor**: add/reorder positions (seats, max_choices, position-level eligibility), add candidates (link to a voter by roll search or enter manually), photo upload to Storage, tagline, markdown manifesto with preview.
- **Publish** (draft → visible). Validation first: every position has ≥ 1 approved candidate and `max_choices ≤ candidates`.
- **Controls**: pause/resume, close early, cancel. Each needs a typed confirmation ("type the election title") and is audit-logged.
- Structural edits are locked once the election is `live`. Only description/manifesto typos can change, and those are audit-logged.

**Done when:** an officer can create an election from scratch, publish it, and see it appear for eligible students only.

### Phase 4: Student voting experience
**Goal:** The best part of the app: fast, clear and trustworthy on a phone.
- `/dashboard`: greeting with name + roll, cards for elections the student is eligible for, grouped Live now / Upcoming / Voted / Results. Each card shows a phase badge, countdown and CTA.
- `/elections/[slug]` (public): hero with title + countdown, positions with candidate cards, and manifesto sheets.
- `/vote/[slug]`: ballot stepper (§8). Selections are kept in client state + `sessionStorage` so a refresh doesn't lose them. Only eligible positions are shown. Multi-choice positions show "Pick up to 2" with a counter. NOTA is shown when allowed.
- `/vote/[slug]/review` → Cast → `cast_ballot` RPC via a server action → `/vote/[slug]/done` with the receipt (code passed once, not stored in the URL).
- Guard states: not eligible, already voted (show "You voted at 10:42 AM"), election not live, paused.
- Friendly errors for race conditions (e.g. the election closed while reviewing).

**Done when:** the Playwright test covers login → vote → receipt → blocked second vote on a mobile viewport.

### Phase 5: Turnout, results & verification
**Goal:** Transparent outcomes without breaking secrecy.
- Admin **Turnout tab**: live via Supabase Realtime on `election_turnout`, a big turnout ring, department bars and a votes-per-hour sparkline (from `voter_participation.voted_at`, bucketed hourly).
- Admin **Results tab**: visible after close. Shows winners by `seats` and flags ties. **Publish results** button (sets `results_published_at`, audit-logged). CSV export.
- `/results/[slug]`: public once published (or live if visibility = `live`), with a turnout ring, per-position winner cards + bars and a share button with an OG image.
- `/verify`: enter a receipt code → "✓ Counted in Student Council Elections 2026" or "Not found".
- Landing page shows live turnout for live elections.

**Done when:** results stay hidden before close for `after_close`, appear to officers after close and to everyone after publish, and receipts verify.

### Phase 6: Nominations (new feature)
**Goal:** Students can stand for election through the app.
- The election gets a nominations window (fields already exist).
- `/nominate/[slug]`: pick a position you're eligible for, upload a photo, write a tagline + manifesto (with character limits), and submit → candidate row with `status='pending'`.
- Admin **Nominations tab**: approve/reject with a reason, audit-logged. Students see their status on the dashboard.
- Only `approved` candidates appear anywhere public or on the ballot.

### Phase 7: Polish, hardening & launch
- Pass on every screen for empty/loading/error states. Skeletons everywhere.
- Accessibility audit (axe in Playwright), keyboard-only ballot run, contrast check.
- Security review: RLS on every table, no service-role key in the client, every server action validates with Zod + checks the role, rate limits in place, security headers (CSP) in `next.config`.
- Load test: script ~2,000 simulated `cast_ballot` calls against a staging Supabase project, and check for no deadlocks or double votes.
- Production setup: Supabase prod project, custom SMTP, OTP email template (code, not link), Vercel env vars, custom domain, `robots` + OG metadata.
- `README.md` with local setup, how to make the first admin and deploy steps. `docs/ELECTION_DAY_RUNBOOK.md` covers the pre-flight checklist, what to do if email is slow, how to pause, and how to publish.
- Delete the old `client/` and `server/` folders once parity is confirmed.

### Later (not in v1)
Telugu language toggle · SMS OTP · ranked-choice voting · club/society elections run by club heads · multi-college (tenant per institution) · PWA install + push reminders.

---

## 11. Non-negotiable rules for the build
1. **Votes only go through `cast_ballot`.** No other code path writes to `ballots`, `ballot_selections` or `voter_participation`.
2. **Never join or log voter identity with ballot contents**: not in SQL, server logs, analytics or error messages.
3. The Supabase **service-role key is server-only** and used only where RLS truly can't express the rule (e.g. admin CSV import). Prefer RLS + `SECURITY DEFINER` functions.
4. Every server action: Zod-validate input → check session + role → do the work → write the audit log (admin actions) → return typed result.
5. Store times in UTC (`timestamptz`) and show them in `Asia/Kolkata`.
6. Mobile-first: design and test every student screen at 375px width first.
7. Keep components small and typed. No `any`.
