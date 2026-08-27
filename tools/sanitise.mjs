#!/usr/bin/env node
/**
 * sanitise.mjs — turn the private AbhinavOS build into the public one.
 *
 *   node tools/sanitise.mjs <private-index.html> <output-index.html>
 *
 * The private build is a single-file PWA that is hard-wired to one Airtable
 * base and one person. This script performs a fixed list of replacements that
 * remove every piece of personal data, then fails loudly if any of them did
 * not match — so a future refactor of the private file can never silently
 * stop scrubbing something.
 *
 * What it removes:
 *   1.  Embedded avatar images (a personal likeness, ~540 KB of base64)
 *   2.  The Airtable base ID
 *   3.  Every Airtable table ID and field ID
 *   4.  The coach system prompt (age, city, employer, clinical history, rules)
 *   5.  Seed lifting weights
 *   6.  Personal lab targets
 *   7.  Personal night-routine checklist items
 *   8.  The brand-specific verified-food list
 *   9.  The private base name in the onboarding copy
 *
 * Everything removed becomes a `window.ABOS_CONFIG` lookup with a safe
 * default, so the public build still runs — it just runs against *your*
 * base and *your* config, not the author's.
 *
 * Run `bash tools/secret-scan.sh app/index.html` afterwards. That is the
 * gate that actually decides whether a file is safe to commit.
 */

import { readFileSync, writeFileSync } from "node:fs";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("usage: node tools/sanitise.mjs <private.html> <public.html>");
  process.exit(1);
}

let src = readFileSync(inPath, "utf8");
const applied = [];

/** Replace once, and record it. Throws if the pattern is missing. */
function must(label, pattern, replacement) {
  const before = src;
  src = src.replace(pattern, replacement);
  if (src === before) {
    throw new Error(
      `sanitise: rule "${label}" matched nothing. The private build has ` +
        `changed shape — fix this rule before publishing anything.`
    );
  }
  applied.push(label);
}

/** Replace every occurrence; require at least one. */
function mustAll(label, pattern, replacement) {
  let count = 0;
  src = src.replace(pattern, (...args) => {
    count++;
    return typeof replacement === "function" ? replacement(...args) : replacement;
  });
  if (!count) throw new Error(`sanitise: rule "${label}" matched nothing.`);
  applied.push(`${label} (${count})`);
}

/* ------------------------------------------------------------------ *
 * 1. Avatars — a real personal likeness, embedded as base64.
 * ------------------------------------------------------------------ */

// The <link rel="apple-touch-icon" href="data:image/png;base64,..."> block.
mustAll(
  "inline icon data-URIs",
  /<link rel="(apple-touch-icon|icon)"[^>]*href="data:image\/png;base64,[^"]*">\n?/g,
  ""
);

// Re-add plain file-based icons in their place.
must(
  "file-based icon links",
  /<link rel="manifest" href="manifest\.json">/,
  `<link rel="manifest" href="manifest.json">\n` +
    `<link rel="apple-touch-icon" sizes="180x180" href="icon-512.png">\n` +
    `<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">`
);

must(
  "FACE_URI",
  /const FACE_URI="data:image\/png;base64,[^"]*";/,
  `const FACE_URI=(window.ABOS_CONFIG&&window.ABOS_CONFIG.faceImage)||"";`
);

must(
  "CHAR_URI",
  /const CHAR_URI="data:image\/png;base64,[^"]*";/,
  `const CHAR_URI=(window.ABOS_CONFIG&&window.ABOS_CONFIG.charImage)||"icon-512.png";`
);

must(
  "FACE_IMG guard",
  /const FACE_IMG='<img src="'\+FACE_URI\+'" alt="" class="facelogo">';/,
  `const FACE_IMG=FACE_URI?'<img src="'+FACE_URI+'" alt="" class="facelogo">':'';`
);

/* ------------------------------------------------------------------ *
 * 2. Config loader — pull in config.js before the app script runs.
 * ------------------------------------------------------------------ */

must(
  "config.js loader",
  /<script>\n/,
  `<!-- Local, gitignored. Copy config.example.js to config.js and fill it in.\n` +
    `     A 404 here is harmless: the app falls back to safe defaults. -->\n` +
    `<script src="config.js"></script>\n<script>\n`
);

/* ------------------------------------------------------------------ *
 * 3. Airtable identifiers.
 * ------------------------------------------------------------------ */

must(
  "Airtable base ID",
  /const BASE="app[A-Za-z0-9]+";/,
  `const BASE=(window.ABOS_CONFIG&&window.ABOS_CONFIG.baseId)||"";`
);

// Every table and field ID becomes an empty string. The real map is supplied
// at runtime by config.js and deep-merged over this skeleton, so the key
// names still document the schema the app expects.
mustAll("table IDs", /"tbl[A-Za-z0-9]{14}"/g, '""');
mustAll("field IDs", /"fld[A-Za-z0-9]{14}"/g, '""');

must(
  "schema provenance comment",
  /\/\* ---------- schema: hardcoded from the real base ----------\n[\s\S]*?\*\//,
  `/* ---------- schema ----------
   The app addresses Airtable by field ID, not field name, so renaming a
   column in Airtable never breaks it. The cost is that every ID has to be
   declared once. In the public build these are deliberately blank and are
   overlaid at runtime from config.js — the key names below are the contract,
   the IDs are yours. See docs/DATA-MODEL.md.                              */`
);

must(
  "schema config merge",
  /\n {2}return S;/,
  `
  // Overlay the real Airtable IDs from config.js. The literals above are
  // deliberately blank in the public build — the shape is the documentation,
  // the IDs are yours.
  (function overlay(target,patch){
    if(!patch||typeof patch!=="object")return;
    Object.keys(patch).forEach(k=>{
      if(patch[k]&&typeof patch[k]==="object"&&!Array.isArray(patch[k])){
        target[k]=target[k]||{};overlay(target[k],patch[k]);
      }else target[k]=patch[k];
    });
  })(S,(window.ABOS_CONFIG&&window.ABOS_CONFIG.schema)||null);

  return S;`
);

/* ------------------------------------------------------------------ *
 * 4. The coach system prompt — the single most sensitive block.
 *    Contains age, city, employer, clinical history and medical rules.
 * ------------------------------------------------------------------ */

const GENERIC_COACH = `const COACH_SYSTEM=(window.ABOS_CONFIG&&window.ABOS_CONFIG.coachSystem)||\`You are a personal health coach embedded in a tracking app. Not a generic motivational AI.

You are given the user's real data below — today's numbers, this week's trend, open actions,
supplement stock, recent labs, recent lift history. Use it directly. Never ask the user to repeat
information that is already in front of you.

HARD RULES:
- Never diagnose. Flag patterns worth discussing and route them to a GP or specialist.
- Never invent a number. If a value is missing from the data, say it is missing.
- Respect any user-specific rules supplied in config (allergies, injuries, intolerances,
  contraindicated supplements). Those override anything you would otherwise recommend.

PROGRAMMING A SESSION — behave like a coach reading a training log, not a search engine:
- Prescribe an exact working weight for every exercise, taken from the last logged top set.
  Never write "your usual weight" or a rep range with no load. If an exercise has no history,
  say so and give a conservative starting load, flagged as an estimate.
- Double progression: hold the weight until the top of the rep range is hit on all sets, then add
  load — 2.5kg isolation, 5kg compounds — and drop back to the bottom of the range.
- If the last two entries for a lift are flat or falling, do not add weight. Say it stalled and
  pick ONE fix: repeat, add reps, or deload ~10%. Recovery is the default suspect, not volume.
- 3 working sets is the default. 5-7 exercises for a normal session, 4 on a low-energy day.
- Always give a 20-minute minimum-viable fallback version of the same session.
- Format a plan as a compact list — exercise, weight x sets x reps — not prose.

OPERATING MODES — read Mode from the data and adjust: OPTIMAL (push), NORMAL (standard),
RECOVERY (reduce intensity, prioritise sleep and hydration), SURVIVAL (hydration, movement,
protein and sleep only — pause dieting and hard training entirely).

TONE: direct, calm, practical. Never shame, guilt-trip, catastrophise or fake positivity. A bad
workout still counts as showing up. Identify the 1-3 highest-leverage actions, never a long list —
a list of ten produces deferral. Keep replies short and mobile-readable. If nothing needs saying,
say briefly why the user is on track rather than manufacturing advice.\`;`;

