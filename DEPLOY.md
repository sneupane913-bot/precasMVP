# Putting this on the internet

**Short answer: yes. About fifteen minutes, and it is free.**

You will get a public URL like `https://precas-practice.netlify.app` that you can send to anyone on WhatsApp. They open it on their phone and sit a mock interview. No install, no account.

---

## The problem this had, and how it is now fixed

Until now, sessions were held in the server's memory. That works on your Mac because there is one server. It does **not** work on Netlify, where every request can land on a different machine that has never heard of your session. A student would have answered question one and then been told their interview had expired.

The store now uses **Netlify Blobs**, which is storage built into Netlify. No extra account, no extra keys, no cost at this scale. The code detects it is running on Netlify and switches automatically. Locally it still uses memory, so nothing about your workflow changes.

You do not have to do anything to turn this on. It is already in the code.

---

## Before you start: two decisions

### 1. Do you want real transcription, or demo mode?

| | Demo mode | Real mode |
|---|---|---|
| Cost | **Free** | About 10 US cents per full interview |
| What students hear | Sample text, clearly labelled as fake | Their own words |
| What you need | Nothing | A Deepgram key and a Gemini key |
| Good for | Showing people the design and the flow | Actual practice |

**For showing it to people, deploy in demo mode first.** The purple banner tells every visitor plainly that we are not really listening yet, so nobody is misled. You can add the keys later without redeploying the code.

### 2. Who are you sending it to?

If you post the link publicly and you have added real keys, **anyone can spend your Deepgram balance.** The credit checks are in the code but the payment wall is not built yet. Until it is:

- Share the link with a small group you know, not on a public Facebook page.
- Set a hard spend limit in the Deepgram dashboard on day one. Not after. Before.
- Deepgram gives new accounts $200 of free credit, which is roughly 2,000 full interviews. That is a lot of runway, but it is not infinite.

---

## Steps

### 1. Put the code on GitHub

Netlify deploys from a repository. In Terminal:

```bash
cd ~/Desktop/"Content Karkhana"/precas-mvp
git init
git add .
git commit -m "PreCAS Practice MVP"
```

Then create a **private** repository at `github.com/new`, call it `precas-mvp`, create it without a README, and run the two commands GitHub shows you. They look like:

```bash
git remote add origin https://github.com/YOUR-USERNAME/precas-mvp.git
git branch -M main
git push -u origin main
```

`.gitignore` already excludes `node_modules`, `.next` and `.env.local`, so no secrets and no junk get uploaded.

### 2. Connect Netlify

1. Go to `netlify.com` and sign up with your GitHub account.
2. **Add new site**, then **Import an existing project**.
3. Choose GitHub, then choose `precas-mvp`.
4. Netlify reads `netlify.toml` and fills in the build settings by itself. Do not change them.
5. Press **Deploy**.

First build takes three to five minutes. After that, every `git push` redeploys automatically.

### 3. Rename the site

Site configuration, then Change site name. Pick something a student can read out loud over the phone.

### 4. Later, when you want real transcription

Site configuration, then Environment variables, then add:

| Key | Where to get it |
|---|---|
| `DEEPGRAM_API_KEY` | `console.deepgram.com`, free $200 credit |
| `GEMINI_API_KEY` | `aistudio.google.com/apikey`, free tier available |

Then Deploys, then Trigger deploy. The purple demo banner disappears on its own once the keys are present, because the app reports its own state rather than being told.

---

## What works on the deployed site

- The whole interview flow, on phone and laptop
- Camera, microphone, recording, the live monitor, all violation detection
- Sessions survive across requests, thanks to Netlify Blobs
- Results, per-question feedback, PEE breakdown
- Add to Home Screen on Android and iPhone

## What does not work yet

- **Payments.** Stubbed. Nobody can pay, everybody gets in free.
- **Accounts and the trial gate.** Stubbed. One person can sit unlimited interviews.
- **Admin and super admin portals.** Not built.
- **Sessions are not linked to a person.** If someone loses the URL, the session is gone.

None of these stop you sharing it to get reactions, which is the point right now.

---

## One thing that will bite you

**HTTPS is required for camera and microphone.** Netlify gives you HTTPS automatically, so this is fine on the deployed site. It is only worth knowing because if you ever try to open the app through your Mac's local IP address to test on your phone, the camera will silently refuse. Use the Netlify URL for phone testing.

---

## What it costs

| | |
|---|---|
| Netlify free tier | 100 GB bandwidth, 125,000 function calls per month |
| Netlify Blobs | Included |
| Demo mode | Zero |
| Real mode | About $0.10 per full interview, almost all of it Deepgram |

At 125,000 function calls you can serve roughly 4,000 full interviews per month before the free tier runs out. If you reach that, you have a business and $19 a month will not be the problem.
