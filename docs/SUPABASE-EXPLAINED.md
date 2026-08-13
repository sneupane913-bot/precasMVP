# Supabase, in plain words

You asked what the "Postgres layer" actually is. Here it is with no jargon.

## What is happening today

Every student account, every payment, every credit and every seat is written
into **one single file** on Netlify. When something changes, the app reads that
whole file, changes one line, and writes the whole file back.

That works perfectly when one person is using the site.

## The problem

Two people doing something at the same second:

1. Student A pays. The app reads the file.
2. Student B pays. The app reads the same file, a moment later.
3. Student A's payment is written back.
4. Student B's payment is written back, **over the top**, from the copy that was
   read before A existed.

Student A's payment has now vanished. No error, no warning. The money arrived in
your wallet and the credits are gone.

That is called a lost write, and a single file cannot prevent it.

## What Supabase changes

Supabase is a proper database. It handles two things happening at once by
design: each payment is its own row, and two rows cannot overwrite each other.
The lost write becomes impossible rather than unlikely.

It is also completely separate from Netlify. When you move to your own domain
and host later, the database does not move. You copy three values across and
everything keeps working.

## Why it is not just "flip a switch"

The credentials are in Netlify already. That part is done. But the app still has
to be **taught to talk to it**, and that means:

- **A schema.** Nine tables (students, trial claims, ledger, payment orders,
  seats, approvals audit, notifications, reward rules, offers), with the right
  columns, types and indexes.
- **A new storage layer.** About twenty five functions that currently read and
  write the single file have to be rewritten as database queries.
- **Row level security.** Rules so one student cannot read another's data even
  if something else goes wrong.
- **A careful switch.** The app must keep working while it moves.

That is a real piece of work, not a setting. It is the largest single item left
on the list, which is why it is called out separately rather than hidden inside
"a few small fixes".

## When it actually matters

- **Not needed** to connect the AI. They are unrelated.
- **Not needed** for you and a few testers.
- **Needed** before real students are paying at the same time, because that is
  exactly when two writes collide.

## What you have to do

Nothing further. The three values are already in Netlify:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The rest is code.
