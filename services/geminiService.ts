
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedFRQ, AssessmentResult, FRQType, Unit } from '../types';
import { FRQ_POINT_TOTALS, UNITS } from '../constants';
import {
  buildUsageRecord,
  PRICING_VERSION,
  sumCost,
  UsageRecord,
} from './pricing';

// Helper to get short FRQ type code
const getFRQTypeShort = (type: FRQType): string => {
  switch (type) {
    case FRQType.IEE: return "IEE";
    case FRQType.IEG: return "IEG";
    case FRQType.SI: return "SI";
    case FRQType.CA: return "CA";
    case FRQType.AVR: return "AVR";
    case FRQType.AD: return "AD";
    default: return "FRQ";
  }
};

// Get API key from runtime config (for Cloud Run) or environment variables
const getApiKey = (): string => {
  // Check runtime config first (injected by docker-entrypoint.sh)
  if (typeof window !== 'undefined' && (window as any).__RUNTIME_CONFIG__?.FRQ) {
    return (window as any).__RUNTIME_CONFIG__.FRQ;
  }

  // Fallback to environment variables with FRQ as fallback
  return process.env.GEMINI_API_KEY || process.env.API_KEY || process.env.FRQ || '';
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

// Thinking model for complex biology generation + grading
const MODEL_NAME = 'gemini-3-pro-preview';
const VISION_MODEL_NAME = 'gemini-3-pro-preview';
const IMAGE_GEN_MODEL = 'gemini-3-pro-image-preview';

// Defensive post-processor: Gemini occasionally returns escaped \n / \r / \t
// inside JSON string values instead of real whitespace, which then renders
// as literal "\n" text in the UI. Convert them back to real characters.
const normalizeEscapedWhitespace = (s: string): string => {
  if (typeof s !== 'string') return s;
  return s
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, '    ');
};

// ---------- Topic helpers ----------

const ALL_SUBTOPICS: { id: string; name: string; unitId: Unit; unitName: string }[] =
  UNITS.flatMap(u => u.subTopics.map(s => ({ id: s.id, name: s.name, unitId: u.id, unitName: u.name })));

const pickRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Pick 3-5 random topics across the whole AP Biology pool.
 * Used when the user clicks Generate without selecting anything.
 */
