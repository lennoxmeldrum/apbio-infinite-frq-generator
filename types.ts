export enum Unit {
  Kinematics = "Unit 1: Kinematics",
  Dynamics = "Unit 2: Force and Translational Dynamics",
  WorkEnergy = "Unit 3: Work, Energy, and Power",
  Momentum = "Unit 4: Linear Momentum",
  Rotation = "Unit 5: Torque and Rotational Dynamics",
  Rolling = "Unit 6: Energy and Momentum of Rotating Systems",
  Oscillations = "Unit 7: Oscillations"
}

export enum FRQType {
  MR = "Mathematical Routines (MR)",
  TBR = "Translation Between Representations (TBR)",
  LAB = "Experimental Design and Analysis (LAB)",
  QQT = "Qualitative/Quantitative Translation (QQT)"
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
  frqTypeShort: string;        // "MR", "TBR", "LAB", "QQT"
  selectedUnits: Unit[];       // Units the user explicitly picked (may be empty)
  selectedSubTopics: string[]; // Topic IDs the user explicitly picked (may be empty)
  actualSubTopics: string[];   // Topic IDs the model reports it actually used
  wasRandom: boolean;          // True if no selection and random fallback was used
}

export interface GeneratedFRQ {
  questionText: string;
  parts: FRQPart[];
  images: string[]; // Base64 or URLs for question diagrams
  scoringGuide: string; // The full scoring guide text
  scoringGuideImages: string[]; // Base64 or URLs for scoring guide diagrams (graphs, tables, FBDs)
  maxPoints: number;
  metadata: FRQMetadata; // Added for PDF generation and storage
}

export interface FRQPart {
  label: string; // (a), (b), etc.
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
