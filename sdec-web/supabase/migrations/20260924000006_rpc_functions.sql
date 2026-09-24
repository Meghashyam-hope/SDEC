-- The only function allowed to write to voter_participation, ballots or
-- ballot_selections (SDEC_PLAN §11 rule 1). Runs as a single transaction:
-- validate → record participation (blocks double voting) → store the
-- anonymous ballot → bump the turnout counter → return the receipt code
-- once, in plaintext, never stored.
create or replace function cast_ballot(p_election uuid, p_selections jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_voter public.voters;
  v_election public.elections;
  v_phase text;
  v_entry jsonb;
  v_position public.positions;
  v_candidate_ids uuid[];
  v_is_nota boolean;
  v_candidate_id uuid;
  v_expected_position_ids uuid[];
  v_seen_position_ids uuid[] := '{}';
  v_alphabet text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_code text;
  v_hash text;
  v_ballot_id uuid;
  v_attempt int;
  v_bytes bytea;
  i int;
begin
  -- 1. resolve auth.uid() -> profile -> voter (must be active)
  select v.* into v_voter
  from public.voters v
  join public.profiles p on p.voter_id = v.id
  where p.id = auth.uid();

  if v_voter.id is null then
    raise exception 'not_a_voter' using errcode = 'P0001';
  end if;
  if not v_voter.is_active then
    raise exception 'voter_inactive' using errcode = 'P0001';
  end if;

  -- lock the election row so a concurrent close/pause can't race a vote
  select * into v_election from public.elections where id = p_election for share;
  if v_election.id is null then
    raise exception 'election_not_found' using errcode = 'P0001';
  end if;

  -- 2. phase must be live
  v_phase := public.election_phase(v_election);
  if v_phase is distinct from 'live' then
    raise exception 'election_not_live' using errcode = 'P0001';
  end if;

  -- 3. voter must be eligible for the election overall
  if not public.is_eligible(v_voter, v_election.eligibility) then
    raise exception 'not_eligible' using errcode = 'P0001';
  end if;

  -- 4. validate selections against every position the voter is eligible for
  select coalesce(array_agg(pos.id), '{}') into v_expected_position_ids
  from public.positions pos
  where pos.election_id = p_election
    and public.is_eligible(v_voter, pos.eligibility);

  if p_selections is null or jsonb_typeof(p_selections) is distinct from 'array' then
    raise exception 'invalid_selections' using errcode = 'P0001';
  end if;

  for v_entry in select * from jsonb_array_elements(p_selections)
  loop
    if not (v_entry ? 'position_id') then
      raise exception 'invalid_selections' using errcode = 'P0001';
    end if;

    select * into v_position
    from public.positions
    where id = (v_entry ->> 'position_id')::uuid
      and election_id = p_election;

    if v_position.id is null or not (v_position.id = any (v_expected_position_ids)) then
      raise exception 'invalid_selections' using errcode = 'P0001';
    end if;
    if v_position.id = any (v_seen_position_ids) then
      raise exception 'invalid_selections' using errcode = 'P0001';
    end if;
    v_seen_position_ids := v_seen_position_ids || v_position.id;

    v_is_nota := coalesce((v_entry ->> 'is_nota')::boolean, false);
    select coalesce(array_agg(distinct x::uuid), '{}')
    into v_candidate_ids
    from jsonb_array_elements_text(coalesce(v_entry -> 'candidate_ids', '[]'::jsonb)) as x;

    if v_is_nota then
      if not v_election.allow_nota then
        raise exception 'nota_not_allowed' using errcode = 'P0001';
      end if;
      if array_length(v_candidate_ids, 1) is not null then
        raise exception 'invalid_selections' using errcode = 'P0001';
      end if;
    else
      if v_candidate_ids is null
        or array_length(v_candidate_ids, 1) is null
        or array_length(v_candidate_ids, 1) < 1
        or array_length(v_candidate_ids, 1) > v_position.max_choices
      then
        raise exception 'invalid_selections' using errcode = 'P0001';
      end if;

      foreach v_candidate_id in array v_candidate_ids
      loop
        if not exists (
          select 1 from public.candidates c
          where c.id = v_candidate_id
            and c.position_id = v_position.id
            and c.status = 'approved'
        ) then
          raise exception 'invalid_selections' using errcode = 'P0001';
        end if;
      end loop;
    end if;
  end loop;

  if array_length(v_seen_position_ids, 1) is distinct from array_length(v_expected_position_ids, 1) then
    raise exception 'invalid_selections' using errcode = 'P0001';
  end if;

  -- 5. record participation — the primary key blocks double voting
  begin
    insert into public.voter_participation (election_id, voter_id)
    values (p_election, v_voter.id);
  exception when unique_violation then
    raise exception 'already_voted' using errcode = 'P0001';
  end;

  -- 6. generate a receipt code + store the anonymous ballot (no voter_id,
  -- no timestamp — see public.ballots / public.ballot_selections)
  for v_attempt in 1..5 loop
    v_bytes := extensions.gen_random_bytes(12);
    v_code := '';
    for i in 0..11 loop
      v_code := v_code || substr(v_alphabet, (get_byte(v_bytes, i) % length(v_alphabet)) + 1, 1);
    end loop;
    v_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');

    begin
      insert into public.ballots (election_id, receipt_hash)
      values (p_election, v_hash)
      returning id into v_ballot_id;
      exit;
    exception when unique_violation then
      if v_attempt = 5 then
        raise exception 'receipt_generation_failed' using errcode = 'P0001';
      end if;
    end;
  end loop;

  for v_entry in select * from jsonb_array_elements(p_selections)
  loop
    v_is_nota := coalesce((v_entry ->> 'is_nota')::boolean, false);
    if v_is_nota then
      insert into public.ballot_selections (ballot_id, position_id, candidate_id, is_nota)
      values (v_ballot_id, (v_entry ->> 'position_id')::uuid, null, true);
    else
      insert into public.ballot_selections (ballot_id, position_id, candidate_id, is_nota)
      select v_ballot_id, (v_entry ->> 'position_id')::uuid, x::uuid, false
      from jsonb_array_elements_text(v_entry -> 'candidate_ids') as x;
    end if;
  end loop;

  -- 7. bump the cached turnout counter
  insert into public.election_turnout (election_id, votes_cast)
  values (p_election, 1)
  on conflict (election_id)
  do update set votes_cast = public.election_turnout.votes_cast + 1, updated_at = now();

  -- 8. return the plain code once — it is never stored anywhere
  return v_code;
end;
$$;

revoke all on function cast_ballot(uuid, jsonb) from public;
grant execute on function cast_ballot(uuid, jsonb) to authenticated;


-- Aggregate results per candidate/position. Gated by results_visibility;
-- officers/admins can preview after close even before publishing.
create or replace function get_results(p_election uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_election public.elections;
  v_phase text;
  v_allowed boolean;
  v_result jsonb;
begin
  select * into v_election from public.elections where id = p_election;
  if v_election.id is null then
    raise exception 'election_not_found' using errcode = 'P0001';
  end if;

  v_phase := public.election_phase(v_election);

  v_allowed := v_election.results_published_at is not null
    or v_election.results_visibility = 'live'
    or (v_election.results_visibility = 'after_close' and v_phase in ('ended', 'results'))
    or (public.is_officer_or_admin() and v_phase in ('ended', 'results'));

  if not v_allowed then
    raise exception 'results_not_available' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'election_id', v_election.id,
    'results_published_at', v_election.results_published_at,
    'positions', coalesce(jsonb_agg(
      jsonb_build_object(
        'position_id', pos.id,
        'title', pos.title,
        'seats', pos.seats,
        'nota_votes', (
          select count(*) from public.ballot_selections bs
          where bs.position_id = pos.id and bs.is_nota
        ),
        'candidates', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'candidate_id', c.id,
              'display_name', c.display_name,
              'photo_path', c.photo_path,
              'votes', (
                select count(*) from public.ballot_selections bs
                where bs.candidate_id = c.id
              )
            )
            order by (
              select count(*) from public.ballot_selections bs
              where bs.candidate_id = c.id
            ) desc
          ), '[]'::jsonb)
          from public.candidates c
          where c.position_id = pos.id and c.status = 'approved'
        )
      )
      order by pos.sort_order
    ), '[]'::jsonb)
  )
  into v_result
  from public.positions pos
  where pos.election_id = p_election;

  return v_result;
