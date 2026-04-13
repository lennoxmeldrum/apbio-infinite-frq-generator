---
name: handwritten-exam-reader
description: Read, interpret, and extract handwritten student responses from scanned PDFs. Use this skill whenever you are given a scanned PDF containing handwritten AP Biology (or other science subject) exam answers and asked to extract. This skill is essential for any workflow involving student exam submissions, handwritten assessments, grading pipelines, or mark-scheme comparison tasks. Trigger whenever the user uploads a scanned PDF with handwritten content and wants it read, transcribed, or assessed.
---

# Handwritten Exam Reader

This skill defines how to visually read and faithfully extract handwritten student responses from scanned PDFs, with particular reference to AP Biology. The principles generalise to any handwritten science exam.

---

## CRITICAL REQUIREMENT: Exact Extraction Only

**You must extract exactly what the student wrote. Never summarise, paraphrase, interpret, or substitute your own understanding of what the student meant.**

This is an assessment context. The marker must see the student's actual words and working, not a cleaned-up or interpreted version. The distinction between what a student wrote and what they meant to write can be the difference between awarding and withholding marks.

**Permitted corrections (minor only):**
- Normalising clearly sloppy letterforms to the intended character (e.g., a carelessly written Greek letter that is unambiguously meant to be "χ" in a chi-square context, or an obviously-intended Δ for "change in")
- Standardising superscript/subscript formatting for readability (e.g., rendering H2O as H₂O, CO2 as CO₂, p2 as p², X^A as Xᴬ when clearly intended)
- Inserting standard mathematical symbols where the student has used a common shorthand (e.g., rendering ≥ when the student wrote ">=")

**Never permitted:**
- Replacing an incorrect statement with the correct one
- Filling in steps the student skipped in a calculation (e.g., chi-square or Hardy–Weinberg)
- Rephrasing a verbal answer to be more precise, more technical, or complete
- Silently correcting terminology (e.g., "bacteria cell" → "prokaryote"; "gene variant" → "allele"; "transcription" ↔ "translation")
- Normalising genotype case (e.g., re-writing "aA" as "Aa", or "AA" as "Aa")
- Italicising gene/species names the student did not italicise (or vice versa)
- Adding words, qualifiers, or explanations not present in the student's writing

---

## Core Philosophy

**Ignore the OCR layer.** Scanned PDFs often contain a machine-generated OCR text layer from the scanner. This layer is generally poor quality — and in biology it frequently mangles Greek letters, subscripts (ATP vs ADP vs AMP), and italicised species names — so it should be disregarded entirely. Use only your own visual reading of the scanned images.

**Read visually, not linearly.** Handwritten exam answers do not always flow top-to-bottom on the page. Students run out of space, add continuations, draw arrows on provided figures, cross things out, and append Punnett squares in the margin. Always survey the full page before extracting content.

---

## Page-Level Interpretation Rules

### 1. Survey each page holistically before extracting
Before extracting any answer, scan the entire page for:
- Arrows indicating continuation order
- Bracket/brace markers grouping content
- Crossing-out or deletion marks
- Margin annotations vs. main answer content
- Flag symbols or letters marking Part (A / B / C / D) starts
- Sub-part labels like (i), (ii), (iii) inside a single Part

### 2. Scan the entire PDF for each question before finalising
Students sometimes run out of space and continue a response on a later page, in a margin, on the blank back of a previous page, or on additional loose paper appended after the booklet. Before finalising the extraction for any Part, scan the entire PDF — including gap pages and any pages beyond the expected booklet — for overflow work belonging to that Part. Look for:
- Written labels like "Part C continued" or "see page 4" or "see extra page"
- Arrows pointing off the edge of a page toward another location
- Work that appears on a page designated for a different Part but is clearly labelled for the current one
- Unlabelled work on blank pages or gap pages — check whether it logically continues a previous response
- Additional pages appended after the anticipated final page (such as loose sheets the student used for extra space)

### 3. Follow student-indicated reading order
Students use several devices to indicate non-linear reading order:

