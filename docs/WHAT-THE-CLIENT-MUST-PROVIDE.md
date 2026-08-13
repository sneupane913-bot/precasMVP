# What only the client can provide

Three things cannot be built by a developer. This is exactly what to get, where
to put it, and what it costs. Nothing here is urgent enough to block the current
work, but all three block the public launch.

---

## 1. Supabase credentials

**What Supabase is for here:** accounts, the credit ledger, payment orders,
approvals and seats. Today these live in a single JSON document on Netlify
Blobs, which silently loses writes when two things happen at once. That is fine
for testing and wrong for money.

**Cost: free.** The free tier covers 50,000 monthly users, far beyond the pilot.

**How to get it, about five minutes:**

1. Go to `supabase.com` and sign in with the project Google account.
2. Click **New project**. Name it `precas-practice`. Choose the **Singapore**
   region, which is the closest to Nepal. Set a database password and save it in
   the password manager, not in a chat.
3. Wait about two minutes for it to finish setting up.
4. Open **Project Settings**, then **API keys**. Three values are needed:

| Netlify variable | Where it is in Supabase | Secret? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | No, it is public by design |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `anon` / publishable key | No, it is public by design |
| `SUPABASE_SERVICE_ROLE_KEY` | the `service_role` / secret key | **YES. Never put this in a screenshot, a chat, or the browser.** |

5. Put all three into Netlify under **Project configuration → Environment
   variables**, scoped to **all contexts**, then **Clear cache and deploy site**.

All three names already exist in `.env.example`, so nothing in the code has to
change to accept them.

**The one thing to be careful about:** the `service_role` key bypasses every
security rule. It belongs only in Netlify's server environment. If it ever
appears in a screenshot or a client-side file, rotate it immediately from the
same Supabase page.

---

## 2. Nepali legal review

**What it is:** a Nepali lawyer reading three pages and confirming they satisfy
the **Privacy Act 2075**, which requires consent and purpose-bounded use of
personal data. We collect recordings, transcripts, and answers about family
income, visa history and finances, which is sensitive personal data.

**What to send them:** the three drafts already written and live:
`/privacy`, `/terms`, `/refund`.

**What to ask them, in one email:**

> We run a website that helps Nepali students practise UK university interviews.
> We record the student's voice, turn it into text, and store the text and our
> feedback. Some answers mention family income, visa history and finances. The
> student signs in with Google. Payment is by wallet transfer and we keep the
> transaction reference. Please review our privacy policy, terms of use and
> refund page against the Privacy Act 2075, tell us what must change, and
> confirm who we must name as the responsible business and contact.

**Who:** any Nepali commercial lawyer or a firm that does IT and company work.
Expect a small one-off fee, not a retainer. This is a single document review.

**Until it is done:** the pages stay marked as working drafts. They are honest
and complete enough for a private pilot with people you know. They are not
enough for a public paid launch.

---

## 3. A real phone, for device testing

**What it is for:** three things cannot be proved in a desktop browser.

1. The microphone actually recording on **iPhone Safari** and **Android
   Chrome**, which handle audio differently from desktop.
2. **Add to Home Screen** working, and the app opening like an app.
3. Every screen readable and tappable at **360 px wide**, which is the cheap
   Android most of our students use.

**How to test:** open the live site on the phone, sign in, start an interview,
answer one question out loud, and finish. Then add it to the home screen and
open it from there.

**Note on the support number.** A phone number for *testing* does not go into
the code. The number that does go into the code is the **support WhatsApp
number**, the one students message about payments. It is set in Netlify as
`NEXT_PUBLIC_SUPPORT_WHATSAPP` and it appears publicly in the footer and on the
payment screen, so it should be a **business number the client is happy to
publish**, not a private one.

---

## Also outstanding, but not blocking

**The wider university list is done.** The catalogue now carries 92 UK
universities without needing the missing CSV: the six approved stay pinned, and
the rest hold only a name and a city, which are public facts. If the original
CSV turns up with sourced, university specific interview details, those can be
added per university, but only with a dated primary source.
