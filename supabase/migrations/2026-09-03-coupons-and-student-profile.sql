-- ExamTestAI, 3 September 2026.
--
-- RUN THIS ONCE in the Supabase SQL editor BEFORE (or immediately after)
-- deploying the coupon release:
--   Supabase dashboard -> SQL Editor -> New query -> paste -> Run
--
-- Everything here is additive and safe to run twice. Old code keeps working
-- after it has run; new code needs it to have run.

-- 1. The five student fields the welcome screen and checkout collect and the
--    live database never stored. Without these columns the phone number a
--    student types is thrown away, `needsProfile` stays true for ever, and the
--    student is bounced back to /welcome and refused an interview.
alter table students add column if not exists whatsapp_number    text;
alter table students add column if not exists whatsapp_confirmed boolean;
alter table students add column if not exists city               text;
alter table students add column if not exists level              text;
alter table students add column if not exists target_university  text;
create index if not exists students_whatsapp_idx on students (whatsapp_number);

-- 2. Coupons. One coupon, one pack, one student, once.
create table if not exists coupons (
  id uuid primary key,
  -- Canonical: upper case, no separators. UNIQUE is what makes a code a code.
  code text not null unique,
  consultancy_id text not null,
  pack_code text not null,
  -- What the consultancy paid for THIS coupon. Copied at issue time, because
  -- prices change and history must not.
  wholesale_npr int not null,
  batch_id text,
  issued_at timestamptz not null default now(),
  issued_by text,
  redeemed_at timestamptz,
  -- Redemption is a conditional UPDATE on this being NULL, so two students
  -- racing on one code produce exactly one winner.
  redeemed_by_student_id uuid references students (id) on delete set null
);
create index if not exists coupons_consultancy_idx on coupons (consultancy_id);
create index if not exists coupons_redeemed_by_idx on coupons (redeemed_by_student_id);

alter table coupons enable row level security;
