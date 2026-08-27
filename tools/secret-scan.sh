#!/usr/bin/env bash
# secret-scan.sh — the gate before anything gets committed or pushed.
#
#   bash tools/secret-scan.sh            # scan the whole repo
#   bash tools/secret-scan.sh app/index.html   # scan one file
#
# Exits non-zero if it finds anything that must not be public. Run it after
# every change to app/index.html, and before every push.

set -uo pipefail

TARGET="${1:-.}"
FAIL=0

scan() {
  local label="$1" pattern="$2"
  local hits
  hits=$(grep -rInE "$pattern" "$TARGET" \
    --exclude-dir=.git \
    --exclude=secret-scan.sh \
    --exclude=sanitise.mjs \
    --exclude=config.js \
    --exclude=private-patterns.txt \
    --exclude=private-patterns.example.txt \
    2>/dev/null | grep -v 'XXXXXXXXXXXXXX' | head -8)
  if [ -n "$hits" ]; then
    echo "BLOCK  $label"
    echo "$hits" | sed 's/^/       /'
    FAIL=1
  else
    echo "ok     $label"
  fi
}

# Like scan(), but only looks at the application source, and skips lines
# explicitly reviewed and marked NEUTRAL-REFERENCE-OK or commented out.
# Documentation and config examples are SUPPOSED to contain example numbers.
scan_app() {
  local label="$1" pattern="$2" f="app/index.html"
  [ -f "$f" ] || f="$TARGET"
  [ -f "$f" ] || { echo "ok     $label (no app source in scope)"; return; }
  local hits
  hits=$(grep -InE "$pattern" "$f" 2>/dev/null \
    | grep -v 'NEUTRAL-REFERENCE-OK' | grep -vE '^\s*[0-9]+:\s*//' | head -8)
  if [ -n "$hits" ]; then
    echo "BLOCK  $label"; echo "$hits" | sed 's/^/       /'; FAIL=1
  else
    echo "ok     $label"
  fi
}

echo "Scanning: $TARGET"
echo

# --- credentials -----------------------------------------------------------
scan "Airtable personal access token"  'pat[A-Za-z0-9]{13,}\.[A-Za-z0-9]{20,}'
scan "Google / Gemini API key"         'AIza[A-Za-z0-9_-]{20,}'
scan "Groq API key"                    'gsk_[A-Za-z0-9]{20,}'
scan "OpenRouter API key"              'sk-or-[A-Za-z0-9-]{20,}'
scan "OpenAI-style secret key"         'sk-[A-Za-z0-9]{32,}'
scan "Anthropic API key"               'sk-ant-[A-Za-z0-9_-]{20,}'
scan "GitHub token"                    'gh[pousr]_[A-Za-z0-9]{30,}'
scan "generic hardcoded bearer"        'Authorization"?\s*:\s*"Bearer [A-Za-z0-9]'

# --- Airtable identifiers --------------------------------------------------
scan "Airtable base ID"                '"app[A-Za-z0-9]{14}"'
scan "Airtable table ID"               '"tbl[A-Za-z0-9]{14}"'
scan "Airtable field ID"               '"fld[A-Za-z0-9]{14}"'
scan "Airtable view ID"                '"viw[A-Za-z0-9]{14}"'
scan "Airtable base name in prose"     '[A-Z][A-Za-z]+ ?OS — [A-Z][a-z]+ System'

# --- personal data ---------------------------------------------------------
# These are deliberately CATEGORICAL. Specific terms — your employer, your
# medication, your city — belong in tools/private-patterns.txt, which is
# gitignored. A published scanner listing them would itself be a document
# describing the maintainer, which defeats the point.
scan "embedded base64 image"           'base64,iVBORw0KGgo'
scan "phone number"                    '[^0-9][6-9][0-9]{9}[^0-9]'
scan "email address"                   '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}'
scan "employment phrasing"             '(Senior|Lead|Principal|Head of) [A-Z][a-z]+ at [A-Z]'
# Scoped to app source: documentation legitimately says things like
# "a full history of every change".
scan_app "diagnosis-style clinical term" '\b(untreated|diagnosed with|history of) [a-z]'
scan "medication dosage in code"       '[0-9]+ ?(mg|mcg|IU) (daily|twice|per day)'
scan "personal deploy URL"             'netlify\.app|lovable\.app|vercel\.app'
scan "confirmed-trigger style list"    'Confirmed: [a-z]+ at [a-z]+'
scan "seed lifting weights"            '"[A-Z][a-z]+ ?[A-Z]?[a-z]*":[0-9]{1,3}[,}].*(Curl|Press|Pulldown|Row|Squat)'
scan "curated lab marker list"         'const priority *= *\[ *"[A-Z]'

# --- biometric literals -----------------------------------------------------
# These are the ones three earlier review passes missed: bare numbers passed
# positionally into a health calculation. No key pattern catches them.
scan "hardcoded biometric prior"       'computeTDEE\([^)]*[0-9]{2,3}, *[0-9]{2}, *(true|false)'
scan_app "biometrics in app code"      '(heightCm|ageYears|weightKg) *[:=] *[0-9]{2,3}'

# --- your own private patterns ---------------------------------------------
# tools/private-patterns.txt is gitignored. If it exists, every LABEL|REGEX
# line in it is scanned too. Absent, the scan simply runs without them.
PRIV="$(dirname "$0")/private-patterns.txt"
if [ -f "$PRIV" ]; then
  echo
  echo "--- private patterns ($(grep -cvE '^\s*(#|$)' "$PRIV") loaded from private-patterns.txt) ---"
  while IFS= read -r line; do
    case "$line" in ''|\#*) continue ;; esac
    plabel="${line%%|*}"
    ppattern="${line#*|}"
    [ -z "$ppattern" ] && continue
    scan "$plabel" "$ppattern"
  done < "$PRIV"
else
  echo
  echo "note   no private-patterns.txt — scanning with generic classes only."
  echo "       Copy tools/private-patterns.example.txt to add your own terms."
fi

echo
if [ "$FAIL" -ne 0 ]; then
  echo "FAILED — do not commit. Fix the findings above, or add a rule to"
  echo "tools/sanitise.mjs and regenerate app/index.html."
  exit 1
fi
echo "PASSED — nothing blocking found."
echo
echo "This catches known patterns. It is not a substitute for reading the diff."
