-- pgTAP tests for cast_ballot() and the secrecy/visibility invariants
-- around it (SDEC_PLAN §6, §11). Self-contained fixtures; rolled back at
-- the end so it never leaves data behind, whichever database it runs
-- against.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

-- ---- fixtures -------------------------------------------------------

insert into voters (id, roll_number, full_name, email, department, year, is_active) values
  ('10000000-0000-0000-0000-000000000001', 'PGTAP-CSE-1', 'Test CSE One', 'pgtap-cse-1@sdec.test', 'CSE', 2, true),
  ('10000000-0000-0000-0000-000000000002', 'PGTAP-ECE-1', 'Test ECE One', 'pgtap-ece-1@sdec.test', 'ECE', 2, true),
  ('10000000-0000-0000-0000-000000000003', 'PGTAP-CSE-2', 'Test CSE Two', 'pgtap-cse-2@sdec.test', 'CSE', 2, true);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'pgtap-auth-1@sdec.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'pgtap-auth-2@sdec.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'pgtap-auth-3@sdec.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now(), '', '', '', '');

insert into profiles (id, role, voter_id) values
  ('20000000-0000-0000-0000-000000000001', 'student', '10000000-0000-0000-0000-000000000001'), -- CSE One
  ('20000000-0000-0000-0000-000000000002', 'student', '10000000-0000-0000-0000-000000000002'), -- ECE One
  ('20000000-0000-0000-0000-000000000003', 'student', '10000000-0000-0000-0000-000000000003'); -- CSE Two

-- Election open to everyone, NOTA allowed, live now.
insert into elections (id, slug, title, starts_at, ends_at, is_published, results_visibility, allow_nota, eligibility)
values ('30000000-0000-0000-0000-000000000001', 'pgtap-live-open', 'PGTAP Live Open', now() - interval '1 day', now() + interval '1 day', true, 'after_close', true, '{}'::jsonb);

insert into positions (id, election_id, title, seats, max_choices) values
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 'Single Pick', 1, 1),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 'Pick Two', 2, 2);

insert into candidates (id, position_id, display_name, status) values
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', 'Single Pick A', 'approved'),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', 'Single Pick B', 'approved'),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000002', 'Pick Two A', 'approved'),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000002', 'Pick Two B', 'approved'),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002', 'Pick Two C', 'approved');

-- CSE-only election, live, no NOTA.
insert into elections (id, slug, title, starts_at, ends_at, is_published, results_visibility, allow_nota, eligibility)
values ('30000000-0000-0000-0000-000000000002', 'pgtap-live-cse-only', 'PGTAP CSE Only', now() - interval '1 day', now() + interval '1 day', true, 'after_close', false, jsonb_build_object('departments', jsonb_build_array('CSE')));

insert into positions (id, election_id, title, seats, max_choices) values
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 'CSE Rep', 1, 1);

insert into candidates (id, position_id, display_name, status) values
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000003', 'CSE Rep A', 'approved');

-- Scheduled (not yet live) election.
insert into elections (id, slug, title, starts_at, ends_at, is_published, results_visibility, allow_nota, eligibility)
values ('30000000-0000-0000-0000-000000000003', 'pgtap-scheduled', 'PGTAP Scheduled', now() + interval '1 day', now() + interval '2 days', true, 'after_close', false, '{}'::jsonb);

insert into positions (id, election_id, title, seats, max_choices) values
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', 'Future Pos', 1, 1);
insert into candidates (id, position_id, display_name, status) values
  ('50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000004', 'Future Candidate', 'approved');

-- ---- 1. a valid vote succeeds and returns a 12-char receipt code -----

set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-000000000001"}';

select is(
  length(cast_ballot(
    '30000000-0000-0000-0000-000000000001',
    '[
      {"position_id":"40000000-0000-0000-0000-000000000001","candidate_ids":["50000000-0000-0000-0000-000000000001"],"is_nota":false},
      {"position_id":"40000000-0000-0000-0000-000000000002","candidate_ids":["50000000-0000-0000-0000-000000000003","50000000-0000-0000-0000-000000000004"],"is_nota":false}
    ]'::jsonb
  )),
  12,
  'a valid vote returns a 12-character receipt code'
);

-- ---- 2. can't vote twice ---------------------------------------------

select throws_ok(
  $t$ select cast_ballot(
    '30000000-0000-0000-0000-000000000001',
    '[
      {"position_id":"40000000-0000-0000-0000-000000000001","candidate_ids":["50000000-0000-0000-0000-000000000002"],"is_nota":false},
      {"position_id":"40000000-0000-0000-0000-000000000002","candidate_ids":[],"is_nota":true}
    ]'::jsonb
  ) $t$,
  'P0001', 'already_voted',
  'voting a second time in the same election is blocked'
);

