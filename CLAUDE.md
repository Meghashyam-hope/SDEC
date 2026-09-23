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
`db reset` / `test db` locally as the plan assumes. Instead: migrations in
`supabase/migrations/*.sql` are applied straight to a hosted (free-tier)
Supabase project via `supabase db push`, and pgTAP tests run against that
same hosted project (`supabase test db --db-url <connection-string>`) rather
than a local one. `src/lib/database.types.ts` is a hand-written placeholder
matching SDEC_PLAN §6 until the real project exists — regenerate it once it
does.

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

## Hard rules
1. Votes are written **only** by the `cast_ballot` Postgres function.
2. Never store, join or log voter identity together with ballot choices.
3. RLS on every table. The service-role key is server-only.
4. Server actions: Zod validate → auth + role check → work → audit log → typed result.
5. Times in `timestamptz` (UTC), displayed in `Asia/Kolkata`.
6. Student screens are mobile-first (375px). Light theme only. Use the design tokens from the plan and don't invent new colors.
7. TypeScript strict, no `any`. Use shadcn/ui primitives and small components.
