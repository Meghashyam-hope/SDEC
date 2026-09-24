# SDEC — Student Digital Election Commission

A secure, mobile-first web app for running student elections: voter roll
import, elections with positions/candidates/nominations, a ballot that
keeps *who voted* separate from *what was voted*, receipts that verify
without revealing a choice, and results that stay hidden until the right
moment. See [`docs/SDEC_PLAN.md`](../docs/SDEC_PLAN.md) for the full
product spec and build phases, and [`CLAUDE.md`](./CLAUDE.md) /
[`../CLAUDE.md`](../CLAUDE.md) for implementation gotchas.

## Stack

Next.js (App Router, TypeScript) · Supabase (Postgres, Auth, Storage,
Realtime) · Tailwind CSS + shadcn/ui (Base UI) · Zod · Vercel.

## Local setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Create a Supabase project** (or use an existing one) and link the CLI:

   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   ```

3. **Apply the database schema.** With Docker available, the plan's
   assumed workflow is `supabase db reset`. Without Docker (this project
   was built without it — see `CLAUDE.md`), push migrations directly to
   the hosted project and run the seed by hand:

   ```bash
   npx supabase db push --linked
   npx supabase db query --linked -f supabase/seed.sql   # optional: sample data
   ```

   If your environment can't reach `*.supabase.co` at all (some sandboxed
   CI/cloud dev environments block it outright), paste the contents of
   each new file under `supabase/migrations/` into the Supabase
   Dashboard's **SQL Editor** instead, in filename order.

4. **Generate types** (repeat after any schema change):

   ```bash
   npx supabase gen types typescript --linked > src/lib/database.types.ts
   ```

5. **Configure environment variables.** Copy `.env.local.example` to
   `.env.local` and fill in your project's values (Project Settings → API
   for the URL/keys). Until custom SMTP is configured (see below), keep
   `AUTH_DEV_BYPASS=true` — OTP codes are generated for real but shown
   directly in the login UI instead of emailed.

6. **Run it**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Making the first admin

The seed script (`supabase/seed.sql`) hand-creates a dev admin + officer
account for local testing. For a **real deployment**, don't reuse that —
instead:

1. Have the person sign in once through the normal flow at `/admin/login`
   (email OTP). This creates their `auth.users` row and, via the
   first-login trigger, a `profiles` row with `role = 'student'`.
2. Promote them to admin directly in the Supabase Dashboard's SQL Editor:

   ```sql
   update profiles
   set role = 'admin'
   where id = (select id from auth.users where email = 'their-email@example.com');
   ```

From there, that admin can promote others to officer/admin from
`/admin/team` — including voters who haven't signed in yet (the promotion
is staged on `voters.pending_role` and applied automatically on their
first sign-in).

## Commands

```bash
npm run dev         # dev server
npm run build        # production build
npm run start         # serve the production build
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm test              # Vitest unit tests
npm run test:e2e       # Playwright (once specs exist — see docs/SDEC_PLAN.md Phase 4/7)
```

`npm run lint && npm run typecheck && npm test` should pass before
considering any change done.

## Production checklist

Before real students vote on this:

- [ ] **Custom SMTP.** Supabase's built-in email sender is for testing
      only and heavily rate-limited. Configure a real provider (Resend,
      Brevo, etc.) under Project Settings → Auth → SMTP, then set
      `AUTH_DEV_BYPASS=false` (or unset it).
- [ ] **OTP email template.** Under Auth → Email Templates, make sure the
      "Magic Link" / OTP template sends the **code** (`{{ .Token }}`), not
      just a clickable link — the login UI expects a 6-digit code.
      (Template editing needs a paid tier or custom SMTP; the free tier's
      default provider refuses any template changes.)
- [ ] **Vercel environment variables** — set all of `.env.local.example`'s
      keys in the Vercel project (Production + Preview), pointing at your
      **production** Supabase project, not a dev one.
- [ ] **Custom domain** on Vercel, and update `NEXT_PUBLIC_SUPABASE_URL`'s
      redirect allow-list in Supabase Auth settings to match it.
- [ ] Read [`docs/ELECTION_DAY_RUNBOOK.md`](../docs/ELECTION_DAY_RUNBOOK.md)
      before the first real election.

## Deploying

Push to a GitHub repo connected to Vercel; it builds and deploys
automatically (preview deployments per branch, production on `main`/`master`).
Nothing SDEC-specific beyond the environment variables above — this is a
standard Next.js App Router deploy.
