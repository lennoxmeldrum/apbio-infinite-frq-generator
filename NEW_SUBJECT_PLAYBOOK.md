# New AP Subject Generator — Playbook

Everything learned from building Physics → Chemistry → Psychology, distilled
into a repeatable sequence. Follow this when spinning up a new AP subject
(Biology, Stats, World History, whatever) so the new repo starts off aligned
with the patterns already in the fleet.

## Rule zero — fork from the closest existing repo

All three generators in the fleet now share the same core: multi-unit
SelectionScreen with a random-fallback UX, the shared prompt-engineering
helpers (`formatTopicContext`, `resolveTopicPool`,
`pickRandomSubTopicSelection`), CED-aware prompt structure with an
explicit `=== COURSE CONTEXT (CED) ===` block, `STUDENT_RESPONSE_
EXTRACTION_RULES` wired into a 5-step extract-then-grade pipeline,
collision-free Firebase Storage archive via `generateArchiveFilename`,
and the conditional viewport lock (`h-screen overflow-hidden` only when
`appState !== 'SELECTION'`). Psychology additionally has
`normalizeEscapedWhitespace` and the source-authenticity contract; PCM
and Chem retain the `gemini-3-pro-image-preview` image generation loops.

Pick the template closest to your new subject:

- **AP Psychology** (`appsych-infinite-frq-generator`) — text-only.
  No image generation. Two FRQ types (AAQ, EBQ) built around synthesized
  peer-reviewed sources, with a hard Source Authenticity Contract and
  `normalizeEscapedWhitespace` defensive post-processing. Best starting
  point for social sciences, languages, and any subject whose FRQs are
  primarily text (AP US History, AP Gov, AP English Literature, AP
  French, AP Human Geography, etc.).
- **AP Physics C: Mechanics** (`appcm-infinite-frq-generator`) — science
  template with image generation retained (two `gemini-3-pro-image-preview`
  loops for question diagrams and scoring-guide diagrams). Four FRQ
  types (MR, TBR, LAB, QQT). Extraction rules cover free-body diagrams,
  sketched graphs, LAB data plots, and Greek-letter symbol disambiguation.
  Best starting point for quantitative science and math subjects where
  figures matter (AP Biology, AP Calculus AB/BC, AP Statistics, AP
  Environmental Science, AP Physics 1/2, AP Computer Science A, etc.).
- **AP Chemistry** (`apchem-infinite-frq-generator`) — same shape as
  PCM (image generation retained) but with chemistry-specific extraction
  rules (Lewis structures, particulate diagrams, state symbols, reaction
  arrow types →/⇌, element-case disambiguation). Two FRQ types (Short,
  Long). Useful if the new subject has particulate-level diagrams,
  structural notation, or otherwise resembles chemistry more than physics.

The rest of this playbook is written assuming you cloned from one of
these three. Decisions that depend on which template you chose are
called out in context.

## Step-by-step

### 1. Clone + rename

- `git clone` the Psychology repo into a new directory.
- Update `package.json` name, `metadata.json` name/description, and
  `index.html` `<title>`.
- Rename the Cloud Run service in `cloudbuild.yaml`. Pattern is
  `appXXX-infinite-frq-generator` where `XXX` is the subject shorthand
  (`apsych`, `apchem`, `appcm`, `apbio`, `apstat`, …).
- Update `README.md` top section. Leave infra sections alone.
- **Leave the reference docs in place.** `NEW_SUBJECT_PLAYBOOK.md` (this
  file), `FILENAME_COLLISION_FIX.md`, `PDF_ACCESS_WEBSITE.md`, and any
  `EXTRACTION.md` are reference material, not runtime code. The next
  subject spin-up depends on them being present. Do NOT delete them —
  every repo in the fleet should carry a copy so it can be used as a
  future template.
- If the template has a subject-specific `EXTRACTION.md` (PCM and Chem
  have one; Psych does not), replace its subject-specific sections
  (diagrams, symbol disambiguation, per-unit context, cross-unit
  disambiguation notes) with the new subject's equivalents rather than
  deleting the file. The general sections (exact extraction, page
  survey, crossed-out work, multi-page continuations, part labelling)
  should stay untouched.
