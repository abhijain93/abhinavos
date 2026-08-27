# Build your own version, with Claude

This repository was built by someone who isn't a developer, using AI as a
collaborator. You can do the same thing to make your own version of it.

Below is a prompt you can copy and paste. It tells Claude what this project is,
what to ask you, and — importantly — what *not* to do.

**Good news first:** basic personalisation no longer needs Claude or file
editing at all. Run the app and a **Setup Wizard** asks for your name, app name,
logo, colours, body and goals, then saves them. There's a read-only demo on the
first screen if you want to see the app before committing to anything.

Use the prompt below when you want to go further than the wizard — a new
feature, a different data model, help building your Airtable base.

**What this actually takes.** It is not one click. Budget an hour or two, most
of which is building your Airtable base. You'll need a
GitHub account, an Airtable account, and at least one AI provider key. All have
free tiers. If a word in that sentence was unfamiliar, read
[GLOSSARY.md](GLOSSARY.md) first — it explains every term in a sentence or two.

---

## The prompt

Copy everything between the lines and paste it into Claude, with this
repository open or uploaded.

---

```
You are helping me create my own personal version of AbhinavOS.

AbhinavOS is a personal health operating system: a single-file installable web
app (PWA) that uses Airtable as its database and AI for meal parsing and
coaching. It was built as a framework so other people can make their own
version with their own identity, data and goals.

I am NOT an experienced developer. Explain things in plain English. When you
use a technical term, define it once in a sentence.

WORK IN THIS ORDER. Do not skip ahead.

STEP 1 — UNDERSTAND BEFORE CHANGING
Read these files first and tell me, in plain English, what this app does and
how it's put together:
  - README.md
  - docs/ARCHITECTURE.md
  - docs/DATA-MODEL.md
  - docs/AI-LAYER.md
  - app/config.example.js
Then summarise: what are the main parts, what talks to what, and what is
configuration versus what is core logic. Do not change any code yet.

STEP 2 — TELL ME WHAT I CAN CUSTOMISE
List what I can change purely through configuration (no code editing), and
separately, what would need a real code change. Be honest about the second
list — don't tell me something is easy if it isn't.

STEP 3 — ASK ME FOR MY DETAILS
Ask me, a few questions at a time rather than all at once:
  - my name, and what I want to call my app
  - a one-line tagline
  - my colour preferences, or a vibe to pick colours from
  - whether I have a logo or avatar image, and where it is
  - my height, age, sex and current weight — and explain exactly what these
    are used for and for how long, before you ask
  - my calorie floor, protein target, water target — and tell me plainly that
    the numbers shipped in this repo are one person's choices, not medical
    advice, and that I should sanity-check them with a doctor
  - whether I have an Airtable account yet
  - which AI provider I want to use (Gemini, Groq or OpenRouter)
If I don't know an answer, say what happens if I leave it blank.

STEP 4 — BUILD MY CONFIG
First ask whether I have already run the app's Setup Wizard.
  - If YES: tell me to open Stats -> "Your profile & goals" -> "Copy my
    config.js", and paste the result to you. Work from that. Do not make me
    re-answer questions the wizard already asked.
  - If NO: create app/config.js by copying app/config.example.js and filling
    in my answers, or suggest I run the wizard first since it's faster.
Show me the file and explain each section. Leave anything I didn't answer
commented out so the framework default applies.

STEP 5 — AIRTABLE
Walk me through creating my own Airtable base using docs/DATA-MODEL.md as the
spec. Then show me how to find my base ID and my table and field IDs, and put
them into config.js. This is the longest step. Go one table at a time and
check in with me.

STEP 6 — API KEYS
Explain where my API keys go — in the app's Settings screen, NOT in any file
in the repository. Confirm with me that I understand this before continuing.

STEP 7 — RUN IT
Help me run the app locally and fix whatever breaks. When something errors,
explain what the error means in non-technical language before proposing a fix.

STEP 8 — CHECK
Run: bash tools/secret-scan.sh
Tell me what it found. Confirm no keys, tokens or personal data would be
committed if I pushed this.

RULES FOR YOU THROUGHOUT:

- Make changes incrementally. One thing at a time, and show me each change.
- Ask before any change that affects more than one file or alters how the app
  works. Configuration edits don't need approval; architecture changes do.
- NEVER put an API key, token, or credential into any file in the repository.
  Keys belong in the app's Settings screen, stored in my browser.
- NEVER commit app/config.js. It's already in .gitignore — leave it there.
- Do not remove the framework attribution ("Built on AbhinavOS · Powered by
  Abhinav Jain") from the footer or the About panel. Everything else about the
  app's identity is mine to change.
- Do not make medical claims. This is a tracking tool, not a diagnostic one.
  If I ask you to set a target that seems unsafe, say so.
- If I ask for something that would break the app, tell me instead of doing it.
- If you're unsure what I meant, ask rather than guessing.
```

---

## After the prompt

Once Claude has walked you through those steps, you'll have your own working
version. A few things worth doing next:

**Change one thing at a time.** The fastest way to get stuck is to change five
things and then not know which one broke it.

**Keep your `config.js` backed up somewhere private.** It isn't in the
repository (deliberately), so if you lose it, you'll be re-reading field IDs
out of Airtable again.

**Read `docs/CUSTOMISATION.md`** for the full list of what's configurable and
what isn't.

**When something breaks, paste the actual error into Claude.** "It doesn't
work" is much harder to help with than the red text in the browser console.

---

## An honest note on what AI can and can't do here

Claude can read this whole repository, explain it, write your config, and debug
most of what goes wrong. That's genuinely a lot.

What it can't do is make the decisions for you: what you want to track, what
targets make sense for your body, whether a number a doctor should see is
right. It also can't see your screen, click things in Airtable, or test your
running app. You're still the one holding the steering wheel — AI just made the
manual readable.

That's the same thing that made this project possible in the first place.
