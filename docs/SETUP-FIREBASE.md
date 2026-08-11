# Switching on Firebase sign-in

**Your part: about twelve minutes of clicking. The code is already done and tested.**

You need **three public values** from a Firebase project. No card, no billing, for Google sign-in.

---

## First, the money, so you budget correctly

You were right that 50,000 users is free. One part is not, and you should know before you plan.

| What | Cost |
|---|---|
| Google sign-in, up to 50,000 users a month | **Free.** No card needed. |
| Above 50,000 users | $0.0055 per user |
| **Phone SMS OTP** | **Not free.** Needs a card. $0.01 to $0.46 per SMS by country. |
| Every SMS sent | **Billed even if the student never types the code** |

That last row is the one that matters for us. "Send me a code" becomes a way for somebody to spend your money without ever being a customer. So when we switch phone on, `otp/send` gets a hard rate limit first. Your QA already flagged this (HANDOFF line 1133) and they were right.

**For now we only switch on Google sign-in, which costs nothing.** Phone comes later, at payment, where only converting students reach it. If 100 students pay in a month that is roughly 100 to 200 messages, not 50,000.

There is also a newer option worth checking when we get there: Firebase Phone Number Verification (May 2026) verifies through the carrier instead of sending a code, with no per-message fee. Worth pricing before we commit to SMS.

---

## Step 1: open the Firebase console

Go to **console.firebase.google.com**

**Check the account in the top right says Umanga Niroula before you do anything else.** Two other Google accounts have been used on this Mac and that is precisely how the code went to the wrong GitHub account.

## Step 2: create the project

- **Create a project**
- Name: `PreCAS Practice`
- Google Analytics: **turn it off**. We do not need it, and it is one more place student data could end up. Analytics on an education product handling visa and finance answers is a decision to make deliberately, not by accepting a default.
- Create, then wait for it to finish

## Step 3: turn on Google sign-in

- Left menu: **Build**, then **Authentication**
- **Get started**
- **Sign-in method** tab
- Click **Google**
- Toggle **Enable**
- Project public-facing name: `PreCAS Practice`
- Support email: pick your email
- **Save**

Do **not** enable Phone here yet. That one needs billing and we are not ready.

## Step 4: register the web app and copy three values

- Click the **gear** next to Project Overview, then **Project settings**
- Scroll to **Your apps**
- Click the **web icon** `</>`
- App nickname: `PreCAS Web`
- Do **not** tick Firebase Hosting
- **Register app**

You will see a config block. You need exactly three lines:

```js
apiKey: "AIzaSy........................"
authDomain: "precas-practice.firebaseapp.com"
projectId: "precas-practice"
```

Copy those three values. Ignore the rest.

**These three are public by design.** They identify the project to Google and appear in any Firebase client. Security comes from Authorised Domains in the next step, not from hiding them. The **service account key** is the dangerous one, and this project deliberately never uses it.

## Step 5: authorise your website addresses

- Still in **Authentication**, go to **Settings**, then **Authorised domains**
- `localhost` is already there
- **Add domain**: `precasmvp-umanga.netlify.app`
- Add your custom domain too, if you have one

**If you skip this, sign-in fails with "unauthorized domain".** The app already turns that into a plain-English message rather than a raw error, but the fix is here.

## Step 6: put the values into Netlify

Netlify, your site, **Site configuration**, then **Environment variables**:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | the `apiKey` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | the `projectId` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | the `authDomain` |
| `SESSION_SECRET` | see below |
| `SUPER_ADMIN_PASSCODE` | your own, not `super-dev` |
| `OWNER_ACCESS_KEY` | your own, **different from the super passcode** |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | your number with country code |
| `PAY_WALLET_NAME` | eSewa or Khalti |
| `PAY_WALLET_NUMBER` | the number students pay into |
| `PAY_ACCOUNT_NAME` | the name on that wallet |

For `SESSION_SECRET`, run this in Terminal and paste the result:

```
openssl rand -base64 32
```

Then **Deploys**, then **Trigger deploy**.

## Step 7: prove it works

1. Open your site at `/start`
2. You should see a real **Continue with Google** button, not the yellow "not switched on" box
3. Sign in
4. Visit `/api/me` in the same browser. You want `"signedIn": true` and `"mocksLeft": 1`

---

## Three things that will bite you

**`SESSION_SECRET` is required in production.** The app refuses to start without it rather than issue cookies anyone could forge. That is deliberate, not a bug.

**The owner key must differ from the super admin passcode.** The entire point of the owner switch is that a super admin cannot reach it. Same value, no separation, and your auditors will find it.

**Leave the project in Testing mode for the pilot** if the consent screen offers it. Only accounts you allow can sign in, which is a feature during a closed pilot.

---

## What happens when we add phone OTP

Already designed for. The student record has `phoneE164` and `phoneVerifiedAt`, and the sign-in route picks up a phone number the moment it exists on the Firebase account. Adding it later is:

1. Enable **Phone** in Firebase (needs billing)
2. Add the OTP step at checkout
3. Rate-limit `otp/send` **before** it goes live, because every send costs money

One identity throughout. The student never ends up with two accounts to merge, which was your reason for choosing Firebase and is the correct reason.
