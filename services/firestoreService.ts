import { getFirestore, addDoc, collection, serverTimestamp, Firestore } from 'firebase/firestore';
import { GeneratedFRQ } from '../types';
import { getFirebaseAppWithAuth, isFirestoreConfigured } from './firebaseService';

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

export const saveFRQToFirestore = async (
  frq: GeneratedFRQ,
  storagePath?: string
): Promise<string | null> => {
  const firestoreInstance = await initializeFirestore();

  if (!firestoreInstance) {
    console.log('Firestore not available - skipping save');
    return null;
  }

  try {
    const docRef = await addDoc(collection(firestoreInstance, 'frqs'), {
      questionText: frq.questionText,
      parts: frq.parts,
      images: frq.images,
      scoringGuide: frq.scoringGuide,
      scoringGuideImages: frq.scoringGuideImages,
      maxPoints: frq.maxPoints,
      metadata: {
        frqType: frq.metadata.frqType,
        frqTypeShort: frq.metadata.frqTypeShort,
        selectedUnits: frq.metadata.selectedUnits,
        selectedSubTopics: frq.metadata.selectedSubTopics,
        actualSubTopics: frq.metadata.actualSubTopics,
        wasRandom: frq.metadata.wasRandom
      },
      storagePath: storagePath || null,
      createdAt: serverTimestamp()
    });

    console.log('FRQ saved to Firestore with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Failed to save FRQ to Firestore:', error);
    return null;
  }
};
