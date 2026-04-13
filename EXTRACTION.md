---
name: handwritten-exam-reader
description: Read, interpret, and extract handwritten student responses from scanned PDFs. Use this skill whenever you are given a scanned PDF containing handwritten physics (or other subject) exam answers and asked to extract. This skill is essential for any workflow involving student exam submissions, handwritten assessments, grading pipelines, or mark-scheme comparison tasks. Trigger whenever the user uploads a scanned PDF with handwritten content and wants it read, transcribed, or assessed.
---

# Handwritten Exam Reader

This skill defines how to visually read and faithfully extract handwritten student responses from scanned PDFs, with particular reference to AP Physics C: Mechanics. The principles generalise to any handwritten science or mathematics exam.

---

## CRITICAL REQUIREMENT: Exact Extraction Only

**You must extract exactly what the student wrote. Never summarise, paraphrase, interpret, or substitute your own understanding of what the student meant.**

This is an assessment context. The marker must see the student's actual words and working, not a cleaned-up or interpreted version. The distinction between what a student wrote and what they meant to write can be the difference between awarding and withholding marks.

**Permitted corrections (minor only):**
- Normalising clearly sloppy letterforms to the intended character (e.g., a carelessly written "a" that is unambiguously meant to be "α" in a rotational context)
- Standardising superscript/subscript formatting for readability (e.g., rendering v2 as v₂ when clearly intended)
- Inserting standard mathematical symbols where the student has used a common shorthand (e.g., rendering "∆" when the student wrote a triangle symbol)

**Never permitted:**
- Replacing an incorrect equation with the correct one
- Filling in steps the student skipped
- Rephrasing a verbal answer to be more precise or complete
- Silently correcting wrong variable names or notation
- Adding words, qualifiers, or explanations not present in the student's writing

---

## Core Philosophy

**Ignore the OCR layer.** Scanned PDFs often contain a machine-generated OCR text layer from the scanner. This layer is generally poor quality and should be disregarded entirely. Use only your own visual reading of the scanned images.

**Read visually, not linearly.** Handwritten exam answers do not always flow top-to-bottom on the page. Students run out of space, add continuations, draw arrows, and cross things out. Always survey the full page before extracting content.

---

## Page-Level Interpretation Rules

### 1. Survey each page holistically before extracting
Before extracting any answer, scan the entire page for:
- Arrows indicating continuation order
- Bracket/brace markers grouping content
- Crossing-out or deletion marks
- Margin annotations vs. main answer content
- Flag symbols or letters marking question starts

### 2. Scan the entire PDF for each question before finalising
Students sometimes run out of space and continue a response on a later page, in a margin, on the blank back of a previous page, or on additional loose paper appended after the booklet. Before finalising the extraction for any question, scan the entire PDF — including gap pages and any pages beyond the expected booklet — for overflow work belonging to that question. Look for:
- Written labels like "Q1(a) continued" or "see page 4" or "see extra page"
- Arrows pointing off the edge of a page toward another location
- Work that appears on a page designated for a different question but is clearly labelled for the current one
- Unlabelled work on blank pages or gap pages — check whether it logically continues a previous response
- Additional pages appended after the anticipated final page (such as loose sheets the student used for extra space)

### 3. Follow student-indicated reading order
Students use several devices to indicate non-linear reading order:

- **Arrows or circles with arrows pointing away from text to another location**: An arrow from below text, or from circled text leading to another set of text, usually indicates "start with the first set of text, then continue with the next set of text." This may apply to whole sections (e.g., a question that began at the bottom of a page with the arrow pointing to a continuation at the top), or to small insertions pushed into a larger body of text. Always confirm by checking whether the continuation follows logically and physically from the first section. If it does not form a coherent answer, consider whether the second section actually belongs to a different question entirely.
- **Numbered flags**: A circled or flagged symbol marks where a new question begins mid-page.
- **Continuation markers**: Phrases like "(continued here)" or arrows pointing off-page signal overflow content.

When in doubt, check whether the mathematical/physical content makes logical sense in a given reading order. The correct order is the one that produces a coherent derivation.

