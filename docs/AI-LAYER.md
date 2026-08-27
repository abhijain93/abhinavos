# The AI layer

## The principle

> **AI interprets. Deterministic code decides.**

Language and estimation go to the model. Scoring, targets, thresholds and
percentages are computed in JavaScript. A language model never guesses a number
that matters in this app.

This wasn't a principle I started with. It's one I arrived at by getting it
wrong first — see [`LESSONS.md`](LESSONS.md).

---

## What the model is allowed to do

### 1. Turn a sentence into structured data

Input: `"2 rotis, dal, half bowl sabzi, one whey scoop"`

Output: a JSON array, one object per food item, with calories, protein, carbs,
fat, fibre, sugar, sodium, calcium, a grain flag, a legume flag, a tolerance
flag, and an `est` boolean marking whether the values were estimated or came
from a verified source.

Three things happen before the model is called at all:

**The verified library is checked first.** Foods you've confirmed before are
matched locally with their known values. The model is only asked about what's
left.

**Auto-learned meals are fed back in.** Dishes you've logged before are included
in the prompt so repeat meals stay consistent week to week — otherwise the same
dal comes back at 150 kcal one week and 190 the next, and every trend built on
top of it is noise.

**Portion conventions are pinned in the prompt.** One katori = 150 g, one roti =
40 g raw, half bowl = 75 g. Without this the model silently picks its own
portion sizes and the numbers stop being comparable across days.

The prompt also instructs strict linear scaling with quantity — "2 roti" must be
exactly twice "1 roti" — because models will otherwise round different
quantities of the same food to the same figure.

### 2. Coaching

Two paths.

**Proactive.** After you log something, a *deterministic gate* checks the rules
engine: is anything actually tripped? A tolerance flag, a rule breach, a protein
shortfall? Only if code has already decided there is something worth saying is
the model called — and then only to phrase it.

The model is never asked "is anything wrong here?" That question has no
reproducible answer. Code asks the question; the model writes the sentence.

**On demand.** An ask-anything coach that already has today's numbers, the
week's trend, your rules, recent lift history and what you just ate. There is no
context to paste. It answers from real data — referencing the meal logged an
hour ago and the target still open — rather than giving generic advice.

The lift-history pack is worth calling out. An earlier version told the coach
only "Gym today: not started", so when asked to program a session it had no
choice but to invent loads or ask. Now it receives per-exercise progression
lines built from data already in memory — last three top sets per lift, newest
first, with the delta — and the system prompt requires an exact working weight
for every exercise, taken from that history. "Your usual weight" is explicitly
forbidden.

---

## What the model is not allowed to do

**Score anything.** Every point comes from a row in an Airtable rules table.

**Set a target.** Calorie and protein targets are computed from measured TDEE
and the weight trend.

**Write to the database.** Every AI-generated record lands in an editable form.
Totals recalculate live as you edit. Nothing is persisted until you tap confirm.
This is the design rule I would defend in any review: **the human is the commit
step.**

**Parse numbers from voice.** `"bench press 15kg 3x10 and 20 min cardio"` is
handled by a regular expression, not a model. It's instant, it can't fail, it
can't hallucinate a rep count, and it works offline. Sending numbers to a model
when a parser will do is how you introduce errors you can't reproduce.

---

## Provider chain

Three browser-callable providers behind one interface: Gemini, Groq and
OpenRouter.

Each implements the same two operations and maintains its own model fallback
list, because free-tier model identifiers change without notice and a hard-coded
model name is a time bomb. Provider order is user-configurable; call counts are
tracked locally against plan caps.

**A note on Anthropic.** There is also a code path targeting
`api.anthropic.com` directly. It is deliberately *not* in the selectable
provider list, because that endpoint does not accept browser requests from an
ordinary web origin — it only worked inside the Claude artifact sandbox where
the earliest prototype of this app was built. On any real host it fails
identically every time.

**It is disabled before it can run.** The flag that gates both entry points
(`ANTHROPIC_DOWN`) is initialised to `true`, so meal parsing and coaching throw
and fall through to the providers above *before* any `fetch` is issued. A
deployed instance never contacts `api.anthropic.com` at all — not once, not on
first use. Those calls also carry no API key, so they could not have succeeded
anywhere outside the original sandbox. The code is left in place because it
documents where the project started; it is not a live provider and must not be
re-enabled.

If every provider fails, meal parsing falls back to a **local parser that runs
entirely in the page** — a food database plus a quantity/unit grammar
(numbers, `half`, `katori`, `bowl`, `plate`, `scoop`), with gravy and
preparation modifiers applied on top. No network call, so it cannot fail or
hang, and it returns instantly. The values are standard-portion estimates,
marked as such, and editable before saving.

That fallback is why the AI layer can be treated as an enhancement rather than a
dependency.

---

## Structured output

Every model call that needs data back asks for JSON only — no prose, no code
fences — and the response is defensively parsed: fences stripped, array
extracted, every field coerced to the expected type with a sane default. A
malformed response degrades to "some fields are blank, edit them", never to a
crash.

The JSON shape is specified exactly in the prompt, field by field. Describing
the schema in prose and hoping is the single most common way structured-output
calls fail.

---

## Cost

Zero, in practice. Gemini, Groq and OpenRouter all have free tiers adequate for
one person's daily logging, and the verified-library-first design means most
meals never reach a model at all. The provider chain exists partly for
reliability and partly so that hitting one free-tier cap doesn't stop the day.
