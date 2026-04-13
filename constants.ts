import { Unit, UnitData, FRQType } from './types';

// Subject slug used by firestoreService.ts to tag docs for the PDF access site.
export const SUBJECT_SLUG = 'apbio';

// Official point totals per AP Biology FRQ type (2025 CED).
// Two "long" 9-point questions (IEE, IEG) and four 4-point "short" questions
// (SI, CA, AVR, AD).
export const FRQ_POINT_TOTALS: Record<FRQType, number> = {
  [FRQType.IEE]: 9,
  [FRQType.IEG]: 9,
  [FRQType.SI]: 4,
  [FRQType.CA]: 4,
  [FRQType.AVR]: 4,
  [FRQType.AD]: 4
};

export const UNITS: UnitData[] = [
  {
    id: Unit.ChemistryOfLife,
    name: "Unit 1: Chemistry of Life",
    subTopics: [
      { id: "1.1", name: "Structure of Water and Hydrogen Bonding" },
      { id: "1.2", name: "Elements of Life" },
      { id: "1.3", name: "Introduction to Macromolecules" },
      { id: "1.4", name: "Carbohydrates" },
      { id: "1.5", name: "Lipids" },
      { id: "1.6", name: "Nucleic Acids" },
      { id: "1.7", name: "Proteins" }
    ]
  },
  {
    id: Unit.Cells,
    name: "Unit 2: Cells",
    subTopics: [
      { id: "2.1", name: "Cell Structure and Function" },
      { id: "2.2", name: "Cell Size" },
      { id: "2.3", name: "Plasma Membrane" },
      { id: "2.4", name: "Membrane Permeability" },
      { id: "2.5", name: "Membrane Transport" },
      { id: "2.6", name: "Facilitated Diffusion" },
      { id: "2.7", name: "Tonicity and Osmoregulation" },
      { id: "2.8", name: "Mechanisms of Transport" },
      { id: "2.9", name: "Cell Compartmentalization" },
      { id: "2.10", name: "Origins of Cell Compartmentalization" }
    ]
  },
  {
    id: Unit.CellularEnergetics,
    name: "Unit 3: Cellular Energetics",
    subTopics: [
      { id: "3.1", name: "Enzymes" },
      { id: "3.2", name: "Environmental Impacts on Enzyme Function" },
      { id: "3.3", name: "Cellular Energy" },
      { id: "3.4", name: "Photosynthesis" },
      { id: "3.5", name: "Cellular Respiration" }
    ]
  },
  {
    id: Unit.CellCommunication,
    name: "Unit 4: Cell Communication and Cell Cycle",
    subTopics: [
      { id: "4.1", name: "Cell Communication" },
      { id: "4.2", name: "Introduction to Signal Transduction" },
      { id: "4.3", name: "Signal Transduction Pathways" },
      { id: "4.4", name: "Feedback" },
      { id: "4.5", name: "Cell Cycle" },
      { id: "4.6", name: "Regulation of Cell Cycle" }
    ]
  },
  {
    id: Unit.Heredity,
    name: "Unit 5: Heredity",
    subTopics: [
      { id: "5.1", name: "Meiosis" },
      { id: "5.2", name: "Meiosis and Genetic Diversity" },
      { id: "5.3", name: "Mendelian Genetics" },
      { id: "5.4", name: "Non-Mendelian Genetics" },
      { id: "5.5", name: "Environmental Effects on Phenotype" }
    ]
  },
  {
    id: Unit.GeneExpression,
    name: "Unit 6: Gene Expression and Regulation",
    subTopics: [
      { id: "6.1", name: "DNA and RNA Structure" },
      { id: "6.2", name: "DNA Replication" },
      { id: "6.3", name: "Transcription and RNA Processing" },
      { id: "6.4", name: "Translation" },
      { id: "6.5", name: "Regulation of Gene Expression" },
      { id: "6.6", name: "Gene Expression and Cell Specialization" },
      { id: "6.7", name: "Mutations" },
      { id: "6.8", name: "Biotechnology" }
    ]
  },
  {
    id: Unit.NaturalSelection,
    name: "Unit 7: Natural Selection",
    subTopics: [
      { id: "7.1", name: "Introduction to Natural Selection" },
      { id: "7.2", name: "Natural Selection" },
      { id: "7.3", name: "Artificial Selection" },
      { id: "7.4", name: "Population Genetics" },
      { id: "7.5", name: "Hardy-Weinberg Equilibrium" },
      { id: "7.6", name: "Evidence of Evolution" },
      { id: "7.7", name: "Common Ancestry" },
      { id: "7.8", name: "Continuing Evolution" },
      { id: "7.9", name: "Phylogeny" },
      { id: "7.10", name: "Speciation" },
      { id: "7.11", name: "Variations in Populations" },
      { id: "7.12", name: "Origins of Life on Earth" }
    ]
  },
  {
    id: Unit.Ecology,
    name: "Unit 8: Ecology",
    subTopics: [
      { id: "8.1", name: "Responses to the Environment" },
      { id: "8.2", name: "Energy Flow Through Ecosystems" },
      { id: "8.3", name: "Population Ecology" },
      { id: "8.4", name: "Effect of Density on Populations" },
      { id: "8.5", name: "Community Ecology" },
      { id: "8.6", name: "Biodiversity" },
      { id: "8.7", name: "Disruptions in Ecosystems" }
    ]
  }
];

export const FRQ_TYPES = [
  {
    id: FRQType.IEE,
    name: "Interpreting and Evaluating Experimental Results (IEE)",
    desc: "9 pts. Authentic experiment with data in a table and/or graph. Describe concepts, identify methods, analyze data, calculate, predict and justify."
  },
  {
    id: FRQType.IEG,
    name: "Interpreting and Evaluating Experimental Results with Graphing (IEG)",
    desc: "9 pts. Authentic experiment with data in a table. Student constructs the graph, analyzes data, performs calculations, states null hypothesis, predicts."
  },
  {
    id: FRQType.SI,
    name: "Scientific Investigation (SI)",
    desc: "4 pts. Describe concepts, identify procedures, state a null hypothesis, and justify predictions for a described lab investigation."
  },
  {
    id: FRQType.CA,
    name: "Conceptual Analysis (CA)",
    desc: "4 pts. A biological phenomenon with a disruption. Describe, explain, predict causes/effects, and justify."
  },
  {
    id: FRQType.AVR,
    name: "Analyze Model or Visual Representation (AVR)",
    desc: "4 pts. A visual model/representation (cladogram, pathway, diagram). Describe, explain, represent relationships, and connect to a larger principle."
  },
  {
    id: FRQType.AD,
    name: "Analyze Data (AD)",
    desc: "4 pts. Data in a graph, table, or other visual. Describe data, evaluate a hypothesis/prediction, and connect results to biological principles."
  }
];
