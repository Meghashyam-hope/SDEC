-- Returns the caller's role, or null if they have no profile (not signed in,
-- or signed in but the first-login trigger hasn't created one yet).
-- SECURITY DEFINER + pinned search_path so it can read `profiles` without
-- being blocked by (or recursing into) that table's own RLS policies —
-- this is what every RLS policy below calls to check the caller's role.
create or replace function current_app_role()
returns app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_app_role() = 'admin';
$$;

create or replace function is_officer_or_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.current_app_role() in ('officer', 'admin');
$$;

-- Does `v` match an eligibility filter shaped like
-- {"departments": ["CSE"], "years": [2,3], "sections": ["A"]}?
-- Any key that is absent or an empty array is unrestricted for that
-- dimension. An empty/absent object as a whole means "everyone".
create or replace function is_eligible(v voters, eligibility jsonb)
returns boolean
language sql
stable
set search_path = ''
as $$
  select
    (
      not (eligibility ? 'departments')
      or jsonb_array_length(eligibility -> 'departments') = 0
      or eligibility -> 'departments' ? v.department
    )
    and (
      not (eligibility ? 'years')
      or jsonb_array_length(eligibility -> 'years') = 0
      or (eligibility -> 'years') @> to_jsonb(v.year::int)
    )
    and (
      not (eligibility ? 'sections')
      or jsonb_array_length(eligibility -> 'sections') = 0
      or (v.section is not null and eligibility -> 'sections' ? v.section)
    );
$$;

-- Derived election phase — see SDEC_PLAN §6. Mirrored in
-- src/lib/election-phase.ts; election-phase.test.ts and
-- supabase/tests/*election_phase* must agree.
create or replace function election_phase(e elections)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when not e.is_published then 'draft'
    when e.override = 'cancelled' then 'cancelled'
    when e.override = 'paused' then 'paused'
    when e.results_published_at is not null then 'results'
    when e.nominations_open_at is not null
      and e.nominations_close_at is not null
      and now() >= e.nominations_open_at
      and now() < e.nominations_close_at
      then 'nominations'
    when now() < e.starts_at then 'scheduled'
    when now() < e.ends_at and e.override is distinct from 'closed_early' then 'live'
    else 'ended'
  end;
$$;
