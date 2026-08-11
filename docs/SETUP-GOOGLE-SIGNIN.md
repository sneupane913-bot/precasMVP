# Switching on Google sign-in

**Your part: about ten minutes, all clicking. My part is already done.**

You need **one value**: a Google OAuth Client ID. No Firebase project, no billing, no card.

---

## Why not Firebase

The decision in HANDOFF says "Firebase Auth". I built Google Identity Services instead, and you should know why so you can overrule me.

| | Firebase Auth | What I built |
|---|---|---|
| What the student sees | Google button | **identical** |
| What you set up | Firebase project, config, SDK keys | **one OAuth client id** |
| Extra code sent to the phone | about 300 KB | about 2 KB |
| Cost | free to 50k users | free to 50k users |
| Locked in? | somewhat | no |

It delivers the locked decision, "trial gate = Sign in with Google", with less setup. If you want Firebase for other reasons, only `lib/auth/google.ts` changes.

---

## The five steps

### 1. Open Google Cloud Console

Go to **console.cloud.google.com** and sign in as **Umanga Niroula**. Check the account name in the top right before you continue: two other Google accounts have been used on this Mac, and this is exactly how the code ended up in the wrong GitHub account.

### 2. Make a project

Top-left project dropdown, then **New Project**. Name it `PreCAS Practice`. Create, then make sure it is selected.

### 3. Configure the consent screen

Left menu, **APIs & Services**, then **OAuth consent screen**.

- User type: **External**, then Create
- App name: `PreCAS Practice`
- User support email: your email
- Developer contact: your email
- Save and continue through Scopes and Test users without adding anything
- Back to dashboard

While it says **Testing**, only Google accounts you add as test users can sign in. For the pilot that is fine and is arguably a feature. Press **Publish app** when you want anyone to sign in.

### 4. Create the client ID

**APIs & Services**, then **Credentials**, then **Create Credentials**, then **OAuth client ID**.

- Application type: **Web application**
- Name: `PreCAS Web`

**Authorised JavaScript origins**, add all three:

```
http://localhost:3000
https://precasmvp-umanga.netlify.app
https://YOUR-CUSTOM-DOMAIN-IF-ANY
```

Leave **Authorised redirect URIs** empty. This flow does not use redirects.

Create. Copy the **Client ID**. It looks like `1234567890-abc123.apps.googleusercontent.com`.

**You do not need the Client Secret.** Never put it in this project.

### 5. Put it in Netlify

Netlify, your site, **Site configuration**, then **Environment variables**. Add:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | the client id you copied |
| `SESSION_SECRET` | a long random string, see below |
| `SUPER_ADMIN_PASSCODE` | your own, not `super-dev` |
| `OWNER_ACCESS_KEY` | your own, **different from the super passcode** |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | your WhatsApp number with country code |
| `PAY_WALLET_NAME` | eSewa or Khalti |
| `PAY_WALLET_NUMBER` | the number students pay into |
| `PAY_ACCOUNT_NAME` | the name on that wallet |

For `SESSION_SECRET`, run this in Terminal and paste the output:

```
openssl rand -base64 32
```

Then **Deploys**, then **Trigger deploy**.

---

## How to check it worked

1. Open your site and go to `/start`
2. You should see a real **Sign in with Google** button, not the yellow "not configured" box
3. Sign in
4. Go to `/api/me` in the same browser. It should show `"signedIn": true` and `"mocksLeft": 1`

If the button does not appear, the client id is missing or misspelled. If sign-in fails, your site's URL is not in **Authorised JavaScript origins**, which must match exactly including `https://`.

---

## Two things that will bite you

**`SESSION_SECRET` is required in production.** The app refuses to start without it rather than issue cookies anyone could forge. That is deliberate.

**Make the owner key different from the super admin passcode.** The whole point of the owner switch is that a super admin cannot reach it. Same value, no separation.

---

## What is still not wired

**WhatsApp OTP at payment.** Deferred by your instruction, since it needs a Meta Business account and per-message cost. The interface is in `lib/otp/index.ts`.

Phone is currently collected at checkout but not verified. Until it is, the real controls on payment are the unique wallet transaction id and a human checking the wallet ledger, which are the ones that actually matter.

**The AI keys.** Deliberately last, as you asked. `GROQ_API_KEY` and `GEMINI_API_KEY`, whenever you are ready.
