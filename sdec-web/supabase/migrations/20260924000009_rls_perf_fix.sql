-- Wrap auth.uid() as (select auth.uid()) so Postgres evaluates it once per
-- query instead of once per row (flagged by `supabase db advisors`).
alter policy voters_select on voters
  using (
    id = (select voter_id from profiles where id = (select auth.uid()))
    or is_officer_or_admin()
  );

alter policy profiles_select on profiles
  using (id = (select auth.uid()) or is_admin());

alter policy voter_participation_select on voter_participation
  using (
    voter_id = (select voter_id from profiles where id = (select auth.uid()))
  );
