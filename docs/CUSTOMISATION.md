# Customisation

Everything you can change, and honestly, what you can't.

All of it happens in one file: `app/config.js` (copy it from
`app/config.example.js`). Nothing on this page requires editing `index.html`
unless it says so explicitly.

---

## Configurable — no code editing

### Identity

| Setting | What it does |
|---|---|
| `branding.appName` | The app's name, in the header, browser tab and About panel. Names ending in "OS" get the accent styling automatically: `RahulOS` renders as Rahul + coloured OS. |
| `branding.tagline` | One line, shown in About. |
| `branding.displayName` | Your first name, shown in About as "For: …". |
| `branding.storagePrefix` | Namespaces browser storage. Change it if you run two forks in the same browser so they don't fight over each other's saved token. |

### Your images

| Setting | Recommended |
|---|---|
| `branding.faceImage` | Square PNG with transparency, 192×192 or larger. Shown small in the header. |
| `branding.charImage` | Portrait PNG with transparency, ~600px tall. Shown on the boot screen and in restart mode. Falls back to the app icon. |

Put your files in `app/` or `app/assets/` and reference them relatively:

```js
branding: {
  faceImage: "assets/my-avatar.png",
  charImage: "assets/my-character.png",
}
```

A `data:` URI works too if you'd rather not add files. Note that inlining a
large image makes the HTML file considerably bigger.

**Replacing the app icon** (the square tile on your home screen) is the one
image change that isn't config: overwrite `app/icon-192.png` and
`app/icon-512.png` with your own, keeping the same filenames and dimensions.

### Colours

Thirteen tokens, each mapping to one CSS custom property:

```js
theme: {
  ground: "#0A0E14",     surface: "#111823",   surface2: "#1A2432",
  line: "#243040",       ink: "#E8F1F8",       ink2: "#A9BED0",
  muted: "#6E8296",      primary: "#4EA8DE",   secondary: "#3A86FF",
  success: "#7CD9A0",    attention: "#E2694A", neutral: "#5A6B7C",
  accent: "#B49BE0",     radius: "14px",
}
```

Omit any and the framework default applies. Set only `primary` and `ground` and
you already have a visibly different app.

A note on `neutral`: it's the "under floor" colour, deliberately dull rather
than red. This app treats under-eating as the failure mode, so falling short
shouldn't feel alarming. Worth keeping muted whatever palette you choose.

### Your body and your targets

```js
profile: { heightCm: 178, ageYears: 41, sex: "female", startingWeightKg: 63 },
targets: {
  kcalFloor: 1800, waterLitres: 2.5,
  proteinPerKg: 1.6, deficitMultiplier: 0.9, proteinFallbackG: 110,
}
```

**Read this before setting targets.** The values shipped in the example config
are one person's protocol choices. They are not medical advice and they are not
right for everyone. `kcalFloor` in particular is a floor the app will never
adapt below — set it wrong and the app will confidently steer you wrong. If a
number matters to your health, get a doctor or dietitian to look at it.

If you leave `profile` out entirely, the app doesn't invent a body for you. It
uses neutral reference figures and labels the estimate *"no profile set — not
personalised"* so you know the number isn't about you. After roughly 21 days of
logged intake and weight, measured energy balance replaces the estimate anyway.

### Your coach

```js
coachSystem: `You are a personal health coach embedded in a tracking app.

HARD RULES:
- I'm allergic to shellfish — never suggest it.
- Left shoulder injury: no overhead pressing. Use landmine press instead.
- Never diagnose. Route anything concerning to a GP.`,
```

This is the standing brief. Your live data is supplied separately on every
call, so don't put numbers here — put constraints. Leave it out and a generic
coach is used.

`dietHint` steers the meal parser toward a cuisine, e.g.
`" Assume Mediterranean home cooking."`

### Your data and habits

`multiSelects` (supplement and skincare chips), `boolChecks` (yes/no habits),
`labPriority` (which markers show, in what order), `labTargets` (your retest
goals), `seedWeights` (starting loads per exercise). All documented inline in
`config.example.js`.

### Airtable and AI

`baseId` and `schema` map the app to your base — see
[DATA-MODEL.md](DATA-MODEL.md). API keys are entered in the app's Settings
screen and stored in your browser; they never go in any file.

---

## Needs a code edit — be honest with yourself about these

**Fonts.** Setting `theme.fontBody` changes the CSS, but the framework only
loads four Google fonts in `index.html`'s `<head>`. A font that isn't loaded
falls back to a system font. To use a different one properly, also edit that
`<link>` tag. One line, but it is a code edit.

**Adding or removing whole feature modules.** The five tabs (Today, Food, Gym,
Body, Stats) and the cards inside them are built in code, not driven by
configuration. You can't yet switch off "overnight vitals" or add a "migraine
tracker" from config — that means editing render functions in `index.html`.
Making these into config-driven blocks is on the roadmap and is a real piece of
work, not a small one.