end;
$$;

revoke all on function get_results(uuid) from public;
grant execute on function get_results(uuid) to authenticated, anon;


-- Eligible-voter count, cached votes_cast, and a per-department breakdown.
-- Fine to show live.
create or replace function get_turnout(p_election uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_election public.elections;
  v_result jsonb;
begin
  select * into v_election from public.elections where id = p_election;
  if v_election.id is null then
    raise exception 'election_not_found' using errcode = 'P0001';
  end if;

  if not v_election.is_published and not public.is_officer_or_admin() then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  select jsonb_build_object(
    'election_id', v_election.id,
    'eligible_voters', (
      select count(*) from public.voters v
      where v.is_active and public.is_eligible(v, v_election.eligibility)
    ),
    'votes_cast', coalesce((
      select et.votes_cast from public.election_turnout et
      where et.election_id = p_election
    ), 0),
    'by_department', coalesce((
      select jsonb_agg(jsonb_build_object(
        'department', d.department,
        'eligible', d.eligible,
        'voted', coalesce(vp.voted, 0)
      ) order by d.department)
      from (
        select v.department, count(*) as eligible
        from public.voters v
        where v.is_active and public.is_eligible(v, v_election.eligibility)
        group by v.department
      ) d
      left join (
        select v.department, count(*) as voted
        from public.voter_participation p
        join public.voters v on v.id = p.voter_id
        where p.election_id = p_election
        group by v.department
      ) vp on vp.department = d.department
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function get_turnout(uuid) from public;
grant execute on function get_turnout(uuid) to authenticated, anon;


-- Public receipt verification: proves a ballot was counted without
-- revealing anything about its contents.
create or replace function verify_receipt(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash text;
  v_election_title text;
begin
  v_hash := encode(extensions.digest(upper(trim(p_code)), 'sha256'), 'hex');

  select e.title into v_election_title
  from public.ballots b
  join public.elections e on e.id = b.election_id
  where b.receipt_hash = v_hash;

  if v_election_title is null then
    return jsonb_build_object('found', false);
  end if;

  return jsonb_build_object('found', true, 'election_title', v_election_title);
end;
$$;

revoke all on function verify_receipt(text) from public;
grant execute on function verify_receipt(text) to authenticated, anon;


-- Roll number -> masked email, for the pre-OTP login step. Throttled per
-- roll number via login_lookup_attempts (5 lookups / 15 minutes).
create or replace function lookup_voter_for_login(p_roll text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_roll text := upper(trim(p_roll));
  v_recent_attempts int;
  v_email text;
  v_at int;
  v_local text;
  v_domain text;
  v_masked text;
begin
  select count(*) into v_recent_attempts
  from public.login_lookup_attempts
  where roll_number = v_roll and attempted_at > now() - interval '15 minutes';

  if v_recent_attempts >= 5 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  insert into public.login_lookup_attempts (roll_number) values (v_roll);
  delete from public.login_lookup_attempts where attempted_at < now() - interval '1 day';

  select email into v_email
  from public.voters
  where roll_number = v_roll and is_active;

  if v_email is null then
    return jsonb_build_object('found', false);
  end if;

  v_at := position('@' in v_email);
  v_local := substr(v_email, 1, v_at - 1);
  v_domain := substr(v_email, v_at);
  v_masked := substr(v_local, 1, 1) || repeat('•', greatest(length(v_local) - 1, 1)) || v_domain;

  return jsonb_build_object('found', true, 'masked_email', v_masked);
end;
$$;

revoke all on function lookup_voter_for_login(text) from public;
grant execute on function lookup_voter_for_login(text) to authenticated, anon;
