-- Dev/demo seed data. Not idempotent — intended to run once against a
-- freshly-migrated database (`supabase db reset` locally, or applied once
-- to a fresh hosted project). See docs/SDEC_PLAN.md Phase 1.
--
-- auth.users / auth.identities rows are hand-inserted for the admin and
-- officer only, so they can sign in immediately via email OTP without
-- going through the (Phase 2) first-login trigger. The 40 voters on the
-- roll are NOT pre-linked to auth accounts — that linking happens lazily
-- on first login, same as real students.

-- ============================================================
-- Admin + officer accounts
-- ============================================================

do $$
declare
  v_admin_id uuid := gen_random_uuid();
  v_officer_id uuid := gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values
    (
      '00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated',
      'kashyapmamidela@gmail.com', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', ''
    ),
    (
      '00000000-0000-0000-0000-000000000000', v_officer_id, 'authenticated', 'authenticated',
      'officer@sdec.test', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now(),
      '', '', '', ''
    );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values
    (gen_random_uuid(), v_admin_id, v_admin_id::text, jsonb_build_object('sub', v_admin_id::text, 'email', 'kashyapmamidela@gmail.com'), 'email', now(), now(), now()),
    (gen_random_uuid(), v_officer_id, v_officer_id::text, jsonb_build_object('sub', v_officer_id::text, 'email', 'officer@sdec.test'), 'email', now(), now(), now());

  insert into profiles (id, role, display_name) values
    (v_admin_id, 'admin', 'Kashyap Mamidela'),
    (v_officer_id, 'officer', 'Election Officer');
end $$;

-- ============================================================
-- Voter roll — 40 voters across CSE/ECE/EEE/MECH, years 1-4.
-- Five CSE year-3 voters carry real names (continuity from
-- server/db/seed.js); the rest are generated but deterministic.
-- ============================================================

insert into voters (roll_number, full_name, email, department, year, section, is_active) values
  ('2473A05132', 'Vamsi Krishna', 'vamsi.2473a05132@sdec.test', 'CSE', 3, 'A', true),
  ('2473A05133', 'Shyam Sundar', 'shyam.2473a05133@sdec.test', 'CSE', 3, 'A', true),
  ('2473A05126', 'Kashyap Mamidela', 'kashyap.2473a05126@sdec.test', 'CSE', 3, 'A', true),
  ('2473A05085', 'Sahel Ahmed', 'sahel.2473a05085@sdec.test', 'CSE', 3, 'B', true),
  ('2473A05001', 'Charan Reddy', 'charan.2473a05001@sdec.test', 'CSE', 3, 'B', true);

with first_names as (
  select array['Aarav','Ananya','Vihaan','Ishita','Kabir','Meera','Rohan','Diya','Arjun','Sneha'] as arr
),
last_names as (
  select array['Rao','Reddy','Nair','Iyer','Sharma','Gupta','Patel','Kumar','Singh','Menon'] as arr
),
depts(code, need) as (
  values ('CSE', 5), ('ECE', 10), ('EEE', 10), ('MECH', 10)
),
gen as (
  select d.code as department, g as rn
  from depts d, generate_series(1, 10) g
  where g <= d.need
)
insert into voters (roll_number, full_name, email, department, year, section, is_active)
select
  gen.department || (((gen.rn - 1) % 4) + 1)::text || (case when gen.rn % 2 = 0 then 'B' else 'A' end) || lpad(gen.rn::text, 3, '0'),
  (select arr[((gen.rn - 1) % 10) + 1] from first_names) || ' ' || (select arr[((gen.rn * 3 - 1) % 10) + 1] from last_names),
  lower((select arr[((gen.rn - 1) % 10) + 1] from first_names)) || '.' || lower(gen.department) || '.' || gen.rn || '@sdec.test',
  gen.department,
  ((gen.rn - 1) % 4) + 1,
  case when gen.rn % 2 = 0 then 'B' else 'A' end,
  true
from gen;

-- ============================================================
-- Election 1: LIVE — Student Council Elections 2026
-- ============================================================

do $$
declare
  v_election_id uuid;
  v_president uuid;
  v_vp uuid;
  v_secretary uuid;
  v_treasurer uuid;
  v_cse_rep uuid;
