alter table voters enable row level security;
alter table profiles enable row level security;
alter table elections enable row level security;
alter table positions enable row level security;
alter table candidates enable row level security;
alter table voter_participation enable row level security;
alter table ballots enable row level security;
alter table ballot_selections enable row level security;
alter table election_turnout enable row level security;
alter table audit_log enable row level security;
alter table login_lookup_attempts enable row level security;

-- voters: students read their own row. Officers/admins read everything.
-- Only admins write.
create policy voters_select on voters for select
  using (
    id = (select voter_id from profiles where id = auth.uid())
    or is_officer_or_admin()
  );

create policy voters_insert on voters for insert
  with check (is_admin());

create policy voters_update on voters for update
  using (is_admin())
  with check (is_admin());

create policy voters_delete on voters for delete
  using (is_admin());

-- profiles: users read their own. Admins read and write everything.
create policy profiles_select on profiles for select
  using (id = auth.uid() or is_admin());

create policy profiles_insert on profiles for insert
  with check (is_admin());

create policy profiles_update on profiles for update
  using (is_admin())
  with check (is_admin());

create policy profiles_delete on profiles for delete
  using (is_admin());

-- elections: anyone can read published elections. Officers/admins have
-- full access (including drafts).
create policy elections_select on elections for select
  using (is_published or is_officer_or_admin());

create policy elections_insert on elections for insert
  with check (is_officer_or_admin());

create policy elections_update on elections for update
  using (is_officer_or_admin())
  with check (is_officer_or_admin());

create policy elections_delete on elections for delete
  using (is_officer_or_admin());

-- positions: readable where the parent election is published. Officers/
-- admins have full access.
create policy positions_select on positions for select
  using (
    is_officer_or_admin()
    or exists (
      select 1 from elections e
      where e.id = positions.election_id and e.is_published
    )
  );

create policy positions_insert on positions for insert
  with check (is_officer_or_admin());

create policy positions_update on positions for update
  using (is_officer_or_admin())
  with check (is_officer_or_admin());

create policy positions_delete on positions for delete
  using (is_officer_or_admin());

-- candidates: only approved candidates are publicly readable, and only
-- where the parent election is published. Officers/admins see every status.
create policy candidates_select on candidates for select
  using (
    is_officer_or_admin()
    or (
      status = 'approved'
      and exists (
        select 1 from positions p
        join elections e on e.id = p.election_id
        where p.id = candidates.position_id and e.is_published
      )
    )
  );

create policy candidates_insert on candidates for insert
  with check (is_officer_or_admin());

create policy candidates_update on candidates for update
  using (is_officer_or_admin())
  with check (is_officer_or_admin());

create policy candidates_delete on candidates for delete
  using (is_officer_or_admin());

-- voter_participation: students read their own "you voted" rows. Nobody
-- else gets a SELECT policy — officers/admins read counts only through
-- get_turnout(). No INSERT/UPDATE/DELETE policy for any client role:
-- writes happen exclusively inside cast_ballot().
create policy voter_participation_select on voter_participation for select
  using (
    voter_id = (select voter_id from profiles where id = auth.uid())
  );

-- ballots / ballot_selections: no policies at all. RLS is enabled with
-- zero grants, so no client role — including officers/admins — can select,
-- insert, update or delete directly. The only access path is through the
-- SECURITY DEFINER functions (cast_ballot, get_results, verify_receipt).

-- election_turnout: public read where the election is published. Officers/
-- admins can also see turnout for unpublished (draft/testing) elections.
-- No client write policy — cast_ballot() increments this.
create policy election_turnout_select on election_turnout for select
  using (
    is_officer_or_admin()
    or exists (
      select 1 from elections e
      where e.id = election_turnout.election_id and e.is_published
    )
  );

-- audit_log: admins read. No insert policy for any client role — entries
-- are written by SECURITY DEFINER functions / server-side service-role code.
create policy audit_log_select on audit_log for select
  using (is_admin());

-- login_lookup_attempts: internal rate-limit bookkeeping for
-- lookup_voter_for_login(). No client policies at all — only the
-- SECURITY DEFINER function (as table owner) reads/writes it.
