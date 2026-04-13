export enum Unit {
  ChemistryOfLife = "Unit 1: Chemistry of Life",
  Cells = "Unit 2: Cells",
  CellularEnergetics = "Unit 3: Cellular Energetics",
  CellCommunication = "Unit 4: Cell Communication and Cell Cycle",
  Heredity = "Unit 5: Heredity",
  GeneExpression = "Unit 6: Gene Expression and Regulation",
  NaturalSelection = "Unit 7: Natural Selection",
  Ecology = "Unit 8: Ecology"
}

export enum FRQType {
  IEE = "Interpreting and Evaluating Experimental Results (IEE)",
  IEG = "Interpreting and Evaluating Experimental Results with Graphing (IEG)",
  SI = "Scientific Investigation (SI)",
  CA = "Conceptual Analysis (CA)",
  AVR = "Analyze Model or Visual Representation (AVR)",
  AD = "Analyze Data (AD)"
}

export interface SubTopic {
  id: string;
  name: string;
}

export interface UnitData {
  id: Unit;
  name: string;
  subTopics: SubTopic[];
}

export interface FRQMetadata {
  frqType: FRQType;
  frqTypeShort: string;        // "IEE", "IEG", "SI", "CA", "AVR", "AD"
  selectedUnits: Unit[];       // Units the user explicitly picked (may be empty)
  selectedSubTopics: string[]; // Topic IDs the user explicitly picked (may be empty)
  actualSubTopics: string[];   // Topic IDs the model reports it actually used
  wasRandom: boolean;          // True if no selection and random fallback was used
}

export interface GeneratedFRQ {
  questionText: string;
  parts: FRQPart[];
  images: string[]; // Base64 or URLs for question diagrams/figures (cell diagrams, cladograms, data figures)
  scoringGuide: string; // The full scoring guide text
  scoringGuideImages: string[]; // Base64 or URLs for scoring guide diagrams (sample graphs, annotated diagrams)
  maxPoints: number;
  metadata: FRQMetadata; // Added for PDF generation and storage
}

export interface FRQPart {
  label: string; // "Part A", "Part B", "Part B (i)", etc.
  text: string;
  points: number;
}

export interface AssessmentResult {
  score: number;
  maxScore: number;
  feedback: string;
  breakdown: string;
  extractedResponse?: string; // Per-part verbatim extraction of the student submission
}

export type AppState = 'SELECTION' | 'GENERATING' | 'QUESTION' | 'GRADING' | 'RESULTS';