must("coach system prompt", /const COACH_SYSTEM=`[\s\S]*?`;/, GENERIC_COACH);

/* ------------------------------------------------------------------ *
 * 5. Personal training / clinical / routine constants.
 * ------------------------------------------------------------------ */

must(
  "seed lifting weights",
  /const SEED_W=\{[\s\S]*?\};/,
  `// Starting loads used only when an exercise has no logged history.\n` +
    `const SEED_W=(window.ABOS_CONFIG&&window.ABOS_CONFIG.seedWeights)||{};`
);

must(
  "lab targets",
  /const LAB_TARGETS=\{[\s\S]*?\n\};/,
  `// Personal retest goals per marker, e.g. {"LDL Cholesterol":{goal:115,dir:"below"}}.\n` +
    `// Empty by default — reference ranges still come from the lab, via Airtable.\n` +
    `const LAB_TARGETS=(window.ABOS_CONFIG&&window.ABOS_CONFIG.labTargets)||{};`
);

// The actual contents of the author's supplement stack and skincare routine,
// including branded and prescription products. These are multi-select option
// lists, so they are pure config — they move out wholesale.
must(
  "supplement and skincare option lists",
  /\n\s*S\.D\.skinAMOpts=\[[^\]]*\];\n\s*S\.D\.skinPMOpts=\[[^\]]*\];\n\s*S\.D\.suppAMOpts=\[[^\]]*\];\n\s*S\.D\.suppPMOpts=\[[^\]]*\];/,
  `
  // Multi-select option lists. These MUST match the options configured on the
  // corresponding Airtable multipleSelects fields, or a write is rejected.
  // Supplied from config so the public build ships nobody's actual stack.
  const MS=(window.ABOS_CONFIG&&window.ABOS_CONFIG.multiSelects)||{};
  S.D.skinAMOpts=MS.skinAM||[];
  S.D.skinPMOpts=MS.skinPM||[];
  S.D.suppAMOpts=MS.suppAM||[];
  S.D.suppPMOpts=MS.suppPM||[];`
);

must(
  "night-routine checklist",
  /const CHECK_BOOL=\[[\s\S]*?\n\];/,
  `// Yes/no habits shown on Today. Each \`f\` must map to a boolean field in\n` +
    `// SCHEMA.D. Supplied via config so the public build ships no personal routine.\n` +
    `const CHECK_BOOL=(window.ABOS_CONFIG&&window.ABOS_CONFIG.boolChecks)||[];`
);

// The lab section orders markers by how much they matter to one specific
// person, and explains why in a comment that names their conditions.
must(
  "lab marker priority list",
  /\/\* Ordered by clinical weight for THIS profile[\s\S]*?\n {2}const priority=\[[\s\S]*?\];/,
  `/* Markers are ordered by how much they matter to you, not alphabetically —\n` +
    `     the first few rows are what you actually look at. Supply your own order\n` +
    `     in config; anything not listed is simply not shown. */\n` +
    `  const priority=(window.ABOS_CONFIG&&window.ABOS_CONFIG.labPriority)||\n` +
    `    Object.keys(groups).sort();`
);

// A SECOND curated lab-marker list, this one inside the coach data pack. The
// ordering encodes which markers matter to one specific person's clinical
// picture, so it goes to config alongside the display list.
must(
  "lab marker list in coach data pack",
  /const priorityLabs=\[[\s\S]*?\]\n\s*\.filter\(m=>groups\[m\]\)/,
  `const priorityLabs=((window.ABOS_CONFIG&&window.ABOS_CONFIG.labPriority)||Object.keys(groups).sort())
    .filter(m=>groups[m])`
);

// A urological symptom named in UI copy explaining the evening water cutoff.
must(
  "symptom named in water-cutoff copy",
  /Past 9PM — cutoff is on for [a-z]+\./,   // symptom name, not spelled out here
  "Past 9PM — evening water cutoff is on."
);

must(
  "training split label",
  /6:"Legs \(2nd[^"]*"/,
  `6:"Legs (2nd)"`
);

/* ------------------------------------------------------------------ *
 * 6. Food data that is specific to one person's kitchen.
 * ------------------------------------------------------------------ */

must(
  "first-person reference in lift-history pack",
  /these are his real logged loads/,
  "these are the user's real logged loads"
);

/* The two meal-parsing prompts (one per provider path) both hard-code one
   person's cuisine, diet, and grocery shelf. Genericise all of it. */

must(
  "diet hint constant",
  /const WATER_TARGET=[^\n]*\n/,
  (m) =>
    m +
    `// Optional cuisine/diet steer for the meal parser,\n` +
    `// e.g. " Assume Indian home cooking, vegetarian."\n` +
    `const DIET_HINT=(window.ABOS_CONFIG&&window.ABOS_CONFIG.dietHint)||"";\n`
);

mustAll(
  "diet assumption in meal prompts",
  /Convert this Indian vegetarian meal into macros\./g,
  "Convert this meal into macros.${DIET_HINT}"
);

mustAll(
  "cuisine assumption in fallback lines",
  /estimate (?:real|standard) Indian home cooking/g,
  "estimate standard home cooking"
);

// Two blocks of hand-entered packaged-food label values — specific brands
// from one person's kitchen, one of them annotated with a health trigger.
mustAll(
  "brand label-value blocks in meal prompts",
  /(?:Use these label-verified values EXACTLY when they match|Verified label values — use these EXACTLY when the description matches), scaled by quantity:\n(?:[^\n$][^\n]*\n)+/g,
  ""
);

// A hard-coded list of one person's confirmed food triggers, shown in the UI.
must(
  "confirmed trigger list in UI copy",
  /Showing the already-confirmed trigger list instead\.<\/div>\n\s*<div class="note"[^>]*>Confirmed: [^<]*<\/div>/,
  `</div>`
);

// A brand name in the food-input placeholder.
must(
  "brand name in food placeholder",
  /placeholder="2 rotis, dal, half bowl sabzi, one turbo caramel vanilla"/,
  `placeholder="2 rotis, dal, half bowl sabzi, one whey scoop"`
);

