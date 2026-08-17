# Moving to a new GitHub account and a new Netlify site

Written 17 August 2026, for the pilot with two students.

Work top to bottom. **Step 4 is the one that will break the pilot if you skip
it**, and it is the one nobody remembers.

---

## 1. Push the code to the new GitHub account

The code is already committed on `master`. Nothing is left uncommitted, and
`.gitignore` now refuses anything shaped like an env file, so no secret can
travel with it.

On the new GitHub account, create an **empty** repository — no README, no
`.gitignore`, no licence. An initialised repo will refuse the push.

Then, in Terminal:

```
cd "~/Developer/Content Karkhana/precas-mvp"

# Point at the new account. Replace NEWACCOUNT and NEWREPO.
git remote set-url origin https://github.com/NEWACCOUNT/NEWREPO.git

# Check it took
git remote -v

git push -u origin master
```

Git will ask for a username and password. **The password is not your GitHub
password** — GitHub stopped accepting those. It wants a Personal Access Token:

  GitHub → your picture → Settings → Developer settings →
  Personal access tokens → Tokens (classic) → Generate new token (classic) →
  tick **repo** → Generate → copy it and paste it as the password.

If macOS has cached the OLD account's credentials and keeps rejecting you:

  Keychain Access → search `github.com` → delete the entry → push again.

---

## 2. Connect the new Netlify to that repository

Netlify → Add new site → Import an existing project → GitHub → pick the new
repo.

Netlify reads `netlify.toml` from the repo, so the build command and publish
directory are already correct. Do not override them.

**Do not press Deploy yet.** Set the environment variables first (step 3). A
build without `NEXT_PUBLIC_*` set produces a site where Google sign-in is
broken, and those particular variables are baked in AT BUILD TIME — setting
them afterwards does nothing until you redeploy.

---

## 3. The environment variables

Open the OLD Netlify site in another tab:

  Site configuration → Environment variables

Copy each value across to the new site. This list is every variable the code
actually reads, checked against the source rather than remembered.

### Must be set, or the pilot does not work

| Variable | What breaks without it |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Google sign-in. Baked in at build time. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Google sign-in. Baked in at build time. |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Google sign-in. Baked in at build time. |
| `SESSION_SECRET` | The app **refuses to start in production** without it. |
| `GROQ_API_KEY` | Speech to text. See the note below — this one changed. |
| `GEMINI_API_KEY` | The marking. Without it students get no feedback. |
| `GEMINI_MODEL` | Which Gemini model to use. |
| `SUPER_ADMIN_PASSCODE` | You cannot open `/super` to approve anything. |
| `OWNER_ACCESS_KEY` | You cannot open `/owner` to pause the platform. |

> **`GROQ_API_KEY` is the one that changed today.**
>
> On the old site this was almost certainly named `GROQ_API_KEY_PARKED`, which
> is why Deepgram was doing all the transcription — the code looks for
> `GROQ_API_KEY`, found nothing, and fell through. On the new site name it
> **`GROQ_API_KEY`**, with the same value. If you copy the parked name across
> you will be back on Deepgram and will not be told.

### Keep, as the safety net

| Variable | Why |
|---|---|
| `DEEPGRAM_API_KEY` | Only runs if Groq **fails** — an outage, or Groq's free hourly ceiling during a busy evening. Costs nothing while Groq is healthy. You chose to keep this. |

### The database — check this one carefully

| Variable | Why |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Only if the old site had them. |
| `SUPABASE_SERVICE_ROLE_KEY` | Only if the old site had them. |

**Look for these two in the old site's variables before you do anything else.**

- **If they are there:** copy them, and the new site sees all the same students
  and payments. Nothing is lost.
- **If they are NOT there:** the old site was storing everything in Netlify
  Blobs, which belong to the old site and **do not come with you**. The new site
  starts completely empty: no students, no payment history, no reports. For a
  pilot with two fresh students that is fine, and arguably cleaner. But any
  existing student is left behind on the old site, so do not switch the domain
  over until you are happy with that.