export const pickRandomSubTopicSelection = (): string[] => {
  const count = pickRandomInt(3, 5);
  const shuffled = [...ALL_SUBTOPICS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(s => s.id);
};

/**
 * Given the user's (possibly empty) selections, resolve the permissible topic pool.
 * - If nothing was selected: returns a random 3-5 topic pool with wasRandom=true.
 * - If units-only were selected: expands to all sub-topics in those units.
 * - Otherwise passes through the explicit sub-topic selection.
 */
const resolveTopicPool = (
  selectedUnits: Unit[],
  selectedSubTopics: string[]
): { subTopicIds: string[]; wasRandom: boolean } => {
  if (selectedUnits.length === 0 && selectedSubTopics.length === 0) {
    return { subTopicIds: pickRandomSubTopicSelection(), wasRandom: true };
  }
  if (selectedSubTopics.length === 0 && selectedUnits.length > 0) {
    const ids = ALL_SUBTOPICS.filter(s => selectedUnits.includes(s.unitId)).map(s => s.id);
    return { subTopicIds: ids, wasRandom: false };
  }
  return { subTopicIds: selectedSubTopics, wasRandom: false };
};

/**
 * Build a human-readable topic context block for the prompt, grouped by unit.
 */
const formatTopicContext = (subTopicIds: string[]): string => {
  const byUnit = new Map<Unit, { unitName: string; topics: { id: string; name: string }[] }>();
  for (const id of subTopicIds) {
    const meta = ALL_SUBTOPICS.find(s => s.id === id);
    if (!meta) continue;
    if (!byUnit.has(meta.unitId)) {
      byUnit.set(meta.unitId, { unitName: meta.unitName, topics: [] });
    }
    byUnit.get(meta.unitId)!.topics.push({ id: meta.id, name: meta.name });
  }
  const lines: string[] = [];
  for (const [, { unitName, topics }] of byUnit) {
    lines.push(`- ${unitName}`);
    for (const t of topics) {
      lines.push(`    - ${t.id} ${t.name}`);
    }
  }
  return lines.join('\n');
};

// ---------- Shared prompt header ----------

/**
 * Shared College Board CED context injected into every generation prompt so the
 * model anchors its output against the actual AP Biology course framework
 * rather than freelancing. Skipping this produces plausible-sounding but
 * off-spec FRQs.
 */
const buildSharedHeader = (topicContext: string): string => `
=== COURSE CONTEXT (2025 AP BIOLOGY CED) ===
AP Biology (College Board, 2025 CED) is organized around FOUR big ideas:
  1. Evolution
  2. Energetics
  3. Information Storage and Transmission
  4. Systems Interactions

The course is divided into EIGHT units (use the full names below):
  - Unit 1: Chemistry of Life (8-11% of the exam)
  - Unit 2: Cells (10-13%)
  - Unit 3: Cellular Energetics (12-16%)
  - Unit 4: Cell Communication and Cell Cycle (10-15%)
  - Unit 5: Heredity (8-11%)
  - Unit 6: Gene Expression and Regulation (12-16%)
  - Unit 7: Natural Selection (13-20%)
  - Unit 8: Ecology (10-15%)

The six AP Biology SCIENCE PRACTICES are:
  1. Concept Explanation — describe/explain biological concepts, processes, models.
  2. Visual Representations — analyze and interpret biological models/diagrams.
  3. Questions and Methods — identify testable questions, experimental procedures,
     null hypotheses, and propose new investigations.
  4. Representing and Describing Data — identify data points, trends, patterns,
     relationships between variables.
  5. Statistical Tests and Data Analysis — mathematical calculations, confidence
     intervals, chi-square tests, evaluating hypotheses with data.
  6. Argumentation — make scientific claims, support with evidence, provide
     reasoning; predict causes/effects of disruptions to a biological system.

The SIX official FRQ types on the redesigned exam are:
  - Question 1: Interpreting and Evaluating Experimental Results (IEE, 9 pts)
      Authentic scenario with data in a table and/or graph. Parts:
      A (1) describe concept/process/model; B (3) identify methods or describe
      data; C (3) identify methods, analyze data, or perform calculations;
      D (2) make and justify predictions.
  - Question 2: Interpreting and Evaluating Experimental Results with Graphing
      (IEG, 9 pts). Authentic scenario with data in a TABLE. The student must
      CONSTRUCT the appropriate graph. Parts:
      A (1) describe concept/process/model; B (4) construct the graph
      (axes, scales, data, error bars/legend); C (2) analyze data, perform
      calculations, state null hypothesis, or predict results; D (2) make and
      justify predictions.
  - Question 3: Scientific Investigation (SI, 4 pts). Lab investigation
      scenario. Parts: A (1) describe biological concepts/processes;
      B (1) identify experimental procedures; C (1) state the null hypothesis
      OR predict results; D (1) justify predictions.
  - Question 4: Conceptual Analysis (CA, 4 pts). Phenomenon with a disruption.
      Parts: A (1) describe; B (1) explain; C (1) predict causes/effects of a
      change in a biological system; D (1) justify predictions.
  - Question 5: Analyze Model or Visual Representation of a Biological Concept
      or Process (AVR, 4 pts). Scenario accompanied by a visual model
      (cladogram, pathway, cell diagram, cycle diagram, cross, etc.). Parts:
      A (1) describe characteristics shown visually; B (1) explain
      relationships between characteristics; C (1) represent relationships
      within the model; D (1) explain how the visual relates to a larger
      principle, concept, process, or theory.
  - Question 6: Analyze Data (AD, 4 pts). Data in a graph, table, or other
      visual. Parts: A (1) describe data; B (1) describe data; C (1) use data
      to evaluate a hypothesis or prediction; D (1) explain how results relate
      to biological principles/concepts/processes/theories.

OFFICIAL TASK VERBS used in AP Biology FRQs (use these verbs in part prompts
when they are the skill being assessed — do not invent synonyms):
  Calculate, Construct/Draw, Describe, Determine, Evaluate, Explain (how/why),
  Identify, Justify, Make a claim, Predict / Make a prediction, Represent,
  State (the null hypothesis), Support a claim.

STYLE & NOTATION CONVENTIONS the question and rubric must respect:
  - Biological terminology is exact (e.g. "prokaryote" not "bacteria cell";
    "allele" not "gene variant"; "transcription" vs "translation").
  - Gene names in italics (conventionally *BRCA1*, *MYO6*, *TPM1*); protein
    names in plain upright type (BRCA1 protein).
  - Species names in binomial italics (*Drosophila melanogaster*,
    *Anopheles gambiae*, *Escherichia coli*). Abbreviate the genus after
    first use (*D. melanogaster*).
  - Numerical data must carry units (mg/m^3, nM, mL, \u00b0C, mmHg, seconds).
    Use scientific notation where helpful (e.g. 2.7 \u00d7 10^9 years).
  - Genotype notation: uppercase = dominant, lowercase = recessive (Aa, AA,
    aa); X-linked uses X^A, X^a, Y. Heterozygous vs homozygous should be
    stated explicitly in rubrics.
  - Chi-square: \u03c7\u00b2 = \u03a3 ((observed \u2212 expected)^2 / expected),
    degrees of freedom = categories \u2212 1, standard critical value at
    p = 0.05 with df = 1 is 3.84.
  - Hardy-Weinberg: p + q = 1, p^2 + 2pq + q^2 = 1.
  - Population ecology: N_t = N_0 \u00d7 e^(rt) (exponential); dN/dt = rN(K-N)/K
    (logistic). State carrying capacity K and intrinsic growth rate r when used.
  - Confidence interval: mean \u00b1 2 SE\u0304\u2093 (the College Board formula).
  - "Statistically similar" means the \u00b12 SE\u0304\u2093 intervals overlap;
    "significantly different" means the intervals do NOT overlap.

=== CONTENT SCOPE ===
Permissible topic pool (draw ONLY from these):
${topicContext}

Rules for content scope:
  - Every biological concept tested in the question or named in the rubric
    MUST come from this pool.
  - If the pool spans more than one unit, favor a question that naturally
    integrates concepts across two or more of the listed topics (the 2025
    CED explicitly rewards cross-unit integration on the redesigned exam,
    e.g. connecting enzyme function to signal transduction, or tying
    population genetics to heredity).
  - Do NOT drift into adjacent topics that are not in the pool (e.g. do not
    invoke photosynthesis if Unit 3 is not in the pool; do not invoke
    Hardy-Weinberg if Unit 7 is not in the pool).
  - Return "usedSubTopics" as an array of the topic IDs (e.g. ["3.4","7.5"])
    that the question and rubric actually draw upon.

=== FORMATTING RULES (APPLY TO questionText, parts[].text, AND scoringGuide) ===
  - Write in real newlines. Do NOT emit literal "\\n" sequences inside
    strings \u2014 use actual line breaks in the JSON string values.
  - Markdown is preferred. Use Markdown tables for any data the student must
    analyze (| Treatment | Mean | \u00b12 SE |).
  - For the rare math expressions biology needs (chi-square formulas,
    Hardy-Weinberg, logistic growth, population genetics), use LaTeX wrapped
    in single dollar signs: $\\chi^2 = \\sum \\frac{(O-E)^2}{E}$, $p + q = 1$,
    $p^2 + 2pq + q^2 = 1$, $N_t = N_0 e^{rt}$. Italicize biological variables
    in math mode as needed.
  - Species and gene names should be italicized using Markdown (*E. coli*,
    *BRCA1*) when they appear in prose.
  - Scoring Guide: format with extensive whitespace for readability.
    Follow this EXACT structure:

    ---

    ### Part A [1 point]

    **1 point** \u2014 Accept any of the following:

    - A change (mutation) in the DNA sequence encoding the sodium channel polypeptide.
    - A point mutation (substitution / missense) in the gene.


    ---

    ### Part B [3 points]

    **1 point** \u2014 Identifying the dependent variable:

    - Percent mortality / susceptibility to the insecticide.


    **1 point** \u2014 Identifying the positive control:

    - Testing a mosquito strain already known to be susceptible to the insecticides.


    KEY FORMATTING REQUIREMENTS:
      - Use THREE blank lines between each scoring criterion.
      - Use horizontal rules (---) to separate Parts.
      - Format point values as bold: **1 point** \u2014 Description
      - Use a bullet list (-) for the "accept any of the following" options.
      - Put LaTeX expressions on their own line with blank lines above and below.
      - Add an extra blank line before each new Part heading.
      - When a scoring guide needs to reference a visual (sample graph, annotated
        diagram), reference it as "See Figure X" and provide a corresponding
        entry in scoringGuideImagePrompts.
`;

// ---------- Per-type prompt builders ----------

const buildIEEPrompt = (topicContext: string, totalPoints: number): string => `
You are an experienced College Board AP Biology Chief Reader / exam writer.
Produce one authentic, exam-quality FRQ of type
"Interpreting and Evaluating Experimental Results" (Question 1, 9 points)
in the STRICT 2025 CED format.

${buildSharedHeader(topicContext)}

=== FRQ TYPE: Interpreting and Evaluating Experimental Results (IEE, 9 pts) ===
This is a LONG question. Build it around an authentic experimental scenario
drawn from the permissible topic pool, accompanied by data presented as a
Markdown table and/or a figure (include a detailed imagePrompt for the
figure). Students must read, not construct, the graph.

REQUIRED PART STRUCTURE (4 parts, points MUST sum to ${totalPoints} = 9):

  Part A \u2014 1 point
    Describe a biological concept, process, or model relevant to the scenario
    (e.g. what a mutation is at the DNA level, what a transmembrane protein
    does, how an enzyme interacts with its substrate). Use the task verb
    "Describe".

  Part B \u2014 3 points
    Three sub-tasks (label them B(i), B(ii), B(iii)). Each awards 1 point.
    Focus on identifying experimental methods and/or describing data:
      - Identify the dependent variable, independent variable, or a control.
      - Identify a positive/negative control and briefly state why.
      - Justify an experimental choice the researchers made.
    Use task verbs "Identify" and/or "Justify".

  Part C \u2014 3 points
    Three sub-tasks (C(i), C(ii), C(iii)), 1 point each. Mix of:
      - Describe a trend or significant change in the data.
      - Perform a calculation grounded in the data (allele frequency,
        growth rate, percent change, chi-square contribution, etc.).
      - Compare treatment groups using the \u00b12 SE\u0304\u2093 rule or
        qualitative evidence.
    Use task verbs "Describe" and "Calculate".

  Part D \u2014 2 points
    Two sub-tasks (D(i), D(ii)), 1 point each:
      - D(i): Predict the outcome of a related follow-up experiment.
      - D(ii): Support a claim with evidence from the data provided.
    Use task verbs "Predict" and "Support a claim" / "Provide evidence".

SCIENCE PRACTICES this question should touch: 1 (Part A), 3 (Part B),
4 and 5 (Part C), 6 (Part D).

Each part must be concrete and gradeable. Part B, C, D sub-tasks should
be listed inside the single "text" field separated by blank lines and
labeled (i), (ii), (iii).

Output as structured JSON per the schema below.
`;

const buildIEGPrompt = (topicContext: string, totalPoints: number): string => `
You are an experienced College Board AP Biology Chief Reader / exam writer.
Produce one authentic, exam-quality FRQ of type
"Interpreting and Evaluating Experimental Results with Graphing" (Question 2,
9 points) in the STRICT 2025 CED format.

${buildSharedHeader(topicContext)}

=== FRQ TYPE: Interpreting and Evaluating Experimental Results with Graphing (IEG, 9 pts) ===
This is a LONG question. Present data only as a Markdown table (NOT a graph).
The student will construct the graph in Part B. If a scenario-setup figure
is helpful (gel electrophoresis schematic, apparatus diagram), include it via
imagePrompts \u2014 but the DATA itself must be in a table the student graphs.

REQUIRED PART STRUCTURE (4 parts, points MUST sum to ${totalPoints} = 9):

  Part A \u2014 1 point
    Describe a biological concept/process/model relevant to the scenario.
    Task verb: "Describe".

  Part B \u2014 4 points
    The student will CONSTRUCT the appropriate graph from the data table.
    State four explicit graphing criteria in the prompt, e.g.
      B(i) \u2014 Choose the correct graph type and orientation (bar vs line).
      B(ii) \u2014 Label axes with units and appropriate scale.
      B(iii) \u2014 Plot the data points and/or bars accurately.
      B(iv) \u2014 Include error bars (\u00b12 SE\u0304\u2093) and a legend
                   distinguishing treatment groups.
    Also include one sub-part asking the student to "determine" which
    treatments are statistically similar using the error-bar overlap rule.
    Task verb: "Construct", "Determine".
    Include a corresponding sample-graph entry in scoringGuideImagePrompts
    so the marker has a reference rendering.

  Part C \u2014 2 points
    Two sub-tasks (C(i), C(ii)), 1 point each:
      - Analyze data / perform a calculation (apply a percentage to an
        absolute count, compute a ratio, apply Hardy-Weinberg, etc.).
      - State a null hypothesis OR predict the outcome of an extension.
    Task verbs: "Calculate", "State (the null hypothesis)", "Predict".

  Part D \u2014 2 points
    Two sub-tasks (D(i), D(ii)), 1 point each:
      - D(i): Predict the outcome when a parameter is changed (e.g. a
              blocker is added, concentration is altered, environment shifts).
      - D(ii): Justify the prediction using the underlying biological
              mechanism.
    Task verbs: "Predict" and "Justify".

SCIENCE PRACTICES: 1 (Part A), 4 (Part B), 5 and 3 (Part C), 6 (Part D).

Output as structured JSON per the schema below.
`;

const buildSIPrompt = (topicContext: string, totalPoints: number): string => `
You are an experienced College Board AP Biology Chief Reader / exam writer.
Produce one authentic, exam-quality SHORT FRQ of type "Scientific Investigation"
(Question 3, 4 points) in the STRICT 2025 CED format.

${buildSharedHeader(topicContext)}

=== FRQ TYPE: Scientific Investigation (SI, 4 pts) ===
Describe a lab investigation scenario in "questionText" \u2014 WITHOUT
providing the data. The scenario should name the independent variable the
researcher manipulated and the dependent variable they measured, so the
student has something concrete to hypothesize about.

REQUIRED PART STRUCTURE (4 parts, 1 point each, total ${totalPoints} = 4):

  Part A \u2014 1 point
    Describe a biological concept or process relevant to the investigation.
    Task verb: "Describe".

  Part B \u2014 1 point
    Identify an experimental procedure needed to carry out the investigation
    (a specific control, a necessary measurement technique, a sampling
    scheme, etc.). Task verb: "Identify".

  Part C \u2014 1 point
    State the null hypothesis OR predict the results of the experiment.
    Task verb: "State (the null hypothesis)" OR "Predict".

  Part D \u2014 1 point
    Justify the Part C prediction using the underlying biology.
    Task verb: "Justify".

SCIENCE PRACTICES: 1 (Part A), 3 (Parts B, C), 6 (Part D).

This question does NOT have a data table or data figure. imagePrompts should
usually be EMPTY unless the investigation has a genuinely complex setup that
needs a schematic (then include a single schematic prompt).

Output as structured JSON per the schema below.
`;

const buildCAPrompt = (topicContext: string, totalPoints: number): string => `
You are an experienced College Board AP Biology Chief Reader / exam writer.
Produce one authentic, exam-quality SHORT FRQ of type "Conceptual Analysis"
(Question 4, 4 points) in the STRICT 2025 CED format.

${buildSharedHeader(topicContext)}

=== FRQ TYPE: Conceptual Analysis (CA, 4 pts) ===
Present a biological phenomenon with a DISRUPTION \u2014 a mutation that
knocks out a gene, a drug that blocks a receptor, a temperature shift that
denatures an enzyme, an invasive species that disrupts a food web, a
chromosome segregation error, etc. The student reasons about what the
disruption means for the wider system.

REQUIRED PART STRUCTURE (4 parts, 1 point each, total ${totalPoints} = 4):

  Part A \u2014 1 point
    Describe a biological concept or process relevant to the scenario.
    Task verb: "Describe".

  Part B \u2014 1 point
    Explain a biological concept or process (how/why it works in the
    undisrupted case). Task verb: "Explain".

  Part C \u2014 1 point
    Predict the cause or effect of the disruption on one or more components
    of the biological system. Task verb: "Predict".

  Part D \u2014 1 point
    Justify the Part C prediction. Task verb: "Justify".

SCIENCE PRACTICES: 1 (Parts A, B), 6 (Parts C, D).

This question does NOT need data. imagePrompts should usually be EMPTY.

Output as structured JSON per the schema below.
`;

const buildAVRPrompt = (topicContext: string, totalPoints: number): string => `
You are an experienced College Board AP Biology Chief Reader / exam writer.
Produce one authentic, exam-quality SHORT FRQ of type "Analyze Model or Visual
Representation of a Biological Concept or Process" (Question 5, 4 points) in
the STRICT 2025 CED format.

${buildSharedHeader(topicContext)}

=== FRQ TYPE: Analyze Model or Visual Representation (AVR, 4 pts) ===
This question MUST include a visual model or representation. Provide ONE
detailed imagePrompt describing the visual \u2014 a cladogram with labelled
nodes, a signal transduction pathway with arrows and labelled molecules, a
Punnett square cross, a food web, a cell-cycle diagram with checkpoints, an
annotated cell/organelle diagram, a gel electrophoresis schematic, etc.
The "questionText" should introduce the scenario and explicitly reference the
figure (e.g. "The cladogram in Figure 1 shows...").

REQUIRED PART STRUCTURE (4 parts, 1 point each, total ${totalPoints} = 4):

  Part A \u2014 1 point
    Describe a characteristic of the biological concept/process/model as
    represented in the figure (a feature that is literally visible in the
    visual \u2014 e.g. "a shared derived character", "a node in the
    cladogram", "a checkpoint on the cell cycle diagram"). Task verb:
    "Describe".

  Part B \u2014 1 point
    Explain a relationship between two different characteristics shown in
    the figure (e.g. why two lineages independently evolved segmentation;
    why two phosphorylation steps converge on the same effector). Task
    verb: "Explain".

  Part C \u2014 1 point
    Identify a specific labelled point, node, or element in the figure that
    answers a targeted question (e.g. "Identify the number from the figure
    that represents the most recent common ancestor of X and Y"). Task
    verb: "Identify" OR "Represent".

  Part D \u2014 1 point
    Explain how the visual relates to a LARGER biological principle,
    concept, process, or theory (e.g. how genome changes led to speciation;
    how feedback connects to homeostasis). Task verb: "Explain".

SCIENCE PRACTICES: Primarily 2 (Visual Representations), with 1 and 6.

Output as structured JSON per the schema below. The question will NOT render
correctly without a populated imagePrompts array \u2014 include at least one
rich image prompt.
`;

const buildADPrompt = (topicContext: string, totalPoints: number): string => `
You are an experienced College Board AP Biology Chief Reader / exam writer.
Produce one authentic, exam-quality SHORT FRQ of type "Analyze Data"
(Question 6, 4 points) in the STRICT 2025 CED format.

${buildSharedHeader(topicContext)}

=== FRQ TYPE: Analyze Data (AD, 4 pts) ===
Present data in a graph, table, or other visual representation. The student
describes and uses the data. Include the data table inline as Markdown in
"questionText" and/or a figure via imagePrompts.

REQUIRED PART STRUCTURE (4 parts, 1 point each, total ${totalPoints} = 4):

  Part A \u2014 1 point
    Describe a specific feature of the data (a trend, a difference between
    treatments, a maximum/minimum). Task verb: "Describe".

  Part B \u2014 1 point
    Describe a second, different feature of the data (a different trend, a
    relationship between two variables, a comparison). Task verb: "Describe".

  Part C \u2014 1 point
    Use the data to evaluate a stated hypothesis or prediction (accept or
    reject, supported or not supported). Task verb: "Evaluate" / "Support a claim".

  Part D \u2014 1 point
    Explain how the experimental results relate to a larger biological
    principle, concept, process, or theory (e.g. connect the trend to
    conservation of energy across trophic levels, to competitive exclusion,
    to Hardy-Weinberg expectations, etc.). Task verb: "Explain".

SCIENCE PRACTICES: Primarily 4 (Data) and 6 (Argumentation).

Output as structured JSON per the schema below.
`;

const buildPromptForType = (type: FRQType, topicContext: string, totalPoints: number): string => {
  switch (type) {
    case FRQType.IEE: return buildIEEPrompt(topicContext, totalPoints);
    case FRQType.IEG: return buildIEGPrompt(topicContext, totalPoints);
    case FRQType.SI:  return buildSIPrompt(topicContext, totalPoints);
    case FRQType.CA:  return buildCAPrompt(topicContext, totalPoints);
    case FRQType.AVR: return buildAVRPrompt(topicContext, totalPoints);
    case FRQType.AD:  return buildADPrompt(topicContext, totalPoints);
    default:          return buildIEEPrompt(topicContext, totalPoints);
  }
};

// ---------- Generation entry point ----------

// Return shape of `generateFRQ`: the FRQ itself plus an audit trail
// of every Gemini call that went into producing it. The access-site
// archive reads `totalCostUsd` off the saved Firestore doc and shows
// a per-FRQ cost column; `usage` is there for spot-checking (e.g.,
// "which call spent the most tokens on this outlier").
export interface GenerationResult {
  frq: GeneratedFRQ;
  usage: UsageRecord[];
  totalCostUsd: number;
  pricingVersion: string;
}

export const generateFRQ = async (
  type: FRQType,
  selectedUnits: Unit[],
  selectedSubTopics: string[]
): Promise<GenerationResult> => {

  const { subTopicIds, wasRandom } = resolveTopicPool(selectedUnits, selectedSubTopics);
  const topicContext = formatTopicContext(subTopicIds);

  const totalPoints = FRQ_POINT_TOTALS[type];

  const prompt = buildPromptForType(type, topicContext, totalPoints) + `

=== JSON STRUCTURE REQUIREMENTS ===
Return a single JSON object with these fields:
  - "usedSubTopics": string[] \u2014 the IDs (e.g. "3.4", "7.5") of the
    sub-topics the question and rubric actually draw upon.
  - "questionText": string \u2014 the scenario/setup ONLY. Do NOT include the
    per-part prompts (A, B, C, D) here. If a data table is required, include
    it here as a Markdown table. Reference any figure as "Figure 1" /
    "the figure".
  - "parts": array of 4 objects (ALWAYS exactly 4 parts for AP Biology). Each:
      - "label": "Part A", "Part B", "Part C", "Part D".
      - "text": the specific instruction for this part. If there are
                sub-parts (i, ii, iii), put them all inside this single text
                field, separated by blank lines.
      - "points": integer. Sum of all four MUST equal ${totalPoints}.
  - "scoringGuide": string \u2014 the full rubric in the format described
    above (horizontal rules between parts, bold point values, bullet lists
    of accept-any-of-the-following).
  - "imagePrompts": array of strings \u2014 descriptive prompts for figures
    to include with the question. MAY BE EMPTY for SI and CA types. REQUIRED
    to have at least one entry for AVR type. For IEE/IEG/AD, include one
    prompt only if a non-data visual (apparatus, schematic, cladogram) adds
    value. Do NOT put the data table or graph itself in imagePrompts
    \u2014 the data table belongs in questionText as Markdown, and for IEG
    the student draws the graph themselves.
  - "scoringGuideImagePrompts": array of strings \u2014 prompts for visual
    aids that accompany the scoring guide. REQUIRED for IEG (a sample
    correctly-constructed graph the marker can compare against). Optional
    but useful for AVR (an annotated version of the student-facing figure
    with the "correct" answer for Part C highlighted).

Each image prompt should be DETAILED enough to produce a clean, schematic,
textbook-style diagram. Example quality:
  "A cladogram drawn left-to-right with five labelled taxa at the tips:
   Annelida, Caudofoveata, Solenogastres, Polyplacophora, Conchifera.
   Three internal nodes are labelled 1, 2, 3 from top to bottom. Three
   horizontal tick marks along internal branches carry labels 'Body with
   repeated segments' (branch leading to Annelida), 'Reduced foot' (branch
   between nodes 2 and 3), 'Mantle; muscular foot; radula' (branch below
   node 3), and 'Body with repeated segments' (branch leading to
   Polyplacophora). Simple black-line schematic on a white background."

Output ONLY valid JSON (no markdown code fences, no preamble).
`;

  // Collect usage from every Gemini call in this generation pipeline
  // (one text call + up to 2 × N image calls). Summed + stamped on
  // the Firestore doc at save time.
  const usage: UsageRecord[] = [];

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 1024 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            usedSubTopics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "The list of sub-topic IDs that were actually used (e.g., ['3.4', '7.5'])."
            },
            questionText: {
              type: Type.STRING,
              description: "Scenario/setup ONLY. Do NOT include Part A/B/C/D prompts here."
            },
            parts: {
              type: Type.ARRAY,
              description: "The four question parts. Always exactly 4 for AP Biology.",
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "e.g., 'Part A'" },
                  text:  { type: Type.STRING, description: "The specific instruction for this part, including sub-parts (i)/(ii)/(iii) if any." },
                  points:{ type: Type.NUMBER, description: "Point value for this part." }
                },
                required: ["label", "text", "points"]
              }
            },
            imagePrompts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Prompts to generate figures needed for the question setup. Empty array for types that do not need one."
            },
            scoringGuide: {
              type: Type.STRING,
              description: "Full text of the scoring guide/rubric."
            },
            scoringGuideImagePrompts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Prompts for visual aids in the scoring guide (sample graph for IEG, annotated version of the AVR figure)."
            }
          },
          required: ["usedSubTopics", "questionText", "parts", "scoringGuide", "imagePrompts", "scoringGuideImagePrompts"]
        }
      }
    });

    usage.push(buildUsageRecord(MODEL_NAME, response.usageMetadata));

    let textResponse = response.text || "{}";
    if (textResponse.includes("```json")) {
      textResponse = textResponse.replace(/```json/g, "").replace(/```/g, "");
    }

    const data = JSON.parse(textResponse);

    // Defensive post-processing: strip literal "\n" sequences that leak into
    // JSON string values from time to time.
    if (typeof data.questionText === 'string') {
      data.questionText = normalizeEscapedWhitespace(data.questionText);
    }
    if (typeof data.scoringGuide === 'string') {
      data.scoringGuide = normalizeEscapedWhitespace(data.scoringGuide);
    }
    if (Array.isArray(data.parts)) {
      for (const p of data.parts) {
        if (p && typeof p.text === 'string') {
          p.text = normalizeEscapedWhitespace(p.text);
        }
      }
    }

    // ---- Post-parse validation ----
    if (!Array.isArray(data.parts) || data.parts.length === 0) {
      throw new Error("Model did not return a valid parts array.");
    }
    if (data.parts.length !== 4) {
      console.warn(`Expected 4 parts for AP Biology FRQ but got ${data.parts.length}. Proceeding anyway.`);
    }
    const partsSum = data.parts.reduce((acc: number, p: any) => acc + (Number(p.points) || 0), 0);
    if (partsSum !== totalPoints) {
      throw new Error(`Part points sum to ${partsSum} but this FRQ type requires exactly ${totalPoints}.`);
    }
    if (!data.scoringGuide || typeof data.scoringGuide !== 'string' || data.scoringGuide.trim().length === 0) {
      throw new Error("Model did not return a scoring guide.");
    }

    // ---- Generate question images ----
    const images: string[] = [];
    if (data.imagePrompts && Array.isArray(data.imagePrompts) && data.imagePrompts.length > 0) {
      for (const imgPrompt of data.imagePrompts) {
        try {
          const stylePrompt = `Biology textbook diagram, schematic line art, black ink on white background, no shading, high contrast vector style. Clearly labeled in a legible serif font. All biological structures (organelles, molecules, nodes, axes) should be clean and symmetric. Subject: ${imgPrompt}`;

          const imgResponse = await ai.models.generateContent({
            model: IMAGE_GEN_MODEL,
            contents: stylePrompt,
            config: {
              imageConfig: {
                imageSize: "1K",
                aspectRatio: "16:9"
              }
            }
          });

          let imagesReturned = 0;
          if (imgResponse.candidates && imgResponse.candidates[0].content.parts) {
            for (const part of imgResponse.candidates[0].content.parts) {
              if (part.inlineData) {
                images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                imagesReturned = 1;
                break;
              }
            }
          }
          usage.push(buildUsageRecord(IMAGE_GEN_MODEL, imgResponse.usageMetadata, imagesReturned));
        } catch (e) {
          console.warn("Failed to generate question image (continuing without):", imgPrompt);
        }
      }
    }

    // ---- Generate scoring-guide images ----
    const scoringGuideImages: string[] = [];
    if (data.scoringGuideImagePrompts && Array.isArray(data.scoringGuideImagePrompts) && data.scoringGuideImagePrompts.length > 0) {
      for (const imgPrompt of data.scoringGuideImagePrompts) {
        try {
          const stylePrompt = `Biology textbook diagram, schematic line art, black ink on white background, no shading, high contrast vector style. Clearly labeled with all values, units, and annotations shown. Subject: ${imgPrompt}`;

          const imgResponse = await ai.models.generateContent({
            model: IMAGE_GEN_MODEL,
            contents: stylePrompt,
            config: {
              imageConfig: {
                imageSize: "1K",
                aspectRatio: "16:9"
              }
            }
          });

          let imagesReturned = 0;
          if (imgResponse.candidates && imgResponse.candidates[0].content.parts) {
            for (const part of imgResponse.candidates[0].content.parts) {
              if (part.inlineData) {
                scoringGuideImages.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                imagesReturned = 1;
                break;
              }
            }
          }
          usage.push(buildUsageRecord(IMAGE_GEN_MODEL, imgResponse.usageMetadata, imagesReturned));
        } catch (e) {
          console.warn("Failed to generate scoring guide image (continuing without):", imgPrompt);
        }
      }
    }

    const frq: GeneratedFRQ = {
      questionText: data.questionText || "Error retrieving question text.",
      parts: data.parts,
      images: images,
      scoringGuide: data.scoringGuide || "Scoring guide unavailable.",
      scoringGuideImages: scoringGuideImages,
      maxPoints: partsSum,
      metadata: {
        frqType: type,
        frqTypeShort: getFRQTypeShort(type),
        selectedUnits,
        selectedSubTopics,
        actualSubTopics: Array.isArray(data.usedSubTopics) ? data.usedSubTopics : [],
        wasRandom
      }
    };

    return {
      frq,
      usage,
      totalCostUsd: sumCost(usage),
      pricingVersion: PRICING_VERSION,
    };

  } catch (error) {
    console.error("Error generating FRQ:", error);
    throw new Error("Failed to generate FRQ. Please try again.");
  }
};

