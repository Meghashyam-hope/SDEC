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
   for the URL/keys).

6. **Run it**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000.

## Authentication

Login is roll number (or email) + a password — no OTP, no SMTP/SMS.
Passwords can come from either side:

- **Self-service (`/signup`)**: a student enters their roll number and
  the **phone number on file** (from the CSV import) and picks their own
  password — no admin involved. The same form also works as "forgot
  password", since proving phone+roll again is the same check either
  way. Requires the voter's roll had a phone number in the import; if not,
  they'll need an admin's help instead (see "Reset password" below).
- **Admin-provisioned**: an admin/officer can also set a password
  directly:
  - **Students**: get a password automatically the first time they're
    imported via `/admin/voters` → Import CSV. The generated password is
    shown once (and downloadable as a CSV) for the commission to hand out
    out-of-band. Existing students can get a new one anytime via "Reset
    password" on their row.
  - **Officers/admins**: get a password automatically when an admin
    promotes them from `/admin/team` (if they don't already have a
    login), shown once the same way.

There's still no email/SMS delivery anywhere in this design — the
commission (or the student themselves, via `/signup`) is always the one
who ends up knowing a password, not this app sending it anywhere.

## Making the first admin

The seed script (`supabase/seed.sql`) hand-creates a dev admin + officer
account for local testing, with the password `ChangeMe123!` — rotate it
before any real use. For a **real deployment**, don't reuse that account;
instead create the first admin directly in the Supabase Dashboard's SQL
Editor:

```sql
do $$
declare
  v_id uuid := gen_random_uuid();
begin
  -- 1. Create their auth account with a real password (pgcrypto's
  --    crypt() matches Supabase Auth's bcrypt storage format):
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    'their-email@example.com', extensions.crypt('a-real-temporary-password', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text, jsonb_build_object('sub', v_id::text, 'email', 'their-email@example.com'), 'email', now(), now(), now());
end $$;

-- 2. The on_auth_user_created trigger just created their profiles row
--    with role='student' — promote it:
update profiles set role = 'admin'
where id = (select id from auth.users where email = 'their-email@example.com');
```

From there, that admin can promote others to officer/admin from
`/admin/team`, which provisions a login for them automatically if they
don't have one yet.

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

- [ ] **A real plan for handing out passwords.** This build has no email/SMS
      delivery — every generated password is shown once in the admin UI
      (and exportable as a CSV for the whole voter roll). Decide how the
      commission will actually get those to students (printed roster,
      existing college systems, etc.) before importing the real roll.
- [ ] **Rotate the seed admin/officer password** (`ChangeMe123!`) — see
      "Making the first admin" below for the real-admin path; deactivate
      or repassword the seeded `officer@sdec.test` account too if it was
      ever created on your project.
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
