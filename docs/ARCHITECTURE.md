# Architecture

## The constraint that produced everything else

Two rules were set before any code was written:

1. **It must cost nothing to run.** No paid hosting, no paid database, no
   subscription beyond AI free tiers.
2. **It must work with no signal.** The gym is where connectivity is worst and
   where logging matters most. An app that won't even open is how a habit dies.

Almost every decision below is downstream of one of those two.

---

## Layer 1 — Frontend

A single `index.html`, roughly 4,000 lines: markup, styles and application code
in one file. Vanilla JavaScript, no framework, no build step, no `node_modules`.

**Why a single file?** Deployment is copying one folder. There is no build to
break, no dependency to go stale, no version of a toolchain to reproduce in
eighteen months. The cost is that the file is large and navigating it depends on
disciplined section comments. That trade was worth it for a project maintained
by one person who is not a full-time engineer.

**Rendering** is a full re-render: state changes, `R()` rebuilds the view. Naive,
and it caused a real bug — the live clock in the header was triggering a full
re-render every fifteen seconds and wiping out whatever you were typing. The fix
was to have the clock write directly to its own DOM node and never touch the
render path. That pattern (surgical updates for anything that ticks, full
re-render for everything else) is used throughout.

**PWA.** `manifest.json` provides the installable identity. `sw.js` decides what
survives a dead connection:

- **Navigations** — network-first, cache fallback. A fresh deploy is picked up
  immediately when online, and a dead connection still opens the app.
- **Fonts and static assets** — cache-first. They don't change within a version.
- **Airtable traffic** — never cached, never intercepted. Stale health data is
  worse than no health data, and the app has its own cache and write queue for
  exactly this.

Cache names are version-prefixed, and activation deletes every cache that
doesn't match the current version. That is what makes a deploy actually take.

---

## Layer 2 — Deterministic rules engine

This is the part that makes the app an app rather than a chat wrapper. It runs
entirely in the browser, in plain JavaScript, and it computes:

**Adaptive macro targets.** The calorie target is derived from *measured* TDEE,
not a formula. The app maintains an exponential moving average of weight
(α = 0.1, roughly a 19-day window), compares the trend against logged intake at
7,700 kcal per kilogram, and recalculates. Below a 21-day rolling window it
falls back to a cold-start prior rather than trusting a noisy estimate. Protein
scales from the weight trend at 2.0 g/kg.

The important property: targets move as data accumulates. A number you set on
day one is a guess. A number derived from three weeks of your own data is a
measurement.

**Scoring.** Every point traces to a row in an Airtable rules table — behaviour,
point value, direction, category, active flag. Change the table, change the
app's behaviour, no redeploy. Losses are capped daily. The weekly reward
threshold is 70% of the week, never a daily target, because a daily target
punishes normal variance.

**Rolling adherence.** 7-, 14- and 28-day percentages rather than streaks. A
missed day nudges a number. Nothing resets to zero. This is a deliberate
behavioural choice, not a display preference — see
[`DESIGN-PRINCIPLES.md`](DESIGN-PRINCIPLES.md).

**Restart mode.** Three consecutive missed days triggers it. Macros hidden,
score hidden, penalties suspended, one trivial goal. Two completions exit it.

**Muscle volume.** Weekly sets per muscle group, aggregated from lift history
and flagged against a target range.

None of this calls a model. All of it is reproducible: same data in, same
numbers out, every time.

---

## Layer 3 — Data

Airtable, 13 linked tables. Full schema in [`DATA-MODEL.md`](DATA-MODEL.md).

**Why Airtable rather than a real database?** For free, it gives you a REST API,
relational links, typed fields, a schema editor, and — critically — an admin UI
that works on a phone. The alternative considered and dropped was
Supabase + Lovable, which meant Postgres and a proper backend, but also a build
pipeline, an auth system and a hosting bill for a single-user app. Airtable
loses on scale and on query power. For one person's health log, neither matters.

The second reason is subtler and turned out to be more valuable: **the rules
table means config lives as data.** The scoring behaviour of the app is a table
I can edit from my phone. That is a genuinely different product than one where
every rule change is a code change.

**Access pattern.** All calls go through one wrapper that adds bearer auth, a
timeout, an abort controller, and error classification. Field addressing is by
field ID rather than name, so renaming a column in Airtable never breaks
anything.

**The offline write queue** is the piece I'd point at if asked what's actually
engineered here. Failure classification matters more than retry logic:

- **Network failure** → queue it, retry on reconnect.
- **Rate limit (429) or server error (5xx)** → queue it. Airtable rate-limits at
  5 requests/second/base, and an earlier version *dropped* anything that came
  back 429 — a queued burst silently lost writes while reporting success.
- **Application error** (bad field, rejected token) → throw. Replaying it
  forever would wedge the queue.
- **Timeout** → throw, *not* queue. This one cost me a real bug. `Promise.race`
  abandons the promise but the underlying request may still have succeeded
  server-side, so treating a timeout as "failed, queue it" duplicated every slow
  POST. A meal logged on 3G got written twice.

That last one is the most useful thing in this document. "Retry on failure" is
obvious. Knowing which failures are safe to retry is the actual problem.

---

## Layer 4 — AI

Three providers behind one interface, with automatic failover: Gemini, Groq and
OpenRouter. Each exposes the same two operations — parse a meal into JSON, and
answer a coaching question — and each maintains its own model fallback list,
because free-tier model names change without warning.

Provider order is user-configurable. Per-provider call counts are tracked
locally against plan caps.

The reasoning about *what* the AI is allowed to do is in
[`AI-LAYER.md`](AI-LAYER.md), and it matters more than the failover mechanics.

---

## Failure modes, and what happens

| Failure | Behaviour |
|---|---|
| No network | App opens from cache. Logging works. Writes queue. |
| Airtable down / rate-limited | Writes queue and retry with backoff. |
| One AI provider down | Chain moves to the next provider. |
| All AI providers down | Meal parsing falls back to a local parser that runs entirely in the page. Coaching is unavailable; nothing else is affected. |
| Bad Airtable token | Explicit message naming the three scopes required. |
| Missing field in the base | The card that needs it hides itself. No crash. |

The pattern throughout: **degrade, never fail.** Every feature has a defined
behaviour when its dependency is gone, and that behaviour is never a blank
screen.