**Changing the scoring rules.** These aren't in `config.js` — they're rows in
your Airtable `Score Rules` table. That's better than config, because you can
edit them from your phone with no redeploy. But it does mean setting up that
table properly.

**Changing the app's structure or maths.** Adding a tab, changing how TDEE is
computed, altering the restart-mode logic — all code.

---

## After you change something

```bash
bash tools/secret-scan.sh
```

Run it before every commit. It checks for API keys, tokens, Airtable IDs,
embedded images, personal identifiers and biometric literals, and exits
non-zero if it finds any.

If you add a new personal value to the code rather than to config, add a
matching check to `tools/secret-scan.sh` in the same commit. That's how this
repository stays safe to be public.

---

## What you may not change

One thing: the framework attribution — the small framework mark and the words
*"Built on AbhinavOS · Powered by Abhinav Jain"* — in the footer and the About
panel. It refers to the framework, never to your app, so renaming your app
changes nothing about it. Everything else about the app's identity is yours.
See [ATTRIBUTION.md](../ATTRIBUTION.md) for the reasoning and the honest
limits of that request.

---

## The Setup Wizard (no file editing required)

Since v2 of the framework you do **not** need to edit `config.js` to
personalise the app. On first run — no saved token, no completed setup — the
app opens a seven-step wizard instead of an Airtable token box:

| Step | Collects |
|---|---|
| 1. Welcome | Nothing yet — sets expectations, offers "just show me the app first" (demo mode) |
| 2. Identity | Your name, what the app calls you, app name, tagline, and a profile photo (opens your device's normal photo picker; preview, change, and remove are all built in — no file paths or URLs shown) |
| 3. Look & Feel | A theme, picked from visual preset cards (Warm, Midnight, Soft, Calm, Energy, Minimal) with a small "Customize" option for two colour pickers — no hex codes required, applies immediately |
| 4. About you | Height, age, sex, weight, activity level |
| 5. Goals | Goal type, target weight, calorie floor, protein, water, training days, diet, foods to avoid, equipment, coaching tone |
| 6. Data Connection | Your Airtable base ID, explained plainly as the one technical step, then a pointer to token entry and auto-discovery |
| 7. Ready | A summary of what you picked before you open the app |

Only a name and an app name are required. Everything else — including the
photo and theme — has a sensible default and is editable later, from
Settings or by simply going through the wizard again.

The photo you pick is resized and compressed in your browser before it's
saved (well under the size a phone camera produces), and the theme you pick
is stored as a short identifier like `midnight`, not raw colour values — the
framework maps that identifier back to the same CSS custom properties a
hand-written `theme:` block in `config.js` uses, so both paths produce
identical results.

### Where the answers go

A browser can't write files, so the wizard saves to your browser's local
storage under your app's namespace. Configuration then resolves in this order:

```
Setup Wizard / Settings   (localStorage)   ← wins
config.js                 (optional, version-controlled)
framework defaults                          ← fallback
```

Both paths work. `config.js` is still there for anyone who wants their setup
in git.

### Changing answers later

**Stats tab → "Your profile & goals"** shows everything you entered.

- **Edit these answers** re-opens the wizard with your answers preloaded.
- **Copy my config.js** generates a complete `config.js` from your wizard
  answers and copies it to your clipboard. Useful for version control, and
  particularly useful for pasting to Claude when you want help with something
  the wizard doesn't cover.

### What the wizard feeds

Your answers don't just sit in a settings screen — they change behaviour:

- **Goal** sets the calorie multiplier (fat loss 0.85, maintain 1.0, muscle
  1.10) unless you override it explicitly.
- **Height/age/sex/weight** replace the cold-start biometric estimate. Leave
  them blank and the app says your target isn't personalised rather than
  guessing with someone else's body.
- **Foods to avoid, equipment, training days, tone, goal** are appended to the
  coach's system prompt, so coaching respects them.
- **Colours and avatar** apply immediately, before first paint.

---

## Demo mode

On step 1 of the wizard there's **"Just show me the app first"** — a read-only
tour with obviously fictional sample data, so you can see what you'd be
building before spending an hour on Airtable.

Two guarantees, enforced in code rather than by UI convention:

1. **Nothing is ever written.** Every Airtable call in this app passes through
   one gateway function (`at()`), and in demo mode that function throws on any
   non-GET request before a request is issued — the refusal is structural, not
   a hidden button. There is no automated test suite in this repository; the
   guarantee rests on there being exactly one gateway, which you can verify by
   reading it.
2. **Demo data never mixes with real data.** Demo mode uses a synthetic schema
   with fake table IDs that resolve to no real base, and it requires no token.

The intended journey is: **Demo → Setup Wizard → your configuration → connect
your Airtable → your app.**