---

## Handling Crossed-Out Work

**Crossed-out work is not part of the student's answer and must not be marked.**

Types of deletion to recognise:
- **Single line through**: Minor correction, usually within a working step
- **Large diagonal cross (X) through a section**: Student explicitly retracts the entire section — do not extract or credit this content, even if it appears physically correct
- **Scribble/heavy overwriting**: Abandoned attempt, ignore

When extracting, note crossed-out sections briefly (e.g., *"[crossed-out working omitted]"*) so the marker is aware they exist, but do not include their content in the assessed answer.

---

## Mathematical Content Extraction

### Equations and working
- Preserve the student's symbolic notation faithfully (e.g., ΔK, v₂, τ_net)
- Use standard Unicode subscripts/superscripts where possible (v₁, v₂, α₀)
- Where a symbol is ambiguous, note the ambiguity (e.g., "possibly M or m")
- Preserve the student's step-by-step structure — do not collapse multi-line derivations

### Intermediate working vs. final answer
- Label intermediate lines clearly
- Identify the student's final boxed or underlined expression as their intended answer
- If no box/underline exists, use the last uncrossed-out line as the answer

### Numerical data and tables
If a student creates a table of values (common in LAB questions for calculated columns), extract it as a markdown table preserving the student's column headers and all numerical values. Note if any cells are blank or illegible. If the student used a pre-printed scratch table (e.g. "Table 2 is provided for scratch work"), note its presence but mark it as scratch unless the student clearly used it as part of their answer.

### Margin annotations
Distinguish between:
- **Scratch working** (formulae jotted in margins to assist the derivation — note their presence but do not treat as part of the answer)
- **Supplementary notes** added after the main answer (treat as part of the answer unless crossed out)

---

## Diagram and Graph Extraction

Diagrams and graphs carry significant scoring weight in AP FRQs. Err on the side of over-describing rather than under-describing.

### Free body diagrams (FBDs)
For each dot/object in the diagram:
- **Count** the total number of force arrows drawn.
- **For each arrow**, describe:
  - Direction (up, down, left, right, or at an angle — specify approximate angle if not along an axis).
  - Relative length compared to other arrows on the same object (e.g. "approximately equal length to the downward arrow", "noticeably shorter", "roughly twice as long").
  - The **exact label** the student wrote on or beside the arrow. Reproduce the label character-for-character (e.g. "F_g", "mg", "G", "W", "F_N", "N"). The exact text of the label can determine whether a mark is awarded — do not paraphrase it.
  - Where the arrow originates (from the dot, from the edge of the object, from empty space nearby).
- **Note which forces are present and which are absent** relative to what the question setup implies (e.g. "No normal force drawn on Block B").
- **Note any extraneous arrows** — arrows that do not represent real forces (e.g. velocity arrows, acceleration arrows, or unlabelled arrows). State clearly that they are present.
- Distinguish clearly between "Before" and "After" states if shown side by side.

### Sketched graphs (student-drawn curves on provided axes)
These are common in TBR questions. The scoring criteria often hinge on precise spatial features, so describe:
- **Axis labels and scales**: What is on each axis? Are the pre-printed labels still visible? Did the student add anything?
- **Starting point**: Where does the curve begin? State the approximate coordinates (e.g. "starts at (0, −v₀)" or "starts at the origin").
- **Ending point or behaviour**: Where does the curve end? Does it continue to the edge of the graph? Does it level off?
- **Axis crossings**: Does the curve cross either axis? If so, at what labelled point (e.g. t₁, t₃)? Is the crossing clean (passes through) or does it merely approach the axis?
- **Shape between key points**: Is the curve linear, concave up, concave down, sinusoidal, or S-shaped? Is it smooth or jagged? Does it have any kinks, cusps, or discontinuities?
- **Monotonicity**: Is the curve strictly increasing, strictly decreasing, or does it change direction? If it changes, where?
- **Constant segments**: Does the curve become a horizontal flat line at any point? If so, at what value and starting from what time?
- **Labelled points on the axis**: Did the student mark and label any specific points on the horizontal or vertical axis (e.g. t₄)? If so, describe their position relative to pre-printed gridlines or other labelled points.
- **Pre-printed vs student-drawn**: Note which elements were already on the page (gridlines, axis labels, dashed reference lines) and which the student added.

