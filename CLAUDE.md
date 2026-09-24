# CLAUDE.md — SDEC rebuild

We are rebuilding SDEC (Student Digital Election Commission) as a **Next.js + Supabase + Vercel** app in `sdec-web/`.

- **Spec & phases:** `docs/SDEC_PLAN.md`. Read it fully before any work. Build one phase at a time and stop for review at the end of each phase.
- **Old code:** the pre-rebuild `client/` (React/Vite) and `server/` (Express/MySQL) were deleted in Phase 7 once `sdec-web/` reached parity. Still in git history if a flow or seed value needs double-checking, but don't recreate them or copy their architecture (no Express, MySQL, Socket.IO or node-cron).
- **Old design mockup:** `design-handoff/sdec-student-election-ui/project/SDEC.dc.html`. It's reference for flows and the teal/navy identity. The new visual system is §8 of the plan.

## Commands (inside sdec-web/)
- `npm run dev`: Next dev server
- `npm run build` / `npm run start`: production build + serve
- `npm run lint && npm run typecheck && npm test`: must pass before ending a phase
- `npx playwright test`: e2e (once Phase 4 adds specs)
- No local Supabase/Docker in this environment — see "Hosted Supabase" below.
  Once a project exists: `npx supabase link --project-ref <ref>`, `npx supabase db push`,
  `npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts`.

