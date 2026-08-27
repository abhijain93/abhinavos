# What I learned building this

I lead an analytics team. I am not a developer and I have never held an
engineering job. This document is the honest version of how this got built,
including the parts that didn't work.

---

## AI did not remove the engineering

The headline version of this story is "non-coder ships an app with AI." That's
true and it's the least interesting thing about it.

Here is what actually had to exist:

```
Problem → Context → Data → Logic → APIs → AI → Interface → Product
```

Every one of those layers still had to be understood and decided on. Nobody
decided them for me. AI lowered the barrier to *learning* them — it answered
questions instantly, at whatever level of ignorance I asked from, without
judgement, at three in the morning. That is genuinely transformative.

It did not delete a single layer.

The gap between "AI can write code" and "I can ship a working system" is
entirely made of decisions: what to store, what to compute, where state lives,
what happens when the network dies, which failures are safe to retry. AI is
excellent at the code. The decisions were mine, and getting several of them
wrong is how I learned which ones mattered.

---

## I learned APIs by connecting Airtable

Not from a course. From auth failures.

A token with the wrong scopes returns a 403 with a message that doesn't tell you
which scope is missing. Learning that meant learning what a scope is, why bearer
auth exists, and why the error message in this app now names all three required
scopes explicitly — because the one I got didn't, and I lost an evening to it.

Then rate limits. Airtable allows 5 requests per second per base. My first
version of the write queue *dropped* anything that came back 429, and reported
success. A burst of queued writes would silently lose records while the UI said
everything synced. That taught me the difference between an error and a failure
you should retry, which turns out to be most of what a queue is.

Then the one I'm proudest of catching. Writes had a timeout implemented with
`Promise.race`. On a slow connection, a POST would time out, get classified as a
network failure, get queued, and get replayed — and the original request would
land anyway. Every slow meal log was being written twice.

The fix required understanding that **abandoning a promise does not abort the
underlying request**. Timeouts now surface as real errors rather than queueable
failures, and the request is genuinely aborted with an `AbortController`.

I would not have learned any of that from a tutorial, because a tutorial's
network never fails.

---

## I learned data modelling by designing the schema

Thirteen linked tables that still hold up months later. This is the part I got
most right, and — worth noting — the part AI helped with least.

Because the question isn't "what fields do I need." It's "what will I want to
ask of this data in a year, and will the shape I'm choosing today let me?" That
depends on knowing your own intentions, and no model has access to those.

The decisions that turned out to matter:

**One wide row per day, with food and lifts in their own tables.** Almost every
question I ask is "what did this day look like," and a wide daily row answers it
in one request.

**Store computed values rather than recomputing them.** I want to know what my
calorie target *was* on the 14th, not what it would be if recalculated with
today's data. A target you can't reconstruct is a target you can't learn from.

**Keep the raw input.** Every food row stores the original sentence. That single
field is what made the auto-learning layer possible later, and it's the only way
to audit an estimate months after the fact.

**What I'd change:** `Food Log` infers sugar and legume content from item names
instead of storing them as fields. It works until you log something the pattern
doesn't match, and then it fails silently. Silent failure is the worst property
a data pipeline can have.

---

## I learned where AI belongs by putting it in the wrong place first

The first version asked a language model to score my day.

It gave different answers to identical data. Not wildly different — just
different enough that the number stopped being comparable to yesterday's, which
means it stopped being a number at all.

That single mistake produced the principle the entire app is now organised
around: **AI interprets, deterministic code decides.** Language and estimation
go to the model. Anything that will be compared to another number is computed.

I don't think I could have reasoned my way to that. I had to watch a
non-deterministic score make a chart that looked fine and wasn't.

---

## The architecture I abandoned

The first build used **Lovable** for the frontend and **Supabase** for the
database. It was dropped.

Supabase was the right database and the wrong choice for this project. Postgres,
proper auth, real queries — all genuinely better than Airtable on every axis
except the ones that mattered here. What it also meant: a build pipeline, an
auth system, a hosting account and a deployment story, for a single-user app
whose entire dataset would fit in a spreadsheet.

The thing that actually decided it: **Airtable gave me an admin UI on my phone,
and it let configuration live as data.** The scoring rules are a table I can
edit from a train. That is a different product than one where every rule change
is a code change and a redeploy.

The lesson isn't "Airtable good, Supabase bad." It's that I chose the more
impressive stack before I understood what the app needed, and swapping it later
cost a rebuild. Choosing tools by their capability ceiling rather than by the
job is a mistake that looks like ambition.

Dropping work you've done is a skill. It took an uncomfortably long time to
admit the first architecture wasn't right.

---

## The three-day build was the last mile

The current version was assembled in three days. The bit that gets attention.

Four months of tracking my own health came before those three days. Four months
of finding out what I actually looked at daily versus what I thought I would,
which numbers changed behaviour and which were decoration, what made me stop
logging.

Restart mode exists because I watched myself abandon tracking after every trip
and never come back. The floor-not-cap ring exists because I watched myself
under-eat while a depleting-budget display told me I was doing well. Neither is
a feature I would have specified on day one. Both came out of being my own user
for months.

**The speed at the end was bought entirely by the slowness at the start.** A
person who tried to build this in three days without those four months would
build something that looks identical and gets abandoned in a fortnight.

---

## What I'd tell someone starting this

**Build for yourself first.** Every good decision in this app came from being
the user. You cannot get that from research when the user is you.

**Get the data structure right before the interface.** The interface is cheap to
change. The schema is not, and everything downstream depends on it.

**Put the AI in last.** Build the deterministic system, then add the model
where genuinely ambiguous language needs interpreting. Starting with AI at the
centre gets you a chat wrapper with a database bolted on.

**Design for the day you fail.** The offline queue, the provider fallback and
restart mode are the three things that make this usable rather than a demo. All
three are about what happens when something breaks.

**Don't let AI's fluency convince you that you understand something.** I could
have shipped every one of those bugs with code that read beautifully. Reading
code you didn't write and being able to explain why it's correct are different
skills, and the second one is the one that matters.