- Replace the template's `CED-and-FRQs/` contents with the new subject's
  CED and sample FRQs (see Step 2).

### 2. Gather the CED material

Put the College Board CED PDFs into `CED-and-FRQs/` at the repo root so they
are available during the next Claude session for reference reads. Include:

- The full CED for the subject (at least the Course at a Glance + the Unit
  guides).
- 2–3 representative real FRQs + their scoring guides. This is your ground
  truth for prompt engineering.

The repo does not read these files at runtime. They exist so a human or
AI agent working on the repo can open them during design — and during
Step 6 you will lift explicit content from them into `buildSharedHeader`:
the full unit list with names, the official FRQ type names and the
expected emphasis of each, the Science Practices / skill categories the
course emphasizes, and the standard symbol/notation conventions. The
point of the CED PDFs is not only human reference — they are the source
material for the `=== COURSE CONTEXT (CED) ===` block the prompt should
contain. Skipping the CED reading pass produces plausible-sounding but
off-spec FRQs.

### 3. Decide the FRQ types up front

Write down for each type, before touching code:

- Official CED name (e.g., "Article Analysis Question").
- Short code (3–4 chars: AAQ, EBQ, LAB, MR, TBR, QQT).
- Number of parts and exact part labels (A, B, B(i), B(ii), C, …).
- Point value per part and the grand total.
- Whether it needs embedded sources / stimulus data / diagrams / none.
- Any "different source" / "different concept" / "must cite X" constraints.

Put this in a scratch file and use it as the spec for `buildXXXPrompt` helpers
later. Getting this wrong at the prompt stage causes silent rubric drift that
is painful to debug.

### 4. Rewrite `types.ts`

This file is the type-level contract the rest of the app is built on. Keep
the shape from Psychology:

```ts
export interface FRQMetadata {
  frqType: FRQType;
  frqTypeShort: string;      // 3–4 char code
  selectedUnits: UnitId[];
  selectedSubTopics: string[];
  actualSubTopics: string[];
  wasRandom: boolean;
}

export interface GeneratedFRQ {
  questionText: string;
  sources: Source[];          // empty if subject doesn't need them
  parts: FRQPart[];
  scoringGuide: string;
  rubricNotes: string;
  maxPoints: number;
  metadata: FRQMetadata;
}

export interface AssessmentResult {
  score: number;
  maxScore: number;
  feedback: string;
  breakdown: string;
  extractedResponse?: string; // Per-part verbatim extraction populated by gradeSubmission
}
```

If the subject doesn't have "sources" (e.g., AP Bio might use data tables
instead), rename the field or add a parallel `stimulus` field. Don't
piggyback wildly different concepts onto `sources[]`.

The `extractedResponse` field on `AssessmentResult` is what the 5-step
grading pipeline (Step 6) writes back into the UI so the marker can see
the verbatim per-part reading the model used before awarding points.

### 5. Rewrite `constants.ts`

- `UNITS`: one object per CED unit, `{ id, name, subTopics: [{ id, name }, …] }`.
- `FRQ_TYPES`: id, name, desc. The SelectionScreen renders these as buttons.
- `FRQ_POINT_TOTALS`: map from type → max points. Used for validation.
- `SUBJECT_SLUG`: short, lowercase, stable identifier. Used by
  `firestoreService.ts` to tag docs for the PDF access site.

Verify topic IDs and names against the CED PDFs you dropped into
`CED-and-FRQs/`. Don't trust memory — topic numbering has changed across
revisions in every subject.

### 6. Rewrite `services/geminiService.ts`

This is where most of the work lives. Copy the whole Psychology file and then
walk through it top to bottom, editing in place:

#### Reusable blocks to keep verbatim

- `normalizeEscapedWhitespace()` — post-processing helper that converts
  stray literal `\n`/`\r`/`\t` in Gemini's JSON output to real characters.
  **Do not skip this.** Gemini occasionally emits escaped newlines inside
  JSON string values and they render as literal text in the UI. This helper
  is the backstop.