begin
  insert into elections (
    slug, title, description, starts_at, ends_at, is_published,
    results_visibility, allow_nota, eligibility
  ) values (
    'student-council-2026', 'Student Council Elections 2026',
    'Annual election for the student council executive positions.',
    now() - interval '1 day', now() + interval '6 days', true,
    'after_close', true, '{}'::jsonb
  ) returning id into v_election_id;

  insert into positions (election_id, title, seats, max_choices, sort_order)
  values (v_election_id, 'President', 1, 1, 0) returning id into v_president;
  insert into positions (election_id, title, seats, max_choices, sort_order)
  values (v_election_id, 'Vice President', 1, 1, 1) returning id into v_vp;
  insert into positions (election_id, title, seats, max_choices, sort_order)
  values (v_election_id, 'Secretary', 1, 1, 2) returning id into v_secretary;
  insert into positions (election_id, title, seats, max_choices, sort_order)
  values (v_election_id, 'Treasurer', 1, 1, 3) returning id into v_treasurer;
  insert into positions (election_id, title, seats, max_choices, eligibility, sort_order)
  values (v_election_id, 'CSE Class Representative', 2, 2, jsonb_build_object('departments', jsonb_build_array('CSE')), 4)
  returning id into v_cse_rep;

  insert into candidates (position_id, display_name, tagline, manifesto, sort_order) values
    (v_president, 'Aditi Sharma', 'Transparent budgets, stronger student voice', 'Transparent budgets and a stronger student voice in academic policy.', 0),
    (v_president, 'Rohan Mehta', 'Better campus, longer library hours', 'Better campus infrastructure and extended library hours.', 1),
    (v_vp, 'Priya Nair', 'Mental health support for every student', 'Champion for mental health resources and peer support.', 0),
    (v_vp, 'Karan Verma', 'One calendar for every club and society', 'One unified calendar linking every club and society event.', 1),
    (v_secretary, 'Neha Kapoor', 'Clearer communication, every week', 'A weekly newsletter and clearer minutes from every council meeting.', 0),
    (v_secretary, 'Arjun Malhotra', 'Events that actually run on time', 'Better coordination between clubs so events stop clashing.', 1),
    (v_treasurer, 'Siddharth Rao', 'Every rupee, audited and public', 'Transparent budgeting with a public quarterly financial audit.', 0),
    (v_treasurer, 'Tanvi Desai', 'Fair funding for every club', 'A fair, published formula for allocating club funds.', 1);

  insert into candidates (position_id, voter_id, display_name, tagline, manifesto, sort_order)
  select v_cse_rep, id, full_name, 'Standing for CSE Class Representative', 'Will represent CSE students on curriculum and lab scheduling issues.', 0
  from voters where roll_number = '2473A05132'; -- Vamsi Krishna

  insert into candidates (position_id, display_name, tagline, manifesto, sort_order) values
    (v_cse_rep, 'Ananya Rao', 'A voice for every CSE section', 'Regular section-wise feedback sessions with the department.', 1),
    (v_cse_rep, 'Kabir Shah', 'Better lab equipment, faster fixes', 'Push for quicker turnaround on lab equipment complaints.', 2);
end $$;

-- ============================================================
-- Election 2: SCHEDULED — Hostel Council Elections 2026
-- ============================================================

do $$
declare
  v_election_id uuid;
  v_rep uuid;
begin
  insert into elections (
    slug, title, description, starts_at, ends_at, is_published,
    results_visibility, allow_nota, eligibility
  ) values (
    'hostel-council-2026', 'Hostel Council Elections 2026',
    'Election for the hostel residents'' council representative.',
    now() + interval '5 days', now() + interval '10 days', true,
    'after_close', false, '{}'::jsonb
  ) returning id into v_election_id;

  insert into positions (election_id, title, seats, max_choices, sort_order)
  values (v_election_id, 'Hostel Representative', 1, 1, 0) returning id into v_rep;

  insert into candidates (position_id, display_name, tagline, manifesto, sort_order) values
    (v_rep, 'Ishaan Bhatt', 'Better mess food, fewer complaints', 'A monthly mess committee meeting with published minutes.', 0),
    (v_rep, 'Riya Chawla', 'Faster maintenance requests', 'A tracked ticket system for hostel maintenance requests.', 1);
end $$;

-- ============================================================
-- Election 3: ENDED, results published — Tech Club Elections 2025
-- ============================================================

do $$
declare
  v_election_id uuid;
  v_lead uuid;
  v_candidate_a uuid;
  v_candidate_b uuid;
  v_voter record;
  v_i int := 0;
  v_code text;
  v_hash text;
  v_ballot_id uuid;
begin
  insert into elections (
    slug, title, description, starts_at, ends_at, is_published,
    results_visibility, results_published_at, allow_nota, eligibility
  ) values (
    'tech-club-2025', 'Tech Club Elections 2025',
    'Election for the Tech Club lead, 2025 term.',
    now() - interval '40 days', now() - interval '33 days', true,
    'after_close', now() - interval '30 days', false, '{}'::jsonb
  ) returning id into v_election_id;

  insert into positions (election_id, title, seats, max_choices, sort_order)
  values (v_election_id, 'Tech Club Lead', 1, 1, 0) returning id into v_lead;

  insert into candidates (position_id, display_name, tagline, manifesto, sort_order)
  values (v_lead, 'Devansh Oberoi', 'More workshops, more hands-on time', 'Monthly hands-on workshops instead of lecture-style sessions.', 0)
  returning id into v_candidate_a;

  insert into candidates (position_id, display_name, tagline, manifesto, sort_order)
  values (v_lead, 'Fatima Sheikh', 'Real projects, real portfolios', 'Team projects every semester that go straight into a portfolio.', 1)
  returning id into v_candidate_b;

  -- Simulate turnout: 24 of the 40 voters "voted", 15/9 split. Seed data
  -- only — real votes only ever go through cast_ballot() (SDEC_PLAN §11.1).
  for v_voter in (select id from voters order by roll_number limit 24) loop
    v_i := v_i + 1;

    insert into voter_participation (election_id, voter_id, voted_at)
    values (v_election_id, v_voter.id, now() - interval '35 days' + (v_i || ' hours')::interval);

    v_code := encode(gen_random_bytes(9), 'hex');
    v_hash := encode(digest(v_code, 'sha256'), 'hex');

    insert into ballots (election_id, receipt_hash)
    values (v_election_id, v_hash)
    returning id into v_ballot_id;

    insert into ballot_selections (ballot_id, position_id, candidate_id, is_nota)
    values (v_ballot_id, v_lead, case when v_i <= 15 then v_candidate_a else v_candidate_b end, false);
  end loop;

  insert into election_turnout (election_id, votes_cast)
  values (v_election_id, 24);
end $$;