// ---------- Student-response extraction rules (biology-adapted) ----------

export const STUDENT_RESPONSE_EXTRACTION_RULES = `
=== STUDENT RESPONSE EXTRACTION RULES (READ BEFORE GRADING) ===

You are looking at a scanned or photographed handwritten student response to
an AP Biology FRQ. Before you grade anything, you must first EXTRACT what the
student actually wrote. Follow these rules exactly.

1. CRITICAL: EXACT EXTRACTION ONLY.
   Extract exactly what the student wrote. NEVER summarise, paraphrase,
   interpret, or substitute your own understanding of what the student meant.
   The marker must see the student's actual words and working, not a
   cleaned-up or interpreted version. The difference between what a student
   wrote and what they meant to write can be the difference between awarding
   and withholding marks. Permitted minor corrections: normalising clearly
   sloppy letterforms (e.g. a sloppy "chi" clearly meant as the Greek letter
   in a chi-square context), standard sub/superscript formatting (H2O -> H\u2082O,
   CO2 -> CO\u2082, p2 -> p\u00b2), standard math symbols (triangle -> \u0394).
   NEVER replace an incorrect statement with the correct one, fill in
   skipped steps, rephrase a verbal answer, silently correct wrong
   terminology, correct genotype notation (Aa -> AA etc.), italicize gene
   names the student did not italicize, or add any words the student did
   not write.

2. IGNORE THE OCR LAYER.
   Scanned PDFs often carry a machine OCR text layer \u2014 it is generally
   poor quality and MUST be disregarded entirely. Read the page visually.

3. SURVEY EACH PAGE HOLISTICALLY BEFORE EXTRACTING.
   Look for arrows indicating continuation order, bracket/brace markers
   grouping content, crossing-out or deletion marks, margin annotations vs.
   main answer, and flag symbols or letters marking where a new Part (A, B,
   C, D) begins. Look also for sub-part labels (i), (ii), (iii).

4. SCAN THE ENTIRE PDF FOR EACH QUESTION BEFORE FINALISING.
   Students routinely continue a response on a later page, in a margin, on
   the blank back of a previous page, or on additional loose paper. Before
   finalising any part's extraction, check every page of the PDF for labelled
   continuations ("Part C continued", "see page 4"), for arrows pointing
   off the edge of a page, for work written on a page designated for a
   different part but labelled for this one, and for unlabelled work on
   blank/gap pages that logically continues a previous response.

5. FOLLOW STUDENT-INDICATED READING ORDER.
   Arrows, circles, numbered flags, and "(continued here)" markers indicate
   non-linear reading order. When in doubt, use the order that makes the
   biological argument logically coherent.

6. CROSSED-OUT WORK IS NOT PART OF THE ANSWER.
   - Single line through: minor correction, discard the struck-out portion.
   - Large diagonal cross (X) or scribble over a block: fully retracted \u2014
     do NOT grade that content, even if it looks correct.
   - Two uncrossed competing attempts: grade the LAST attempt.
   Note crossed-out sections briefly (e.g. "[crossed-out working omitted]")
   so the marker knows they exist, but do not include their content.

7. NEVER FILL GAPS.
   If the student wrote nothing for a part, record "[no response]" and
   award 0 points. Do not grade what they might have meant.

8. WRITTEN BIOLOGY CONTENT.
   - Preserve the student's exact terminology, including wrong or imprecise
     terms (e.g. if the student wrote "bacteria cell" instead of
     "prokaryote", record "bacteria cell").
   - Preserve gene/protein/species formatting AS WRITTEN. If the student did
     not italicize "E. coli" or "BRCA1", do not italicize for them \u2014
     that may or may not affect the rubric.
   - Preserve step-by-step structure in calculations \u2014 do not collapse
     multi-line arithmetic.
   - If a symbol is ambiguous, note the ambiguity ("could be 'p' or 'q'").
   - If the student boxed or underlined a final answer, that is their
     intended final answer. Otherwise treat the last uncrossed line as the
     answer.
   - For calculations (e.g. Part C(iii) of an IEE: calculate an allele
     frequency), reproduce the student's ARITHMETIC verbatim even if the
     final number is wrong. Whether working shown is worth a mark depends on
     the rubric.
   - If the student produced a numerical table (common when ordering data
     or computing derived columns), extract it as a Markdown table
     preserving their column headers and all values.

9. STUDENT-CONSTRUCTED GRAPHS (common in IEG, Part B).
   AP Biology IEG questions demand the student CONSTRUCT a graph from a
   data table. The graph is typically worth 4 of the 9 points. Describe it
   with forensic precision:
     - Graph type chosen (bar, line, scatter). Is it appropriate for the
       data type (categorical vs continuous x)?
     - Axis labels verbatim including units (reproduce the student's exact
       wording; note missing units).
     - Axis scales \u2014 is the scale linear and appropriate for the data
       range? Is there a break in the axis? Is zero shown?
     - Legend \u2014 is one present? Does it distinguish treatment groups?
     - Each bar/point plotted \u2014 does its height/position match the
       value in the data table, given the scale the student drew?
     - Error bars \u2014 are they present? Is the length consistent with
       \u00b12 SE\u0304\u2093? Do they extend symmetrically above and below?
     - Any labels on individual bars/points written by the student.
     - Which elements were pre-printed on the answer grid vs. drawn by the
       student.

10. DIAGRAMS, CLADOGRAMS, AND ANNOTATED MODELS (common in AVR).
    When a student answers on or near a provided figure:
      - State which node, arrow, molecule, or pathway element the student
        marked, and what label they wrote character-for-character.
      - If the student drew their own mini-diagram (e.g. a cross, Punnett
        square, or pedigree), reproduce it faithfully in a text description
        with row/column labels preserved.
      - Distinguish student annotations from pre-printed elements in the
        figure.

11. PUNNETT SQUARES AND GENETIC CROSSES (common in Heredity).
    Reproduce the square as a text grid. Preserve exactly the genotype the
    student wrote in each cell (e.g. "Aa" vs "AA" vs "aA"). Do NOT
    "normalize" the order of alleles in a heterozygote \u2014 whether a
    student wrote aA vs Aa may reflect their genotype convention and
    should be preserved verbatim. For X-linked crosses, preserve the
    superscript notation (X^A, X^a).

12. SELECT-AND-JUSTIFY AND TWO-PART ANSWERS.
    For parts that ask for a selection (supported / not supported; increases
    / decreases / remains the same; null hypothesis yes / no) followed by
    reasoning:
      - Extract the SELECTION FIRST ("Selected: supported").
      - Then extract the justification separately and verbatim.
      - If the student changed their selection, note both the final and
        crossed-out choice (e.g. "Selected: not supported [originally
        circled 'supported' \u2014 crossed out]").

13. MULTI-PAGE CONTINUATIONS.
    If Part C begins on page 2 and continues on page 4 via an arrow, the
    full response for Part C is the concatenation of both regions in the
    order indicated.

14. PART LABELING.
    Identify which student writing corresponds to which Part (A/B/C/D) and
    which sub-part (i/ii/iii) using the student's own labels where present,
    and spatial cues otherwise. Do not merge parts.

15. BIOLOGY SYMBOL & NAMING DISAMBIGUATION (use for reading, never to
    "correct" the student).
    - Element case: Co (cobalt) vs CO (carbon monoxide) vs CO\u2082 (carbon
      dioxide) vs Co (as in "Co-enzyme") \u2014 context resolves, but write
      exactly what was drawn.
    - O2 vs O\u2082 vs 2O: molecular oxygen is O\u2082; "2 O" alone may mean
      two oxygen atoms. Note the student's exact notation.
    - Genotype case: Aa = heterozygous, AA = homozygous dominant, aa =
      homozygous recessive. Do NOT re-case an ambiguous letter to "fix"
      it; flag the ambiguity.
    - Gene vs protein: by convention genes are italic (*BRCA1*, *MYO6*),
      proteins are upright (BRCA1). Students often ignore this convention
      \u2014 preserve what they wrote.
    - Species: binomial italicized (*E. coli*, *A. gambiae*). Students may
      write "E. coli" without italics \u2014 preserve.
    - p/q: allele frequencies \u2014 lowercase. P/Q in chi-square
      probability tables is separate \u2014 preserve case.
    - \u03c7\u00b2 (chi-square): often written as "x^2" or "X^2" by students
      \u2014 preserve their notation verbatim.
    - SE, SEM, SD, \u03c3: standard error vs standard deviation \u2014 these
      are NOT interchangeable. Preserve whichever the student wrote.
    - Mitosis vs meiosis: single-letter swaps change the answer entirely.
      Read carefully.
    - Transcription vs translation: frequently confused \u2014 do not
      "correct" one to the other. Preserve.
    - mRNA / tRNA / rRNA / snRNA / miRNA: read the prefix letter precisely.
    - ATP / ADP / AMP: one letter makes a difference \u2014 preserve.
    - 5' / 3' ends: preserve the prime marks.

Record the per-part extraction in the "extractedResponse" field as plain
text with one labeled block per part, e.g.:

  Part A: <verbatim text>
  Part B(i): <verbatim text>
  Part B(ii): <verbatim text>
  ...
  Part D: <verbatim text>

=== END EXTRACTION RULES ===
`;

