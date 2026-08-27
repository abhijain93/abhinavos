# AbhinavOS

**A personal health operating system — and a framework for building your own.**

AbhinavOS is an installable web app that captures a day's food, training, sleep,
body metrics and habits, interprets them against rules that adapt to your own
data, and surfaces one prioritised action instead of a dashboard.

It is a single HTML file. There is no server. The database is an Airtable base
*you* own. The AI layer is three providers behind a failover chain, deliberately
confined to the two jobs a language model is actually good at.

I built it for myself over four months of tracking my own health, then three
days of assembling the thing, using AI as a collaborator throughout. I am not a
developer. This repository is the framework version of that app: everything
personal stripped out and replaced with configuration, so someone else can make
it theirs.

**AbhinavOS → RahulOS → PriyaOS → whatever you call yours.**

> **Not a medical device.** This is a personal logging and screening tool. It
> never diagnoses. Nothing it produces is medical advice. See
> [Medical positioning](#medical-positioning).

---

## Contents

1. [What is AbhinavOS?](#1-what-is-abhinavos)
2. [Why I built it](#2-why-i-built-it)
3. [The story behind it](#3-the-story-behind-it)
4. [What it does](#4-what-it-does)
5. [Technology stack](#5-technology-stack)
6. [Architecture](#6-architecture)
7. [AI architecture](#7-ai-architecture)
8. [Data architecture](#8-data-architecture)
9. [Privacy model](#9-privacy-model)
10. [**Build your own version**](#10-build-your-own-version)
11. [Customisation](#11-customisation)
12. [Branding](#12-branding)
13. [Your own logo and caricature](#13-your-own-logo-and-caricature)
14. [Setting up your Airtable](#14-setting-up-your-airtable)
15. [Configuring AI](#15-configuring-ai)
16. [Running locally](#16-running-locally)
17. [Deployment](#17-deployment)
18. [Troubleshooting](#18-troubleshooting)
19. [What is intentionally not included](#19-what-is-intentionally-not-included)
20. [Attribution](#20-attribution)
21. [Licence](#21-licence)
22. [Roadmap](#22-roadmap)

---

## 1. What is AbhinavOS?

Two things at once.

**A working app.** A health tracker I use every day — food, training, sleep,
body metrics, labs, supplements, habits — built around the idea that a tracker
should tell you the one thing to do next, not show you twelve charts.

**A framework.** The same code, with every personal value moved into a
configuration file, so you can point it at your own database, your own targets,
your own branding, and end up with your own app.

The interesting part isn't the tracking. It's the architecture: what AI is
allowed to decide (very little), what deterministic code decides (everything
that gets compared to another number), and what happens when the network dies.

---

## 2. Why I built it

For four months I tracked everything by typing it into an AI chat window. Food,
training, sleep, lab reports. It worked, in the sense that I got useful answers.
It failed in three specific ways:

**Every meal was typed by hand, twice.** Once to describe it, once more as a
prompt to get macros back.

**Weekly analysis meant rewriting prompts.** A different conversation for
nutrition, another for sleep, another for training. Every week. From scratch.

**The data lived in chat history.** Nothing structured, nothing queryable,
nothing to build on. Four months of records that couldn't be aggregated or
charted, because they were prose.

The realisation that turned this into a build: *the intelligence was never the
bottleneck.* The model was already giving good answers. What was missing was a
persistent structured place to put the data, and a logic layer between the data
and the model. That's a software problem, not an AI problem.

---

## 3. The story behind it

The first architecture used Lovable and Supabase. I dropped it.

Supabase was the better database and the wrong choice for this project.
Postgres, real auth, real queries — better than Airtable on every axis except
the ones that mattered. What it also meant: a build pipeline, an auth system, a
hosting account and a deployment story, for a single-user app whose entire
dataset fits in a spreadsheet.

What decided it: Airtable gave me an admin UI on my phone, and it let
configuration live as data. The scoring rules are a table I can edit from a
train. That's a different product from one where every rule change is a code
change and a redeploy.

The lesson wasn't "Airtable good, Supabase bad." It was that I picked the more
impressive stack before I understood what the app needed, and swapping it later
cost a rebuild. Choosing tools by their capability ceiling rather than by the
job is a mistake that looks like ambition.

Then three days of actual building. Those three days get the attention. The four
months before them are what made them possible — restart mode exists because I
watched myself abandon tracking after every trip; the floor-not-cap ring exists
because I watched myself under-eat while a depleting-budget display told me I
was doing well. Neither is a feature I'd have specified on day one.

The longer version, including the bugs: [docs/LESSONS.md](docs/LESSONS.md).

---

## 4. What it does

**Today** — one screen for the whole day. A weekly review prompt when the week
closes, exactly one prioritised action, and macro rings that fill *toward a
floor rather than up to a cap*, because under-eating was the actual failure mode.

**Food** — describe a meal in plain language. It matches your verified food
library first, and only asks the model to estimate what the library doesn't
know. Everything the AI produces lands in an editable form. Nothing is written
until you confirm it.

**Gym** — session-aware logging that updates today's session rather than
duplicating it, voice input parsed deterministically into structured sets, and
the last logged weight shown against every exercise so progression is the
default.

**Body** — sleep stages rather than just hours, overnight vitals framed
explicitly as screening signals, progress photos compressed client-side.

**Stats** — a scoring engine that shows its working line by line, rolling
adherence percentages instead of streaks, weekly muscle volume aggregated from
lift history, lab markers with reference ranges and direction of travel.

**Restart mode** — after three days away the app changes. Macros hidden, score
hidden, penalties suspended, one deliberately trivial goal. The job on day four
isn't catching up. It's opening the app at all.

---

## 5. Technology stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vanilla HTML / CSS / JS, single file | No build step, no toolchain, no dependency drift |
| Install | PWA — manifest + service worker | Home-screen icon and offline launch without an app store |
| Hosting | Any static host | It's one folder of static files |
| Database | Airtable | REST API, relational links, and a usable admin UI, free |
| Config as data | Airtable "Score Rules" table | Change the table, change the behaviour. No redeploy |
| AI | Gemini, Groq, OpenRouter | Three providers behind one failover chain |
| Voice | Web Speech API | Built into the browser, no service to call |

No framework, no `node_modules`, no build. Deployment is copying a folder.

---

## 6. Architecture

Four layers, no server.

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND — single-file installable PWA                 │
│  Vanilla HTML, CSS, JS. Installs to the home screen,    │
│  opens offline via a service worker.                    │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  APPLICATION LOGIC — deterministic rules engine         │
│  Scoring, adaptive targets, TDEE, rolling adherence.    │
│  Computed in code. Never guessed by a model.            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  DATA — Airtable as the database                        │
│  13 linked tables. REST API with bearer auth, plus an   │
│  offline write queue that retries failed syncs.         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│  AI — three providers, automatic failover               │
│  Meal parsing and coaching only. If all three are down, │
│  a local parser takes over. The app never goes dark.    │
└─────────────────────────────────────────────────────────┘
```

Layered on top of that, the framework split:

```
CORE APPLICATION          app/index.html  — logic, rendering, rules engine
      +
USER CONFIGURATION        app/config.js   — identity, theme, profile, targets
      +
USER DATA                 your Airtable base — never in this repository
```

Full detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 7. AI architecture

The design rule that matters most here:

> **AI interprets. Deterministic code decides.**

Language goes to the model. Numbers do not. Every score, target, threshold and
percentage is computed in JavaScript, traceably.

**What the model does:**
1. **Turns a sentence into structured data.** "2 rotis, dal, half bowl sabzi"
   becomes a JSON array with per-item macros. Your verified food library is
   checked first, so known foods never reach the model.
2. **Coaching.** A note fires after logging — but only when a *deterministic
   gate* has already decided there's something worth saying. Code asks the
   question; the model writes the sentence.

**What it may never do:** score anything, set a target, or write to the
database. Every AI-generated record passes through a human confirm step.

Voice input isn't AI here — `"bench press 15kg 3x10"` is parsed by a regular
expression. Sending numbers to a model when a parser will do is how you
introduce errors you can't reproduce.

Prompts live in `config.js` (`coachSystem`, `dietHint`). API keys live in your
browser. Full detail: [docs/AI-LAYER.md](docs/AI-LAYER.md).

---

## 8. Data architecture

Thirteen linked Airtable tables. **Each user has their own base, their own
account, their own records.** No data from this repository's author is included,
and there's no shared instance — your browser talks straight to your base.

Field addressing is by field ID, not field name, so renaming a column in
Airtable never breaks the app.

The write queue is the piece worth pointing at: failure *classification* matters
more than retry logic. Network failures and rate limits queue and retry.
Application errors throw. Timeouts throw rather than queue — because
`Promise.race` abandons a promise without aborting the request, so treating a
timeout as "failed, retry" duplicated every slow write.

Full schema: [docs/DATA-MODEL.md](docs/DATA-MODEL.md).

---

## 9. Privacy model

**No health data has ever been in this repository, and none ever will be.**

| Thing | Where it lives | In this repo? |
|---|---|---|
| Health records | Your Airtable base | Never |
| Airtable token | Your browser, entered at runtime | Never |
| AI provider keys | Your browser, entered at runtime | Never |
| Base ID, table/field IDs | Your local `config.js` | No — gitignored |
| Your profile, targets, coach prompt | Your local `config.js` | No — gitignored |
| Progress photos | Your Airtable base | Never |

There is no server in this architecture, so there is no third party between you
and Airtable — including me.

Keys aren't in the repo as an *architectural property*, not a discipline one:
there's no build step and no environment variables, so there's no mechanism by
which a key could reach a commit. The honest trade-off is that browser storage
is readable by anything running JavaScript on that origin — fine for a
single-user app on your own device, not fine for a multi-user product.

Full accounting: [docs/PRIVACY.md](docs/PRIVACY.md) and
[SECURITY.md](SECURITY.md).

---

## 10. Build your own version

**You do not need to be a traditional software developer to experiment with
this.** I wasn't when I built it. But it isn't one click either, and I'd rather
tell you that now than have you discover it at step five.

**What it actually takes:** an hour or two, most of it spent building your
Airtable base. Accounts needed: GitHub, Airtable, and one AI provider (Gemini,
Groq or OpenRouter). All free tiers.

**The shortcut:** [docs/CLAUDE-BUILD-YOUR-OWN.md](docs/CLAUDE-BUILD-YOUR-OWN.md)
contains a ready-to-paste prompt that walks Claude through the whole thing with
you — reading the repository, asking you the right questions, writing your
config, and debugging what breaks. If any word below is unfamiliar,
[docs/GLOSSARY.md](docs/GLOSSARY.md) defines all of them.

### Step 1 — Create a GitHub account
[github.com](https://github.com) → Sign up. Free.

### Step 2 — Fork this repository
"Fork" means *make your own copy under your account.* Click **Fork** at the top
of this page. Your fork is yours; changing it doesn't affect the original.

### Step 3 — Open the repository with Claude
Download your fork (green **Code** button → **Download ZIP**) and upload it to
Claude, or point Claude at your fork's URL.

### Step 4 — Ask Claude to explain it before changing anything
Paste the prompt from
[docs/CLAUDE-BUILD-YOUR-OWN.md](docs/CLAUDE-BUILD-YOUR-OWN.md). Its first
instruction is to *explain* the architecture, not modify it. Resist the urge to
skip this — understanding the shape of the thing makes every later step faster.

### Step 5 — Create your own Airtable base
[airtable.com](https://airtable.com) → new base. Build the 13 tables from
[docs/DATA-MODEL.md](docs/DATA-MODEL.md). This is the longest step. Claude can
walk you through it one table at a time.

### Step 6 — Run it and take the tour
Start it locally ([section 16](#16-running-locally)). On first run you'll see
**"Just show me the app first"** — a read-only demo with fictional sample data.
Nothing you see there is real and nothing is saved. It exists so you know what
you're building before you spend an hour on Airtable.

### Step 7 — Complete the Setup Wizard
Five steps: your name and app name, your logo and colours, your body, your
goals, your Airtable base. Only a name and an app name are required.

**No file editing.** The wizard saves to your browser. If you'd rather have
your setup in version control, Settings → **Copy my config.js** generates the
file for you afterwards.

### Step 8 — Configure your AI provider
Get a free key from Gemini, Groq or OpenRouter. Enter it in the app's Settings
screen — **not** in any file. See [section 15](#15-configuring-ai).

### Step 9 — Connect your own Airtable
Paste your Airtable token when the app asks. Your day loads from your own base.
This is the moment demo mode ends and it becomes your app.

### Step 10 — Deploy if you want to
Netlify, Vercel, Cloudflare Pages — all free, all drag-and-drop. See
[section 17](#17-deployment). Optional; it runs fine locally.

---

## 11. Customisation

**Most of this is now done in the app itself**, through the Setup Wizard on
first run and the "Your profile & goals" card on the Stats tab afterwards. No
file editing required:

- App name, tagline, display name, storage namespace
- Logo, avatar, character image
- 13 colour tokens and corner radius
- Your height, age, sex, starting weight
- Calorie floor, water, protein per kg, deficit multiplier
- Coach system prompt and diet hint
- Supplement and skincare option lists
- Habit checklist, lab marker priority, lab targets, seed weights
- Airtable base and schema mapping
- Goal type, activity level, training days, equipment, foods to avoid,
  coaching tone — all fed into the coach's prompt and your targets

**What still needs a code edit** — and I'd rather say so plainly: adding or
removing whole feature modules (the five tabs and their cards are built in code,
not driven by config), using a font that isn't one of the four already loaded,
and any change to the app's structure or maths.

Full detail and honest limits: [docs/CUSTOMISATION.md](docs/CUSTOMISATION.md).

---

## 12. Branding

```js
branding: {
  appName: "RahulOS",
  tagline: "Training and recovery, tracked properly",
  displayName: "Rahul",
  storagePrefix: "rahulos",
  faceImage: "assets/rahul-avatar.png",
},
theme: {
  ground: "#0A0E14", surface: "#111823",
  primary: "#4EA8DE", secondary: "#3A86FF", ink: "#E8F1F8",
}
```

A name ending in "OS" gets the accent styling automatically — `RahulOS` renders
as Rahul + a coloured OS. Set only `primary` and `ground` and it already looks
like a different app.

`storagePrefix` matters if you run more than one fork in the same browser: it
keeps each app's saved token and settings separate.

---

## 13. Your own logo and caricature

| Image | Setting | Recommended | Where it shows |
|---|---|---|---|
| Avatar | `branding.faceImage` | Square PNG, transparent, 192×192+ | Header, small |
| Character | `branding.charImage` | Portrait PNG, transparent, ~600px tall | Boot screen, restart mode |
| App icon | *(file replacement)* | `icon-192.png`, `icon-512.png` | Home screen tile |

Put your files in `app/` or `app/assets/` and reference them relatively:

```js
branding: { faceImage: "assets/my-avatar.png" }
```

A `data:` URI works too. The app icon is the one image that isn't config —
overwrite the two PNG files, keeping the filenames.

---

## 14. Setting up your Airtable

1. Create a base at [airtable.com](https://airtable.com).
2. Build the tables described in [docs/DATA-MODEL.md](docs/DATA-MODEL.md). Only
   `Daily Log` with a `date` field is strictly required — every other table
   switches on features, and a missing field hides its card rather than
   erroring. Start with Daily Log and Food Log; add the rest later.
3. Create a personal access token: Airtable → Developer hub → Personal access
   tokens. Scopes: `schema.bases:read`, `data.records:read`,
   `data.records:write`. Grant it to **that one base only**.
4. Get your IDs:
   ```
   https://api.airtable.com/v0/meta/bases/{baseId}/tables
   ```
   Your base ID is in the base URL (`airtable.com/appXXXX.../tblYYYY...`).
5. Put base ID and field IDs into `config.js`. Paste the token into the app when
   it asks — not into a file.

---

## 15. Configuring AI

Three providers, tried in order, each with its own model fallback list because
free-tier model names change without warning:

| Provider | Free tier | Get a key |
|---|---|---|
| Gemini | Yes | Google AI Studio |
| Groq | Yes | Groq Console |
| OpenRouter | Yes, on some models | OpenRouter |

Enter keys in the app's **Settings** screen. They're stored in your browser and
never leave your device except to call the provider.

If all three fail, meal parsing falls back to a local parser that runs entirely
in the page — a food database plus a quantity/unit grammar. It can't fail or
hang, and its values are marked as estimates. That fallback is why the AI layer
is an enhancement rather than a dependency.

To change coaching behaviour, edit `coachSystem` in `config.js`. That's the
standing brief; your live data is supplied separately on every call.

---

## 16. Running locally

```bash
cd abhinavos/app
cp config.example.js config.js
npx serve .
```

Then open the URL it prints.

**Opening `index.html` directly from disk will not work** — service workers need
a real origin. Any static server does: `npx serve`, `python3 -m http.server`, or
the Live Server extension in VS Code.

On first load the app asks for your Airtable token. Paste it in. If your config
is right, your day loads.

---

## 17. Deployment

Optional. It works fine locally.

| Host | Notes |
|---|---|
| Netlify | Drag the `app/` folder onto Netlify Drop. No build step |
| Cloudflare Pages | No bandwidth cap on the free tier |
| Vercel | Same idea, connect or drag |
| GitHub Pages | Only serves from repo root or `/docs`, so `/app` needs restructuring or an Actions workflow |

Once deployed, open it on your phone and use **Add to Home Screen** to install
it as a PWA.

**Keep your deployed private build separate from your public repository.** Your
`config.js` contains your base ID and personal targets. If you set up automatic
deployment from GitHub, deploy from a **private** repo, never the public one.

---

## 18. Troubleshooting

**"Airtable rejected the token"** — wrong scopes. It needs all three:
`schema.bases:read`, `data.records:read`, `data.records:write`, on that base.

**App loads but every card is empty** — your field IDs in `config.js` don't
match your base. Re-pull the schema endpoint and compare.

**A card is missing entirely** — that's by design. A field your config doesn't
declare hides its card rather than erroring.

**Blank page, nothing at all** — open the browser console (F12) and read the
first red error. Usually a syntax error in `config.js`. Check with
`node --check app/config.js`.

**Changes don't appear** — the service worker cached the old version. Hard
refresh (Ctrl/Cmd + Shift + R), or unregister the service worker in
DevTools → Application.

**Meal parsing returns nothing** — no AI key, or all three providers failed. The
local parser should still return estimates. Check Settings.

**Writes seem to vanish** — you're probably offline. They're queued and will
retry. The offline bar tells you.

**Something else** — paste the actual console error into Claude along with the
file it came from. That works better than any troubleshooting list.

---

## 19. What is intentionally not included

- **Any of my health data.** Not one record, ever.
- **Any credentials.** No keys, tokens, base IDs, or deployment secrets.
- **My personal biometrics.** Height, age and sex were hardcoded in an earlier
  version of this file; they're now config, and if you don't set them the app
  says the estimate isn't personalised rather than quietly using someone else's
  body.
- **My supplement stack, skincare routine, food library, lab targets, or
  coaching prompt.** All config, all empty by default.
- **My avatar images.** Yours to supply.
- **A hosted demo.** There's nothing to demo without your own base — a live
  version would load and then ask for a token it can't have.
- **Tests.** There is no test suite. Verification is a secret scanner, syntax
  checks and manual testing. For a single-file personal app that was the right
  trade; for anything larger it wouldn't be.
- **Production-readiness claims.** This is a personal project. It works well for
  me. It has not been security-audited, load-tested, or reviewed by a clinician.

---

## 20. Attribution

**AbhinavOS is a framework created by Abhinav Jain.**

Your version is yours — name, branding, data, goals, features. The one thing
asked in return is that the framework credit stays visible:

> Built on AbhinavOS · Powered by Abhinav Jain

It appears as a small caricature mark plus **"Powered by Abhinav Jain"** in the
footer, and again in the About/Credits panel. It's deliberately quiet, leads
with the author rather than the framework name so your app reads as yours, and
never carries a personal email address.

<img src="app/assets/framework-mark-128.png" width="72" alt="AbhinavOS framework mark">

**Honestly:** the source is public, so anyone capable can remove that line.
There's no obfuscation, no phone-home, no tamper check — those would be
user-hostile in a health app and trivially defeated anyway. Attribution here
rests on the licence's `Required Notice:` mechanism, this README, and good
faith. Please leave it in.

Full reasoning: [ATTRIBUTION.md](ATTRIBUTION.md).

---

## 21. Licence

**[PolyForm Noncommercial 1.0.0](LICENSE.md)** — this is **source-available**,
not OSI open source, and I'd rather use the accurate word.

**You may:** fork it, modify it, rebrand it, learn from it, run your own
personal version, use it in a charity, school, or public research or health
organisation.

**You may not:** use it commercially. No selling it, no selling a service built
on it, no using it inside a commercial product.

Why not MIT: MIT would let anyone take this, rebrand it, and sell it. That's a
legitimate choice for many projects and it isn't the one I wanted here.

The licence's **Notices** clause requires that anyone receiving a copy from you
also receives the licence terms and the `Required Notice:` line naming the
author. That's the legally meaningful part of the attribution.

Want to use it commercially? Open an issue — the answer isn't automatically no.

*Not legal advice. If a licensing question matters to you materially, ask a
lawyer.*

---

## Medical positioning

**This is not a medical device and not medical advice.**

- **Personal tracking** — what you logged. Yours, factual.
- **Deterministic calculations** — TDEE, adherence, scoring. Reproducible
  arithmetic on your own data. Estimates, not measurements.
- **AI assistance** — informational only. It can be wrong. It never diagnoses.
- **Medical decision-making** — belongs with a qualified clinician. Not here.

Lab reference ranges come from **your own lab report**, not from the app.
Anything flagged is a pattern worth discussing with a doctor, not a conclusion.

The example targets shipped in `config.example.js` are one person's protocol
choices. They are not appropriate for everyone and could be actively wrong for
you. If a number matters to your health, have a professional look at it.

If you fork this, keep this framing. It's a correctness property, not a
disclaimer.

---

## 22. Roadmap

**Next — configurability.** The honest gap. Trackers and feature modules are
config-driven in name but still fixed in code. The plan: a `Trackers` table so
every habit, counter and scale becomes an Airtable row rather than code; module
on/off toggles; a shareable Airtable base template with first-run auto-mapping
so nobody hand-copies 150 field IDs; and a coach prompt assembled from your own
rows instead of hand-written.

**Next — Apple Health sync.** Sleep stages, HRV, resting heart rate and steps
imported automatically; manual check-in becomes the fallback.

**Next — Longitudinal baselines** at 90, 180 and 365 days, so a bad night is
measured against your own history rather than a population average.

**Later — Correlation engine.** Sleep against training performance. Food against
symptoms. Recovery markers against the behaviour that preceded them. The actual
point of collecting structured data for a year.

**Later — A coach with memory.** Coaching grounded in months of history rather
than today's numbers — the difference between a chatbot and a system that knows
you.
