create type app_role as enum ('student', 'officer', 'admin');
create type results_visibility as enum ('after_close', 'manual', 'live');
create type election_override as enum ('paused', 'closed_early', 'cancelled');
create type candidate_status as enum ('pending', 'approved', 'rejected', 'withdrawn');
