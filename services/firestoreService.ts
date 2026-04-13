import { getFirestore, addDoc, collection, serverTimestamp, Firestore } from 'firebase/firestore';
import { GeneratedFRQ } from '../types';
import { SUBJECT_SLUG } from '../constants';
import { getFirebaseAppWithAuth, isFirestoreConfigured } from './firebaseService';
import { UsageRecord } from './pricing';

let firestore: Firestore | null = null;

const initializeFirestore = async (): Promise<Firestore | null> => {
  if (!isFirestoreConfigured()) {
    console.log('Firebase not configured - Firestore disabled');
    return null;
  }

  if (!firestore) {
    const app = await getFirebaseAppWithAuth();
    if (!app) {
      return null;
    }

    firestore = getFirestore(app);
  }

  return firestore;
};

export interface SaveOptions {
  storagePath?: string;
  // Per-Gemini-call audit trail, preserved on the doc so the access
  // site can break down an outlier FRQ if needed.
  usage?: UsageRecord[];
  // Pre-computed sum of `usage[*].costUsd`. Stored alongside `usage`
  // so recomputing totals on the access site doesn't require running
  // the price table there — and so the historical cost survives
  // price-table edits.
  totalCostUsd?: number;
  // Identifies which version of the price table produced the cost
  // values above. Helps diagnose "why did our totals jump?"
  pricingVersion?: string;
}

export const saveFRQToFirestore = async (
  frq: GeneratedFRQ,
  options: SaveOptions = {}
): Promise<string | null> => {
  const firestoreInstance = await initializeFirestore();

  if (!firestoreInstance) {
    console.log('Firestore not available - skipping save');
    return null;
  }

  const { storagePath, usage, totalCostUsd, pricingVersion } = options;

  try {
    // NOTE: `images` and `scoringGuideImages` from the FRQ are
    // intentionally NOT written to Firestore. Each base64 data URL is
    // in the ~500KB range, and a single FRQ with one question diagram
    // and one scoring-guide diagram already blows past Firestore's
    // 1 MB per-document limit → the client SDK throws
    // "Document ... exceeded the maximum allowed size of 1,048,576 bytes"
    // BEFORE even attempting to hit the server. Images are already
    // rendered into the PDF that goes to Storage, and the access site
    // reads the PDF directly — the duplicated base64 in Firestore was
    // never consumed by anything.
    const docRef = await addDoc(collection(firestoreInstance, 'frqs'), {
      subject: SUBJECT_SLUG,
      questionText: frq.questionText,
      parts: frq.parts,
      scoringGuide: frq.scoringGuide,
      maxPoints: frq.maxPoints,
      metadata: {
        frqType: frq.metadata.frqType,
        frqTypeShort: frq.metadata.frqTypeShort,
        selectedUnits: frq.metadata.selectedUnits,
        selectedSubTopics: frq.metadata.selectedSubTopics,
        actualSubTopics: frq.metadata.actualSubTopics,
        wasRandom: frq.metadata.wasRandom
      },
      storagePath: storagePath || "",
      // Cost metadata. Coalesced to fleet-standard defaults when the
      // generator doesn't provide them — Firestore rejects undefined
      // and we want legacy docs without these fields to continue
      // working without a backfill.
      usage: usage ?? [],
      totalCostUsd: totalCostUsd ?? 0,
      pricingVersion: pricingVersion ?? "",
      createdAt: serverTimestamp()
    });

    console.log('FRQ saved to Firestore with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Failed to save FRQ to Firestore:', error);
    return null;
  }
};