- **Arrows or circles with arrows pointing away from text to another location**: An arrow from below text, or from circled text leading to another set of text, usually indicates "start with the first set of text, then continue with the next set of text." This may apply to whole sections (e.g., a Part that began at the bottom of a page with the arrow pointing to a continuation at the top), or to small insertions pushed into a larger body of text. Always confirm by checking whether the continuation follows logically and physically from the first section. If it does not form a coherent biological argument, consider whether the second section actually belongs to a different Part entirely.
- **Numbered flags**: A circled or flagged symbol marks where a new Part begins mid-page.
- **Continuation markers**: Phrases like "(continued here)" or arrows pointing off-page signal overflow content.

When in doubt, check whether the biological content makes logical sense in a given reading order. The correct order is the one that produces a coherent biological explanation.

---

## Handling Crossed-Out Work

**Crossed-out work is not part of the student's answer and must not be marked.**

Types of deletion to recognise:
- **Single line through**: Minor correction, usually within a calculation step or a genotype
- **Large diagonal cross (X) through a section**: Student explicitly retracts the entire section — do not extract or credit this content, even if it appears correct
- **Scribble/heavy overwriting**: Abandoned attempt, ignore

When extracting, note crossed-out sections briefly (e.g., *"[crossed-out working omitted]"*) so the marker is aware they exist, but do not include their content in the assessed answer.

---

## Written Biology Content

### Prose and terminology
- Preserve the student's exact terminology, including wrong or imprecise terms. If the student wrote "bacteria cell" instead of "prokaryote", "blood type" instead of "ABO phenotype", or "chromosome" when they meant "chromatid", record exactly that. Whether the rubric accepts it is the marker's decision.
- Preserve gene / protein / species formatting **as written**. If the student did not italicise *E. coli* or *BRCA1*, do not italicise them for the student.
- Preserve capitalisation exactly. "mRNA" and "MRNA" are different in biology: do not regularise.
- Preserve Δ, σ, χ, μ, α, β as written — note that students frequently write "delta G" instead of "ΔG" and "chi-squared" instead of "χ²". Reproduce the student's notation.

### Numbers, calculations, and tables
- Reproduce the student's arithmetic line by line even if the final number is wrong. For AP Biology the most common calculations are:
  - **Allele frequencies** (Hardy–Weinberg): (2 × homozygous + heterozygous) / (2 × total)
  - **Chi-square**: χ² = Σ (O−E)² / E, with df = categories − 1
  - **Population growth**: N_t = N_0 × e^(rt); dN/dt = rN(K−N)/K
  - **Percent / ratio calculations** applied to a count (e.g. "85% of 115,000 cells")
  - **Standard error and confidence intervals**: mean ± 2 SE
- Reproduce numerical tables (calculated columns, derived frequencies) as Markdown tables, preserving the student's column headers, units, and all values. Flag blank or illegible cells.

### Intermediate working vs. final answer
- If the student boxed, circled, or underlined a final expression / number / selection, that is their intended final answer.
- Otherwise treat the last uncrossed line as the answer.
- Distinguish scratch working in the margins (note its presence but do not treat as part of the answer) from supplementary notes added after the main answer (treat as part of the answer unless crossed out).

### Margin annotations
Distinguish between:
- **Scratch working** (formulae jotted in margins to assist the derivation — note presence but do not treat as part of the answer)
- **Supplementary notes** added after the main answer (treat as part of the answer unless crossed out)

---

## Student-Constructed Graphs (IEG, Question 2)

Graphing is a FOUR-point task in IEG — four of the nine points are allocated to the graph alone. Extract it with forensic precision because the marker will be awarding or withholding each of those four points against specific criteria.

Describe:

- **Graph type chosen** (bar graph, line graph, scatter plot). Is the student's choice appropriate for the data type? AP Biology convention: continuous independent variable → line / scatter; categorical independent variable → bar graph.
- **Axis labels and units**: reproduce the student's exact label wording. Note missing units, missing labels, swapped axes.
- **Axis scales**: is the scale linear and appropriate for the data range? Is there a break in an axis? Is zero shown? Are the intervals evenly spaced?
- **Data accuracy**: for each bar / data point, does its position match the value in the data table, given the scale the student drew? Note any obviously misplotted values.
- **Error bars**: are they present? Is each bar's error range consistent with ± 2 SE (the College Board standard)? Do they extend symmetrically above and below?
- **Legend / key**: is one present? Does it distinguish treatment groups? Are colours, shading, or line styles used consistently?
- **Labels on individual bars/points**: the student may have written a numeric value above each bar. Preserve these.
- **Pre-printed vs student-drawn**: note which gridlines, axes, or labels were already printed on the answer booklet and which the student added.