// The matching entries in the offline food database.
must(
  "label-verified entries in local food DB",
  /const FOODDB=\[\n \/\/ ---- label-verified ----\n(?: \{k:\[[^\n]*\n)+/,
  `const FOODDB=[\n // Add your own label-verified staples here — name, per-unit basis,\n` +
    ` // [kcal, protein, carbs, fat, fibre, sugar, sodium, calcium], v:1 = verified.\n`
);

/* ------------------------------------------------------------------ *
 * 6b. Vocabulary neutralisation (optional, private).
 *
 * A personal build can name specific conditions in its identifiers and UI
 * copy. Even with every value stripped, an identifier like `fooUsed` or a
 * label like "Foo hours" still discloses a diagnosis to anyone reading the
 * source. Renaming them to neutral terms fixes that.
 *
 * The rename map is NOT published. It lives in tools/private-renames.json,
 * which is gitignored — because a published list of "condition X becomes
 * neutral word Y" is a decoder ring that undoes the neutralisation it
 * performs. That file is the one place the specifics exist.
 *
 * If the file is absent, this step is skipped and the sanitiser says so.
 * Copy tools/private-renames.example.json to create your own.
 * ------------------------------------------------------------------ */

let NEUTRALISE = [];
const RENAMES_PATH = new URL("./private-renames.json", import.meta.url);
try {
  const raw = readFileSync(RENAMES_PATH, "utf8");
  NEUTRALISE = JSON.parse(raw).map(([pattern, flags, replacement]) =>
    [new RegExp(pattern, flags || "g"), replacement]);
} catch (e) {
  NEUTRALISE = [];
}

if (!NEUTRALISE.length) {
  console.warn(
    "\n  note: tools/private-renames.json not found — vocabulary\n" +
    "        neutralisation skipped. This is fine for a build that has no\n" +
    "        condition-specific naming to remove. See the .example file.\n"
  );
  applied.push("vocabulary neutralisation (skipped — no private map)");
} else {
  let neutralised = 0;
  for (const [pattern, replacement] of NEUTRALISE) {
    src = src.replace(pattern, () => { neutralised++; return replacement; });
  }
  applied.push(`vocabulary neutralisation (${neutralised})`);
}

/* ==================================================================== *
 * PHASE 1-3 — FRAMEWORK CONVERSION
 *
 * Everything below turns AbhinavOS from "one person's app" into a
 * framework someone else can brand and configure as their own, while the
 * framework attribution stays put.
 *
 * Design rule: every default below is the ORIGINAL AbhinavOS value, so a
 * build with no config.js behaves exactly as before. Nothing here changes
 * behaviour — it only moves the value's source of truth to config.
 * ==================================================================== */

/* ---- Config accessor + branding + theme + storage prefix ------------ */

must(
  "framework config bootstrap",
  /const AT="https:\/\/api\.airtable\.com\/v0\/";/,
  `/* ---------- FRAMEWORK CONFIGURATION ----------
   AbhinavOS is a framework. Everything a person needs to make this their
   own app lives in config.js (copy config.example.js). Nothing personal is
   hard-coded below — the fallbacks are the framework's own defaults.

   Attribution: this app is built on the AbhinavOS framework by
   Abhinav Jain. See ATTRIBUTION.md. The footer credit is a condition of
   the licence's Required Notice; please leave it in place.            */
const CFG=(typeof window!=="undefined"&&window.ABOS_CONFIG)||{};
const CFG_BRAND=CFG.branding||{};
const CFG_THEME=CFG.theme||{};
const CFG_PROFILE=CFG.profile||{};
const CFG_TARGETS=CFG.targets||{};

/* The framework's own identity. Not user-configurable — see ATTRIBUTION.md. */
const FRAMEWORK_NAME="AbhinavOS";
const FRAMEWORK_AUTHOR="Abhinav Jain";
const FRAMEWORK_CREDIT="Built on "+FRAMEWORK_NAME+" · Powered by "+FRAMEWORK_AUTHOR;

/* The USER's identity. All of this is theirs to change. */
const APP_NAME=CFG_BRAND.appName||"AbhinavOS";
const APP_TAGLINE=CFG_BRAND.tagline||"Personal health operating system";
const USER_DISPLAY_NAME=CFG_BRAND.displayName||"";

/* Renders "RahulOS" as Rahul<em>OS</em> so the accent styling survives any
   app name. Names not ending in OS simply render whole. */
function brandHTML(){
  const esc0=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const m=/^(.+?)(OS)$/.exec(APP_NAME);
  return m?esc0(m[1])+"<em>"+esc0(m[2])+"</em>":esc0(APP_NAME);
}

/* Storage keys are namespaced so two different forks open in the same
   browser never collide over each other's keys and API tokens. */
const STORE_PREFIX=CFG_BRAND.storagePrefix||"abhinavos";
const SKEY=k=>STORE_PREFIX+"_"+k;

/* Theme tokens map 1:1 onto the CSS custom properties in :root. Anything
   omitted keeps the framework default already set in the stylesheet. */
function applyTheme(){
  if(typeof document==="undefined")return;
  const r=document.documentElement, t=CFG_THEME;
  const map={ground:"--ground",surface:"--surface",surface2:"--surface2",line:"--line",
    ink:"--ink",ink2:"--ink2",muted:"--muted",primary:"--gold",secondary:"--ember",
    success:"--teal",attention:"--amber",neutral:"--short",accent:"--violet",radius:"--r"};
  Object.keys(map).forEach(k=>{ if(t[k])r.style.setProperty(map[k],t[k]); });
  if(t.fontBody)r.style.setProperty("--font-body",t.fontBody);
  if(t.fontHeading)r.style.setProperty("--font-heading",t.fontHeading);
  if(t.fontBody)document.body&&(document.body.style.fontFamily=t.fontBody);
  document.title=APP_NAME;
}

const AT="https://api.airtable.com/v0/";`
);

// Namespace every localStorage key through the configured prefix.
mustAll(
  "namespaced storage keys",
  /"abhinavos_([a-z_]+)"/g,
  (_m, key) => `SKEY("${key}")`
);

/* ---- Phase 2: personal biometrics and targets --------------------- */

// The cold-start biometric prior. These were one person's real height, age
// and sex, silently applied to anyone else for their first 21 days.
must(
  "hard-coded biometric prior",
  /const tdeeR = computeTDEE\(weight\|\|\d+, \d+, \d+, (?:true|false)\); \/\/ profile fallbacks if EMA not yet available/,
  // Matched structurally on purpose: the real height/age must not appear in
  // a published file, not even inside the regex that removes them.
  `/* Cold-start biometrics. NOT a medical calculation and NOT tuned for
     anyone in particular — Mifflin-St Jeor is a population estimate that
     is wrong for most individuals. It is used only until ~21 days of real
     intake and weight data exist, after which measured energy balance
     replaces it entirely.

     If the user has not supplied a profile, we do NOT quietly substitute
     someone else's body. We fall back to a neutral reference figure and
     label the result so the UI can say the target is unpersonalised.   */
  const prof=PROFILE_OR_NULL();
  const tdeeR = computeTDEE(
    weight || prof.weightKg,
    prof.heightCm, prof.ageYears, prof.isMale, prof.configured);`
);

must(
  "profile resolver",
  /function computeTDEE\(profileWeightKg,heightCm,ageYears,isMale\)\{/,
  `/* Returns the user's configured profile, or a clearly-flagged neutral
   reference. \`configured:false\` is what makes the UI honest about it. */
function PROFILE_OR_NULL(){
  const p=CFG_PROFILE;
  const has=p&&p.heightCm&&p.ageYears&&p.sex;
  if(has)return{
    heightCm:Number(p.heightCm), ageYears:Number(p.ageYears),
    isMale:String(p.sex).toLowerCase()==="male",
    weightKg:Number(p.startingWeightKg)||70, configured:true
  };
  // Neutral reference values, used ONLY to render a placeholder number.
  // They describe nobody. Set profile in config.js for a real estimate.
  return{heightCm:170, ageYears:35, isMale:true, weightKg:70, configured:false}; // NEUTRAL-REFERENCE-OK
}

function computeTDEE(profileWeightKg,heightCm,ageYears,isMale,profileConfigured){`
);

mustAll(
  "cold-start source labelling",
  /source:"cold-start \(Mifflin-St Jeor × 1\.5\)"/g,
  `source: profileConfigured
        ? "cold-start (Mifflin-St Jeor × 1.5)"
        : "cold-start (no profile set — generic reference, not personalised)"`
);

// Nutrition targets. One person's protocol choices, not universal values.
must(
  "hard-coded nutrition targets",
  /  const proteinTarget = weight \? Math\.round\(weight\*PROTEIN_G_PER_KG\) : 150;\n  const kcalFloor = 2000; \/\/ HARD RULE: glucose floor, never adaptive downward past this/,
  `  const proteinTarget = weight
    ? Math.round(weight*PROTEIN_G_PER_KG)
    : (CFG_TARGETS.proteinFallbackG || 150);
  /* A floor, never a ceiling — the app is built so under-eating is the
     failure it guards against. This is a personal protocol choice, not a
     medical recommendation, and it is meant to be set per person. */
  const kcalFloor = CFG_TARGETS.kcalFloor || 2000;`
);

mustAll(
  "configurable target constants",
  /const WATER_TARGET=3\.5; \/\/ litres/,
  `const WATER_TARGET=CFG_TARGETS.waterLitres||3.5; // litres — example default`
);

must(
  "configurable protein and deficit constants",
  /const PROTEIN_G_PER_KG = 2\.0;        \/\/ midpoint of 1\.8–2\.2\nconst RECOMP_DEFICIT = 0\.85;         \/\/ midpoint of 10–20% below TDEE/,
  `/* EXAMPLE DEFAULTS — the original author's own protocol choices, not
   medical advice and not right for everyone. Override in config.js. */
const PROTEIN_G_PER_KG = CFG_TARGETS.proteinPerKg || 2.0;
const RECOMP_DEFICIT   = CFG_TARGETS.deficitMultiplier || 0.85;`
);

/* ==================================================================== *
 * SETUP WIZARD + SETTINGS STORE  (framework feature)
 *
 * A browser cannot write config.js — there is no server and no build step.
 * So the wizard persists to localStorage, and configuration resolves in
 * priority order:
 *
 *     localStorage (wizard/settings)  >  config.js  >  framework defaults
 *
 * "Copy my config" in Settings emits a ready-made config.js from whatever
 * the wizard captured, so the two paths join up and anyone who later wants
 * their setup in version control (or wants Claude to work on it) can have it.
 * ==================================================================== */

must(
  "setup store + config resolver",
  /const AT="https:\/\/api\.airtable\.com\/v0\/";/,
  `/* ---------- SETUP STORE ----------
   Everything the Setup Wizard captures. Read through USER(), never directly.  */
const SETUP_KEY_SUFFIX="setup";
let SETUP=null;

function loadSetup(){
  try{
    const raw=localStorage.getItem(STORE_PREFIX+"_"+SETUP_KEY_SUFFIX);
    SETUP=raw?JSON.parse(raw):null;
  }catch(e){ SETUP=null; }
  return SETUP;
}
function saveSetup(patch){
  SETUP=Object.assign({}, SETUP||{}, patch);
  try{ localStorage.setItem(STORE_PREFIX+"_"+SETUP_KEY_SUFFIX, JSON.stringify(SETUP)); }
  catch(e){ console.warn("could not persist setup:",e); }
  return SETUP;
}
function setupComplete(){ return !!(SETUP && SETUP.completed); }

/* The single resolver. Wizard answers win, then config.js, then the
   framework default passed in by the caller. */
function USER(path, fallback){
  const seg=path.split(".");
  const dig=o=>{ let v=o; for(const k of seg){ if(v==null)return undefined; v=v[k]; } return v; };
  const a=SETUP?dig(SETUP):undefined;
  if(a!==undefined&&a!==""&&a!==null)return a;
  const b=dig(CFG);
  if(b!==undefined&&b!==""&&b!==null)return b;
  return fallback;
}

const AT="https://api.airtable.com/v0/";`
);

/* ---- Demo mode: read-only, fictional data, never touches Airtable ---- */

must(
  "demo mode guard on the Airtable gateway",
  /async function at\(path,opts=\{\},ms=15000\)\{\n  if\(!TOKEN\) throw new Error\("No Airtable token set"\);/,
  `/* DEMO MODE. A read-only tour with obviously fictional data so someone can
   see the app before spending an hour building an Airtable base.

   Two hard guarantees, enforced here at the single gateway every Airtable
   call passes through:
     1. In demo mode NOTHING is ever written to Airtable. Mutations are
        refused at this function, not merely hidden in the UI.
     2. Demo data is never mixed with real data — demo mode requires no
        token, and the moment a real token exists demo mode is off.        */
let DEMO=false;

async function at(path,opts={},ms=15000){
  if(DEMO){
    const m=(opts.method||"GET");
    if(m!=="GET") throw new Error("DEMO_READONLY");
    return demoResponse(path);
  }
  if(!TOKEN) throw new Error("No Airtable token set");`
);

must(
  "demo dataset",
  /\/\* ---------- SETUP STORE ----------/,
  `/* ---------- DEMO DATA ----------
   Deliberately fictional. Round numbers, a made-up name, nobody's real
   figures. Never written anywhere — it exists only in memory for the tour. */
const DEMO_TODAY=(()=>{const d=new Date();return d.toISOString().slice(0,10)})();
function demoRow(fields){ return {id:"demo"+Math.random().toString(36).slice(2,9), fields}; }
function demoResponse(path){
  const D=SCHEMA&&SCHEMA.D||{};
  if(/\\/meta\\/bases\\//.test(path)) return {tables:[]};
  if(SCHEMA&&path.indexOf(SCHEMA.daily.id)>-1){
    return {records:[demoRow({
      [D.date]:DEMO_TODAY,[D.weight]:70,[D.sleep]:7.5,[D.deep]:75,[D.rem]:90,
      [D.awake]:12,[D.water]:2,[D.steps]:8000,[D.kcal]:1500,[D.p]:90,
      [D.c]:160,[D.f]:50,[D.gymDone]:true,[D.mode]:"Normal"
    })]};
  }
  if(SCHEMA&&path.indexOf(SCHEMA.food.id)>-1){
    return {records:[
      demoRow({[SCHEMA.F.item]:"Oats with milk and banana",[SCHEMA.F.meal]:"Breakfast",
        [SCHEMA.F.kcal]:420,[SCHEMA.F.p]:18,[SCHEMA.F.c]:62,[SCHEMA.F.f]:11,[SCHEMA.F.date]:DEMO_TODAY}),
      demoRow({[SCHEMA.F.item]:"Chicken salad wrap",[SCHEMA.F.meal]:"Lunch",
        [SCHEMA.F.kcal]:560,[SCHEMA.F.p]:42,[SCHEMA.F.c]:48,[SCHEMA.F.f]:20,[SCHEMA.F.date]:DEMO_TODAY})
    ]};
  }
  if(SCHEMA&&path.indexOf(SCHEMA.lift.id)>-1){
    return {records:[
      demoRow({[SCHEMA.L.ex]:"Bench Press",[SCHEMA.L.w]:40,[SCHEMA.L.sets]:3,[SCHEMA.L.reps]:10,[SCHEMA.L.date]:DEMO_TODAY}),
      demoRow({[SCHEMA.L.ex]:"Lat Pulldown",[SCHEMA.L.w]:35,[SCHEMA.L.sets]:3,[SCHEMA.L.reps]:12,[SCHEMA.L.date]:DEMO_TODAY})
    ]};
  }
  return {records:[]};
}

function enterDemo(){
  /* Runs the demo through the SAME load pipeline as real data, so the tour
     shows the app actually working rather than an empty shell. The Airtable
     gateway is what makes this safe: in demo mode it serves fictional
     records and refuses every write. */
  DEMO=true; TOKEN=null; view="today";
  CACHE_BUST_DEMO();
  loadAll(true);
}
/* Demo must never read or write the real cache, or a visitor's tour could
   be polluted by — or pollute — a configured user's cached data. */
function CACHE_BUST_DEMO(){
  try{
    // cachedFetch stores under "atcache_<key>" via Store.
    ["history","lifts","exlib","supps","actions","labs","foodlib","scorerules",
     "labpanels","labresults","muscvol","dscore"]
      .forEach(k=>{ try{ Store.del("atcache_"+k); }catch(e){} });
  }catch(e){}
}
function exitDemo(){
  DEMO=false; SCHEMA=null;
  DAILY={}; HISTORY=[]; FOODS=[]; LIFTS=[]; TODAY_ID=null;
  CACHE_BUST_DEMO();
  WIZ_STEP=0; state="setup"; R();
}

/* A self-consistent fake schema so the demo doesn't need a real base. */
function demoSchema(){
  const k=n=>"demo_"+n;
  const S={daily:{id:k("daily")},food:{id:k("food")},gym:{id:k("gym")},
    lift:{id:k("lift")},act:{id:k("act")},exl:{id:k("exl")},fl:{id:k("fl")},
    supp:{id:k("supp")},score:{id:k("score")},dscore:{id:k("dscore")},
    muscleVol:{id:k("mv")},lp:{id:k("lp")},lr:{id:k("lr")}};
  const mk=keys=>{const o={};keys.forEach(x=>o[x]=k(x));return o};
  S.D=mk(["date","datekey","weight","official","sleep","deep","rem","awake","onset",
    "water","steps","mode","gymDone","kcal","p","c","f","na","grain","gate","notes"]);
  S.F=mk(["date","meal","qty","item","notes","day","raw","kcal","p","c","f","fib","na","ca","grain","tol","note"]);
  S.G=mk(["date","split","dur","core","cardio","rpe","notes"]);
  S.L=mk(["date","ex","w","sets","reps","side","notes"]);
  S.A=mk(["action","priority","category","opened","status","done","notes"]);
  S.E=mk(["name","group","type","repMin","repMax","cur","uni","notes"]);
  S.SUP=mk(["name","dose","timing","status","purpose","notes","units","dailyDose","threshold","daysLeft","flag","link","restocked","recheckDue"]);
  S.SCORE=mk(["behaviour","points","direction","category","active","conf","suspend","notes"]);
  S.DS=mk(["date","earned","lostRaw","logged","gap","restart","restartGoal","freshStart","weeklyMax","notes"]);
  S.MV=mk(["week","group","sets","sessions"]);
  S.LP=mk(["date","lab","fasting","context"]);
  S.LR=mk(["marker","date","value","unit","refLow","refHigh","status","category","notes"]);
  S.D.skinAMOpts=[];S.D.skinPMOpts=[];S.D.suppAMOpts=[];S.D.suppPMOpts=[];
  /* Select-option lists the real schema loader derives from Airtable field
     metadata. Without these the Body tab threw on .map(). */
  S.D.stoolFormOpts=["1 — separate hard lumps","2 — lumpy sausage","3 — cracked sausage",
    "4 — smooth sausage","5 — soft blobs","6 — mushy ragged","7 — entirely liquid"];
  S.D.modeOpts=["Optimal","Normal","Recovery","Survival"];
  S.D.bloatOpts=["None","Mild","Moderate","Severe"];
  S.D.energyOpts=["Low","Medium","High"];
  S.D.stressOpts=["Low","Medium","High"];
  S.G.splitOpts=["Rest","Back + Biceps","Chest + Shoulders","Legs (primary)",
    "Arms + Core","Full Body + cardio","Legs (2nd)"];
  return S;
}

/* ---------- SETUP STORE ----------`
);

/* ==================================================================== *
 * THE SETUP WIZARD
 * ==================================================================== */

must(
  "setup wizard view",
  /function vSetup\(\)\{/,
  `/* Five steps. Nothing is required except a name and an app name — every
   other answer has a documented default and can be changed later in
   Settings. The wizard never writes source code; it writes localStorage. */
let WIZ_STEP=0;
const WIZ_STEPS=["Identity","Branding","About you","Goals","Data & AI"];

const ACTIVITY={sedentary:["Sedentary","desk job, little exercise"],
  light:["Lightly active","1-3 sessions a week"],
  moderate:["Moderately active","3-5 sessions a week"],
  high:["Very active","6+ sessions, or physical job"]};
const GOALS={fatloss:["Fat loss","calorie target below maintenance"],
  maintain:["Maintain","calorie target around maintenance"],
  muscle:["Build muscle","calorie target above maintenance"],
  health:["General health","no calorie steer, just tracking"]};
const TONES={direct:["Direct","short, factual, no cheerleading"],
  supportive:["Supportive","encouraging, gentler framing"],
  strict:["Strict","holds you to the target, names the gap"]};

function wizField(id,label,val,ph,type){
  return \`<label class="note" style="display:block;margin:10px 0 4px">\${esc(label)}</label>
   <input id="\${id}" type="\${type||"text"}" value="\${esc(val==null?"":val)}" placeholder="\${esc(ph||"")}" autocomplete="off">\`;
}
function wizChoice(id,map,cur){
  return Object.keys(map).map(k=>\`<button class="btn sm \${cur===k?"p":""}"
    style="margin:4px 4px 0 0" onclick="wizPick('\${id}','\${k}')">\${esc(map[k][0])}</button>\`).join("")
    + (cur&&map[cur]?\`<div class="note" style="margin-top:6px">\${esc(map[cur][1])}</div>\`:"");
}
function wizPick(id,val){ wizCapture(); saveSetup({[id]:val}); R(); }

/* Reads whatever is currently on screen so answers survive step changes. */
function wizCapture(){
  const g=id=>{const e=document.getElementById(id);return e?e.value.trim():undefined};
  const patch={};
  [["wz_name","name"],["wz_display","displayName"],["wz_app","appName"],["wz_tag","tagline"],
   ["wz_face","faceImage"],["wz_primary","primary"],["wz_ground","ground"],
   ["wz_height","heightCm"],["wz_age","ageYears"],["wz_weight","startingWeightKg"],
   ["wz_targetw","targetWeightKg"],["wz_kcal","kcalFloor"],["wz_protein","proteinPerKg"],
   ["wz_water","waterLitres"],["wz_train","trainingDays"],["wz_base","baseId"],
   ["wz_diet","dietHint"],["wz_avoid","avoidFoods"],["wz_equip","equipment"]
  ].forEach(([el,key])=>{const v=g(el);if(v!==undefined&&v!=="")patch[key]=v});
  if(Object.keys(patch).length)saveSetup(patch);
}
function wizGo(n){ wizCapture(); WIZ_STEP=Math.max(0,Math.min(WIZ_STEPS.length-1,n)); R(); }

function wizFinish(){
  wizCapture();
  const s=SETUP||{};
  if(!s.name||!s.appName){ alert("A name and an app name are needed to continue."); return; }
  saveSetup({completed:true, completedAt:new Date().toISOString()});
  DEMO=false;
  applyBrandingFromSetup();
  state = TOKEN ? "loading" : "needtoken";
  R();
  if(TOKEN) loadAll(true);
}

/* Re-applies name/theme immediately, so finishing the wizard visibly
   changes the app rather than needing a reload. */
function applyBrandingFromSetup(){
  try{
    const s=SETUP||{};
    if(s.appName){ document.title=s.appName; }
    const r=document.documentElement;
    if(s.primary)r.style.setProperty("--gold",s.primary);
    if(s.ground)r.style.setProperty("--ground",s.ground);
  }catch(e){}
}

function vWizard(){
  const s=SETUP||{};
  const dots=WIZ_STEPS.map((l,i)=>\`<span style="display:inline-block;width:7px;height:7px;border-radius:50%;
    margin-right:5px;background:\${i===WIZ_STEP?"var(--gold)":i<WIZ_STEP?"var(--teal)":"var(--line)"}"></span>\`).join("");
  let b="";

  if(WIZ_STEP===0){
    b=\`<div class="note" style="margin-bottom:6px">This is your app. Name it whatever you like.</div>
      \${wizField("wz_name","Your name","","e.g. Rahul Sharma")}
      \${wizField("wz_display","What should the app call you?",s.displayName,"e.g. Rahul")}
      \${wizField("wz_app","App name",s.appName,"e.g. RahulOS")}
      \${wizField("wz_tag","Tagline (optional)",s.tagline,"e.g. My health, tracked properly")}\`;
    b=b.replace('id="wz_name" type="text" value=""','id="wz_name" type="text" value="'+esc(s.name||"")+'"');
  }
  else if(WIZ_STEP===1){
    b=\`<div class="note" style="margin-bottom:6px">Your logo and colours. All of this is changeable later.</div>
      \${wizField("wz_face","Your avatar or logo (image path or URL)",s.faceImage,"assets/my-avatar.png")}
      <div class="note" style="margin-top:4px">Square PNG with a transparent background works best. Leave blank for none.</div>
      \${wizField("wz_primary","Primary colour",s.primary||"#EC9A3E","#EC9A3E")}
      \${wizField("wz_ground","Background colour",s.ground||"#120D0A","#120D0A")}\`;
  }
  else if(WIZ_STEP===2){
    b=\`<div class="note" style="margin-bottom:8px">Used to estimate your calorie needs for roughly the first three weeks.
      After that the app measures your actual energy balance from what you log, and this stops mattering.
      Leave it blank and the app will say your target isn't personalised rather than guessing.</div>
      \${wizField("wz_height","Height (cm)",s.heightCm,"175","number")}
      \${wizField("wz_age","Age (years)",s.ageYears,"30","number")}
      <label class="note" style="display:block;margin:10px 0 4px">Sex (for the calorie formula)</label>
      \${wizChoice("sex",{male:["Male",""],female:["Female",""]},s.sex)}
      \${wizField("wz_weight","Current weight (kg)",s.startingWeightKg,"70","number")}
      <label class="note" style="display:block;margin:12px 0 4px">Activity level</label>
      \${wizChoice("activity",ACTIVITY,s.activity)}\`;
  }
  else if(WIZ_STEP===3){
    b=\`<div class="note" style="margin-bottom:8px"><b>These are your numbers, not medical advice.</b>
      The suggestions below are common starting points, not recommendations for you specifically.
      If a target matters to your health, check it with a doctor or dietitian.</div>
      <label class="note" style="display:block;margin:4px 0">Primary goal</label>
      \${wizChoice("goal",GOALS,s.goal)}
      \${wizField("wz_targetw","Target weight (kg, optional)",s.targetWeightKg,"","number")}
      \${wizField("wz_kcal","Calorie floor — never go below this",s.kcalFloor,"2000","number")}
      \${wizField("wz_protein","Protein, grams per kg bodyweight",s.proteinPerKg,"1.8","number")}
      \${wizField("wz_water","Water target (litres)",s.waterLitres,"3","number")}
      \${wizField("wz_train","Training days per week",s.trainingDays,"4","number")}
      \${wizField("wz_diet","Dietary preference (optional)",s.dietHint," Assume Indian home cooking, vegetarian.")}
      \${wizField("wz_avoid","Foods to avoid (optional)",s.avoidFoods,"shellfish, peanuts")}
      \${wizField("wz_equip","Equipment available (optional)",s.equipment,"full gym / dumbbells only / bodyweight")}
      <label class="note" style="display:block;margin:12px 0 4px">Coaching tone</label>
      \${wizChoice("tone",TONES,s.tone)}\`;
  }
  else {
    b=\`<div class="note" style="margin-bottom:8px">Your data lives in <b>your own</b> Airtable base.
      Nothing is stored by this app's author and there is no server in between —
      your browser talks to your base directly.</div>
      \${wizField("wz_base","Your Airtable base ID",s.baseId,"appXXXXXXXXXXXXXX")}
      <div class="note" style="margin-top:4px">Found in your base's URL. See docs/DATA-MODEL.md for building the base itself.</div>
      <div class="note" style="margin-top:12px;line-height:1.6">
        <b>Next:</b> after finishing you'll be asked for your Airtable token, then
        your AI key in Settings. Neither is stored in any file — both stay in this browser.
      </div>\`;
  }

  return \`<div class="card">
    <div style="margin-bottom:10px">\${dots}</div>
    <div class="ttl">\${esc(WIZ_STEPS[WIZ_STEP])}</div>
    <div class="note" style="margin-bottom:10px">Step \${WIZ_STEP+1} of \${WIZ_STEPS.length}</div>
    \${b}
    <div style="display:flex;gap:8px;margin-top:16px">
      \${WIZ_STEP>0?\`<button class="btn" onclick="wizGo(\${WIZ_STEP-1})">Back</button>\`:""}
      \${WIZ_STEP<WIZ_STEPS.length-1
        ? \`<button class="btn p grow" onclick="wizGo(\${WIZ_STEP+1})">Continue</button>\`
        : \`<button class="btn p grow" onclick="wizFinish()">Finish setup</button>\`}
    </div>
    \${WIZ_STEP===0?\`<button class="btn full" style="margin-top:8px;opacity:.7" onclick="enterDemo()">Just show me the app first</button>\`:""}
  </div>\`;
}

function vSetup(){`
);

/* ---- Wire the wizard and demo into the boot state machine ---------- */

must(
  "wizard in render switch",
  /  if\(state==="needtoken"\)body=vSetup\(\);/,
  `  if(state==="setup")body=vWizard();
  else if(state==="needtoken")body=vSetup();`
);

/* FIX: loadAll() unconditionally set state="needtoken" whenever there was no
   token, which clobbered the wizard state set during boot — a genuinely fresh
   user never saw the Setup Wizard. It also blocked demo mode from loading its
   own sample data. Both are handled here, at the one guard responsible. */
/* In demo mode the schema is synthetic — loadSchema() would replace it with
   the public build's blank field IDs and every record would collapse. */
must(
  "loadAll uses the demo schema in demo mode",
  /    LOAD_STEP="Reading base schema…";R\(\);\n    SCHEMA=await loadSchema\(\);/,
  `    LOAD_STEP="Reading base schema…";R();
    SCHEMA = DEMO ? demoSchema() : await loadSchema();`
);

must(
  "loadAll token guard respects wizard and demo",
  /  if\(!TOKEN\)\{state="needtoken";R\(\);return\}/,
  `  if(!TOKEN && !DEMO){
    // A first-time visitor with no completed setup belongs in the wizard,
    // not staring at an Airtable token box they have no context for.
    state = setupComplete() ? "needtoken" : "setup";
    R(); return;
  }`
);

must(
  "wizard as first-run state",
  /  try\{TOKEN=await Store\.get\(TOKEN_KEY\)\}catch\(e\)\{TOKEN=null\}/,
  `  loadSetup();
  try{TOKEN=await Store.get(TOKEN_KEY)}catch(e){TOKEN=null}
  /* First run: no token and no completed setup means this person has never
     been here. Send them to the wizard rather than an Airtable token box. */
  if(!TOKEN && !setupComplete()){ state="setup"; }`
);

must(
  "demo banner",
  /  const offlineBar = \(!navigator\.onLine \|\| WRITE_QUEUE\.length\)/,
  `const demoBar = DEMO
    ? '<div class="card" style="border-color:var(--gold);background:rgba(236,154,62,.09);padding:10px 12px;margin-bottom:10px">'
      +'<div style="font-weight:600;font-size:13px">Demo — sample data, nothing is saved</div>'
      +'<div class="note" style="margin-top:3px">These figures are made up. Nothing here writes to Airtable.</div>'
      +'<button class="btn sm p" style="margin-top:8px" onclick="exitDemo()">Set up my own</button></div>'
    : "";
  const offlineBar = (!navigator.onLine || WRITE_QUEUE.length)`
);

must(
  "demo banner rendered",
  /document\.getElementById\("app"\)\.innerHTML=head\+offlineBar\+body\+sheetHtml/,
  `document.getElementById("app").innerHTML=head+demoBar+offlineBar+body+sheetHtml`
);

/* ==================================================================== *
 * Wire wizard answers into the values the app actually uses.
 * USER() resolves localStorage → config.js → framework default.
 * ==================================================================== */

must(
  "wizard-aware branding",
  /const APP_NAME=CFG_BRAND\.appName\|\|"AbhinavOS";\nconst APP_TAGLINE=CFG_BRAND\.tagline\|\|"Personal health operating system";\nconst USER_DISPLAY_NAME=CFG_BRAND\.displayName\|\|"";/,
  `function APP_NAME_(){ return USER("appName", CFG_BRAND.appName||"AbhinavOS"); }
function APP_TAGLINE_(){ return USER("tagline", CFG_BRAND.tagline||"Personal health operating system"); }
function USER_DISPLAY_NAME_(){ return USER("displayName", CFG_BRAND.displayName||""); }
/* Kept as live getters, not constants, because the Setup Wizard can change
   them mid-session and the header has to follow immediately. */
Object.defineProperty(globalThis,"APP_NAME",{get:APP_NAME_});
Object.defineProperty(globalThis,"APP_TAGLINE",{get:APP_TAGLINE_});
Object.defineProperty(globalThis,"USER_DISPLAY_NAME",{get:USER_DISPLAY_NAME_});`
);

must(
  "wizard-aware avatar",
  /const FACE_URI=\(window\.ABOS_CONFIG&&window\.ABOS_CONFIG\.faceImage\)\|\|"";/,
  `Object.defineProperty(globalThis,"FACE_URI",{get:()=>USER("faceImage",(CFG.branding&&CFG.branding.faceImage)||CFG.faceImage||"")});`
);

must(
  "wizard-aware theme",
  /  Object\.keys\(map\)\.forEach\(k=>\{ if\(t\[k\]\)r\.style\.setProperty\(map\[k\],t\[k\]\); \}\);/,
  `  Object.keys(map).forEach(k=>{ if(t[k])r.style.setProperty(map[k],t[k]); });
  // Wizard answers win over config.js for the two colours it collects.
  const wp=USER("primary",null), wg=USER("ground",null);
  if(wp)r.style.setProperty("--gold",wp);
  if(wg)r.style.setProperty("--ground",wg);`
);

must(
  "wizard-aware profile",
  /  const p=CFG_PROFILE;\n  const has=p&&p\.heightCm&&p\.ageYears&&p\.sex;/,
  `  const p={
    heightCm:USER("heightCm",CFG_PROFILE.heightCm),
    ageYears:USER("ageYears",CFG_PROFILE.ageYears),
    sex:USER("sex",CFG_PROFILE.sex),
    startingWeightKg:USER("startingWeightKg",CFG_PROFILE.startingWeightKg)
  };
  const has=p&&p.heightCm&&p.ageYears&&p.sex;`
);

must(
  "wizard-aware targets",
  /const WATER_TARGET=CFG_TARGETS\.waterLitres\|\|3\.5; \/\/ litres — example default/,
  `/* Live getters — the wizard and Settings can change these mid-session. */
Object.defineProperty(globalThis,"WATER_TARGET",{get:()=>Number(USER("waterLitres",CFG_TARGETS.waterLitres||3.5))});`
);

must(
  "wizard-aware protein and deficit",
  /const PROTEIN_G_PER_KG = CFG_TARGETS\.proteinPerKg \|\| 2\.0;\nconst RECOMP_DEFICIT   = CFG_TARGETS\.deficitMultiplier \|\| 0\.85;/,
  `Object.defineProperty(globalThis,"PROTEIN_G_PER_KG",{get:()=>Number(USER("proteinPerKg",CFG_TARGETS.proteinPerKg||2.0))});
/* Deficit follows the goal chosen in the wizard unless explicitly overridden. */
const GOAL_DEFICIT={fatloss:0.85, maintain:1.0, muscle:1.10, health:1.0};
Object.defineProperty(globalThis,"RECOMP_DEFICIT",{get:()=>{
  const explicit=USER("deficitMultiplier",null);
  if(explicit)return Number(explicit);
  const g=USER("goal",null);
  return (g&&GOAL_DEFICIT[g])||CFG_TARGETS.deficitMultiplier||0.85;
}});`
);

must(
  "wizard-aware calorie floor",
  /  const kcalFloor = CFG_TARGETS\.kcalFloor \|\| 2000;/,
  `  const kcalFloor = Number(USER("kcalFloor", CFG_TARGETS.kcalFloor || 2000));`
);

must(
  "wizard-aware base id",
  /const BASE=\(window\.ABOS_CONFIG&&window\.ABOS_CONFIG\.baseId\)\|\|"";/,
  `Object.defineProperty(globalThis,"BASE",{get:()=>USER("baseId",(window.ABOS_CONFIG&&window.ABOS_CONFIG.baseId)||"")});`
);

must(
  "wizard-aware diet hint",
  /const DIET_HINT=\(window\.ABOS_CONFIG&&window\.ABOS_CONFIG\.dietHint\)\|\|"";/,
  `Object.defineProperty(globalThis,"DIET_HINT",{get:()=>USER("dietHint",(window.ABOS_CONFIG&&window.ABOS_CONFIG.dietHint)||"")});`
);

/* The coach prompt gains the wizard's preferences, appended rather than
   replacing anything the user wrote themselves in config.js. */
must(
  "coach preferences from wizard",
  /const COACH_SYSTEM=\(window\.ABOS_CONFIG&&window\.ABOS_CONFIG\.coachSystem\)\|\|`/,
  `function coachPrefsBlock(){
  const s=SETUP||{}; const bits=[];
  if(s.displayName)bits.push("The user's name is "+s.displayName+".");
  if(s.goal&&GOALS&&GOALS[s.goal])bits.push("Primary goal: "+GOALS[s.goal][0]+".");
  if(s.activity&&ACTIVITY&&ACTIVITY[s.activity])bits.push("Activity level: "+ACTIVITY[s.activity][0]+".");
  if(s.trainingDays)bits.push("Trains about "+s.trainingDays+" days a week.");
  if(s.equipment)bits.push("Equipment available: "+s.equipment+".");
  if(s.avoidFoods)bits.push("MUST NOT suggest these foods: "+s.avoidFoods+".");
  if(s.targetWeightKg)bits.push("Target weight: "+s.targetWeightKg+"kg.");
  if(s.tone==="direct")bits.push("Tone: direct and factual. No cheerleading.");
  if(s.tone==="supportive")bits.push("Tone: warm and encouraging, gentle framing.");
  if(s.tone==="strict")bits.push("Tone: hold them to the target and name the gap plainly.");
  return bits.length?"\\n\\nUSER PREFERENCES:\\n"+bits.join("\\n"):"";
}
const COACH_SYSTEM_BASE=(window.ABOS_CONFIG&&window.ABOS_CONFIG.coachSystem)||\``
);

must(
  "coach prompt assembly",
  /say briefly why the user is on track rather than manufacturing advice\.`;/,
  `say briefly why the user is on track rather than manufacturing advice.\`;
Object.defineProperty(globalThis,"COACH_SYSTEM",{get:()=>COACH_SYSTEM_BASE+coachPrefsBlock()});`
);

/* ---- Phase 3: attribution ----------------------------------------- */

must(
  "brand name in header",
  /const head=`<header><div><div class="brand">\$\{FACE_IMG\}Abhinav<em>OS<\/em><\/div>/,
  'const head=`<header><div><div class="brand">${FACE_IMG}${brandHTML()}</div>'
);

must(
  "framework credit in footer",
  /const TABS=\[/,
  `/* Framework attribution. Subtle, non-interactive, sits below the nav.
   Please leave this in place — see ATTRIBUTION.md and the licence's
   Required Notice. It never carries a personal email address. */
function frameworkCredit(){
  return '<div class="fwcredit">'+FRAMEWORK_CREDIT+'</div>';
}
const TABS=[`
);

must(
  "footer credit styles",
  /\*\{box-sizing:border-box;-webkit-tap-highlight-color:transparent\}/,
  `.fwcredit{text-align:center;font-size:10.5px;letter-spacing:.04em;color:var(--muted);
  opacity:.62;padding:14px 10px 4px;user-select:none}
.aboutrow{display:flex;justify-content:space-between;gap:12px;padding:7px 0;
  border-bottom:1px solid var(--line);font-size:13px}
.aboutrow:last-child{border-bottom:none}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}`
);

// Render the credit at the end of the app body, above the fixed nav.
must(
  "render framework credit",
  /document\.getElementById\("app"\)\.innerHTML=head\+demoBar\+offlineBar\+body\+sheetHtml\+\(state==="ready"\?vCoachWidget\(\):""\);/,
  `document.getElementById("app").innerHTML=head+demoBar+offlineBar+body+sheetHtml
    +(state==="ready"?vCoachWidget():"")+frameworkCredit();`
);

// Apply the user's theme and app name once, at boot.
must(
  "apply theme at boot",
  /if\("serviceWorker" in navigator\)\{/,
  `/* Branding is applied once, before first paint, so a custom theme never
   flashes the framework's default colours first. */
try{ applyTheme(); }catch(e){ console.warn("theme config ignored:",e); }

if("serviceWorker" in navigator){`
);

// An About / Credits card, shown on the Stats tab.
must(
  "about and credits panel",
  /function frameworkCredit\(\)\{/,
  `/* About / Credits. Names the user's app, states plainly that it runs on
   the AbhinavOS framework, and carries the medical disclaimer. Collapsed
   by default so it never competes with the day's actual content. */
function vAbout(){
  const rows=[
    ["App", esc(APP_NAME)],
    ["Tagline", esc(APP_TAGLINE)],
    USER_DISPLAY_NAME?["For", esc(USER_DISPLAY_NAME)]:null,
    ["Framework", esc(FRAMEWORK_NAME)],
    ["Framework author", esc(FRAMEWORK_AUTHOR)],
    ["Licence", "PolyForm Noncommercial 1.0.0"]
  ].filter(Boolean);
  return collapse("about","About","credits",
    \`<div style="margin-bottom:10px">
      \${rows.map(([k,v])=>\`<div class="aboutrow"><span class="note">\${k}</span><span>\${v}</span></div>\`).join("")}
     </div>
     <div class="note" style="line-height:1.5">
       \${esc(APP_NAME)} is a personal health operating system built from the
       \${esc(FRAMEWORK_NAME)} framework by \${esc(FRAMEWORK_AUTHOR)}. Your data,
       your configuration and your branding are yours.
     </div>
     <div class="note" style="margin-top:9px;line-height:1.5;color:var(--muted)">
       Not a medical device. Nothing here is medical advice or a diagnosis.
       Lab reference ranges come from your own lab report. Anything flagged
       is a pattern worth discussing with a doctor, not a conclusion.
     </div>\`);
}

function frameworkCredit(){`
);

must(
  "about panel on stats tab",
  /    h\+=collapse\('settings',"Settings",connectedCount\+"\/3 AI connected",settingsBody\);\n  \}\n  return h;/,
  `    h+=collapse('settings',"Settings",connectedCount+"/3 AI connected",settingsBody);
  }
  h+=vAbout();
  return h;`
);


/* ==================================================================== *
 * SETTINGS — edit everything the wizard captured, plus Copy my config
 * ==================================================================== */

must(
  "settings and framework mark",
  /function vAbout\(\)\{/,
  `/* Emits a ready-made config.js from whatever the wizard captured. Useful
   on its own, and specifically useful for handing to Claude when someone
   wants help going beyond what the wizard covers. */
function exportConfig(){
  const s=SETUP||{};
  const q=v=>JSON.stringify(v);
  const L=[];
  L.push("/* Generated by the "+FRAMEWORK_NAME+" Setup Wizard.");
  L.push("   Save this as app/config.js. It is gitignored by default.");
  L.push("   API keys are NOT here — they stay in your browser. */");
  L.push("window.ABOS_CONFIG = {");
  L.push("  branding: {");
  ["appName","tagline","displayName","faceImage"].forEach(k=>{
    if(s[k])L.push("    "+k+": "+q(s[k])+",");
  });
  L.push("  },");
  if(s.primary||s.ground){
    L.push("  theme: {");
    if(s.primary)L.push("    primary: "+q(s.primary)+",");
    if(s.ground)L.push("    ground: "+q(s.ground)+",");
    L.push("  },");
  }
  L.push("  profile: {");
  ["heightCm","ageYears","startingWeightKg"].forEach(k=>{ if(s[k])L.push("    "+k+": "+Number(s[k])+","); });
  if(s.sex)L.push("    sex: "+q(s.sex)+",");
  L.push("  },");
  L.push("  targets: {");
  [["kcalFloor","kcalFloor"],["waterLitres","waterLitres"],["proteinPerKg","proteinPerKg"]]
    .forEach(([k,o])=>{ if(s[k])L.push("    "+o+": "+Number(s[k])+","); });
  L.push("  },");
  if(s.baseId)L.push("  baseId: "+q(s.baseId)+",");
  if(s.dietHint)L.push("  dietHint: "+q(s.dietHint)+",");
  L.push("};");
  const text=L.join("\\n");
  try{
    navigator.clipboard.writeText(text);
    alert("config.js copied to your clipboard.\\n\\nSave it as app/config.js, or paste it to Claude if you want help going further.");
  }catch(e){
    prompt("Copy this and save it as app/config.js:", text);
  }
}

function rerunSetup(){
  if(!confirm("Re-open setup? Your answers are kept — you can change any of them."))return;
  WIZ_STEP=0; state="setup"; R();
}

/* Everything the wizard captured, editable afterwards. */
function vProfileSettings(){
  const s=SETUP||{};
  const row=(k,v)=>\`<div class="aboutrow"><span class="note">\${esc(k)}</span><span>\${esc(v||"not set")}</span></div>\`;
  const goal=s.goal&&GOALS[s.goal]?GOALS[s.goal][0]:null;
  const act=s.activity&&ACTIVITY[s.activity]?ACTIVITY[s.activity][0]:null;
  const tone=s.tone&&TONES[s.tone]?TONES[s.tone][0]:null;
  const body=\`
    \${row("App name",s.appName)}
    \${row("Called",s.displayName)}
    \${row("Height",s.heightCm?s.heightCm+" cm":null)}
    \${row("Age",s.ageYears)}
    \${row("Sex",s.sex)}
    \${row("Activity",act)}
    \${row("Goal",goal)}
    \${row("Calorie floor",s.kcalFloor)}
    \${row("Protein g/kg",s.proteinPerKg)}
    \${row("Water (L)",s.waterLitres)}
    \${row("Training days",s.trainingDays)}
    \${row("Coaching tone",tone)}
    <div class="note" style="margin-top:10px;line-height:1.5">
      Targets shown here are yours, not medical recommendations. The calorie
      estimate becomes measured rather than estimated after about three weeks
      of logging.
    </div>
    <button class="btn p full" style="margin-top:12px" onclick="rerunSetup()">Edit these answers</button>
    <button class="btn full" style="margin-top:8px" onclick="exportConfig()">Copy my config.js</button>
    <div class="note" style="margin-top:6px">Useful if you want your setup in version control, or want Claude to help you go further.</div>\`;
  return collapse("profilesettings","Your profile & goals",s.appName||"",body);
}

function vAbout(){`
);

must(
  "profile settings on stats tab",
  /  h\+=vAbout\(\);\n  return h;/,
  `  h+=vProfileSettings();
  h+=vAbout();
  return h;`
);

/* ---- The framework mark: the uploaded caricature logo -------------- */

must(
  "framework mark in footer credit",
  /function frameworkCredit\(\)\{\n  return '<div class="fwcredit">'\+FRAMEWORK_CREDIT\+'<\/div>';\n\}/,
  `function frameworkCredit(){
  /* The framework's attribution mark — the creator's caricature logo. It is
     deliberately small and non-interactive. The wording stays "Powered by
     <author>" rather than leading with the framework name, so a customised
     app reads as the user's app first. See ATTRIBUTION.md. */
  return '<div class="fwcredit">'
    + '<img src="assets/framework-mark-48.png" alt="" class="fwmark">'
    + '<span>Powered by ' + FRAMEWORK_AUTHOR + '</span></div>';
}`
);

must(
  "framework mark styles",
  /\.fwcredit\{text-align:center;font-size:10\.5px;letter-spacing:\.04em;color:var\(--muted\);\n  opacity:\.62;padding:14px 10px 4px;user-select:none\}/,
  `.fwcredit{display:flex;align-items:center;justify-content:center;gap:6px;
  font-size:10.5px;letter-spacing:.04em;color:var(--muted);
  opacity:.6;padding:16px 10px 6px;user-select:none}
.fwmark{width:17px;height:17px;border-radius:50%;opacity:.9;flex:none}
.fwmark-lg{width:34px;height:34px;border-radius:50%;flex:none}`
);

must(
  "framework mark in about panel",
  /  return collapse\("about","About","credits",\n    `<div style="margin-bottom:10px">/,
  `  return collapse("about","About","credits",
    \`<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
       <img src="assets/framework-mark-128.png" alt="" class="fwmark-lg">
       <div><div style="font-weight:600">\${esc(APP_NAME)}</div>
       <div class="note">Powered by \${esc(FRAMEWORK_AUTHOR)}</div></div>
     </div>
     <div style="margin-bottom:10px">`
);

/* ---- App identity in title, manifest-facing strings ---------------- */

must(
  "document title",
  /<title>AbhinavOS<\/title>/,
  `<title>AbhinavOS</title><!-- replaced at boot by branding.appName -->`
);

/* The file was relying on the server sending charset=utf-8. Netlify does;
   python -m http.server and some static hosts do not, and every em dash and
   middot in the UI turned to mojibake. Declaring it in the document makes
   rendering correct regardless of who serves it. Must be within the first
   1024 bytes of <head>, so it goes first. */
must(
  "utf-8 charset declaration",
  /<meta name="theme-color" content="#120D0A">/,
  `<meta charset="utf-8">\n<meta name="theme-color" content="#120D0A">`
);

/* ------------------------------------------------------------------ *
 * 7. Private base name in the onboarding instructions.
 * ------------------------------------------------------------------ */

mustAll(
  "private base name",
  /\b[A-Z][A-Za-z]* ?OS — [A-Z][a-z]+ System\b/g,   // private base name, shape only
  "your own base"
);

/* The token screen named the framework's base rather than the user's app. */
must(
  "token screen uses the user's app name",
  /4\. Access — add base <b>your own base<\/b><br>/,
  "4. Access — add the base you built for <b>\${esc(APP_NAME)}</b><br>"
);

/* ------------------------------------------------------------------ *
 * Done.
 * ------------------------------------------------------------------ */

writeFileSync(outPath, src, "utf8");

console.log("Applied rules:");
applied.forEach((r) => console.log("  -", r));
console.log(
  `\nWrote ${outPath} (${(Buffer.byteLength(src) / 1024).toFixed(0)} KB, ` +
    `down from ${(Buffer.byteLength(readFileSync(inPath, "utf8")) / 1024).toFixed(0)} KB).`
);
console.log("Now run: bash tools/secret-scan.sh " + outPath);