// ---------- Grading ----------

export const gradeSubmission = async (
  frq: GeneratedFRQ,
  submissionBase64: string,
  mimeType: string
): Promise<AssessmentResult> => {

  const userContentPart = {
    inlineData: {
      mimeType: mimeType,
      data: submissionBase64
    }
  };

  // Pass a curated FRQ payload (no metadata bloat)
  const frqPayload = JSON.stringify({
    frqType: frq.metadata.frqTypeShort,
    questionText: frq.questionText,
    parts: frq.parts,
    scoringGuide: frq.scoringGuide,
    maxPoints: frq.maxPoints
  }, null, 2);

  const prompt = `
You are an AP Biology Reader (College Board Chief Reader) grading a student
FRQ submission using the official scoring guide.

${STUDENT_RESPONSE_EXTRACTION_RULES}

=== QUESTION + RUBRIC ===
${frqPayload}

=== TASK (5-STEP PIPELINE) ===

STEP 1 \u2014 EXTRACT.
  Apply the extraction rules above to the attached student submission.
  Produce a clean per-part (and per sub-part where relevant) extraction of
  what the student ACTUALLY wrote \u2014 verbatim, with constructed graphs,
  diagrams, Punnett squares, and calculations described as specified \u2014
  BEFORE grading. This extracted text goes in the "extractedResponse" field
  of the output.

STEP 2 \u2014 GRADE.
  Grade each part strictly per the scoring guide. Award points only for
  what the student actually wrote (not what you think they meant). When
  explaining a point decision, QUOTE the student's extracted writing so the
  marker can audit the decision. Respect "accept any of the following"
  bullets in the rubric \u2014 if the student matches ANY bullet, award the
  point. Never double-award. Never exceed the part's maximum.

  AP Biology rubric-reading notes:
    - If the rubric says "Accept one of:", any single correct bullet earns
      the point.
    - If the rubric lists multiple specific points (e.g. three data-
      description points), each is independent; one correct bullet earns
      one point.
    - For calculations, a numerical answer inside the rubric's stated
      acceptable range earns the point even without showing work UNLESS
      the rubric explicitly requires shown work.
    - For graphs: award each of the 4 B-points independently (correct
      graph type, correct axis labels/scales, accurate plotted data,
      legend + error bars). Do not deduct for minor drafting imperfections
      if the required elements are present.
    - For Punnett squares and cross diagrams: award if the genotypic or
      phenotypic ratio asked for is present, even if arrangement differs
      from the canonical answer.
    - Be generous with biological synonyms for concepts (e.g. "hydrogen
      bonding" vs "H-bonds"; "ATP synthase" vs "the enzyme that makes
      ATP") but strict with specific terminology where the rubric demands
      a named structure, process, or molecule.

STEP 3 \u2014 FEEDBACK.
  Provide concise per-part feedback explaining why points were earned or
  lost, referencing the rubric language and quoting the student's
  extraction. Address the student directly ("You correctly identified...",
  "Your claim would earn the point if you had also...").

STEP 4 \u2014 TALLY.
  Sum the per-part scores. Total score must be an integer between 0 and
  ${frq.maxPoints}, inclusive. NEVER exceed ${frq.maxPoints}.

STEP 5 \u2014 FORMAT.
  Format "feedback" and "breakdown" using Markdown (headings, bold, bullet
  lists, Markdown tables). Use single-dollar LaTeX ($p^2 + 2pq + q^2 = 1$)
  for the occasional formula. Use real newlines inside JSON string values
  \u2014 do NOT emit literal "\\n" sequences.

=== OUTPUT JSON ===
Return one JSON object with all five fields populated:
  score (number, 0 \u2013 ${frq.maxPoints})
  maxScore (number, exactly ${frq.maxPoints})
  feedback (markdown string with per-part headings)
  breakdown (Markdown table: | Part | Points awarded | Max | Reason |)
  extractedResponse (plain text per-part extraction from STEP 1)
`;

  try {
    const response = await ai.models.generateContent({
      model: VISION_MODEL_NAME,
      contents: {
        parts: [
          { text: prompt },
          userContentPart
        ]
      },
      config: {
        thinkingConfig: { thinkingBudget: 2048 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            maxScore: { type: Type.NUMBER },
            feedback: { type: Type.STRING },
            breakdown: { type: Type.STRING },
            extractedResponse: { type: Type.STRING }
          },
          required: ["score", "maxScore", "feedback", "breakdown", "extractedResponse"]
        }
      }
    });

    const parsed = JSON.parse(response.text!);

    // Defensive normalization of the same literal "\n" issue Gemini occasionally
    // emits inside string fields.
    if (typeof parsed.feedback === 'string')          parsed.feedback          = normalizeEscapedWhitespace(parsed.feedback);
    if (typeof parsed.breakdown === 'string')         parsed.breakdown         = normalizeEscapedWhitespace(parsed.breakdown);
    if (typeof parsed.extractedResponse === 'string') parsed.extractedResponse = normalizeEscapedWhitespace(parsed.extractedResponse);

    return parsed as AssessmentResult;
  } catch (error) {
    console.error("Error grading submission:", error);
    throw new Error("Failed to grade submission.");
  }
};

// ---------- Tutor chat ----------

export const chatWithTutor = async (
  history: { role: string, text: string }[],
  newMessage: string,
  context: any
): Promise<string> => {
  const prompt = `
You are a helpful, rigorous AP Biology tutor. The student has just worked
through an AP Biology FRQ.

Question + rubric: ${JSON.stringify(context.frq)}
Grading result (if any): ${JSON.stringify(context.result)}

Answer the student's questions about the scenario, the underlying biology,
the rubric, or where they lost points. Be encouraging but accurate.
Use Markdown for clarity and, where math is needed (chi-square, Hardy-Weinberg,
population growth), wrap it in single-dollar LaTeX (e.g. $p^2 + 2pq + q^2 = 1$).
Italicize species and gene names (*E. coli*, *BRCA1*) in prose.
`;

  const contents = [
    { role: 'user', parts: [{ text: prompt }] },
    ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: newMessage }] }
  ];

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        thinkingConfig: { thinkingBudget: 1024 },
      }
    });
    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Chat error", error);
    return "Error connecting to tutor.";
  }
};