## Hosted Supabase (no Docker)
Docker isn't installed on this machine, so we can't run `supabase start` /
`db reset` / `test db` locally as the plan assumes. Project: `sdec`
(ref `frvupjxngahnbtkyynvt`, ap-south-1), under a separate Supabase account
logged in via a named CLI profile (`supabase login --token <t> --name sdec`
switched the *default* profile to that account — `--profile sdec` itself
doesn't work, gives `LegacyProfileLoadError`). Already linked
(`supabase link --project-ref frvupjxngahnbtkyynvt`).

Workflow used for Phase 1, and the one to keep using until Docker exists:
- `npx supabase db push --linked` applies `supabase/migrations/*.sql` directly
  to the hosted DB — no Docker needed, this is a plain connection-string push.
- `npx supabase db query --linked -f <file.sql>` runs arbitrary SQL against
  the hosted DB via the Management API. This is how `supabase/seed.sql` was
  applied (there's no `--include-seed` path without a local DB) and how the
  pgTAP suite was verified (see below).
- **Caveat:** when a `.sql` file has multiple top-level statements, the tool
  only surfaces the *last* statement's resultset — fine for `db push`/DDL,
  but for anything where you need to see every statement's output (e.g.
  running the pgTAP suite and actually seeing per-test pass/fail), wrap each
  assertion as `insert into a_temp_table select is(...);` etc. and finish
  with one `select string_agg(line, E'\n' order by n) from a_temp_table;` —
  see the pattern in supabase/tests/database/*.sql, which stays plain/
  idiomatic (bare `select is(...)`, `select * from finish()`) for when
  `supabase test db` becomes available; the aggregating-temp-table version
  is only how it was *manually verified* this session, not committed.
- To simulate an authenticated user for RLS/RPC testing without a real
  signup: `set local request.jwt.claims = '{"sub":"<uuid>"}';` (and
  `set local role authenticated;` when testing what RLS itself allows, not
  just a SECURITY DEFINER function) in the same file/session as the calls
  that need `auth.uid()`.
- `supabase/tests/database/*.sql` each wrap themselves in `begin; ... rollback;`
  with self-contained fixtures — never depend on `seed.sql` data, so they're
  safe to run against the shared hosted project repeatedly.
- Seeding real `auth.users` rows directly via SQL (for the admin/officer —
  see `supabase/seed.sql`) needs `instance_id`, `aud`/`role` = 'authenticated',
  `encrypted_password` = `''` (no password, OTP-only), `email_confirmed_at`
  = `now()`, plus a matching `auth.identities` row (email provider) — the
  exact columns were introspected from the live project via
  `db query --linked` before writing the seed, since this schema is
  Supabase-managed and can drift between versions/training data.
- `src/lib/database.types.ts` is now the **real** generated file
  (`supabase gen types typescript --linked > src/lib/database.types.ts`) —
  regenerate it after every schema-changing migration.

## Framework/library gotchas (learned in Phase 0 — read before writing UI code)
- **Next.js 16, not 15.** Breaking changes from training data — see
  `node_modules/next/dist/docs/` before assuming an API. Key ones we hit:
  - `middleware.ts` is renamed to **`proxy.ts`**, exporting a `proxy()`
    function (nodejs runtime only, no edge). The actual logic lives in
    `src/lib/supabase/middleware.ts` (`updateSession`); `src/proxy.ts` just
    calls it. Don't recreate `middleware.ts` — Next won't load it.
  - `params`/`searchParams` are `Promise`s everywhere (layouts, pages,
    routes, image metadata). Use the generated `PageProps<'/route'>` /
    `LayoutProps<'/route'>` helpers.
  - Calling `Date.now()`/`new Date()` directly in a Server Component's
    render body fails the `react-hooks/purity` lint rule. Compute
    time-dependent values in a small client component instead (see
    `src/app/dev/ui/countdown-demo.tsx` for the pattern: `useState(null)` +
    compute inside `useEffect` via a named inner function — calling
    `setState` as the literal first statement of the effect body trips
    `react-hooks/set-state-in-effect`, wrapping it in a named function that
    the effect calls does not).
- **shadcn/ui here is Base UI, not Radix.** `npx shadcn add` generated
  components use `@base-ui/react` + a standalone `cn` package
  (`src/lib/utils.ts` just re-exports it), not `@radix-ui/*` + clsx/tailwind-merge.
  Concretely:
  - No `asChild`. Use the **`render`** prop: `<Button render={<Link href="/x">Go</Link>} />`.
  - `Button`/other native-element components default to `nativeButton: true`
    (or `NonNativeButtonProps` defaults `false` depending on the component) —
    when `render`-ing a non-`<button>` element (e.g. `next/link`'s `<a>`),
    pass **`nativeButton={false}`** or Base UI logs a console error about
    missing native button semantics.
  - `Select`'s `SelectValue` does **not** auto-derive the label from the
    selected `SelectItem`'s children (unlike Radix). Pass an `items` map to
    the `Select` root: `<Select items={{cse: "CSE", ...}} defaultValue="cse">`,
    or `SelectValue`'s `children` render-prop, or the trigger shows the raw
    value.
  - Card/Dialog/Sheet titles default to `font-heading` (mapped to Fraunces —
    see design tokens below), by shadcn's own convention here, not something
    we added.
- **Design tokens** live in `src/app/globals.css` as CSS custom properties
  under `@theme inline` / `:root`, per §8 of the plan (Tailwind v4, no
  `tailwind.config.js`). Light mode only — don't add a `.dark` block.
  Custom brand tokens beyond shadcn's defaults: `surface`, `surface-2`,
  `ink`, `ink-2`, `caption` (the plan's "muted" — renamed to avoid colliding
  with shadcn's own `--muted` background token), `navy`, `teal`,
  `teal-tint`, `amber`, `amber-tint`, `red-c`, `red-tint`.

## Auth redesign: password login, not OTP (post-Phase-7 change)
The plan's §5 (OTP-only) is **superseded**. The product decision was to
drop email/SMS entirely rather than set up SMTP — see git history around
this change for the conversation. What's true now:

- **No `signInWithOtp`/`verifyOtp` anywhere.** Students sign in with roll
  number *or* email + a password; officers/admins with email + password
  (`src/actions/auth.ts` — `signInStudent`/`signInAdmin`, both call
  `supabase.auth.signInWithPassword`). `AUTH_DEV_BYPASS` is gone — there's
  no dev/prod branch to maintain anymore.
- **Passwords are provisioned by an admin by default**, via the
  service-role client's `admin.auth.admin.createUser({email, password,
  email_confirm:true})` (voter roll CSV import for new voters —
  `actions/voters.ts` — and `/admin/team` promotion for officers/admins
  without a login yet — `actions/team.ts`) or reset
  (`admin.auth.admin.updateUserById(id, {password})` —
  `resetVoterPassword`). The generated password is returned once, shown
  in the UI (and, for CSV import, downloadable as a CSV) — there is no
  other record of it.
- **`/signup` (`claimVoterAccount` in `actions/auth.ts`) is the
  self-service alternative**, added after voters found "wait for the
  admin to hand me a password" too much friction. A voter proves it's
  really them with roll number + the `voters.phone` value from CSV import
  (the only per-voter secret-ish field that already existed — adding one
  would've needed a migration) and picks their own password. Same
  function handles both first-time setup (no `user_id` yet → `createUser`)
  and "forgot password" (`user_id` already set → `updateUserById`) since
  the identity check is identical either way, then signs them in
  immediately. A voter with no phone on file can't use this — falls back
  to an admin's "Reset password". Reuses `lookup_voter_for_login` purely
  for its rate-limit side effect, same as `signInStudent`.
- **`handle_new_auth_user()` (20260924000010) didn't need to change at
  all.** It fires on any `auth.users` insert regardless of how the row
  got there — OTP magic-link, `admin.createUser`, real signup — and links
  `voters.user_id` + creates the `profiles` row the same way every time.
  This is *why* switching auth methods was a pure application-layer
  change with zero new migrations.
- **`voters.pending_role` is now vestigial.** It existed to stage a
  promotion for a voter who hadn't signed in yet (OTP was lazy — the
  account only existed after their first login). Password auth
  provisions the account immediately at CSV-import time, so there's
  normally nothing to stage. The column is still read as a display
  fallback in `/admin/team`'s `effectiveRole` for any pre-existing rows
  that have it set, but nothing writes to it anymore.
- **`lookup_voter_for_login` and its `login_lookup_attempts` throttle
  table are reused, not replaced.** They predate this change (built for
  "does this roll number exist, rate-limited" before sending an OTP), but
  that's exactly the check a password login needs too — same throttle
  now also guards against roll-number password-brute-forcing. Its
  `masked_email` return field is simply unused now (the caller doesn't
  need to show a masked email anywhere in a single-step password form).
- **The seeded admin/officer accounts need a real password.** They used
  to have `encrypted_password = ''` (OTP-only, unusable with
  `signInWithPassword`). `supabase/seed.sql` now sets both to
  `extensions.crypt('ChangeMe123!', extensions.gen_salt('bf'))` via
  pgcrypto — matches Supabase Auth's own bcrypt storage format. Accounts
  already created on a live project before this change need a one-off
  `update auth.users set encrypted_password = extensions.crypt(...) where
  email = ...` to get a working password (seed.sql itself isn't safely
  re-runnable — see its own header comment).
- **`OtpLoginFlow`/`otp-input.tsx`**: the login flow component was deleted
  and replaced with `PasswordLoginFlow`. The generic `OtpInput` UI
  primitive (`components/ui/otp-input.tsx`) and its `/dev/ui` showcase
  entry were left in place — harmless, unused, not worth ripping out for
  a component that might be reused elsewhere later (e.g. a future 2FA
  feature), but don't assume it's wired to anything.

## Phase 2 gotchas (mostly historical — see the auth redesign above)
- **No real email yet.** Free-tier Supabase + default email provider refuses
  ANY email template customization ("Email template modification is not
  available for free tier projects using the default email provider.")
  and `config push` fails the *entire* auth-config batch if the template
  change is included — split it out. Until Phase 7 sets up custom SMTP:
  `AUTH_DEV_BYPASS=true` in `.env.local` makes `src/actions/auth.ts` call
  `admin.auth.admin.generateLink({type:'magiclink', email})` instead of
  `signInWithOtp()` — this creates a real Supabase Auth OTP without emailing
  it, and returns it in `properties.email_otp`, shown directly in the login
  UI. `verifyOtp({email, token, type:'email'})` is unchanged either way, so
  flipping the flag when real SMTP exists is a one-line change, not a
  rearchitecture. Also fixed via `supabase config push`:
  `auth.email.otp_length` (was 8, plan wants 6 — matches the OTP input's 6
  boxes).
- **`supabase config push` pushes everything declared in config.toml**, no
  per-key scoping. Always `supabase config diff` first — `supabase init`'s
  own template declares things (db.pooler sizing, mfa, site_url) that can
  silently overwrite real hosted settings. We deliberately left
  `db.pooler.default_pool_size`/`max_client_conn` undeclared so push can't
  touch the project's actual provisioned pooler sizing.
- **Admin/officer auth.users are pre-seeded** (Phase 1), so they never go
  through the first-login trigger — `handle_new_auth_user()` only fires for
  genuinely new `auth.users` rows (students, or anyone invited later via
  `admin.createUser`/`generateLink`, which also inserts one).
- **Promoting a voter who hasn't signed in yet**: can't set `profiles.role`
  (no profile exists). `voters.pending_role` stages it; the first-login
  trigger consumes it. `setVoterRole()` picks the right path based on
  whether `voters.user_id` is already set. Verified end-to-end: staged a
  pending officer promotion, signed that voter in for real, confirmed the
  trigger applied it and cleared `pending_role`.
- **`/admin/team`'s "commission" list must be queried from `profiles`, not
  `voters`** — an officer/admin with no voter record (e.g. the seeded
  placeholder officer) is invisible if you start from `voters`. Demoting
  such a person needs a plain profile-id update (`setProfileRole`), not the
  voter-id-based `setVoterRole` path, since there's no voter row to look up.
- **Base UI `Select`'s `items` map values must be typed `Record<string,
  string>` explicitly** — `Object.fromEntries` on a spread of tuple arrays
  infers `Record<string, unknown>`, which fails against `ReactNode`.
- Pagination links (`<Button render={<a href=... />}>`) need
  `nativeButton={false}` too — same Base UI rule as any other non-`<button>`
  render target.

## Phase 6 gotchas
- **This cloud session's network policy blocks `*.supabase.co` entirely**
  (not just `api.supabase.com`), so `supabase db push`/`gen types` can't
  reach the hosted project from here at all — worse than earlier phases'
  "no Docker" limitation. `supabase/migrations/20260924000012_nominations.sql`
  (adds `candidates.rejection_reason` + a `candidates_select_own` RLS
  policy + a `(position_id, voter_id)` unique index) has **not been run
  against the hosted DB** — it needs to be pasted into the Supabase
  Dashboard's SQL Editor by hand. `src/lib/database.types.ts`'s
  `candidates` entry was **manually patched** to add `rejection_reason`
  (matching the migration) since `gen types` can't run here either —
  regenerate it for real
  (`supabase gen types typescript --linked > src/lib/database.types.ts`)
  once either the migration has actually been applied or network access
  allows running it from this session.
- **RLS SELECT policies are OR'd**, not replaced — `candidates_select_own`
  was added as a *second* permissive policy alongside the existing
  `candidates_select` (20260924000005_rls.sql) specifically so a student
  can see their own `pending`/`rejected` nomination without weakening the
  "only `approved` + published" rule everyone else is still bound by.
- **`write_audit_log` rejects non-officers** (`is_officer_or_admin()`
  check inside the function itself) — a student's own
  `submitNomination()` call can't audit-log itself even if we wanted it
  to. Only the admin/officer approve/reject actions are audit-logged.

## Hard rules
1. Votes are written **only** by the `cast_ballot` Postgres function.
2. Never store, join or log voter identity together with ballot choices.
3. RLS on every table. The service-role key is server-only. In policy
   `using`/`with check` expressions, always write `(select auth.uid())`,
   never bare `auth.uid()` — otherwise Postgres re-evaluates it per row
   instead of once per query (`supabase db advisors --type performance`
   catches this as `auth_rls_initplan`).
4. Server actions: Zod validate → auth + role check → work → audit log → typed result.
5. Times in `timestamptz` (UTC), displayed in `Asia/Kolkata`.
6. Student screens are mobile-first (375px). Light theme only. Use the design tokens from the plan and don't invent new colors.
7. TypeScript strict, no `any`. Use shadcn/ui primitives and small components.