When the marker checks whether two treatments are "statistically similar", they will look at whether the student's error bars overlap — so describing error bars faithfully is essential.

---

## Diagrams, Models, and Visual Representations (AVR, Question 5)

AVR questions present a visual model (cladogram, pathway, cell diagram, cycle, food web, cross) and ask the student to annotate, identify a labelled element, or extend the model. Extract:

### Cladograms / phylogenetic trees
- Which tip / lineage / taxon the student identified for each Part.
- Any internal node (usually labelled with a numeral: 1, 2, 3) the student chose for Part C-type "identify the most recent common ancestor" prompts. Reproduce the numeral exactly.
- Any character-state annotations the student added to specific branches (e.g. "loss of mantle" written on a branch).

### Signal transduction / metabolic pathways
- Each molecule or protein the student named, preserving exact label (e.g. "cAMP", "G-protein", "kinase", "PKA"). Do not substitute the "correct" name.
- Arrows the student drew: state where each arrow originates and terminates, and what label (if any) sits on it.
- Any activation vs inhibition notation (arrows with + or −; blunt-ended lines; "⊣" vs "→"). Preserve the student's exact glyph.

### Cell cycle / cycle diagrams
- Which phase or checkpoint the student circled or labelled (G₁, S, G₂, M; G₁/S checkpoint; metaphase checkpoint).
- Any additions the student made to the diagram (e.g. an arrow labelled "cyclin–CDK acts here").

### Genetic crosses and Punnett squares
- Reproduce the square as a text grid. Preserve the genotype in each cell character-for-character. Do NOT re-order heterozygote alleles: "aA" and "Aa" should each be preserved.
- For X-linked crosses, preserve superscript notation (Xᴬ, Xᵃ, Y).
- For di-hybrid 4×4 crosses, reproduce the full 16-cell grid.
- Note phenotypic / genotypic ratios the student wrote alongside the square.

### Food webs, ecological pyramids, biogeochemical cycles
- Each organism or reservoir the student named, exactly as labelled.
- Arrows between them with direction preserved.
- Any energy / biomass / moles values written on arrows.

### Other diagrams
For any diagram not covered above (experimental setups, gel electrophoresis images, membrane schematics):
- Describe the spatial layout and labelling as precisely as possible.
- Identify what the student drew vs. what was pre-printed in the booklet.

---

## Selection and Two-Part Answers

### Standard tick-box / multiple-option selection
- Look for check marks (✓), underlines, or circled options.
- Note if more than one option appears marked (could indicate a correction).
- If an option is marked AND crossed out, treat it as not selected.

### Select-and-justify (common in CA, AD Part C, IEG Part D)
AP Biology Part-C and Part-D prompts frequently ask the student to select an outcome (supported / not supported; increases / decreases / remains the same; null hypothesis is rejected / is not rejected) and then justify that selection.
- **Extract the selection first.** State clearly which option was selected (e.g. "Selected: not supported"). Note the exact method (circled, underlined, written out).
- **Then extract the justification** as written — do not merge the selection and justification into a single paraphrase.
- If the student changed their selection, note both the final and crossed-out choice: "Selected: not supported [originally circled 'supported' — crossed out]".

---

## Common Student Handwriting Challenges (Biology-Specific)