-- ---- 3. can't vote outside live (scheduled election) ------------------

select throws_ok(
  $t$ select cast_ballot(
    '30000000-0000-0000-0000-000000000003',
    '[{"position_id":"40000000-0000-0000-0000-000000000004","candidate_ids":["50000000-0000-0000-0000-000000000007"],"is_nota":false}]'::jsonb
  ) $t$,
  'P0001', 'election_not_live',
  'voting in a scheduled (not yet live) election is blocked'
);

-- ---- 4. can't vote if ineligible (ECE voter, CSE-only election) -------

set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-000000000002"}';

select throws_ok(
  $t$ select cast_ballot(
    '30000000-0000-0000-0000-000000000002',
    '[{"position_id":"40000000-0000-0000-0000-000000000003","candidate_ids":["50000000-0000-0000-0000-000000000006"],"is_nota":false}]'::jsonb
  ) $t$,
  'P0001', 'not_eligible',
  'a voter outside the election''s eligibility is blocked'
);

-- ---- remaining invalid-selection cases, using a fresh voter -----------

set local request.jwt.claims = '{"sub":"20000000-0000-0000-0000-000000000003"}';

-- 5. can't pick more than max_choices
select throws_ok(
  $t$ select cast_ballot(
    '30000000-0000-0000-0000-000000000001',
    '[
      {"position_id":"40000000-0000-0000-0000-000000000001","candidate_ids":["50000000-0000-0000-0000-000000000001"],"is_nota":false},
      {"position_id":"40000000-0000-0000-0000-000000000002","candidate_ids":["50000000-0000-0000-0000-000000000003","50000000-0000-0000-0000-000000000004","50000000-0000-0000-0000-000000000005"],"is_nota":false}
    ]'::jsonb
  ) $t$,
  'P0001', 'invalid_selections',
  'picking more candidates than max_choices is rejected'
);

-- 6. can't pick a candidate from another position
select throws_ok(
  $t$ select cast_ballot(
    '30000000-0000-0000-0000-000000000001',
    '[
      {"position_id":"40000000-0000-0000-0000-000000000001","candidate_ids":["50000000-0000-0000-0000-000000000003"],"is_nota":false},
      {"position_id":"40000000-0000-0000-0000-000000000002","candidate_ids":["50000000-0000-0000-0000-000000000004"],"is_nota":false}
    ]'::jsonb
  ) $t$,
  'P0001', 'invalid_selections',
  'a candidate belonging to a different position is rejected'
);

-- 7. NOTA combined with a real candidate is rejected
select throws_ok(
  $t$ select cast_ballot(
    '30000000-0000-0000-0000-000000000001',
    '[
      {"position_id":"40000000-0000-0000-0000-000000000001","candidate_ids":["50000000-0000-0000-0000-000000000001"],"is_nota":true},
      {"position_id":"40000000-0000-0000-0000-000000000002","candidate_ids":["50000000-0000-0000-0000-000000000003","50000000-0000-0000-0000-000000000004"],"is_nota":false}
    ]'::jsonb
  ) $t$,
  'P0001', 'invalid_selections',
  'NOTA combined with a candidate pick is rejected'
);

-- 8. NOTA where the election doesn't allow it (voter IS eligible here,
-- isolating the allow_nota check from the eligibility check in test 4)
select throws_ok(
  $t$ select cast_ballot(
    '30000000-0000-0000-0000-000000000002',
    '[{"position_id":"40000000-0000-0000-0000-000000000003","candidate_ids":[],"is_nota":true}]'::jsonb
  ) $t$,
  'P0001', 'nota_not_allowed',
  'NOTA is rejected when the election has allow_nota = false'
);

-- ---- 9. ballots/ballot_selections have no voter reference -------------

select columns_are('public', 'ballots', array['id', 'election_id', 'receipt_hash']);
select columns_are('public', 'ballot_selections', array['ballot_id', 'position_id', 'candidate_id', 'is_nota']);

-- ---- 10. a student cannot select from ballots directly (RLS) ----------

set local role authenticated;
select is((select count(*) from ballots)::int, 0, 'authenticated students cannot select any row from ballots directly');
reset role;

-- ---- 11. get_results hides results before close when after_close -----

select throws_ok(
  $t$ select get_results('30000000-0000-0000-0000-000000000001') $t$,
  'P0001', 'results_not_available',
  'get_results hides results while the election is still live under after_close visibility'
);

select * from finish();
rollback;
