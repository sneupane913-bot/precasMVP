-- ONE NUMBER, ONE ACCOUNT, AND A PAYMENT THAT CAN BE TAKEN BACK.
--
-- 12 September 2026. One student held two Google accounts on one phone number,
-- took a free mock on each, and was credited a paid pack twice: once by hand
-- onto the account he had abandoned, once through the checkout on the account
-- he really used. Nothing in the product could undo either payment, and the
-- payments screen showed both rows as the same name with no account beside it.

-- Why a closed account is closed, in words the student reads at sign-in.
alter table students add column if not exists disabled_reason text;

-- The number is now unique. The application refuses a number another account
-- holds, but that check is a read then a write, so this closes the race.
--
-- THIS WILL FAIL if duplicates written before today are still in the table.
-- That is deliberate: resolve them first in /super (Students -> "One number,
-- more than one account"), then run this. A unique index quietly skipped is
-- worse than none, because the application would trust a guarantee the
-- database is not keeping.
create unique index if not exists students_whatsapp_unique
  on students (whatsapp_number)
  where whatsapp_number is not null;

-- 'voided' joins the order states. No constraint to widen: state is plain text.
-- Kept here so the state list lives beside the schema it belongs to:
--   created | submitted | verified | rejected | expired | voided
