/* ============================================================================
 * YOUR CONFIGURATION — this is the file that makes this app yours.
 * ============================================================================
 *
 *   1. Copy this file to `config.js` in the same folder.
 *   2. Fill in the parts you want. Everything is optional except `baseId`
 *      and `schema` — leave a section out and the framework default applies.
 *   3. Never commit `config.js`. It's already in .gitignore.
 *
 * WHAT IS AND ISN'T A SECRET
 * Your API keys are NOT in this file. You type those into the app itself and
 * they stay in your browser. What's here is the map to *your* Airtable base
 * plus your own targets and identity — still yours, still private.
 *
 * If config.js is missing entirely, the app loads with framework defaults and
 * asks you for an Airtable token. That's the correct behaviour for a fresh
 * clone that hasn't been set up.
 *
 * ---------------------------------------------------------------------------
 * ABOUT THE EXAMPLE VALUES BELOW
 *
 * Three different kinds of number appear in this app. Keep them straight:
 *
 *   EXAMPLE / DEFAULT  — a starting point shipped with the framework. It is
 *                        NOT medical advice and NOT correct for everyone.
 *                        It came from one person's own protocol.
 *   USER-PROVIDED      — what you set here. Your body, your goals.
 *   CALCULATED         — what the app works out from your logged data over
 *                        time (TDEE, weight EMA, adherence). These override
 *                        the defaults once enough data exists.
 *
 * This app is not a medical device. Nothing it produces is medical advice or
 * a diagnosis. Talk to a doctor about targets that matter to your health.
 * ========================================================================= */