- `getApiKey()` — runtime-config lookup with fallbacks. Keeps the
  `window.__RUNTIME_CONFIG__.FRQ` → `process.env.GEMINI_API_KEY` →
  `process.env.API_KEY` chain so both local dev and Cloud Run work without
  config changes.
- The usage-capture pattern around every `ai.models.generateContent(...)`
  call: declare a `const usage: UsageRecord[] = []` at the top of
  `generateFRQ`, then `usage.push(buildUsageRecord(MODEL, response.usageMetadata, imagesReturned))`
  after each call. Return `{ frq, usage, totalCostUsd: sumCost(usage), pricingVersion: PRICING_VERSION }`
  instead of the bare `GeneratedFRQ`. The imports come from `./pricing`.
  See `EXTRACTION.md` and the existing apbio implementation for the
  exact shape — losing this means the access site shows `—` in the
  Cost column for every FRQ this generator writes.
- `resolveTopicPool(selectedUnits, selectedSubTopics)` — returns the list of
  permissible topic IDs + names given the user's selection. Handles the
  "selected units with no explicit subtopics → expand to all subtopics"
  case.
- `pickRandomSubTopicSelection()` — picks 3–5 random topics from the full
  pool when the user provides empty selection. Sets `wasRandom: true`.
- `formatTopicContext(units, topics)` — renders a markdown bullet list of
  the permissible topic pool that gets injected into every prompt.
- The shared `buildSharedHeader()` that emits:
  - Markdown formatting rules (real newlines, not `\n`).
  - The topic pool.
  - The subject-level style guidance ("sound like College Board, not like a
    textbook").
- The `responseSchema` with required fields and nested shapes.
- The strict post-parse validators: length check on `parts[]`, sum check on
  part points, non-empty check on `scoringGuide`. Throw with a detail
  message; `App.tsx` catches and resets to SELECTION.

#### Per-subject changes

- `buildAAQPrompt`, `buildEBQPrompt`, etc. → rename / rewrite for the new
  FRQ types. Each builder is ~80 lines: spec of parts, source authenticity
  contract (if applicable), rubric shape.
- If the subject has **no sources**, delete the Source Authenticity
  Contract block entirely. Don't leave it in "just in case" — Gemini
  will obey it and invent sources.
- **Inject CED content into `buildSharedHeader`.** The prompt should
  contain a `=== COURSE CONTEXT (CED) ===` block that names the CED
  year, lists every unit in the course (not just the ones in the current
  topic pool — the full list, for situational awareness), names the
  official FRQ types with the expected emphasis of each, names the
  course's Science Practices / skill categories, and lists standard
  symbol/notation conventions the subject uses. See PCM and Chem
  `geminiService.ts` for worked examples. This is the "reference the
  CED in the prompt" requirement; skipping it produces plausible-sounding
  but off-spec FRQs.
- `STUDENT_RESPONSE_EXTRACTION_RULES` has a subject-agnostic core and a
  subject-specific shell. The **general** rules — exact extraction (no
  paraphrase), OCR-layer rejection, holistic page survey, PDF-wide
  continuation search, crossed-out work handling, multi-page
  continuations, part labelling — copy verbatim. The **subject-specific**
  sections need real adaptation:
  - Diagram extraction: free-body diagrams in Physics, Lewis +
    particulate diagrams in Chemistry, student-drawn axes in TBR-style
    parts, data plots in LAB-style parts. A text-only subject (Psych,
    a history, a language) can omit the diagram extraction section
    entirely.
  - Typical symbol disambiguation: Greek letters in mechanics (J/I/L/ω/α),
    element case and arrow types in chemistry (Co vs CO, → vs ⇌), APA
    citation format in psychology. List the most-common ambiguities the
    grader will hit for the new subject.
  - Select-and-justify examples: rewrite with a representative question
    from the new subject.
  See `EXTRACTION.md` in each existing repo for worked examples (PCM and
  Chem carry a full one; Psych has the rules only as a `const` inside
  `services/geminiService.ts`).
- `gradeSubmission` should be a **5-step pipeline** inside the prompt:
  STEP 1 apply `STUDENT_RESPONSE_EXTRACTION_RULES` and produce a verbatim
  per-part extraction; STEP 2 grade strictly per the scoring guide,
  awarding only what the student actually wrote and quoting the extracted
  text when explaining a point decision; STEP 3 per-part feedback
  referencing the rubric language; STEP 4 tally out of `frq.maxPoints`
  (never exceed); STEP 5 format in Markdown + subject-appropriate math
  delimiters (LaTeX `$...$` for Physics and Chem, plain Markdown for
  Psych and other non-math subjects). Return `extractedResponse`
  alongside `feedback` and `breakdown`, and mark all five output fields
  `required` in the response schema so Gemini can't silently drop one.

#### Image generation: keep or remove

Psychology has no image generation pipeline. PCM and Chem both retain
two `gemini-3-pro-image-preview` loops — one for question diagrams
(`imagePrompts`), one for scoring-guide visuals
(`scoringGuideImagePrompts`).

- If you cloned from **Psychology** and your new subject needs diagrams,
  you'll need to add the two loops back yourself (lift them from PCM or
  Chem). This is a significant code add; be ready to sanity-check the
  image output quality before shipping.
