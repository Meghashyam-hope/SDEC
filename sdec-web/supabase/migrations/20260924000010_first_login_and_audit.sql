-- Deferred role assignment: admin can promote a voter to officer/admin
-- before they've ever signed in. Consumed by handle_new_auth_user() below.
alter table voters add column pending_role app_role;

-- Links a new auth.users row to its voters row by email (student first
-- login — SDEC_PLAN §5.4), creating the profile. Voters not on record get
-- a plain 'student' profile with no voter_id (harmless — they're
-- ineligible everywhere until an admin actually adds them to the roll).
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_voter public.voters;
begin
  select * into v_voter from public.voters where email = new.email;

  if v_voter.id is not null then
    update public.voters set user_id = new.id where id = v_voter.id;
    insert into public.profiles (id, role, voter_id, display_name)
    values (new.id, coalesce(v_voter.pending_role, 'student'), v_voter.id, v_voter.full_name)
    on conflict (id) do nothing;
    if v_voter.pending_role is not null then
      update public.voters set pending_role = null where id = v_voter.id;
    end if;
  else
    insert into public.profiles (id, role) values (new.id, 'student')
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- The only way anything writes to audit_log (RLS has zero insert policies
-- for any client role). Officers and admins both use this going forward —
-- e.g. election controls in Phase 3, not just Phase 2's voter/team actions.
create or replace function write_audit_log(
  p_action text,
  p_entity text default null,
  p_entity_id uuid default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_officer_or_admin() then
    raise exception 'not_authorized' using errcode = 'P0001';
  end if;

  insert into public.audit_log (actor_id, action, entity, entity_id, meta)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_meta);
end;
$$;

revoke all on function write_audit_log(text, text, uuid, jsonb) from public;
grant execute on function write_audit_log(text, text, uuid, jsonb) to authenticated;

-- Add per-IP throttling alongside the existing per-roll-number throttle.
alter table login_lookup_attempts add column ip inet;
create index login_lookup_attempts_ip_time_idx on login_lookup_attempts (ip, attempted_at);

drop function if exists lookup_voter_for_login(text);

create or replace function lookup_voter_for_login(p_roll text, p_ip inet default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_roll text := upper(trim(p_roll));
  v_recent_roll_attempts int;
  v_recent_ip_attempts int;
  v_email text;
  v_at int;
  v_local text;
  v_domain text;
  v_masked text;
begin
  select count(*) into v_recent_roll_attempts
  from public.login_lookup_attempts
  where roll_number = v_roll and attempted_at > now() - interval '15 minutes';

  if v_recent_roll_attempts >= 5 then
    raise exception 'too_many_attempts' using errcode = 'P0001';
  end if;

  if p_ip is not null then
    select count(*) into v_recent_ip_attempts
    from public.login_lookup_attempts
    where ip = p_ip and attempted_at > now() - interval '15 minutes';

    if v_recent_ip_attempts >= 20 then
      raise exception 'too_many_attempts' using errcode = 'P0001';
    end if;
  end if;

  insert into public.login_lookup_attempts (roll_number, ip) values (v_roll, p_ip);
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

revoke all on function lookup_voter_for_login(text, inet) from public;
grant execute on function lookup_voter_for_login(text, inet) to authenticated, anon;