### Cost guards — copy them so the new site behaves like the old one

These all have safe defaults in code, but the defaults are not necessarily what
you have been running.

| Variable | Default if unset |
|---|---|
| `MAX_PAID_CALLS_PER_MONTH` | 6000 |
| `MAX_MOCKS_PER_ACCOUNT_PER_DAY` | 12 |
| `REFERRAL_LIFETIME_CAP` | 20 |
| `MAX_ANSWER_SECONDS` | 90 |
| `MAX_TRANSCRIPT_WORDS` | 400 |

### Payment and support details

| Variable | Note |
|---|---|
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | The number students see when something goes wrong. |
| `PAY_WALLET_NAME` | |
| `PAY_WALLET_NUMBER` | |
| `PAY_ACCOUNT_NAME` | |
| `PAY_QR_IMAGE_URL` | |

You can also set the payment ones from `/super` → **Payment details** after
deploying, and that is the better route — a change there takes effect
immediately, where an env change needs a redeploy.

### Do not set these

`ESEWA_MERCHANT_CODE` and `KHALTI_SECRET_KEY` are read by `lib/payments/`, but
that module is a stub with a TODO where the provider should be. Payment is
manual QR plus a human approving it in `/super`. Setting these changes nothing
except making `paymentsConfigured()` claim a provider exists.

`NETLIFY`, `NETLIFY_BLOBS_CONTEXT`, `CONTEXT`, `COMMIT_REF`, `HEAD`,
`BUILD_TIME`, `NODE_ENV` are set by Netlify itself. `QA_ALLOW_DEV_TOKENS` is the
test harness's door and **must never be set in production** — it is refused
there anyway, but do not add it.

---

## 4. Add the new domain to Firebase — THE ONE THAT BREAKS PILOTS

Google sign-in refuses to run on a domain Firebase has not been told about. The
new Netlify site has a **new domain**, so as it stands your two students will
tap "Sign in with Google" and get an error, on a project that is otherwise
working perfectly.

  Firebase Console → your project → Authentication → Settings →
  **Authorised domains** → Add domain

Add the new Netlify domain exactly as Netlify shows it, for example
`your-new-site.netlify.app`. Add the custom domain too if you point one at it
later.

Leave the old domain in the list until you are certain nobody is mid-interview
on it.

---

## 5. Before the two students touch it

Deploy, then walk these in order. Each takes under a minute and each has cost
this project a day at some point.

1. **The build served is the build you pushed.** Netlify → Deploys → confirm the
   newest deploy's commit matches your last commit. Nine green test suites once
   sat on top of a build from before a price change.

2. **Sign in with Google yourself, on a phone.** If this fails, it is step 4.

3. **Answer one question out loud and check the transcript comes back.**
   This is the only real proof that Groq works. `/super` will happily say
   *Speech to text: Live (Groq Whisper large v3)* purely because the key is
   **present** — it does not test it. A key that is set and a key that works are
   different things, and only a recorded answer tells them apart.

4. **Open `/super`, then reload it.** You should stay signed in and see a
   **Log out**. That is D-42, fixed today.

5. **Set the support number and payment details** in `/super` → Payment
   details, so a student who hits trouble has somebody to contact.

6. **Check the free trial gives exactly one mock.** The header chip should read
   **1 mock**, not 2. A second credit was being granted to anyone who
   double-tapped the Google button; that is fixed, but this is the cheapest
   possible confirmation.

---

## 6. What the students will see

Both are new accounts, so each gets the free trial: **10 questions of a
17-question paper**, real marking, a real report at the end. They are not asked
to pay and will not see a price unless they go looking for `/pricing`.

If one of them exhausts the ten and you want them to continue, grant credits
from `/super` rather than asking them to pay. There is a grant control on the
student row.