| Challenge | How to handle |
|---|---|
| Very light pencil | Increase contrast mentally; look for indentations in the scan |
| Mixed print and cursive in same answer | Read holistically, not letter-by-letter |
| Superscripts vs. coefficients (p² vs 2p) | Use context to disambiguate: Hardy–Weinberg always uses p² |
| Genotype case (A vs a, AA vs Aa vs aa) | Read carefully — a single mis-read letter changes the phenotype |
| Overwritten genotypes (e.g. an "a" written over an "A") | Read the top layer; note the original if visible |
| Chemical formulae (H₂O, CO₂, O₂, ATP, NADPH, NAD⁺) | Preserve exact subscripts/superscripts; note if missing |
| Greek letters (χ, Δ, σ, μ, α, β) | Expect χ in chi-square; Δ for change; σ for standard deviation |
| Italic conventions (*BRCA1*, *E. coli*) | Preserve what the student wrote; do NOT add italics |
| Arrows in pathways (→ vs ⊣ vs ⇌) | Distinguish activation (→), inhibition (⊣), reversible (⇌) |
| mRNA vs tRNA vs rRNA vs snRNA | Read the prefix letter precisely — these are different molecules |

---

## Biology-Specific Context (AP Biology, All Units)

Knowing the subject matter aids interpretation. The full course covers eight units. Common symbols, terminology, and concepts by unit are listed below. Use this to disambiguate handwritten content — but never use this knowledge to correct or improve what the student actually wrote.

**General conventions (apply across all units):**
- Macromolecule abbreviations: DNA, RNA (mRNA / tRNA / rRNA / snRNA / miRNA), ATP / ADP / AMP, NADH / NAD⁺, NADPH / NADP⁺, FADH₂ / FAD, GTP / GDP, cAMP.
- Elemental symbols: C, H, O, N, P, S, Na⁺, K⁺, Cl⁻, Ca²⁺, Mg²⁺.
- Greek letters commonly used: χ² (chi-square), Δ (change in), σ (standard deviation), μ (mean or micro), α / β (as in α-helix, β-sheet, α/β-galactosidase, alpha / beta chains in haemoglobin).
- Formula conventions: H₂O, CO₂, O₂ (molecular oxygen), NH₃, NH₄⁺, H⁺ (proton), OH⁻.
- Arrows: → (one-way reaction / activation), ⇌ (reversible / equilibrium), ⊣ (inhibition in a pathway diagram).
- Gene names are italicised (e.g. *BRCA1*, *MYO6*, *TPM1*); protein products are upright (BRCA1 protein).
- Species are italicised binomials (*Drosophila melanogaster*, *Anopheles gambiae*, *Escherichia coli*); after first mention the genus is abbreviated (*D. melanogaster*).

---

### Unit 1 — Chemistry of Life
Structure of water, hydrogen bonding, elements of life (C, H, O, N, P, S), macromolecules (carbohydrates, lipids, nucleic acids, proteins), monomer / polymer, dehydration vs hydrolysis.

Key vocabulary: hydrophilic / hydrophobic, polar / nonpolar, cohesion / adhesion, polar covalent bond, peptide bond, phosphodiester bond, glycosidic linkage, ester linkage, primary / secondary / tertiary / quaternary structure, R group, denaturation.

Watch for: H₂O, CO₂, and other molecular formulae (preserve subscripts); α-helix / β-sheet in protein structure; "R group" as a placeholder for amino-acid side chains; NH₂ / COOH for amino-acid termini.

---

### Unit 2 — Cells
Organelles (nucleus, mitochondrion, chloroplast, ER, Golgi, lysosome, ribosome, vacuole), plasma membrane, selective permeability, membrane transport (passive, facilitated, active), osmosis, tonicity (hypotonic / isotonic / hypertonic), surface-area-to-volume ratio, endosymbiotic theory.

Key vocabulary: phospholipid bilayer, integral / peripheral proteins, aquaporin, symporter / antiporter, Na⁺/K⁺ ATPase, endocytosis / exocytosis, turgor pressure, plasmolysis.