window.ABOS_CONFIG = {

  /* ==================================================================== *
   * 1. BRANDING — make it your app
   * ==================================================================== */
  branding: {
    // Your app's name. If it ends in "OS" the accent styling is applied
    // automatically: "RahulOS" renders as Rahul + a coloured OS.
    appName: "AbhinavOS",

    tagline: "Personal health operating system",

    // Optional. Shown in About/Credits, e.g. "For: Rahul".
    displayName: "",

    // Namespaces this app's browser storage. Change it if you run more than
    // one fork in the same browser, so they don't overwrite each other's
    // saved token and settings. Lowercase, no spaces.
    storagePrefix: "abhinavos",

    // YOUR avatar / caricature, shown small in the header.
    // Recommended: square PNG with transparency, 192x192 or larger.
    // Put the file in the app/ folder (or app/assets/) and point at it.
    //   faceImage: "assets/my-avatar.png",
    // A data: URI also works if you'd rather not add a file.
    //
    // End users don't need this at all — the setup wizard has an "Add
    // Photo" step that opens their device's normal photo picker, previews
    // the result, and lets them change or remove it. Whatever they pick is
    // saved in the browser and takes over from this value automatically, so
    // it's still fine to leave faceImage set here as the shared default
    // before anyone has chosen their own photo.
    faceImage: "",

    // YOUR larger character image, shown on the boot screen and in restart
    // mode. Recommended: portrait PNG with transparency, ~600px tall.
    // Defaults to the app icon if you leave it empty.
    //
    // If a user has picked a profile photo in the wizard, that same photo is
    // used here too — there's only one "photo" concept end users see. Set
    // charImage explicitly if you want the boot portrait to always differ
    // from the small header photo, even for users who've chosen their own.
    charImage: "",
  },

  /* ==================================================================== *
   * 2. THEME — make it look like yours
   *
   * Each key maps to one CSS custom property. Anything you omit keeps the
   * framework's default. Use any valid CSS colour.
   *
   * End users don't need any of this — the in-app setup wizard now offers a
   * "Look & Feel" step with ready-made theme cards (Warm, Midnight, Soft,
   * Calm, Energy, Minimal) plus two colour pickers, no hex codes required.
   * Picking one there is saved as a theme identifier, not raw colours, and
   * always wins over whatever is set here. The block below is still the
   * right place for a developer who wants to hand-pick every token, or ship
   * a fixed look nobody can change from the wizard.
   * ==================================================================== */
  theme: {
    // ground:    "#120D0A",  // page background
    // surface:   "#1D1712",  // cards
    // surface2:  "#261E17",  // inputs, nested panels
    // line:      "#392C20",  // borders
    // ink:       "#F2ECE1",  // primary text
    // ink2:      "#C7BAA4",  // secondary text
    // muted:     "#9C8D76",  // captions, the footer credit
    // primary:   "#EC9A3E",  // buttons, active states, focus rings
    // secondary: "#D9722E",  // secondary accent
    // success:   "#8FCB9B",  // on-track indicators
    // attention: "#E2694A",  // over-ceiling warnings
    // neutral:   "#7A6E58",  // under-floor — deliberately not alarming
    // accent:    "#B49BE0",  // XP / points
    // radius:    "16px",     // corner rounding

    // FONTS — honest limitation: the framework loads four Google fonts in
    // the HTML <head>. Setting a family here changes body text, but a font
    // that isn't loaded falls back to a system font. To use a different
    // font properly, also edit the Google Fonts <link> at the top of
    // index.html. That is the one branding change that needs a code edit.
    // fontBody:    "'Inter', sans-serif",
    // fontHeading: "'Archivo', sans-serif",
  },

  /* ==================================================================== *
   * 3. YOUR PROFILE — used only for the cold-start estimate
   *
   * For roughly the first 21 days, before there's enough logged data to
   * measure your actual energy balance, the app needs a rough starting
   * point. It uses the Mifflin-St Jeor equation, which is a POPULATION
   * estimate and will be wrong for most individuals to some degree.
   *
   * If you leave this out, the app uses neutral reference figures and
   * clearly labels the result as "not personalised" rather than quietly
   * pretending it knows your body. Once ~21 days of real intake and weight
   * data exist, measured energy balance replaces this entirely.
   * ==================================================================== */
  profile: {
    // heightCm: 175,
    // ageYears: 30,
    // sex: "male",            // "male" or "female" — selects the formula
    // startingWeightKg: 70,   // only used until you log a real weight
  },

  /* ==================================================================== *
   * 4. YOUR TARGETS
   *
   * EXAMPLE VALUES. These are one person's protocol choices, not medical
   * recommendations. Set your own, ideally with a doctor or dietitian.
   * ==================================================================== */
  targets: {
    // A FLOOR, not a ceiling. This app is deliberately built so that
    // under-eating is the failure it guards against, and the calorie target
    // never adapts downward past this number.
    // kcalFloor: 2000,

    // waterLitres: 3.5,

    // Grams of protein per kg of bodyweight.
    // proteinPerKg: 2.0,

    // Multiplier applied to your estimated TDEE. Below 1.0 is a deficit.
    // deficitMultiplier: 0.85,

    // Used only before any weight has been logged.
    // proteinFallbackG: 150,
  },

  /* ==================================================================== *
   * 5. AIRTABLE — your own base, your own data
   *
   * Your records live in YOUR Airtable base. Nobody else's data is in this
   * repository and yours never leaves your account: the app talks to
   * Airtable directly from your browser. There is no server in between.
   *
   * Find your base ID in the URL when you open the base:
   *   https://airtable.com/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY/...
   *                       ^^^^^^^^^^^^^^^^^^
   * ==================================================================== */
  baseId: "appXXXXXXXXXXXXXX",

  /* The app addresses Airtable by field ID, not field name, so renaming a
     column in Airtable never breaks it. The cost is that every ID has to be
     declared once, here.

     To read yours: create a personal access token with `schema.bases:read`
     and call https://api.airtable.com/v0/meta/bases/{baseId}/tables

     See docs/DATA-MODEL.md for what each table holds. Everything except
     `daily.date` is optional — leave a key out and the card that needs it
     hides itself rather than erroring. */
  schema: {
    // ---- table IDs ----
    daily:     { id: "tblXXXXXXXXXXXXXX" },  // Daily Log — one row per day
    food:      { id: "tblXXXXXXXXXXXXXX" },  // Food Log — one row per item eaten
    fl:        { id: "tblXXXXXXXXXXXXXX" },  // Food Library — verified foods
    gym:       { id: "tblXXXXXXXXXXXXXX" },  // Gym Sessions — one row per session
    lift:      { id: "tblXXXXXXXXXXXXXX" },  // Lift Log — one row per exercise per day
    exl:       { id: "tblXXXXXXXXXXXXXX" },  // Exercise Library
    act:       { id: "tblXXXXXXXXXXXXXX" },  // Medical Actions — open follow-ups
    supp:      { id: "tblXXXXXXXXXXXXXX" },  // Supplements — stock and schedule
    score:     { id: "tblXXXXXXXXXXXXXX" },  // Score Rules — the behaviour ledger
    dscore:    { id: "tblXXXXXXXXXXXXXX" },  // Daily Score — one computed row per day
    muscleVol: { id: "tblXXXXXXXXXXXXXX" },  // Muscle Volume — weekly sets per group
    lp:        { id: "tblXXXXXXXXXXXXXX" },  // Lab Panels
    lr:        { id: "tblXXXXXXXXXXXXXX" },  // Lab Results

    /* ---- Daily Log fields (S.D) ----
       Only `date` is genuinely required. The full key list:

       date datekey weight official sleep deep rem awake onset water steps
       mode gymDone skinAM skinPM suppAM suppPM eveningCutoff habitCount
       nasal left bloat energy stress alcohol notes foodLink kcal p c f na
       grain gate spo2 spo2Dips hrv restingHR stoolForm bmCount emaWeight
       tdee photos therapyUsed therapyHours deviceIndex grog                */
    D: {
      date: "fldXXXXXXXXXXXXXX",
      weight: "fldXXXXXXXXXXXXXX",
      sleep: "fldXXXXXXXXXXXXXX",
      water: "fldXXXXXXXXXXXXXX",
      steps: "fldXXXXXXXXXXXXXX",
      // ...add the rest of the keys above for the fields you actually have.
    },

    // Food Log
    F:     { date:"", meal:"", qty:"", item:"", notes:"", day:"", raw:"",
             kcal:"", p:"", c:"", f:"", fib:"", na:"", ca:"", grain:"",
             tol:"", note:"" },

    // Gym Sessions
    G:     { date:"", split:"", dur:"", core:"", cardio:"", rpe:"", notes:"" },

    // Lift Log
    L:     { date:"", ex:"", w:"", sets:"", reps:"", side:"", notes:"" },

    // Medical Actions
    A:     { action:"", priority:"", category:"", opened:"", status:"",
             done:"", notes:"" },

    // Exercise Library
    E:     { name:"", group:"", type:"", repMin:"", repMax:"", cur:"",
             uni:"", notes:"" },

    // Supplements
    SUP:   { name:"", dose:"", timing:"", status:"", purpose:"", notes:"",
             units:"", dailyDose:"", threshold:"", daysLeft:"", flag:"",
             link:"", restocked:"", recheckDue:"" },

    // Score Rules — behaviour, point value, direction, category, active flag
    SCORE: { behaviour:"", points:"", direction:"", category:"", active:"",
             conf:"", suspend:"", notes:"" },

    // Daily Score
    DS:    { date:"", earned:"", lostRaw:"", logged:"", gap:"", restart:"",
             restartGoal:"", freshStart:"", weeklyMax:"", notes:"" },

    // Muscle Volume
    MV:    { week:"", group:"", sets:"", sessions:"" },

    // Lab Panels / Lab Results
    LP:    { date:"", lab:"", fasting:"", context:"" },
    LR:    { marker:"", date:"", value:"", unit:"", refLow:"", refHigh:"",
             status:"", category:"", notes:"" },
  },

  /* ==================================================================== *
   * 6. MULTI-SELECT OPTION LISTS
   *
   * These MUST exactly match the options you configured on the matching
   * Airtable `multipleSelects` fields, or Airtable rejects the write.
   * Whatever you put here appears as tappable chips on Today.
   * Omit any of them and that group doesn't render.
   * ==================================================================== */
  // multiSelects: {
  //   suppAM: ["Creatine", "Vitamin D3", "B12"],
  //   suppPM: ["Magnesium"],
  //   skinAM: ["Cleanser", "Moisturiser", "SPF 50"],
  //   skinPM: ["Cleanser", "Moisturiser"],
  // },

  /* ==================================================================== *
   * 7. AI — your providers, your coach
   *
   * API KEYS DO NOT GO HERE. You enter them in the app's Settings screen
   * and they're stored in your browser only.
   *
   * The app supports Gemini, Groq and OpenRouter, tried in order with
   * automatic failover. If all three are unavailable, a local parser that
   * runs entirely in the page takes over, so meal logging never blocks.
   *
   * What AI is allowed to do here: interpret language (turn "2 rotis, dal"
   * into structured macros) and phrase coaching notes. What it is NOT
   * allowed to do: score anything, set a target, or write to the database.
   * All of that is deterministic code. See docs/AI-LAYER.md.
   * ==================================================================== */

  // Optional steer for the meal parser — helps it estimate portions for a
  // cuisine it might otherwise guess badly.
  // dietHint: " Assume Indian home cooking, vegetarian.",

  /* YOUR COACH. This is the standing brief that sits above your live data.
     Put your real constraints here — allergies, injuries, intolerances,
     anything a doctor told you to avoid. Leave it out and a sensible
     generic coach is used instead.

     The coach never diagnoses and should not be asked to. */
  // coachSystem: `You are a personal health coach embedded in a tracking app.
  //
  // HARD RULES:
  // - Never recommend <thing your doctor told you to avoid>.
  // - <injury> — never program <exercise>. Use <substitutes> instead.
  // - Never diagnose. Route anything concerning to a GP.
  // ...`,

  /* ==================================================================== *
   * 8. LABS AND HABITS
   * ==================================================================== */

  // Which lab markers appear, and in what order. Anything not listed is
  // hidden. Omit this and every marker shows, alphabetically.
  // labPriority: ["Vitamin D3", "Vitamin B12", "Fasting Glucose"],

  // Your own retest goals per marker. `dir` is "below", "above" or "range"
  // (with `goal` as [low, high]). Reference ranges still come from YOUR lab
  // report via Airtable — this is only your target on top of them.
  // labTargets: { "LDL Cholesterol": { goal: 100, dir: "below" } },

  // Yes/no habits shown on Today. Each `f` must be a key that exists in
  // schema.D and points at an Airtable checkbox field.
  // boolChecks: [
  //   { f: "eveningCutoff", l: "Evening cutoff held", s: "Rolling rate, not a streak" },
  // ],

  // Starting loads, used only when an exercise has no logged history yet.
  // seedWeights: { "Lat Pulldown": 25, "Bench Press": 20, "Leg Press": 80 },
};

/* ============================================================================
 * ATTRIBUTION
 *
 * This app is built on the AbhinavOS framework by Abhinav Jain.
 * Your name, branding, theme, data and configuration are entirely yours.
 * The framework credit in the footer and About panel is not configurable —
 * please leave it in place. See ATTRIBUTION.md and LICENSE.md.
 * ========================================================================= */
