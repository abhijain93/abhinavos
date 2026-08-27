# Design principles

Five rules the app is organised around, and the reasoning behind each. These are
the parts I would defend in a design review.

---

## 1. AI interprets. Deterministic code decides.

Language and estimation go to the model. Scoring, targets, thresholds and
percentages are computed in code.

**Why.** The first version of this app asked a model to score my day. It gave
different answers to identical inputs. Not wildly different — just different
enough that the number stopped meaning anything, and any trend built on top of
it was noise dressed as signal.

A health tracker's core promise is that today's number is comparable to last
Tuesday's. Non-determinism breaks that promise silently. You don't get an error;
you get a chart that looks fine and isn't.

**Where the line sits.** The model handles ambiguity — what does "half bowl
sabzi" contain, how do I phrase this observation. Code handles anything that
will be compared to another number.

---

## 2. Nothing writes without confirmation.

Every AI-generated record passes through an editable form. Totals recalculate
live as you edit. Nothing reaches the database until you tap confirm.

**Why.** Two reasons, and the second matters more.

The obvious one: models get portions wrong, and an unreviewed wrong value is
permanent and poisons every aggregate downstream.

The real one: **the confirmation step is where the data becomes yours.** Reading
the estimate and correcting it is what makes you notice that the sabzi is 110
kcal and not 40. Auto-committing would be faster and would also remove the only
moment in the loop where you actually learn anything.

**The human is the commit step.** If I had to keep one line from this project,
it would be that one.

---

## 3. Degrade, never fail.

Three AI providers with automatic failover. A local parser when all three are
gone. An offline write queue that retries. A service worker that opens the app
with no signal. A card that hides itself when its Airtable field is missing.

**Why.** The gym has no signal, and the gym is exactly where logging matters.
An app that shows a blank screen once teaches you not to open it, and a health
tracker you don't open is worth nothing regardless of how good its analytics
are.

Every feature has a defined behaviour when its dependency disappears. That
behaviour is never a crash and never a blank screen.

**The interesting part is failure classification, not retry logic.** Knowing
*which* failures are safe to replay is the actual engineering. A timeout is not
a failure — the request may have succeeded server-side — and treating it as one
duplicated every slow write. See [`ARCHITECTURE.md`](ARCHITECTURE.md).

---

## 4. Design for the relapse, not the streak.

Rolling percentages instead of streaks. A daily cap on point losses. A weekly
reward threshold at 70%, never a daily target. And a restart mode that triggers
after three days away: macros hidden, score hidden, penalties suspended, one
deliberately trivial goal.

**Why.** Most trackers are designed for a person who never misses a day. That
person does not exist. The failure mode is not the missed day — it's the
*fourth* day, when the streak counter reads zero and opening the app means
confronting everything you didn't do.

So the app is built around that moment specifically. Nothing resets to zero. A
missed day nudges a number. After a gap, the app doesn't show you what you
missed; it offers a clean line to start from — the next Monday or the first of
the month — and one goal small enough to be embarrassing.

The job on day four is not catching up. It is opening the app at all. Everything
in restart mode is subordinate to that.

**A daily target punishes normal variance.** A weekly threshold doesn't. That is
the whole argument for scoring on a 70%-of-week basis, and it's why a bad day
cannot sink a good week.

---

## 5. Rings fill toward a floor, not up to a cap.

Most trackers show you a calorie budget depleting. This one shows a floor you're
filling toward, with a message like *"140 kcal under the floor — add food, not
less."*

Overeating is never scored against you. Points come from **logging honestly**.
Hiding a meal is what costs you.

**Why.** Under-eating was the real failure mode for the problem this was built
to solve, and a depleting-budget display actively encourages it. But the
generalisable principle is bigger than that:

> A tracker that punishes honest logging will get dishonest data, and every
> analysis built on top of it will be fiction.

If the incentive structure makes you not want to record something, the incentive
structure is broken — no matter how well-intentioned. So the scoring is
deliberately arranged so that the only thing that costs you points is failing to
record what happened. A big meal costs nothing. Hiding it costs points.

That decision is the reason four months of this data are worth analysing at all.

---

## A note on what these have in common

None of them are about AI. They're about incentives, failure modes, and where
determinism belongs. The AI is a component — a genuinely useful one — but the
things that make this app work are ordinary product and engineering decisions
that would have been just as necessary in 2015.

That is the actual lesson, and it's expanded in [`LESSONS.md`](LESSONS.md).