Watch for: SA:V ratio notation (preserve the student's style — "SA:V", "S:V", "surface area to volume"); directional arrows on membrane diagrams showing solute or water movement; tonicity terms frequently confused (hypotonic / hypertonic).

---

### Unit 3 — Cellular Energetics
Enzymes, activation energy, enzyme–substrate interactions, competitive / non-competitive inhibition, environmental effects (pH, temperature, cofactors), ATP, photosynthesis (light reactions, Calvin cycle), cellular respiration (glycolysis, pyruvate oxidation, Krebs / citric acid cycle, oxidative phosphorylation, electron transport chain, chemiosmosis).

Key vocabulary: active site, allosteric site, induced fit, denaturation, photosystem I / II, NADP⁺ → NADPH, chlorophyll a / b, stroma vs thylakoid lumen, grana, proton gradient / proton motive force, ATP synthase, anaerobic vs aerobic, fermentation (lactic acid / alcoholic).

Watch for: ATP / ADP / AMP — one-letter differences matter; H⁺ gradient direction arrows (into thylakoid lumen during photosynthesis, into intermembrane space during respiration); O₂ as input or output depending on process; distinguishing "light-dependent reactions" vs "Calvin cycle".

---

### Unit 4 — Cell Communication and Cell Cycle
Cell signalling (ligand, receptor, second messenger, amplification, cellular response), signal transduction pathways (phosphorylation cascade, G-protein-coupled receptors, receptor tyrosine kinases), feedback (positive, negative), homeostasis, cell cycle phases (G₁, S, G₂, M), mitosis (prophase, metaphase, anaphase, telophase, cytokinesis), cell-cycle checkpoints, cyclin / CDK, cancer and uncontrolled division.

Key vocabulary: ligand, first messenger, second messenger (cAMP, Ca²⁺, IP₃), kinase / phosphatase, apoptosis, tumour suppressor, proto-oncogene, G₀, quiescence.

Watch for: cAMP (preserve case; NOT "CAMP"); cyclin–CDK complexes (the dash or slash between them); G₁ / S / G₂ / M phase subscripts; arrows on feedback loops (positive amplifies; negative dampens).

---

### Unit 5 — Heredity
Meiosis (meiosis I vs II, prophase I, synapsis, tetrads, crossing over, independent assortment, segregation), genetic diversity sources (independent assortment, crossing over, fertilisation, mutation), Mendelian genetics (monohybrid, dihybrid, test crosses, Punnett squares, law of segregation, law of independent assortment), non-Mendelian (incomplete dominance, codominance, multiple alleles, ABO blood groups, sex linkage, X-linked inheritance, pleiotropy, polygenic inheritance, epistasis), environmental effects on phenotype.

Key vocabulary: homozygous / heterozygous, dominant / recessive, genotype / phenotype, allele, locus, genotypic ratio (1:2:1), phenotypic ratio (3:1 or 9:3:3:1), test cross, carrier, chromosome / chromatid / centromere / kinetochore.

Watch for: genotype case (preserve exactly — Aa vs AA vs aa); Punnett square cells (reproduce the grid verbatim); X-linked notation (Xᴬ / Xᵃ / Y); "meiosis I" vs "meiosis II" (the Roman numeral matters); I / II confused with "1 / 2" (preserve).

---

### Unit 6 — Gene Expression and Regulation
DNA and RNA structure, DNA replication (semi-conservative, leading / lagging strand, Okazaki fragments, helicase, DNA polymerase, ligase, primase, topoisomerase), transcription (RNA polymerase, promoter, terminator, template / coding strand, mRNA processing — 5′ cap, poly-A tail, splicing of introns, alternative splicing), translation (ribosome, tRNA, codon, anticodon, start / stop codon, peptide bond formation), regulation of gene expression (operons — lac / trp, transcription factors, enhancers, silencers, epigenetics — methylation, histone acetylation), mutations (point, frameshift, silent, missense, nonsense, insertion, deletion, chromosomal), biotechnology (PCR, gel electrophoresis, CRISPR, restriction enzymes, plasmids, transformation, sequencing).

Key vocabulary: 5′ / 3′ (preserve prime marks); base pairs (A–T in DNA, A–U in RNA, G–C); purine vs pyrimidine; codon / anticodon; ribosomal subunits (30S/50S in prokaryotes; 40S/60S in eukaryotes); reading frame.

Watch for: 5′ and 3′ marks (absolutely preserve); uppercase vs lowercase letters in sequences (often significant); mRNA vs pre-mRNA vs tRNA vs rRNA (different molecules); restriction enzyme names (EcoRI, HindIII — preserve case); PCR / qPCR / RT-PCR (different techniques).

---

### Unit 7 — Natural Selection
Mechanisms of natural selection (variation, heritability, overproduction, differential survival and reproduction), artificial selection, population genetics, Hardy–Weinberg equilibrium, evolutionary fitness, evidence of evolution (fossil record, biogeography, homologous / analogous / vestigial structures, molecular evidence), common ancestry, continuing evolution (antibiotic resistance, pesticide resistance), phylogeny and cladograms, speciation (allopatric, sympatric, prezygotic / postzygotic barriers), genetic drift (bottleneck, founder effect), gene flow, variations in populations (sexual / asexual reproduction), origins of life (RNA world, abiogenesis, Miller–Urey).

Key vocabulary: allele frequency (p, q), genotype frequency (p², 2pq, q²), Hardy–Weinberg conditions (no mutation, no migration, no selection, large population, random mating), fitness, selection coefficient, reproductive isolation, cladogram / phylogenetic tree, node / branch / clade / out-group, monophyletic / paraphyletic / polyphyletic, homologous / analogous, LUCA.

Watch for: p / q as allele frequencies (lowercase; p + q = 1; p² + 2pq + q² = 1); "fitness" in evolutionary sense (reproductive success, NOT physical strength); cladogram node numbers (preserve exactly); "homologous" vs "analogous" (frequently confused); chi-square often used here for comparing observed vs expected genotype frequencies.

---

### Unit 8 — Ecology
Responses to environment (tropisms, taxis, photoperiodism, circadian rhythms), energy flow (trophic levels, producers / consumers / decomposers, 10% rule, food chain vs food web, pyramids of energy / biomass / numbers), population ecology (density, dispersion, age structure, survivorship curves I/II/III, life history strategies, r- vs K-selection, exponential vs logistic growth, carrying capacity K, intrinsic growth rate r), density-dependent vs density-independent factors, community ecology (competition, predation, symbiosis — mutualism / commensalism / parasitism, keystone species, ecological niche, resource partitioning), biodiversity (species richness, evenness, Simpson's index, Shannon index), disruptions (invasive species, pollution, climate change, eutrophication, deforestation, overharvesting).

Key vocabulary: biotic / abiotic, gross vs net primary productivity (GPP / NPP), biogeochemical cycles (carbon, nitrogen, phosphorus, water), nitrogen fixation, denitrification, eutrophication, biomagnification, bioaccumulation.

Watch for: population-growth formulae N_t = N₀e^(rt) and dN/dt = rN(K−N)/K — preserve subscripts and exponent placement; trophic-level numbering (producer = level 1); "keystone" vs "indicator" species (different concepts); Simpson's vs Shannon index (different formulae).

---

**Cross-unit disambiguation notes:**
- **Transcription vs Translation** (Unit 6): frequently swapped by students — preserve whichever they wrote, even if clearly wrong.
- **Mitosis vs Meiosis** (Units 4 & 5): letter differences change the answer. Read carefully; do not "correct".
- **p / q** (Unit 7): lowercase allele frequencies. Uppercase P / Q in probability contexts is separate. Preserve case.
- **χ² chi-square notation**: students often write "x²", "X²", "chi-squared", "X-squared". Reproduce verbatim.
- **H⁺ gradient direction** (Unit 3): into the thylakoid lumen during photosynthesis, into the intermembrane space during respiration. Preserve direction arrows as drawn.
- **Element case**: Co (cobalt) vs CO (carbon monoxide) vs CO₂ (carbon dioxide); Na (sodium) vs NA / N.A. — context resolves but preserve exactly.
- **Gene vs protein**: by convention genes are italic (*BRCA1*), proteins upright (BRCA1). Students often ignore — preserve what they wrote.
- **Species names**: italicised binomials (*E. coli*). Preserve italicisation (or lack of it) as written.
- **Directionality on pathway diagrams**: arrow direction matters (activation → vs inhibition ⊣). Preserve glyphs.
- **SE vs SD vs σ vs μ**: standard error, standard deviation, population SD, population mean — not interchangeable. Preserve exactly.
- **5′ / 3′ ends of nucleic acids** (Unit 6): always preserve the prime marks and orientation. Writing "5 to 3" vs "3 to 5" is not interchangeable.
