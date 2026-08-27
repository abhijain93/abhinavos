# Attribution

## The short version

**AbhinavOS is a framework created by Abhinav Jain.**

If you build your own version from it, the app you end up with is yours — your
name, your logo, your colours, your data, your goals. The one thing asked in
return is that the framework credit stays visible:

> Built on AbhinavOS · Powered by Abhinav Jain

It appears in two places, in both cases next to the small framework mark: a
line in the footer, and the About/Credits panel on the Stats tab. It is
deliberately quiet — 10.5px, 60% opacity, in the muted colour. It should never
look like an advertisement inside your app.

Your app name is not part of that line and is never touched by it. The header,
the browser tab and the top of the About panel all carry *your* name; the
credit line sits underneath and says what the thing is built on. The framework
is also named in `LICENSE.md`'s `Required Notice:` line, which is the part the
licence actually obliges you to carry forward.

---

## What's yours and what isn't

| Yours | The framework's |
|---|---|
| App name, tagline, display name | The name "AbhinavOS" as the framework |
| Logo, avatar, character image | The footer credit line |
| Colours, theme, radius | The About/Credits attribution |
| Health profile, targets, goals | The `Required Notice:` line in LICENSE.md |
| Food library, exercise library | |
| Coaching rules and prompts | |
| Airtable base and every record in it | |
| API keys and provider choice | |
| Any features you add | |

Your data is yours completely. It never touches anything of the original
author's — there is no server in this architecture, so your app talks directly
to your own Airtable base and your own AI providers.

---

## Being honest about what this can and can't enforce

The source code is public. Anyone technically capable **can** delete the
attribution line. There is no obfuscation here, no phone-home check, no
tamper-detection, and none of those would be a good idea — they'd be
user-hostile in an app that handles health data, and they'd be trivially
defeated anyway.

So attribution here rests on four things, in descending order of strength:

1. **The licence.** LICENSE.md is PolyForm Noncommercial 1.0.0. Its **Notices**
   section requires that anyone who receives a copy from you also receives the
   licence terms *and* any plain-text `Required Notice:` lines. This repository
   ships exactly one, at the top of LICENSE.md, naming Abhinav Jain. Stripping
   it while redistributing is a licence violation.
2. **This document**, stating the expectation plainly.
3. **The README**, so nobody can say they didn't see it.
4. **Good faith** — which, realistically, is what actually does most of the
   work in projects like this.

The in-app footer credit is a request backed by the spirit of the licence, not
a separate legal instrument. It is not hidden, not encoded, and not enforced by
code. If you remove it, nothing breaks. Please don't.

---

## If you want to go further

Attribution beyond the minimum is welcome but never required:

- A line in your own README: *"Built from the
  [AbhinavOS](https://github.com/abhijain93/abhinavos) framework by
  Abhinav Jain."*
- A link back to this repository if you publish yours.
- If you write about your version, mentioning where the architecture came from.

---

## What is not permitted

Under PolyForm Noncommercial 1.0.0, **commercial use is not licensed.** You may
not sell this, sell a service built on it, or use it inside a commercial
product. Personal use, learning, hobby projects, and use by charities,
educational institutions, and public health or research organisations are all
explicitly permitted.

Separately from the licence: please don't present the framework as your own
original work. Building your own version and saying so is exactly the point.
Claiming you designed the architecture is not.

---

## Commercial licensing

If you want to use this commercially, the noncommercial licence doesn't cover
it — but that doesn't mean the answer is no.

**How to get in touch:** open an issue on the framework repository —
<https://github.com/abhijain93/abhinavos/issues>. Title it "Commercial
licensing" and say what you want to build. That is the only contact route, and
it is deliberate: there is no email address anywhere in this repository or in
the application UI, so no forked app can ever end up displaying one, and
`tools/secret-scan.sh` blocks any email address from being committed.

Security issues go a different way — see [SECURITY.md](SECURITY.md).

---

## The framework mark

The attribution mark is a caricature logo of the framework's author, supplied
by him as the creator mark. It ships in three sizes:

| File | Use |
|---|---|
| `app/assets/framework-mark-48.png` | Footer credit, ~17px rendered |
| `app/assets/framework-mark-128.png` | About/Credits panel, README |
| `app/assets/framework-mark-512.png` | Documentation, larger contexts |
| `brand/framework-logo-original.png` | The original supplied file, unmodified |

The three `framework-mark-*` files are the same artwork with the white
background made transparent and cropped to content, so the mark sits correctly
on a dark UI. The face, glasses, beard, gradient ring and heartbeat line are
pixel-identical to the original. Nothing was redrawn, regenerated, or
overlaid with text.

**The mark carries no app name deliberately.** Your app is called whatever you
call it; the mark identifies the framework's author, not the product. The
footer line beside it reads *"Built on AbhinavOS · Powered by Abhinav Jain"* —
naming the framework and its author, never your app. Your identity stays the
primary one on screen: it owns the header, the tab title and the About panel,
and nothing in the credit line changes when you rename your app.

**This is not your app's logo.** Set `branding.faceImage` (or use the Setup
Wizard) to put your own avatar, caricature, photo or logo in the header. The
two are separate on purpose: yours is the app's identity, this one is the
credit line.
