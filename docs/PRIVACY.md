# Privacy

## The short version

**No health data has ever been in this repository, and none ever will be.**

Your records live in your own Airtable base. Your API keys live in your
browser's storage. Neither is in git. There is no server in this architecture,
so there is no third party in the path between you and Airtable — including me.

---

## Where every sensitive thing actually lives

| Thing | Where it lives | In this repo? |
|---|---|---|
| Health records | Your Airtable base | Never |
| Airtable token | Your browser storage, entered at runtime | Never |
| AI provider keys | Your browser storage, entered at runtime | Never |
| Airtable base ID | Your local `config.js` | No — gitignored |
| Table and field IDs | Your local `config.js` | No — gitignored |
| Your coach prompt | Your local `config.js` | No — gitignored |
| Lab targets, seed weights, habit list | Your local `config.js` | No — gitignored |
| Progress photos | Your Airtable base | Never |

`app/config.js` is in `.gitignore`. **Do not remove that line.** It is the only
file in a working installation that contains anything personal.

---

## Why keys are not in the repo, structurally

The app has no build step and no environment variables, because it has no
server. Credentials are entered through the settings UI and stored in the
browser. That means there is no mechanism by which a key *could* end up in a
commit — it isn't a discipline problem, it's an architectural property.

The trade-off is honest: browser storage is readable by anything that can run
JavaScript on the page's origin. For a single-user app on your own device
serving your own data, that is an acceptable exposure. It would not be
acceptable for a multi-user product, and if you fork this into one, the key
handling is the first thing to redesign.

---

## Public build vs. private build

This repo is not a copy of the app the author uses. It is the same code with
every personal element removed and replaced by configuration.

**Removed entirely:**

- Airtable base ID, 13 table IDs and 142 field IDs
- The coach system prompt — which named age, city, employer and a full clinical
  history — replaced by a generic ~40-line brief
- Two embedded avatar images of the author (510 KB of base64, most of the
  original file's size)
- Personal lab retest targets and the marker priority order
- Seed lifting weights for 17 exercises
- The personal night-routine checklist
- The author's supplement stack and skincare routine, including branded and
  prescription products
- Two curated lab-marker lists whose ordering encoded a specific clinical
  picture
- A symptom named in UI copy
- A brand-specific verified-food list from the author's kitchen
- A hard-coded list of the author's confirmed food triggers
- The private Airtable base name

**Renamed:** three feature areas used clinical terminology that disclosed
specific diagnoses through the identifiers and UI copy alone, even with every
value removed. The mechanisms are worth publishing; the diagnoses are not. They
now use neutral vocabulary — stool form, sleep index, therapy device, evening
cutoff. Same engine, same maths, different words.

---

## How that is enforced

Not by hand.

**[`tools/sanitise.mjs`](../tools/sanitise.mjs)** applies a fixed, documented
list of rules to the private file and **throws if any rule matches nothing**. If
a future version of the private build changes shape, the script fails loudly
rather than silently skipping a scrub. Every removed value becomes a
`window.ABOS_CONFIG` lookup with a safe default, so the public build still runs
— against your base and your config.

**[`tools/secret-scan.sh`](../tools/secret-scan.sh)** is the gate before any
commit. It checks for Airtable tokens and IDs, Google/Groq/OpenRouter/Anthropic/
GitHub key formats, hardcoded bearer headers, embedded base64 images, phone
numbers, email addresses, clinical terms, brand names from the private build,
and private deploy URLs. It exits non-zero on any hit.

```bash
node tools/sanitise.mjs ../private/index.html app/index.html
bash tools/secret-scan.sh
```

Both should be run before every push. Neither is a substitute for reading the
diff.

---

## If you fork this

- Copy `config.example.js` to `config.js`. Never rename it the other way.
- Keep `app/config.js` in `.gitignore`.
- Run `bash tools/secret-scan.sh` before your first push, and after any change
  to `index.html`.
- If you add a new personal constant to the code, add a matching rule to
  `sanitise.mjs` and a matching check to `secret-scan.sh` in the same commit.
- Consider whether your feature *names* disclose anything. Values are the
  obvious risk; identifiers and UI labels are the one people miss.

---

## Not a medical device

This app never diagnoses. Lab reference ranges come from your own lab report,
not from the app. Anything flagged is a pattern worth discussing with a doctor,
not a conclusion.

That framing is a correctness property, not a legal disclaimer. If you fork
this, keep it.
