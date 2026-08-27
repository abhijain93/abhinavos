# Glossary for non-developers

Every term in this repository that assumes knowledge you might not have. One or
two sentences each, no prior knowledge needed.

If you're about to follow [CLAUDE-BUILD-YOUR-OWN.md](CLAUDE-BUILD-YOUR-OWN.md),
skim this first.

---

## The GitHub words

**GitHub** — a website where code lives. Think Google Drive, but built for code,
with a full history of every change anyone ever made.

**Repository (or "repo")** — one project's folder on GitHub. This whole thing —
the app, the docs, the licence — is one repository.

**Fork** — your own personal copy of somebody else's repository, on your own
GitHub account. You can change anything in your fork without affecting the
original. This is how you'd start your own version.

**Clone** — downloading a repository onto your own computer so you can work on
the files. A fork lives on GitHub; a clone lives on your laptop.

**Commit** — saving a batch of changes with a short note about what you did.
Like a save point in a game. The important thing to know: commits are permanent
and public in a public repository, so never commit a password or a key.

**Branch** — a parallel version of the project where you can try something
without disturbing the working version. The main one is usually called `main`.

**Push** — uploading your commits from your computer to GitHub.

**Pull request** — proposing that your changes get added to someone else's
project. You won't need this to build your own version.

**.gitignore** — a list of files Git should never upload. In this project it's
what keeps your `config.js` and your keys off GitHub.

---

## The technical words

**Frontend** — the part of an app you can see and click. In this project, the
frontend is essentially the whole app.

**Backend / server** — a computer somewhere else that an app talks to. **This
project deliberately has none.** Your browser talks directly to Airtable. That's
why it's free to run and why your data never passes through anyone else's
machine.

**API** — the way one piece of software talks to another. When this app saves a
meal to Airtable, it's using Airtable's API.

**API key (or token)** — a long password that proves an API request is really
you. Anyone who has your key can act as you, which is why keys never go in a
repository. Treat one like a bank card number.

**Database** — organised storage for information. This app uses Airtable as its
database.

**Airtable** — a service that looks like a spreadsheet but behaves like a
database, with an API. This app stores everything in your Airtable base.

**Base** — Airtable's word for one database. You'll create your own.

**Schema** — the structure of a database: what tables exist, what columns they
have, what type each column is. `docs/DATA-MODEL.md` documents this project's
schema.

**Environment variable** — a setting stored outside the code, usually for
secrets. This project doesn't use them (no server), so your settings live in
`config.js` and your keys live in your browser.

**Deployment** — putting your app somewhere on the internet so you can open it
on your phone. Netlify, Vercel and Cloudflare Pages all do this free.

**Localhost** — your app running on your own computer, visible only to you.
Where you test before deploying.

**PWA (Progressive Web App)** — a website that installs to your phone's home
screen and opens like a normal app, including offline. That's what this is —
which is why there's no App Store version.

**Service worker** — the small piece of code that makes a PWA work offline by
caching the app on your device.

**Cache** — a local copy kept so things load fast, or still load with no signal.

---

## The AI words

**AI model** — the specific system answering a question. Claude, Gemini and
GPT are different models made by different companies.

**LLM (Large Language Model)** — the technical name for that kind of AI. Good
at language, unreliable with arithmetic — which is precisely why this app lets
AI interpret your words but never calculate your score.

**Provider** — the company you get an AI model from. This app supports Gemini,
Groq and OpenRouter, and switches automatically if one is down.

**Prompt** — the instructions given to an AI. This app's coaching prompt lives
in `config.js` so you can write your own.

**Token (AI meaning)** — a chunk of text, roughly ¾ of a word. AI pricing and
limits are usually counted in tokens. Not the same thing as an API token.

**Structured output** — asking an AI to reply in a strict format (here, JSON)
so a program can read it, instead of a paragraph a human would read.

**Deterministic** — the opposite of AI-ish: same input, same output, every
single time. All the scoring and target maths in this app is deterministic on
purpose, so your numbers are comparable from one day to the next.

---

## The health-app words

**TDEE (Total Daily Energy Expenditure)** — roughly how many calories you burn
in a day. This app estimates yours from your own logged data rather than from a
formula, once it has about three weeks of history.

**Mifflin-St Jeor** — a standard formula that estimates calorie needs from
height, weight, age and sex. It's a population average and will be somewhat
wrong for any individual, which is why this app only uses it as a starting
point and then replaces it with measured data.

**EMA (Exponential Moving Average)** — a smoothed average that weights recent
values more heavily. Used here for weight, because daily bodyweight is noisy
and the trend is what matters.

**Macros** — protein, carbohydrates and fat.

**Adherence** — how consistently you hit a target, expressed here as a rolling
percentage rather than a streak, so one missed day doesn't reset you to zero.

**Progressive overload** — gradually increasing weight or reps over time. The
app shows your last session's numbers so this happens by default.

---

## Still stuck?

Paste the word into Claude along with the file you found it in, and ask what it
means in this context. That's a completely legitimate way to learn this, and
it's how the person who built this learned most of it.
