# CLAUDE.md — SDEC rebuild

We are rebuilding SDEC (Student Digital Election Commission) as a **Next.js + Supabase + Vercel** app in `sdec-web/`.

- **Spec & phases:** `docs/SDEC_PLAN.md`. Read it fully before any work. Build one phase at a time and stop for review at the end of each phase.
- **Old code:** `client/` (React/Vite) and `server/` (Express/MySQL) are reference only, for flows and seed data. Don't copy their architecture (no Express, MySQL, Socket.IO or node-cron).
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

## Phase 2 gotchas
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
