-- PreCAS Practice schema (J2)
--
-- Run this once in the Supabase SQL editor:
--   Supabase dashboard -> SQL Editor -> New query -> paste -> Run
--
-- Why this exists: the previous store kept every student, payment, credit and
-- seat in ONE JSON document and did read-modify-write. Two people acting in the
-- same second could silently overwrite each other, and the write that vanished
-- could be a payment. Rows cannot do that to each other.
--
-- Access model: every table has row level security ON with no public policy, so
-- the anon key can read nothing at all. The app talks to these tables only from
-- the server with the service role key, which bypasses RLS. That is deliberate:
-- authorisation is decided in our API routes, where the rules already live and
-- are already tested, rather than being duplicated in two places that can drift.

-- ---------------------------------------------------------------- students --
create table if not exists students (
  id uuid primary key,
  auth_provider_id text not null unique,
  auth_provider text not null,
  email text,
  name text,
  phone_e164 text,
  phone_verified_at timestamptz,
  consultancy_id text,
  attribution_consultancy text,
  source text not null,
  created_via text not null,
  status text not null default 'active',
  disabled_at timestamptz,
  disabled_by text,
  referral_code text not null unique,
  referred_by_code text,
  consent_version text,
  consent_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index if not exists students_consultancy_idx on students (consultancy_id);
create index if not exists students_referred_by_idx on students (referred_by_code);

-- ------------------------------------------------------------ trial claims --
-- One claim per Google account is the actual trial gate.
create table if not exists trial_claims (
  id uuid primary key,
  student_id uuid not null references students (id) on delete cascade,
  auth_provider_id text not null unique,
  fingerprint_hash text,
  ip text,
  outcome text not null,
  risk_score int not null default 0,
  risk_reasons jsonb not null default '[]'::jsonb,
  claimed_at timestamptz not null default now(),
  overridden_by text,
  overridden_at timestamptz
);
create index if not exists trial_claims_fingerprint_idx on trial_claims (fingerprint_hash);
create index if not exists trial_claims_outcome_idx on trial_claims (outcome);

-- ------------------------------------------------------------------ ledger --
-- Append only. A balance is SUM(delta) and is never stored, because a stored
-- balance is exactly the column that drifts under concurrency.
create table if not exists ledger (
  id uuid primary key,
  student_id uuid not null references students (id) on delete cascade,
  kind text not null,
  delta int not null,
  reason text not null,
  session_id text,
  order_id text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists ledger_student_idx on ledger (student_id);
create index if not exists ledger_order_idx on ledger (order_id);

-- ---------------------------------------------------------- payment orders --
create table if not exists payment_orders (
  id uuid primary key,
  student_id uuid not null references students (id) on delete cascade,
  consultancy_id text,
  pack_code text not null,
  amount_npr int not null,
  -- The anti double claim control. One wallet transaction, one order, enforced
  -- by the database rather than by hopeful application code.
  wallet_txn_id text unique,
  payer_name text,
  payer_phone_suffix text,
  screenshot_url text,
  state text not null default 'created',
  verified_by text,
  verified_at timestamptz,
  allocated_at timestamptz,
  rejected_reason text,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists payment_orders_student_idx on payment_orders (student_id);
create index if not exists payment_orders_state_idx on payment_orders (state);
create index if not exists payment_orders_consultancy_idx on payment_orders (consultancy_id);

-- ------------------------------------------------------------------- seats --
create table if not exists seat_allocations (
  id uuid primary key,
  consultancy_id text not null,
  student_id uuid not null references students (id) on delete cascade,
  allocated_by text,
  allocated_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (consultancy_id, student_id)
);
create index if not exists seats_consultancy_idx on seat_allocations (consultancy_id);

-- ------------------------------------------------------------------ audits --
create table if not exists approvals_audit (
  id uuid primary key,
  actor_role text not null,
  actor_id text not null,
  action text not null,
  subject_id text not null,
  before_state text,
  after_state text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists audit_subject_idx on approvals_audit (subject_id);

create table if not exists admin_notifications (
  id uuid primary key,
  consultancy_id text not null,
  message text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists notifications_consultancy_idx on admin_notifications (consultancy_id);

-- ----------------------------------------------------------------- rewards --
create table if not exists reward_rules (
  id text primary key,
  code text not null,
  kind text not null,
  name text not null,
  public_reason text not null,
  active boolean not null default true,
  bonus_mocks_by_pack jsonb not null default '{}'::jsonb,
  ends_at timestamptz,
  window_minutes int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists student_offers (
  id uuid primary key,
  student_id uuid not null references students (id) on delete cascade,
  rule_id text not null,
  started_at timestamptz not null default now(),
  -- A real instant. Once past, the offer is gone and is never reissued, which
  -- is the difference between an honest countdown and a dark pattern.
  ends_at timestamptz not null,
  consumed_at timestamptz
);
create index if not exists offers_student_idx on student_offers (student_id);

-- ---------------------------------------------------------------- sessions --
-- Interview sessions, including the transcript. Deleted outright when a student
-- exercises their right to be deleted, which is why cascade matters here.
create table if not exists interview_sessions (
  id uuid primary key,
  student_id uuid references students (id) on delete cascade,
  owner_id text,
  vertical text not null,
  institution_id text not null,
  mode text not null,
  status text not null,
  question_ids jsonb not null default '[]'::jsonb,
  current_index int not null default 0,
  answers jsonb not null default '[]'::jsonb,
  flags jsonb not null default '[]'::jsonb,
  is_trial boolean not null default true,
  consent_version text,
  consent_at timestamptz,
  summary jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists sessions_student_idx on interview_sessions (student_id);

-- --------------------------------------------------------------------- RLS --
-- On everywhere, with no policies, so the public anon key can read nothing.
-- The server uses the service role key and is where authorisation is decided.
alter table students            enable row level security;
alter table trial_claims        enable row level security;
alter table ledger              enable row level security;
alter table payment_orders      enable row level security;
alter table seat_allocations    enable row level security;
alter table approvals_audit     enable row level security;
alter table admin_notifications enable row level security;
alter table reward_rules        enable row level security;
alter table student_offers      enable row level security;
alter table interview_sessions  enable row level security;
