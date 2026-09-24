-- pgTAP tests for election_phase(). Self-contained: creates its own
-- fixtures and rolls back, so it's safe to run against any environment
-- (including the hosted dev project, via `supabase db query -f`, until
-- Docker is available for `supabase test db` locally).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(9);

insert into elections (id, slug, title, starts_at, ends_at, is_published, results_visibility, allow_nota, override, nominations_open_at, nominations_close_at, results_published_at)
values
  ('00000000-0000-0000-0000-000000000001', 'phase-test-draft', 'Draft', now() + interval '1 day', now() + interval '2 days', false, 'after_close', false, null, null, null, null),
  ('00000000-0000-0000-0000-000000000002', 'phase-test-cancelled', 'Cancelled', now() - interval '1 day', now() + interval '1 day', true, 'after_close', false, 'cancelled', null, null, null),
  ('00000000-0000-0000-0000-000000000003', 'phase-test-paused', 'Paused', now() - interval '1 day', now() + interval '1 day', true, 'after_close', false, 'paused', null, null, null),
  ('00000000-0000-0000-0000-000000000004', 'phase-test-nominations', 'Nominations', now() + interval '5 days', now() + interval '10 days', true, 'after_close', false, null, now() - interval '1 day', now() + interval '1 day', null),
  ('00000000-0000-0000-0000-000000000005', 'phase-test-scheduled', 'Scheduled', now() + interval '1 day', now() + interval '2 days', true, 'after_close', false, null, null, null, null),
  ('00000000-0000-0000-0000-000000000006', 'phase-test-live', 'Live', now() - interval '1 day', now() + interval '1 day', true, 'after_close', false, null, null, null, null),
  ('00000000-0000-0000-0000-000000000007', 'phase-test-ended', 'Ended', now() - interval '2 days', now() - interval '1 day', true, 'after_close', false, null, null, null, null),
  ('00000000-0000-0000-0000-000000000008', 'phase-test-closed-early', 'ClosedEarly', now() - interval '1 day', now() + interval '1 day', true, 'after_close', false, 'closed_early', null, null, null),
  ('00000000-0000-0000-0000-000000000009', 'phase-test-results', 'Results', now() - interval '3 days', now() - interval '2 days', true, 'after_close', false, null, null, null, now() - interval '1 day');

select is((select election_phase(e.*) from elections e where slug = 'phase-test-draft'), 'draft', 'unpublished election is draft');
select is((select election_phase(e.*) from elections e where slug = 'phase-test-cancelled'), 'cancelled', 'cancelled override wins even though published');
select is((select election_phase(e.*) from elections e where slug = 'phase-test-paused'), 'paused', 'paused override');
select is((select election_phase(e.*) from elections e where slug = 'phase-test-nominations'), 'nominations', 'inside nomination window');
select is((select election_phase(e.*) from elections e where slug = 'phase-test-scheduled'), 'scheduled', 'before starts_at');
select is((select election_phase(e.*) from elections e where slug = 'phase-test-live'), 'live', 'between starts_at and ends_at');
select is((select election_phase(e.*) from elections e where slug = 'phase-test-ended'), 'ended', 'past ends_at');
select is((select election_phase(e.*) from elections e where slug = 'phase-test-closed-early'), 'ended', 'closed_early counts as ended even before ends_at');
select is((select election_phase(e.*) from elections e where slug = 'phase-test-results'), 'results', 'results_published_at set');

select * from finish();
rollback;