### Data plots (student-plotted points on a grid)
These appear in LAB/experimental design questions. Describe:
- **Axis labels**: What quantities are on each axis, and what units are shown? Reproduce the student's exact labels.
- **Axis scales**: What numerical values are marked on each axis? Is the scaling linear and appropriate?
- **Plotted points**: How many points are plotted? Are they at approximately correct positions relative to the axis scales? Note any obviously misplotted points.
- **Best-fit line**: Did the student draw a line? Is it straight or curved? Does it pass through the data trend (roughly equal scatter above and below), or is it systematically offset? Does it extend across the full data range?
- **Annotations**: Did the student mark specific points on the line for slope calculation? Did they draw construction lines (rise/run triangles)?

### Other diagrams
For any diagram not covered above (e.g. experimental setups, motion diagrams, energy bar charts):
- Describe the spatial layout and labelling as precisely as possible.
- Identify what the student drew vs. what was pre-printed.

---

## Selection Questions (Multiple-Choice, Tick-Box, and Select-and-Justify)

### Standard multiple-choice / tick-box
- Read the student's mark carefully — look for check marks (✓), underlines, or circled options
- Note if more than one option appears marked (could indicate a correction)
- If an option is marked AND crossed out, treat it as not selected

### Select-and-justify (common in QQT questions)
Some FRQ parts ask the student to select one of several options (e.g. "Increases / Decreases / Remains constant") and then justify their choice. For these:
- **Extract the selection first.** State clearly which option was selected (e.g. "Selected: Decreases"). If the student circled, underlined, or wrote out the word, note the exact method.
- **Then extract the justification** as written — do not merge the selection and justification into a single paraphrase.
- If the student changed their selection (e.g. crossed out "Increases" and circled "Decreases"), note both the final selection and the crossed-out one: "Selected: Decreases [originally selected 'Increases' — crossed out]".

---

## Common Student Handwriting Challenges

| Challenge | How to handle |
|---|---|
| Very light pencil | Increase contrast mentally; look for indentations in the scan |
| Mixed print and cursive in same answer | Read holistically, not letter-by-letter |
| Superscripts vs. coefficients | Use physical context to disambiguate (e.g., v² vs. 2v) |
| Overwritten corrections | Read the top layer; note the original if visible |
| Equations spanning multiple lines with connectors | Follow the = signs and logical flow |
| Greek letters (α, τ, θ, ω) | These appear frequently in rotational mechanics — expect them |

---

## Physics-Specific Context (AP Physics C: Mechanics, All Units)

Knowing the subject matter aids interpretation. The full course covers seven units. Common symbols, equations, and concepts by unit are listed below. Use this to disambiguate handwritten symbols — but never use this knowledge to correct or improve what the student actually wrote.

**General symbol conventions (apply across all units):**
- Roman letters: a = acceleration, d/x/y = position or distance, E = energy, f = frequency, F = force, h = height, I = rotational inertia, J = impulse, k = spring constant, K = kinetic energy, ℓ = length, L = angular momentum, m/M = mass, p = momentum, P = power, r = radius/distance/position, t = time, T = period, U = potential energy, v = velocity/speed, W = work
- Greek letters: α = angular acceleration, θ = angle, λ = linear mass density, μ = coefficient of friction, τ = torque, φ = phase angle, ω = angular frequency or angular speed

---

### Unit 1 — Kinematics
Scalars and vectors, displacement, velocity, acceleration, motion in 2D/3D, relative motion, reference frames.

Key expressions: v = dx/dt, a = dv/dt, x = x₀ + v₀t + ½at², v² = v₀² + 2aΔx, **r** = x**î** + y**ĵ**

Watch for: vector notation (bold or arrow overhead), component subscripts (vₓ, vᵧ), derivative notation (ẋ, ẍ)

---

