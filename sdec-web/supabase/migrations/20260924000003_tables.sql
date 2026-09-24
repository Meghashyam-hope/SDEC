-- official voter roll (imported by admin)
create table voters (
  id uuid primary key default gen_random_uuid(),
  roll_number text not null unique,          -- stored UPPERCASE, trimmed
  full_name text not null,
  email text not null unique,
  phone text,
  department text not null,                  -- e.g. 'CSE','ECE'
  year smallint not null check (year between 1 and 5),
  section text,
  is_active boolean not null default true,
  user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index voters_department_year_idx on voters (department, year);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role app_role not null default 'student',
  voter_id uuid unique references voters(id),
  display_name text,
  created_at timestamptz not null default now()
);

create table elections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  cover_path text,                           -- storage path
  nominations_open_at timestamptz,
  nominations_close_at timestamptz,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  is_published boolean not null default false,   -- false = draft, hidden from students
  override election_override,                     -- null = follow schedule
  results_visibility results_visibility not null default 'after_close',
  results_published_at timestamptz,
  allow_nota boolean not null default false,
  eligibility jsonb not null default '{}'::jsonb, -- {"departments":["CSE"],"years":[2,3]} ; empty = everyone
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index elections_is_published_idx on elections (is_published);

create table positions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(id) on delete cascade,
  title text not null,
  description text,
  seats smallint not null default 1 check (seats >= 1),
  max_choices smallint not null default 1 check (max_choices >= 1),
  eligibility jsonb not null default '{}'::jsonb, -- narrows the election's eligibility (e.g. CSE rep)
  sort_order int not null default 0
);

create index positions_election_id_idx on positions (election_id);

create table candidates (
  id uuid primary key default gen_random_uuid(),
  position_id uuid not null references positions(id) on delete cascade,
  voter_id uuid references voters(id),       -- the student standing (null if added manually)
  display_name text not null,
  tagline text,                              -- one line, shown on ballot card
  manifesto text,                            -- markdown, shown on detail sheet
  photo_path text,
  status candidate_status not null default 'approved',
  sort_order int not null default 0
);

create index candidates_position_id_idx on candidates (position_id);
create index candidates_status_idx on candidates (status);

-- WHO voted (never what)
create table voter_participation (
  election_id uuid not null references elections(id) on delete cascade,
  voter_id uuid not null references voters(id),
  voted_at timestamptz not null default now(),
  primary key (election_id, voter_id)
);

create index voter_participation_voter_id_idx on voter_participation (voter_id);

-- WHAT was voted (never who). No timestamps, random ids.
create table ballots (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections(id) on delete cascade,
  receipt_hash text not null unique          -- sha256(receipt_code)
);

create index ballots_election_id_idx on ballots (election_id);

create table ballot_selections (
  ballot_id uuid not null references ballots(id) on delete cascade,
  position_id uuid not null references positions(id),
  candidate_id uuid references candidates(id),   -- null when is_nota
  is_nota boolean not null default false,
  check ((candidate_id is null) = is_nota)
);

create index ballot_selections_ballot_id_idx on ballot_selections (ballot_id);
create index ballot_selections_position_candidate_idx on ballot_selections (position_id, candidate_id);

-- cached counters for cheap reads + realtime
create table election_turnout (
  election_id uuid primary key references elections(id) on delete cascade,
  votes_cast int not null default 0,
  updated_at timestamptz not null default now()
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references profiles(id),
  action text not null,                      -- 'election.create','election.close_early','voters.import',...
  entity text,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_at_idx on audit_log (created_at desc);
create index audit_log_entity_idx on audit_log (entity, entity_id);

-- table-backed rate limiter for lookup_voter_for_login (§5, §6). Rows are
-- pruned by the function itself; no external cron needed.
create table login_lookup_attempts (
  id bigint generated always as identity primary key,
  roll_number text not null,
  attempted_at timestamptz not null default now()
);

create index login_lookup_attempts_roll_time_idx on login_lookup_attempts (roll_number, attempted_at);
