# Security

## How credentials work here

There is no server and no build step, so there are no environment variables and
no secret store. Credentials are entered through the app's settings UI and kept
in browser storage on your device:

- Airtable personal access token
- AI provider keys (Gemini, Groq, OpenRouter)

None of them are in this repository, and there is no mechanism by which they
could be — nothing in the codebase reads a key from a file.

**Airtable token scopes.** The token needs exactly three:
`schema.bases:read`, `data.records:read`, `data.records:write`, on one base.
Do not grant more. Do not reuse a token across bases.

**The honest trade-off.** Browser storage is readable by any JavaScript running
on the page's origin. For a single-user app serving your own data from a static
host you control, that's acceptable. For a multi-user product it is not, and the
key handling is the first thing you would redesign.

---

## Before you push

```bash
bash tools/secret-scan.sh
```

Exits non-zero if it finds an Airtable token or ID, a provider key in any of the
common formats, a hardcoded bearer header, an embedded base64 image, a phone
number, an email address, clinical terminology from the private build, or a
private deploy URL.

If you regenerate `app/index.html` from a private build, run the sanitiser
first:

```bash
node tools/sanitise.mjs <path-to-private>/index.html app/index.html
bash tools/secret-scan.sh
```

`sanitise.mjs` throws if any of its rules stops matching, so a change to the
private build cannot silently skip a scrub.

Neither tool replaces reading the diff.

---

## If a key is exposed

Rotating is the only fix. A `git rm` does not remove anything from history.

1. **Revoke immediately** — Airtable: *Developer hub → Personal access tokens*.
   Gemini, Groq, OpenRouter: each provider's console.
2. **Issue a new key** and enter it in the app.
3. **Treat the old key as compromised permanently.** Rewriting git history with
   `filter-repo` or BFG is worth doing, but assume anything pushed to a public
   repo was scraped within minutes.

For an exposed Airtable token specifically: revoking it cuts access to the base
immediately. Your data is not deleted, and nothing else needs to change.

---

## Reporting a vulnerability

Open a GitHub issue for anything non-sensitive. For something that would expose
data if described publicly, use GitHub's private vulnerability reporting on this
repository instead.

This is a personal project maintained by one person. Expect a considered
response, not a fast one.
