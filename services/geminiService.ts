
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedFRQ, AssessmentResult, FRQType, Unit } from '../types';
import { FRQ_POINT_TOTALS, UNITS } from '../constants';

// Helper to get short FRQ type code
const getFRQTypeShort = (type: FRQType): string => {
  switch (type) {
    case FRQType.MR: return "MR";
    case FRQType.TBR: return "TBR";
    case FRQType.LAB: return "LAB";
    case FRQType.QQT: return "QQT";
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

// We use the Thinking model for complex physics generation
const MODEL_NAME = 'gemini-3-pro-preview';
const VISION_MODEL_NAME = 'gemini-3-pro-preview';
const IMAGE_GEN_MODEL = 'gemini-3-pro-image-preview';

// ---------- Topic helpers ----------

const ALL_SUBTOPICS: { id: string; name: string; unitId: Unit; unitName: string }[] =
  UNITS.flatMap(u => u.subTopics.map(s => ({ id: s.id, name: s.name, unitId: u.id, unitName: u.name })));

const pickRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Pick 3-5 random topics across the whole AP Physics C: Mechanics pool.
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

export const generateFRQ = async (
  type: FRQType,
  selectedUnits: Unit[],
  selectedSubTopics: string[]
): Promise<GeneratedFRQ> => {

  const { subTopicIds, wasRandom } = resolveTopicPool(selectedUnits, selectedSubTopics);
  const topicContext = formatTopicContext(subTopicIds);

  const totalPoints = FRQ_POINT_TOTALS[type];

  const prompt = `
    You are an experienced College Board AP Physics C: Mechanics exam writer and rubric
    designer. Your task is to produce one authentic, exam-quality Free Response Question
    in the STRICT format used on the AP Physics C: Mechanics exam (2024 CED).

    === CONTENT SCOPE ===
    Permissible topic pool (draw ONLY from these):
${topicContext}

    Rules for content scope:
    - Every physics concept tested in the question or named in the rubric MUST come from
      this pool.
    - If the pool spans more than one unit, favor a question that naturally integrates
      concepts across at least two of the listed topics (the 2024 CED explicitly rewards
      cross-unit integration on the redesigned exam).
    - Do not drift into adjacent topics that are not in the pool (e.g. do not invoke
      fluid mechanics, thermodynamics, or E&M — those are not part of AP Physics C:
      Mechanics).
    - Return "usedSubTopics" as an array of the topic IDs (e.g. ["2.2","3.4"]) that the
      question and rubric actually draw upon.

    === COURSE CONTEXT (2024 CED) ===
    AP Physics C: Mechanics covers 7 units: (1) Kinematics, (2) Force and Translational
    Dynamics, (3) Work, Energy, and Power, (4) Linear Momentum, (5) Torque and Rotational
    Dynamics, (6) Energy and Momentum of Rotating Systems, and (7) Oscillations. Calculus
    (derivatives and definite/indefinite integrals) is expected wherever appropriate.
    Use SI units throughout. Prefer standard symbols: a (acceleration), v (velocity),
    x (position), F (force), m/M (mass), W (work), K (kinetic energy), U (potential
    energy), p (momentum), I (rotational inertia), tau (torque), omega (angular speed),
    alpha (angular acceleration), L (angular momentum), T (period), A (amplitude).

    === FRQ TYPE: "${type}" ===
    Create a question of exactly this type. The four official AP Physics C: Mechanics
    FRQ types (and the expected emphasis of each) are:
    - Mathematical Routines (MR): symbolic derivations, calculus steps, logical
      mathematical pathways that lead to a clean final expression.
    - Translation Between Representations (TBR): connect graphs, diagrams, equations,
      and verbal descriptions. Students usually sketch a graph or annotate a diagram
      as part of the answer.
    - Experimental Design and Analysis (LAB): design a procedure, linearize data,
      compute slope/intercept from a plotted best-fit line, and include error analysis
      or experimental uncertainty reasoning. ALWAYS include a Markdown data table the
      student will analyze.
    - Qualitative/Quantitative Translation (QQT): pair a qualitative claim (e.g.
      "increases / decreases / remains the same") with a quantitative justification
      grounded in an equation or symbolic argument. Students are expected to explicitly
      state the selection AND justify it.

    TOTAL POINTS FOR THIS QUESTION: ${totalPoints}.
    Distribute these points reasonably among 3-5 parts.

    Specifics for ${type}:
    ${type === FRQType.MR ? "- Mathematical Routines (MR): Focus on deriving symbolic expressions, calculus (derivatives/integrals), and logical mathematical pathways." : ""}
    ${type === FRQType.TBR ? "- Translation Between Representations (TBR): Focus on connecting graphs, diagrams, and equations. At least one part should ask the student to sketch on provided axes." : ""}
    ${type === FRQType.LAB ? "- Experimental Design (LAB): Focus on designing a procedure, analyzing data (linearization), and error analysis. ALWAYS include a data table for students to analyze." : ""}
    ${type === FRQType.QQT ? "- Qualitative/Quantitative Translation (QQT): Focus on qualitative reasoning justified by quantitative equations. At least one part should use a \"Select one of: Increases / Decreases / Remains the same, and justify\" format." : ""}

    IMPORTANT FORMATTING RULES:
    - **Math:** Use LaTeX for ALL mathematical expressions, variables, and equations. Wrap them in single dollar signs (e.g., $F_{net} = ma$).
    - **Tables:** Use standard Markdown table syntax (e.g., | x | y | ...). Ensure columns are aligned.
    - **Scoring Guide:** Format with extensive whitespace for readability. Follow this EXACT structure:

      Example Scoring Guide Format:

      ---

      ### Part (a) [3 points]

      **1 point** — For starting with the integral definition of work:

      $W = \\int F(x) dx$


      **1 point** — For substituting the force function and correct limits:

      $W = \\int_0^D (kx^3) dx$


      **1 point** — For evaluating the integral and arriving at the correct expression:

      $W = \\frac{kD^4}{4}$


      ---

      ### Part (b) [2 points]

      **1 point** — For identifying the relationship...

      KEY FORMATTING REQUIREMENTS:
      - Use THREE blank lines between each scoring criterion
      - Use horizontal rules (---) to separate parts
      - Format point values as bold: **1 point** — Description
      - Put mathematical expressions on their own lines with blank lines above and below
      - Add extra blank line before each new Part heading
      - When showing visual aids (graphs, data tables with calculations, Free Body Diagrams) in scoring guide, reference them as "See Figure X" and provide detailed image prompts

    STRUCTURE REQUIREMENTS (JSON):
    - "usedSubTopics": An array of strings containing the IDs (e.g. "1.1", "1.2") of the sub-topics that were *actually* tested or relevant in this specific question.
    - "questionText": The setup/scenario description ONLY. Do NOT include the sub-questions (a, b, c) here. If a table of data is needed (especially for LAB), include it here using Markdown.
    - "parts": An array of objects for the sub-questions. YOU MUST GENERATE 3-5 DISTINCT PARTS.
      - "label": "Part (a)", "Part (b)", etc.
      - "text": The specific instruction (e.g. "Derive an expression for...", "Calculate the...", "Sketch a graph...").
      - "points": Integer value. The sum of all points MUST equal ${totalPoints}.
    - "scoringGuide": The detailed rubric explaining how points are awarded for each part. Follow the formatting rules above strictly to ensure readability.
    - "imagePrompts": An array of strings. Describe 1-2 essential diagrams or graphs needed for the question setup. Be extremely descriptive for an AI image generator (e.g., "A schematic line art diagram of a block on an incline plane with angle theta, simple black lines on white background, no shading").
    - "scoringGuideImagePrompts": An array of strings for visual aids in the scoring guide. Include when needed for:
      • Linearized data graphs (e.g., "Graph with x-axis labeled 'm (kg)' from 0 to 0.5, y-axis labeled '1/vf (s/m)' from 0.6 to 1.4, showing 5 data points in linear trend with best-fit line, grid lines visible")
      • Extended data tables (e.g., "Table with 3 columns: 'm (kg)', 'vf (m/s)', '1/vf (s/m)'. Five rows of data showing mass values 0.10-0.50 kg, corresponding velocities, and calculated reciprocals")
      • Free Body Diagrams for solutions (e.g., "Free body diagram showing block on surface with normal force N pointing up, weight mg pointing down, friction force f pointing left, applied force F at angle theta above horizontal pointing right. All forces labeled clearly")
      Use the same detailed, technical style as question image prompts.

    Ensure the scenario in "questionText" provides all necessary constants and variables (e.g., "mass M", "length L") that are referenced in the "parts".
    Ensure "scoringGuide" perfectly aligns with the generated "parts".

    Format the output as JSON.
  `;

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
              description: "The list of sub-topic IDs that were actually used in the generated question (e.g., ['2.1', '2.2'])."
            },
            questionText: { type: Type.STRING, description: "The intro text and scenario description ONLY. Do NOT include parts a, b, c here." },
            parts: {
              type: Type.ARRAY,
              description: "The individual question parts (a, b, c, etc.) that the student must answer. MUST NOT BE EMPTY.",
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING, description: "e.g., 'Part (a)'" },
                  text: { type: Type.STRING, description: "The specific question/task text for this part." },
                  points: { type: Type.NUMBER, description: "Point value for this part." }
                },
                required: ["label", "text", "points"]
              }
            },
            imagePrompts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Prompts to generate diagrams/graphs needed for the question setup."
            },
            scoringGuide: { type: Type.STRING, description: "Full text of the scoring guide/rubric." },
            scoringGuideImagePrompts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Prompts to generate visual aids for the scoring guide (graphs, extended tables, FBDs). Only include when needed to show calculations, linearized data, or correct diagrams."
            }
          },
          required: ["questionText", "parts", "scoringGuide"]
        }
      }
    });

    let textResponse = response.text || "{}";
    if (textResponse.includes("```json")) {
        textResponse = textResponse.replace(/```json/g, "").replace(/```/g, "");
    }

    const data = JSON.parse(textResponse);
    
    // Ensure parts array exists
    if (!data.parts || !Array.isArray(data.parts)) {
        console.warn("Model failed to generate parts array correctly. Attempting to recover...");
        data.parts = []; 
    }
    
    // Generate images based on prompts for question
    const images: string[] = [];
    if (data.imagePrompts && Array.isArray(data.imagePrompts) && data.imagePrompts.length > 0) {
        for (const imgPrompt of data.imagePrompts) {
            try {
                // Enforce a schematic style for better physics diagrams
                const stylePrompt = `Technical textbook diagram, schematic line art, black and white, high contrast, white background, no shading, vector style. Clearly labeled. Subject: ${imgPrompt}`;

                const imgResponse = await ai.models.generateContent({
                    model: IMAGE_GEN_MODEL,
                    contents: stylePrompt,
                    config: {
                        imageConfig: {
                            imageSize: "1K",
                            aspectRatio: "16:9" // Landscape usually fits scenarios better
                        }
                    }
                });

                if (imgResponse.candidates && imgResponse.candidates[0].content.parts) {
                    for (const part of imgResponse.candidates[0].content.parts) {
                        if (part.inlineData) {
                            images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                            break;
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to generate question image for prompt (continuing without image):", imgPrompt);
            }
        }
    }

    // Generate images for scoring guide (graphs, tables, FBDs)
    const scoringGuideImages: string[] = [];
    if (data.scoringGuideImagePrompts && Array.isArray(data.scoringGuideImagePrompts) && data.scoringGuideImagePrompts.length > 0) {
        for (const imgPrompt of data.scoringGuideImagePrompts) {
            try {
                // Use same technical style for consistency
                const stylePrompt = `Technical textbook diagram, schematic line art, black and white, high contrast, white background, no shading, vector style. Clearly labeled with all values and units shown. Subject: ${imgPrompt}`;

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

                if (imgResponse.candidates && imgResponse.candidates[0].content.parts) {
                    for (const part of imgResponse.candidates[0].content.parts) {
                        if (part.inlineData) {
                            scoringGuideImages.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
                            break;
                        }
                    }
                }
            } catch (e) {
                console.warn("Failed to generate scoring guide image for prompt (continuing without image):", imgPrompt);
            }
        }
    }

    return {
      questionText: data.questionText || "Error retrieving question text.",
      parts: data.parts,
      images: images,
      scoringGuide: data.scoringGuide || "Scoring guide unavailable.",
      scoringGuideImages: scoringGuideImages,
      maxPoints: data.parts.reduce((acc: number, p: any) => acc + (p.points || 0), 0),
      metadata: {
        frqType: type,
        frqTypeShort: getFRQTypeShort(type),
        selectedUnits,
        selectedSubTopics,
        actualSubTopics: Array.isArray(data.usedSubTopics) ? data.usedSubTopics : [],
        wasRandom
      }
    };

  } catch (error) {
    console.error("Error generating FRQ:", error);
    throw new Error("Failed to generate FRQ. Please try again.");
  }
};

// ---------- Grading ----------

export const STUDENT_RESPONSE_EXTRACTION_RULES = `
=== STUDENT RESPONSE EXTRACTION RULES (READ BEFORE GRADING) ===

You are looking at a scanned or photographed handwritten student response to an AP
Physics C: Mechanics FRQ. Before you grade anything, you must first EXTRACT what the
student actually wrote. Follow these rules exactly.

1. CRITICAL: EXACT EXTRACTION ONLY.
   Extract exactly what the student wrote. NEVER summarise, paraphrase, interpret, or
   substitute your own understanding of what the student meant. The marker must see the
   student's actual words and working, not a cleaned-up or interpreted version. The
   difference between what a student wrote and what they meant to write can be the
   difference between awarding and withholding marks. Permitted minor corrections:
   normalising clearly sloppy letterforms (e.g. a sloppy "a" clearly meant as "α" in a
   rotational context), standard sub/superscript formatting (v2 → v₂), standard math
   symbols (triangle symbol → ∆). NEVER replace an incorrect equation with the correct
   one, fill in skipped steps, rephrase a verbal answer, silently correct wrong symbols,
   or add any words the student did not write.

2. IGNORE THE OCR LAYER.
   Scanned PDFs often carry a machine OCR text layer — it is generally poor quality and
   must be disregarded entirely. Read the page visually.

3. SURVEY EACH PAGE HOLISTICALLY BEFORE EXTRACTING.
   Look for arrows indicating continuation order, bracket/brace markers grouping content,
   crossing-out or deletion marks, margin annotations vs. main answer, and flag symbols
   or letters marking where a new question begins.

4. SCAN THE ENTIRE PDF FOR EACH QUESTION BEFORE FINALISING.
   Students routinely continue a response on a later page, in a margin, on the blank
   back of a previous page, or on additional loose paper. Before finalising any part's
   extraction, check every page of the PDF for labelled continuations ("Q1(a) continued",
   "see page 4"), for arrows pointing off the edge of a page, for work written on a page
   designated for a different question but labelled for this one, and for unlabelled
   work on blank/gap pages that logically continues a previous response.

5. FOLLOW STUDENT-INDICATED READING ORDER.
   Arrows, circles, numbered flags, and "(continued here)" markers indicate non-linear
   reading order. When in doubt, use the order that makes the mathematical/physical
   derivation logically coherent.

6. CROSSED-OUT WORK IS NOT PART OF THE ANSWER.
   - Single line through: minor correction, discard the struck-out portion.
   - Large diagonal cross (X) or scribble over a block: fully retracted — do NOT grade
     that content, even if it looks correct.
   - Two uncrossed competing attempts: grade the LAST attempt.
   Note crossed-out sections briefly (e.g. "[crossed-out working omitted]") so the
   marker knows they exist, but do not include their content.

7. NEVER FILL GAPS.
   If the student wrote nothing for a part, record "[no response]" and award 0 points.
   Do not grade what they might have meant.

8. MATHEMATICAL CONTENT.
   - Preserve the student's symbolic notation faithfully (ΔK, v₂, τ_net, etc.).
   - Preserve step-by-step structure — do not collapse multi-line derivations.
   - If a symbol is ambiguous, note the ambiguity ("possibly M or m").
   - If the student boxed or underlined a final expression, that is their intended
     final answer. Otherwise treat the last uncrossed line as the answer.
   - Distinguish scratch working in the margins (note its presence but do not treat as
     part of the answer) from supplementary notes added after the main answer
     (treat as part of the answer unless crossed out).
   - If the student produced a numerical table (common in LAB questions), extract it
     as a Markdown table preserving their column headers and all values. Note blank
     or illegible cells.

9. FREE BODY DIAGRAMS (FBDs).
   FBDs carry significant scoring weight. For each object/dot in the diagram:
   - Count the total number of force arrows.
   - For each arrow, describe: direction (up/down/left/right or at an angle), relative
     length compared to other arrows on the same object, and the EXACT label the
     student wrote character-for-character (e.g. "F_g", "mg", "G", "W", "N", "F_N").
     The exact label text can determine whether a mark is awarded — do not paraphrase.
   - Note where each arrow originates (from the dot, from the edge of the object,
     from empty space).
   - Note which required forces are present AND which are absent (e.g. "no normal force
     drawn on Block B").
   - Note extraneous arrows — velocity, acceleration, or unlabelled arrows that do not
     represent real forces. State that they are present.
   - Distinguish "Before" vs "After" states if shown side by side.

10. SKETCHED GRAPHS ON PROVIDED AXES (common in TBR).
    Describe: axis labels and scales (pre-printed vs student-added); starting point
    (coordinates); ending point / behaviour; axis crossings (at what labelled point,
    and is it a clean crossing or merely approaches); shape between key points (linear,
    concave up/down, sinusoidal, S-shape, kinks, cusps); monotonicity and any direction
    changes; constant/flat segments (at what value, starting from what time); student
    annotations on the axis (e.g. labelled t₁, t₃); and which elements were pre-printed
    vs student-drawn.

11. DATA PLOTS (common in LAB).
    Describe: exact axis labels including units (reproduce the student's wording);
    numerical scales; how many points plotted and whether their positions match the
    axis scales; any obviously misplotted points; the best-fit line — is it straight
    or curved, does it pass through the data trend or is it systematically offset, does
    it extend across the full data range; any slope-calculation annotations or
    rise/run triangles.

12. SELECTION-AND-JUSTIFY QUESTIONS (common in QQT).
    Extract the selection FIRST ("Selected: Decreases") by whatever means the student
    indicated (circled, underlined, written out). Then extract the justification
    separately and verbatim. If the student changed their selection, note both the
    final and crossed-out choice (e.g. "Selected: Decreases [originally selected
    'Increases' — crossed out]").

13. MULTI-PAGE CONTINUATIONS.
    If Part (c) begins on page 2 and continues on page 4 via an arrow, the full
    response for Part (c) is the concatenation of both regions in the order indicated.

14. PART LABELING.
    Identify which student writing corresponds to which part using the student's own
    labels where present, and spatial cues (paragraph breaks, blank lines) otherwise.
    Do not merge parts.

15. PHYSICS SYMBOL DISAMBIGUATION (use for reading, never to "correct" the student).
    - J: impulse (Unit 4) vs. rarely rotational inertia — resolve by unit context.
    - I: almost always rotational inertia in this course.
    - L: angular momentum (Unit 6) vs. length ℓ — capitalisation and context distinguish.
    - ω: angular frequency (Unit 7) vs. angular speed (Units 5–6) — treat identically.
    - α: almost always angular acceleration in this course.
    - N: normal force vs. unit of force (Newton) — context resolves.

Record the per-part extraction in the "extractedResponse" field as plain text with one
labeled block per part, e.g.:

  Part (a): <verbatim text>
  Part (b): <verbatim text>
  ...

=== END EXTRACTION RULES ===
`;

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
You are an AP Physics C: Mechanics Reader (Grader).

${STUDENT_RESPONSE_EXTRACTION_RULES}

=== QUESTION + RUBRIC ===
${frqPayload}

=== TASK ===
STEP 1: Apply the extraction rules above to the attached student submission. Produce
        a clean per-part extraction of what the student actually wrote — verbatim,
        with FBDs and graphs described as specified — before grading.
STEP 2: Grade each part strictly per the scoring guide. Award points only for what
        the student actually wrote (not what you think they meant). Quote the
        student's extracted writing when explaining a point decision.
STEP 3: Provide a concise feedback paragraph per part explaining why points were
        earned or lost, referencing the rubric language.
STEP 4: Compute the total score out of ${frq.maxPoints}. Never exceed ${frq.maxPoints}.
STEP 5: Use Markdown formatting (bold, bullet points) and LaTeX for math wrapped in
        single dollar signs (e.g. $F_{net} = ma$).

Output JSON with:
  score: number (0-${frq.maxPoints})
  maxScore: ${frq.maxPoints}
  feedback: markdown string with per-part headings
  breakdown: compact table: Part | Points awarded | Max | Reason
  extractedResponse: plain text per-part extraction
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

    return JSON.parse(response.text!);
  } catch (error) {
      console.error("Error grading submission:", error);
      throw new Error("Failed to grade submission.");
  }
};

export const chatWithTutor = async (
    history: { role: string, text: string }[],
    newMessage: string,
    context: any
): Promise<string> => {
    const prompt = `
      Context: The user is discussing an AP Physics C FRQ.
      Question Data: ${JSON.stringify(context.frq)}
      Grading Result (if any): ${JSON.stringify(context.result)}
      
      You are a helpful physics tutor. Answer the student's questions about the problem, the physics concepts, or their grading.
      Be encouraging but rigorous. Use Markdown for clarity and LaTeX ($...$) for math.
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
