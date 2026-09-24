-- Gate for /admin/login: is this email already an officer/admin? Used so
-- unregistered emails never even get an OTP attempt (real email flow uses
-- signInWithOtp's shouldCreateUser:false too, but admin.generateLink — used
-- for the dev bypass — has no such option, so this check is the actual
-- gate while that bypass is active).
create or replace function is_admin_login_allowed(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    join public.profiles p on p.id = u.id
    where u.email = lower(trim(p_email)) and p.role in ('officer', 'admin')
  );
$$;

revoke all on function is_admin_login_allowed(text) from public;
grant execute on function is_admin_login_allowed(text) to authenticated, anon;
