-- Phase 6: nominations. Students apply for a position they're eligible
-- for (SDEC_PLAN §10). Two gaps the existing schema/RLS don't cover yet:
--
-- 1. A rejected nomination needs a reason the student can actually see.
-- 2. `candidates_select` (see 20260924000005_rls.sql) only lets a student
--    see `approved` candidates on a published election — a student can't
--    see their own `pending`/`rejected` nomination at all. RLS SELECT
--    policies are OR'd together, so adding a second permissive policy for
--    "it's my own nomination" only widens visibility; it can't weaken the
--    existing one.

alter table candidates add column rejection_reason text;

create policy candidates_select_own on candidates for select
  using (
    voter_id is not null
    and voter_id = (select voter_id from profiles where id = (select auth.uid()))
  );

-- One nomination per student per position (self-nominated or manually
-- added by an officer) — `submitNomination` also checks this up front so
-- it can show a friendly message instead of a raw constraint error.
create unique index candidates_position_voter_unique
  on candidates (position_id, voter_id)
  where voter_id is not null;