- If you cloned from **PCM** or **Chem** and your new subject is
  primarily text, delete both image-generation loops AND the
  `imagePrompts` / `scoringGuideImagePrompts` fields from the response
  schema AND the `images` / `scoringGuideImages` fields from
  `GeneratedFRQ` AND every render site in the view components. Half-
  removed image code crashes at runtime in surprising ways.
- If you cloned from PCM or Chem and your new subject **does** need
  diagrams, leave the loops in place and update the per-type image-prompt
  guidance (FBD prompts for Physics, Lewis-structure prompts for Chem;
  write new guidance for your subject — e.g., cell-diagram prompts for
  AP Biology, or function-graph prompts for AP Calculus).

### 7. Update `App.tsx`

Mostly unchanged from Psychology. The only thing to double-check:

- `handleGenerate` signature matches the new `generateFRQ` in
  `geminiService.ts`.
- The conditional viewport lock:
  ```tsx
  const isFixedViewport = appState !== 'SELECTION';
  <div className={`${isFixedViewport ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-gray-50`}>
  ```
  Leave this alone. It fixes the inner-scrollbar-on-landing-page bug that
  bit Psychology.

### 8. Update `components/SelectionScreen.tsx`

- FRQ type buttons populate from `FRQ_TYPES`.
- Topic picker reads from `UNITS`.
- "Generate" button always enabled; empty selection = random.
- "Random instead" secondary button appears once the user has made a manual
  selection, letting them discard it.

Do NOT remove the expand/collapse per-unit affordance — subjects with 7+
units become unusable without it.

### 9. Update the view components

- `QuestionView.tsx`, `ResultsView.tsx`, `PrintableContent.tsx`,
  `Loading.tsx`: scrub all Physics/Psych-specific copy. Search for the old
  subject name string and replace.
- Tutor chat greetings: "AP Psychology tutor" → "AP [Subject] tutor".
- If the subject has no sources, delete the `SourceBlock` rendering blocks
  in all three views. If it has a different stimulus shape, write a new
  component (`DataTableBlock`, `DiagramBlock`, whatever) and render it in
  the same spots.

### 10. Update `services/pdfService.ts`

- `generatePDFFilename`: change the template's prefix to the new
  subject's prefix. **Use an all-caps prefix** — `AP PCM FRQ`,
  `AP CHEM FRQ`, `AP PSYCH FRQ`, `AP BIO FRQ`, `AP CALC AB FRQ`, etc.
  The unified PDF access site pattern-matches on this, and mixed case
  (`AP Chem FRQ`) breaks it; Chemistry originally shipped with the
  wrong case and had to be retroactively normalized. Keep the format
  stable: `AP XXX FRQ - TYPE - topics.pdf`.
- `generateArchiveFilename`: timestamp-suffixed version for Storage
  uploads. **Required** — see `FILENAME_COLLISION_FIX.md` for the
  rationale. Do not ship a new generator without this. Confirm
  `storageService.ts` imports `generateArchiveFilename` (not
  `generatePDFFilename`) for the upload path — this is a small but
  critical one-line detail.
- `getSubUnitsString`: return `'random'` for an empty topic list (so
  random generations produce a sensible `... - random.pdf` filename),
  `'topic X.Y'` for a single topic, and `'topics X.Y, X.Z, ...'` for
  multiple topics — sorted naturally with
  `localeCompare(..., { numeric: true, sensitivity: 'base' })` so `1.10`
  comes after `1.9`. The `topic`/`topics` wording is fleet-standard;
  don't drift to `unit`/`subtopic` or you'll break the PDF access site
  pattern matching.
- Leave the html2canvas + jsPDF pipeline alone. It's a pain to get right
  and it works as-is.

### 11. Update `services/firestoreService.ts`

- `subject: SUBJECT_SLUG` on every doc. This is what the PDF access website
  uses to filter.
- Drop any legacy fields from the template (`images`, `unit`, etc.).
- Coalesce optional strings to `""` — Firestore rejects `undefined` and it's
  a common footgun.
- Accept `usage`, `totalCostUsd`, and `pricingVersion` via a `SaveOptions`
  object alongside `storagePath`, and write all three onto the Firestore
  doc. Coalesce to `[]`, `0`, and `""` respectively when missing — this
  is the contract the access site reads to populate the per-FRQ Cost
  column and the per-subject "$X.XX in Gemini API spend" label.

### 11b. `services/pricing.ts` — copy across, then verify the price table

Every generator carries its own copy of `services/pricing.ts`. Copy
the file from the template repo verbatim, then:

- Open the price table near the top and confirm each model the new
  generator's `geminiService.ts` actually uses has an entry. If you
  add a new model (e.g. moving from `gemini-3-pro` to a successor),
  add it here too.
- Bump `PRICING_VERSION` to today's date in `YYYY-MM` form so the
  access site's archive can flag generations that ran on an older
  price table.
- Eyeball the dollar values against https://ai.google.dev/pricing —
  pricing changes a few times a year and the table goes stale fast.

The `geminiService.ts` import (`buildUsageRecord`, `sumCost`,
`PRICING_VERSION`, `UsageRecord`) is then identical across the
fleet; the only thing that varies is the model names in the
`PRICE_TABLE` constant.

### 12. Update `services/storageService.ts`

- Import `generateArchiveFilename` (not `generatePDFFilename`) for the
  upload path.
- `customMetadata` should mirror the FRQ metadata fields useful for future
  queries: `selectedUnits`, `selectedSubTopics`, `actualSubTopics`,
  `wasRandom`, `maxPoints`, `generatedAt`.

### 13. `services/firebaseService.ts` — do not touch

Same across all subjects. Anonymous auth + runtime config.

### 14. `index.html`

- `<title>` to the new subject.
- Body classes: `class="bg-gray-50 text-gray-900 min-h-screen"`. NOT
  `h-screen overflow-hidden` — that re-introduces the inner scrollbar on
  the landing page.
- `#root` class: `min-h-screen`.

### 15. `cloudbuild.yaml`

- Rename all 4 occurrences of the old service name to the new one.
- Keep the `FRQ=FRQ:latest` secret binding.
- Keep the 6 FIREBASE_* env var substitutions.
- Do NOT rename the secret itself in Secret Manager — just re-use the same
  secret if all generators share the same Gemini project. Otherwise provision
  a new secret and update the binding here.

### 16. Build + local smoke test

```
npm install
npm run build
npm run dev
```

Smoke test matrix:

1. Each FRQ type with one unit + no subtopic selection → verify part count,
   point total, rubric shape.
2. Each FRQ type with cross-unit subtopics → verify integration.
3. Each FRQ type with empty selection → verify `wasRandom === true` and
   3–5 random topics picked.
4. "Show Solution Only" path → ResultsView shows question + rubric, no
   missing image placeholders.
5. Upload a handwritten PDF → grading returns a score, per-part feedback,
   and populated `extractedResponse`.
6. Upload a page with crossed-out work → crossed-out text absent from
   `extractedResponse`.
7. Chat tutor responds in character.
8. PDF download from "Download PDF" button → correct filename, renders
   correctly, no broken images.
9. Check browser dev tools Network → Firestore and Storage calls succeed.
10. Landing page has no inner vertical scrollbar — only the browser
    scrollbar moves.

### 17. Cloud deploy

Critical Cloud Run env var checklist — **this is where every previous
deploy has tripped**:

| Var | Value |
|---|---|
| `FRQ` | reference to `FRQ:latest` secret (the Gemini API key) |
| `FIREBASE_API_KEY` | Firebase Web SDK API key |
| `FIREBASE_AUTH_DOMAIN` | `<project-id>.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | the GCP project ID hosting Firebase |
| `FIREBASE_STORAGE_BUCKET` | `<project-id>.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID (project number) |
| `FIREBASE_APP_ID` | Firebase App ID (`1:xxx:web:yyy`) |

Do **not** name the Gemini key env var `API_KEY`, `GEMINI_KEY`, or anything
else — the runtime lookup reads `FRQ` first. If you rename it, update
`docker-entrypoint.sh`, `vite.config.ts`, and every generator in the fleet
at once, or just leave it alone.

If the first deploy fails to generate questions with a "missing API key"
error, check Cloud Run env vars before touching any code.

If the first deploy generates questions but doesn't save to Firebase, check
that all 6 FIREBASE_* vars are set. This is the second most common mistake.

### 18. Register the subject with the PDF access website

The full walkthrough lives at `REGISTER_NEW_SUBJECT.md` in the
`ap-frq-access` repo
(https://github.com/lennoxmeldrum/ap-frq-access/blob/main/REGISTER_NEW_SUBJECT.md).
**Read that file** rather than reinventing the steps — it covers
the exact edits to `types.ts` and `constants.ts`, the College Board
category to use, the colour-class pattern, and the post-deploy
manifest-rebuild click. Mismatches between this playbook and that
file should be resolved in favour of that file (it lives next to
the code it changes; this one only links to it).

The TL;DR for this step:

- Add the new subject slug to the `SubjectSlug` union in
  `ap-frq-access/types.ts`.
- Add a `SUBJECTS` entry in `ap-frq-access/constants.ts` with the
  matching `slug`, `category`, and `storagePrefix`.
- Confirm Firestore docs from the new generator carry
  `subject: SUBJECT_SLUG` and show up in the access site's listing.
- Click **Run trigger** on the `ap-frq-access-functions` Cloud
  Build trigger if you want the manifest backfilled immediately
  rather than waiting for the next FRQ write.

Composite indexes don't need any new entries — they're keyed on
`(subject, createdAt)` and `(subject, metadata.frqTypeShort, createdAt)`,
both subject-agnostic.

### 19. Commit and push

Push to a feature branch, not main. Let the user review before you merge.

## Common pitfalls (learned the hard way)

- **Literal `\n` in the scoring guide.** Fix with `normalizeEscapedWhitespace`
  post-processing + explicit prompt instructions about using real newlines.
- **Filename collisions in Firebase Storage.** `uploadBytes()` silently
  overwrites. Use `generateArchiveFilename` with a timestamp suffix. See
  `FILENAME_COLLISION_FIX.md`.
- **Gemini key env var naming mismatch.** Code reads `FRQ`. Cloud Run UI
  defaults to `API_KEY` if you're not paying attention. They are not the
  same thing.
- **Missing FIREBASE_* env vars on a freshly deployed service.** Generation
  works, persistence silently no-ops. Always confirm the archive has new
  docs after the first deploy.
- **Mangled `_FIREBASE_API_KEY` substitution in `cloudbuild.yaml`.**
  Hit once on AP Biology — the substitution value contained the
  39-char Firebase web key concatenated with itself, so Firebase init
  silently rejected it and every Storage / Firestore write no-op'd.
  After cloning, eyeball the substitutions block:
  - `_FIREBASE_API_KEY` should be 39 characters, starting `AIzaSy`.
  - The other 5 vars should be exactly the same shape as in the
    template repo — no leading/trailing whitespace, no doubled
    values, no missing dots.
  Quick sanity check from the repo root:
  `awk -F: '/_FIREBASE_API_KEY/ { gsub(/[ '\''"]/, "", $2); print length($2) }' cloudbuild.yaml`
  should print `39`.
- **Skipping the `services/pricing.ts` copy.** If you forget to copy
  the file from the template repo, `geminiService.ts` won't compile
  (the `buildUsageRecord` import resolves to nothing). If you copy
  the file but forget to register a new model name in
  `PRICE_TABLE`, every call to that model logs a console warning
  and stamps `costUsd: 0` — the access site's Cost column quietly
  shows everything as `$0.00`. Always verify the model names in
  `PRICE_TABLE` match the model constants at the top of
  `geminiService.ts`.
- **Stale prices in `services/pricing.ts`.** Gemini pricing changes
  a few times a year. The dollar amounts in the price table are
  point-in-time snapshots — if you spot the access site's Cost
  column drifting noticeably away from the actual GCP Billing
  charges, that's the first place to check. Bump `PRICING_VERSION`
  when you update.
- **Inner vertical scrollbar on the landing page.** Body must be
  `min-h-screen`, not `h-screen overflow-hidden`. The viewport lock is
  applied conditionally inside `App.tsx` only when `appState !== 'SELECTION'`.
- **Leaving image generation code in when the subject doesn't need it.**
  Remove `imagePrompts`, `scoringGuideImagePrompts`, and the two image
  generation loops. Half-migrated code crashes at runtime in surprising
  ways.
- **Trusting Gemini to obey point totals.** Always post-validate
  `parts.reduce((n, p) => n + p.points, 0) === FRQ_POINT_TOTALS[type]` and
  throw on mismatch.
- **Overcomplicating the prompt.** More constraints ≠ better output.
  Psychology's prompts are tight and focused. Start there and only add rules
  when you catch a specific failure mode in testing.
- **Testing only the AAQ equivalent.** Each FRQ type has its own prompt
  builder, its own rubric shape, and its own failure modes. Smoke-test
  every type, not just the first one.
- **Shipping without reading the CED.** The rubrics in the repo need to
  match the College Board's official scoring. If you skip the CED reading
  pass, you'll ship plausible-sounding but incorrect rubrics.

## What to hand off to the next Claude session

When starting a new subject, the next Claude session should already have,
sitting in the cloned repo:

- This playbook (`NEW_SUBJECT_PLAYBOOK.md`) at the repo root.
- `FILENAME_COLLISION_FIX.md` at the repo root.
- `PDF_ACCESS_WEBSITE.md` at the repo root (if present).
- The template subject's `EXTRACTION.md` if the template had one (PCM
  and Chem carry one; Psych does not). If present, it will be adapted
  for the new subject per Step 6.
- The **new** subject's `CED-and-FRQs/` folder already dropped in,
  replacing the template subject's CED material.

…and the session should ALSO have the `ap-frq-access` repo linked
in (separately from the generator clone), because Step 18 requires
edits there. The session should read
`ap-frq-access/REGISTER_NEW_SUBJECT.md` for the exact two-file
patch (`types.ts` + `constants.ts`) it needs to make. Without that
linkage the new subject won't appear on the archive site.

Plus a one-line prompt:

> Convert this AP [Template] generator to AP [NewSubject] following
> `NEW_SUBJECT_PLAYBOOK.md`. The new subject's CED is already in
> `CED-and-FRQs/`. The `ap-frq-access` repo is also linked — apply
> the access-site changes per its `REGISTER_NEW_SUBJECT.md`.

That's enough context for the next session to work autonomously from
clone to push.
