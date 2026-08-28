# Data model

Thirteen tables are defined in the schema/configuration. The starter template
contains the 11 tables currently used by the application. This document
describes what each holds and which fields the app reads. It is enough to
rebuild the base from scratch.

**Faster than building from scratch: copy the starter template.** A public,
read-only Airtable base — [AbhinavOS Health
Template](https://airtable.com/apprHhK8MYc51ERpa/shr52rwUsM4sXMZgO) — has the
tables, fields, select options and the 14 `Score Rules` rows already set up,
matching this document and the app's code exactly. Open the link, use
Airtable's **Copy base** to get your own editable copy, then skip straight to
getting your IDs (below). The template covers 11 of the 13 tables — see
**Why the template has 11 tables, not 13** below for the two it leaves out and
why that's safe to start without.

**Field IDs, not field names.** The app addresses Airtable by field ID. Renaming
a column in the Airtable UI never breaks anything. The cost is that every ID has
to be declared once, in `app/config.js` — see
[`app/config.example.js`](../app/config.example.js) for the shape and the full
key list.

**Five field names read by name, not by ID, across three lookup contexts.** A
handful of lookups use Airtable's `filterByFormula`, which has to reference a
column by name. These five field names are the only ones in the whole app you
cannot freely rename in Airtable:

| Lookup context | Table | Field(s) | Why |
|---|---|---|---|
| Finding "today's" row | `Daily Log` | `Date`, `Date key` (falls back to `Date` if `Date key` isn't configured) | Two possible field names, one lookup |
| Filtering a day's food entries | `Food Log` | `Date` | One field name, one lookup |
| Finding/updating this week's rollup row per group | `Muscle Volume Weekly` | `Week`, `Muscle Group` | Two field names together identify one row, one lookup |

If you rename any of these five column names in Airtable, the corresponding
lookup silently returns nothing rather than erroring — the same "config as
data, and configuration mistakes fail quietly" trade-off described for `Score
Rules` below.

**Everything except `Daily Log.date` is optional.** Leave a key out of your
config and the card that depends on it hides itself. There is no crash path for
a missing field.

To read your own IDs, create a personal access token with `schema.bases:read`
and call:

```
https://api.airtable.com/v0/meta/bases/{baseId}/tables
```

---

## Core logging

### `Daily Log` — one row per day

The centre of the model. Everything else links to or aggregates into it.

| Group | Fields | Type |
|---|---|---|
| Identity | `date`, `datekey` | date, formula/text |
| Body | `weight`, `official`, `emaWeight`, `tdee` | number, checkbox, number, number |
| Sleep | `sleep`, `deep`, `rem`, `awake`, `onset`, `grog` | number (hours / minutes) |
| Overnight vitals | `spo2`, `spo2Dips`, `hrv`, `restingHR` | number |
| Therapy device | `therapyUsed`, `therapyHours`, `deviceIndex` | checkbox, number, number |
| Activity | `steps`, `gymDone` | number, checkbox |
| Intake | `water`, `kcal`, `p`, `c`, `f`, `na`, `grain` | number |
| Routine | `suppAM`, `suppPM`, `skinAM`, `skinPM` | multiple select |
| Habits | `eveningCutoff`, `habitCount`, `nasal`, `left`, `alcohol` | checkbox / number |
| Subjective | `bloat`, `energy`, `stress` | single select |
| Digestive | `stoolForm`, `bmCount` | single select, number |
| Meta | `mode`, `notes`, `photos`, `foodLink`, `gate` | select, text, attachment, link, formula |

`mode` drives the operating mode (Optimal / Normal / Recovery / Survival) that
the coach and the scoring engine both read.

`emaWeight` and `tdee` are written by the app, not entered — they are the
outputs of the adaptive-target engine described in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

### `Food Log` — one row per item eaten

`date`, `meal`, `item`, `qty`, `raw`, `day` (link to Daily Log),
`kcal`, `p`, `c`, `f`, `fib`, `na`, `ca`, `grain`, `tol`, `note`, `notes`.

`raw` preserves the original sentence you typed. That turns out to matter: it's
what makes the auto-learning layer possible, and it's the only way to audit a
macro estimate months later.

`tol` is a tolerance flag — `Safe` / `Caution` / `Trigger` — used by the
trigger-hypothesis view and by the coach's gate.

There is no dedicated sugar or legume field. Sugar is folded into the note text;
legume detection is done by item name.

### `Food Library` — verified foods (defined, not currently used)

A table for confirmed items with known per-unit macro values — intended as a
manually maintained cache that a future version of the app could check before
an AI call, to keep repeat meals consistent and reduce model calls. The current
application code has no call site for this table: every meal description goes
to the AI provider (or the local-parser fallback) regardless of what's in this
table. It's included in the schema for anyone who wants to maintain the data by
hand, or to build that lookup themselves.

---

## Training

### `Gym Sessions` — one row per session
`date`, `split`, `dur`, `core`, `cardio`, `rpe`, `notes`.

### `Lift Log` — one row per exercise per day
`date`, `ex`, `w`, `sets`, `reps`, `side`, `notes`.

`w` is the best set, `sets` is the count, `reps` is the average. One row per
exercise per day rather than per set — a deliberate simplification that keeps the
table small enough to load a month of history in a single request, which is what
makes the coach's progression pack free.

### `Exercise Library`
`name`, `group`, `type`, `repMin`, `repMax`, `cur`, `uni`, `notes`.

`repMin`/`repMax` encode the rep-range rule per lift (compounds 8–12, isolation
12–15 by default). `cur` is the current working weight. `uni` marks unilateral
exercises.

### `Muscle Volume` — weekly rollup
`week`, `group`, `sets`, `sessions`. Written by the app from lift history.

---

## Health records

### `Lab Panels`
`date`, `lab`, `fasting`, `context`. One row per blood draw.

### `Lab Results`
`marker`, `date`, `value`, `unit`, `refLow`, `refHigh`, `status`, `category`,
`notes`. One row per marker per panel.

Reference ranges come from **your lab report**, not from the app. The app never
supplies a normal range and never assigns a diagnosis — it displays the value,
the range your lab gave, and the direction of travel since last time.

### `Medical Actions`
`action`, `priority`, `category`, `opened`, `status`, `done`, `notes`. Open
follow-ups — a retest that's due, an appointment to book. This feeds "today's
one action".

### `Supplements`
`name`, `dose`, `timing`, `status`, `purpose`, `units`, `dailyDose`,
`threshold`, `daysLeft`, `flag`, `link`, `restocked`, `recheckDue`, `notes`.

`daysLeft` against `threshold` produces reorder flags. `recheckDue` produces a
Medical Actions row when a level needs retesting.

---

## The behaviour engine

### `Score Rules` — config as data

`behaviour`, `points`, `direction`, `category`, `active`, `conf`, `suspend`,
`notes`.

**This is the most important table in the base and it contains no data about
you.** It is the app's configuration, stored as rows. Every point the scoring
engine awards or deducts traces to one row here. Editing the table changes the
app's behaviour with no code change and no redeploy.

`direction` is positive or negative. `suspend` marks rules that pause during
restart mode. `active` lets you retire a rule without losing its history.

**The `behaviour` text is a contract with the code, not a label.** The scoring
engine looks up each rule by matching `behaviour` against a fixed string the
code expects (case-insensitive, but otherwise exact). If a row's `behaviour`
text doesn't match one of those expected strings precisely, that rule is
silently never applied — no error, no missing-data warning, the points just
never get added. The starter template's 14 rows use the exact strings the code
expects, including `Tracked habit (per unit)` for the generic per-unit habit
rule (an app you build from scratch might instead label this row for a specific
habit, e.g. `Cigarette (per unit)` — that's fine for your own use, but it means
your habit tracker's per-unit entries won't score unless you either use the
code's expected text or add a matching lookup in code). If you add a new
`Score Rules` row for a behaviour the code doesn't already know about, it will
sit in the table quietly doing nothing until code is added to look it up.

### `Daily Score` — one computed row per day

`date`, `earned`, `lostRaw`, `logged`, `gap`, `restart`, `restartGoal`,
`freshStart`, `weeklyMax`, `notes`.

`lostRaw` is stored before the daily loss cap is applied, so the cap stays
visible and auditable rather than silently swallowing information.

---

## Notes on the design

**Why one row per day rather than an event log?** Because almost every question
I want to ask is "what did this day look like", and a wide daily row answers it
in one request. Food and lifts are the two things that genuinely happen many
times a day, so those get their own tables and link back.

**Why store computed values (`emaWeight`, `tdee`, `daysLeft`) rather than
recomputing?** Partly speed, mostly history — I want to know what the target
*was* on a given day, not what it would be if recalculated with today's data.
A target you can't reconstruct is a target you can't learn from.

**What I would change.** `Food Log` should have had explicit `sugar` and
`legume` fields from the start rather than inferring both. Inference from item
names works until you log something the pattern doesn't match, and then it fails
silently — which is the worst way for a data pipeline to fail.

---

## Why the template has 11 tables, not 13

`app/config.example.js` still declares keys for all thirteen tables (`fl` for
`Food Library`, `dscore` for `Daily Score`). Both are defined in the
schema/configuration, but neither is currently read or written anywhere in the
application code — there is no call site for either table in `app/index.html`.
The starter template linked above omits exactly those two:

- **`Food Library`** is described elsewhere in this document as a cache of
  verified foods, but the current code never queries it and never checks it
  before an AI or local-parser meal-parsing call. Configuring `fl` today has no
  effect on app behaviour.
- **`Daily Score`** is described elsewhere in this document as a computed
  output table, but the current code never writes to it and never reads from
  it. Configuring `dscore` today has no effect on app behaviour.

Both are safe to leave unconfigured — omitting them from your base changes
nothing about how the app runs today. The template leaves them out only to keep
the first base you build
smaller and faster to set up.