### Unit 2 — Force and Translational Dynamics
Systems, centre of mass, free-body diagrams, Newton's Laws, gravity, friction, spring forces (Hooke's Law), resistive forces, circular motion.

Key expressions: ΣF = ma, F_g = mg, F_s = -kx, f_k = μ_k N, f_s ≤ μ_s N, F_c = mv²/r = mω²r, x_cm = Σmᵢxᵢ / Σmᵢ

Watch for: subscripts on friction (k = kinetic, s = static), normal force N vs. Newton unit N (context resolves), spring compression/extension Δx

---

### Unit 3 — Work, Energy, and Power
Translational kinetic energy, work, potential energy (gravitational and spring), conservation of energy, power.

Key expressions: K = ½mv², W = ∫F·dx, U_g = mgh, U_s = ½kx², ΔE = W_net, P = dW/dt = F·v, W-K theorem: W_net = ΔK

Watch for: ΔK vs K, students using "KE" and "PE" instead of K and U, energy bar charts alongside equations

---

### Unit 4 — Linear Momentum
Linear momentum, impulse, change in momentum, conservation of momentum, elastic and inelastic collisions.

Key expressions: p = mv, J = ΔP = ∫F dt, Σpᵢ = Σpf (conservation), K_initial = K_final (elastic only)

Watch for: J used for both impulse AND rotational inertia — resolve by unit context (Unit 4 = impulse; Unit 5/6 = rotational inertia). Impulse shown as area under F-t graph (triangle or trapezoid area calculations common). Momentum bar charts (visual representations of before/after states).

---

### Unit 5 — Torque and Rotational Dynamics
Rotational kinematics, connecting linear and rotational motion, torque, rotational inertia, rotational equilibrium, Newton's Second Law in rotational form.

Key expressions: τ = r × F = rF sinθ, Στ = Iα, I = Σmᵢrᵢ² (point masses), common I values: rod about end = ⅓ML², rod about centre = 1/12 ML², solid disk = ½MR², solid sphere = ⅖MR², α = a/r, v = ωr

Watch for: torque arms and perpendicular distances carefully (r vs r sinθ), pivot point choices affecting torque signs, rotational equilibrium (Στ = 0), parallel axis theorem I = I_cm + Md²

---

### Unit 6 — Energy and Momentum of Rotating Systems
Rotational kinetic energy, torque and work, angular momentum, angular impulse, conservation of angular momentum, rolling, orbital mechanics.

Key expressions: K_rot = ½Iω², W = ∫τ dθ, L = Iω = r × p, ΔL = ∫τ dt (angular impulse), K_rolling = ½mv² + ½Iω², v = ωr (rolling without slipping), F_g = GMm/r² (orbital), v_orbit = √(GM/r)

Watch for: combined translational + rotational KE in rolling problems, L conservation when no external torque (ice skater problems), angular momentum vs linear momentum (L vs p)

---

### Unit 7 — Oscillations
Simple harmonic motion (SHM), frequency, period, representations of SHM, energy of SHM, simple and physical pendulums.

Key expressions: a = -ω²x, x(t) = A cos(ωt + φ), v(t) = -Aω sin(ωt + φ), ω = √(k/m) for spring-mass, ω = √(g/L) for simple pendulum, T = 2π/ω, E = ½kA² = ½mv²_max, T_physical pendulum = 2π√(I/mgd)

Watch for: amplitude A, phase angle φ, angular frequency ω vs angular velocity ω (same symbol, different context), students mixing degrees and radians

---

**Cross-unit disambiguation notes:**
- **J**: impulse (Unit 4) vs. rotational inertia notation used by some students (Units 5–6) — resolve by context
- **I**: rotational inertia (Units 5–6) vs. rarely used for other quantities — almost always rotational inertia in this course
- **L**: angular momentum (Unit 6) vs. length ℓ (all units) — capitalisation and context distinguish these
- **ω**: angular frequency in SHM (Unit 7) vs. angular speed in rotation (Units 5–6) — treat identically unless context requires distinction
- **α**: angular acceleration (Units 5–6) vs. rarely used for linear acceleration — in this course, α is almost always angular
