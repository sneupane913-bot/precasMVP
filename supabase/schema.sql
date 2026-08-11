-- PreCAS Practice: money and identity schema.
--
-- Run this in the Supabase SQL editor. Field names match lib/db/types.ts, so
-- the repository swap is mechanical.
--
-- The two properties this file exists to guarantee, which blob storage cannot:
--   1. UNIQUE(wallet_txn_id)  makes a payment screenshot unclaimable twice.
--   2. Real transactions      make seat allocation and credit grants atomic.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- students

create type student_status as enum ('active', 'disabled');
create type student_source as enum ('direct', 'consultancy');

create table students (
  id                      uuid primary key default gen_random_uuid(),
  auth_provider_id        text not null unique,
  auth_provider           text not null default 'google',
  email                   text,
  name                    text,

  -- Verified at payment, not at trial. See spec section 13.
  phone_e164              text,
  phone_verified_at       timestamptz,

  -- Binding relationship, used for access control.
  consultancy_id          uuid references consultancies(id),
  -- Free text the student typed. Lead generation only.
  -- NEVER use this for access control.
  attribution_consultancy text,

  source                  student_source not null default 'direct',
  created_via             text not null default 'marketing',

  status                  student_status not null default 'active',
  disabled_at             timestamptz,
  disabled_by             text,

  referral_code           text not null unique,
  referred_by_code        text,

  consent_version         text,
  consent_at              timestamptz,

  created_at              timestamptz not null default now(),
  last_seen_at            timestamptz not null default now()
);

create index on students (consultancy_id);
create index on students (referred_by_code);

-- ------------------------------------------------------------ trial claims

create table trial_claims (
  id               uuid primary key default gen_random_uuid(),
  student_id       uuid not null references students(id) on delete cascade,
  -- One trial per auth account. This is the gate.
  auth_provider_id text not null unique,
  fingerprint_hash text,
  ip               inet,
  outcome          text not null check (outcome in ('granted','soft_denied')),
  risk_score       int  not null default 0,
  risk_reasons     jsonb not null default '[]',
  claimed_at       timestamptz not null default now(),
  overridden_by    text,
  overridden_at    timestamptz
);

create index on trial_claims (fingerprint_hash, claimed_at);
create index on trial_claims (outcome);

-- --------------------------------------------------------------- ledger

-- Append only. Balance is SUM(delta). There is deliberately no balance
-- column: a mutable balance is the field that drifts under concurrency.
create table credit_ledger (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  kind       text not null check (kind in ('mock','practice')),
  delta      int  not null,
  reason     text not null,
  session_id uuid,
  order_id   uuid,
  note       text,
  created_at timestamptz not null default now()
);

create index on credit_ledger (student_id, kind);

create or replace function credit_balance(p_student uuid, p_kind text)
returns int language sql stable as $$
  select coalesce(sum(delta), 0)::int
  from credit_ledger where student_id = p_student and kind = p_kind;
$$;

-- --------------------------------------------------------- payment orders

create type order_state as enum ('created','submitted','verified','rejected','expired');

create table payment_orders (
  id                 uuid primary key default gen_random_uuid(),
  student_id         uuid not null references students(id) on delete cascade,
  consultancy_id     uuid references consultancies(id),
  pack_code          text not null,
  -- Server-owned. The client never sends a price.
  amount_npr         int  not null check (amount_npr >= 0),

  -- THE anti-double-claim control. One wallet transaction, one order, ever.
  wallet_txn_id      text unique,
  payer_name         text,
  payer_phone_suffix text,
  screenshot_url     text,

  state              order_state not null default 'created',
  verified_by        text,
  verified_at        timestamptz,
  rejected_reason    text,
  -- Set once when credits are granted, so re-verifying cannot double-allocate.
  allocated_at       timestamptz,

  created_at         timestamptz not null default now(),
  expires_at         timestamptz not null
);

create index on payment_orders (state);
create index on payment_orders (student_id);

-- --------------------------------------------------------------- seats

create table consultancies (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  name                 text not null,
  contact_name         text,
  contact_phone        text,
  logo_url             text,
  primary_color        text default '#0d1b2a',
  status               text not null default 'pending'
                       check (status in ('pending','approved','suspended')),
  seats_total          int  not null default 0 check (seats_total >= 0),
  paid_npr             int  not null default 0,
  -- Wi-Fi / IP ranges that relax the trial device-velocity threshold.
  -- The single biggest false-positive reducer for consultancy labs.
  allowlisted_ips      jsonb not null default '[]',
  passcode_hash        text not null,
  created_at           timestamptz not null default now(),
  approved_at          timestamptz
);

create table seat_allocations (
  id             uuid primary key default gen_random_uuid(),
  consultancy_id uuid not null references consultancies(id) on delete cascade,
  student_id     uuid not null references students(id) on delete cascade,
  allocated_by   text not null,
  allocated_at   timestamptz not null default now(),
  revoked_at     timestamptz,
  unique (consultancy_id, student_id)
);

-- Atomic allocation. Cannot oversell even under twenty concurrent callers,
-- because the count and the insert happen inside one statement's snapshot.
create or replace function allocate_seat(p_consultancy uuid, p_student uuid, p_by text)
returns boolean language plpgsql as $$
declare v_total int; v_used int;
begin
  select seats_total into v_total from consultancies where id = p_consultancy for update;
  if v_total is null then return false; end if;

  select count(*) into v_used
  from seat_allocations
  where consultancy_id = p_consultancy and revoked_at is null;

  if v_used >= v_total then return false; end if;

  insert into seat_allocations (consultancy_id, student_id, allocated_by)
  values (p_consultancy, p_student, p_by)
  on conflict (consultancy_id, student_id) do nothing;

  return true;
end; $$;

-- --------------------------------------------------------------- audit

create table approvals_audit (
  id         uuid primary key default gen_random_uuid(),
  actor_role text not null,
  actor_id   text not null,
  action     text not null,
  subject_id text not null,
  before     text,
  after      text,
  note       text,
  created_at timestamptz not null default now()
);

create index on approvals_audit (created_at desc);

create table admin_notifications (
  id             uuid primary key default gen_random_uuid(),
  consultancy_id uuid not null references consultancies(id) on delete cascade,
  message        text not null,
  created_at     timestamptz not null default now(),
  read_at        timestamptz
);

-- --------------------------------------------------------------- rewards

create table reward_rules (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique,
  kind                text not null check (kind in ('post_trial_window','campaign','referral')),
  name                text not null,
  public_reason       text not null,
  active              boolean not null default true,
  bonus_mocks_by_pack jsonb not null default '{}',
  -- A campaign deadline is set ONCE. Never regenerated per page view.
  -- An evergreen countdown is a dark pattern and is treated as a defect.
  ends_at             timestamptz,
  window_minutes      int,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  updated_by          text
);

create table student_offers (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id) on delete cascade,
  rule_id     uuid not null references reward_rules(id) on delete cascade,
  started_at  timestamptz not null default now(),
  -- Real, personal, and never silently extended or reissued.
  ends_at     timestamptz not null,
  consumed_at timestamptz,
  unique (student_id, rule_id)
);

-- ----------------------------------------------------------------- RLS

alter table students          enable row level security;
alter table trial_claims      enable row level security;
alter table credit_ledger     enable row level security;
alter table payment_orders    enable row level security;
alter table seat_allocations  enable row level security;
alter table approvals_audit   enable row level security;
alter table consultancies     enable row level security;

-- Deliberately no permissive policies here. All access goes through the
-- server using the service role. Adding a policy that lets the browser read
-- these tables directly would undo the LIVE-002 fix.
