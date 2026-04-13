import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';

// Ensure the storage bucket value matches the bucket name format Firebase expects
const normalizeStorageBucket = (bucket: string | undefined, projectId: string | undefined) => {
  const trimmed = bucket?.trim();

  if (trimmed) {
    // Cloud console sometimes surfaces the download host (firebasestorage.app);
    // the SDK requires the bucket name (appspot.com)
    // if (trimmed.endsWith('.firebasestorage.app')) {
    //  const normalized = trimmed.replace(/\.firebasestorage\.app$/, '.appspot.com');
    //  console.warn(`Normalized storage bucket from ${trimmed} to ${normalized} for Firebase SDK`);
    //  return normalized;
    // }

    return trimmed;
  }

  return projectId ? `${projectId}.appspot.com` : '';
};

// Firebase configuration from runtime config or environment variables
const getFirebaseConfig = () => {
  const runtimeConfig = typeof window !== 'undefined' ? (window as any).__RUNTIME_CONFIG__ : undefined;

  if (runtimeConfig) {
    const projectId = runtimeConfig.FIREBASE_PROJECT_ID || '';
    return {
      apiKey: runtimeConfig.FIREBASE_API_KEY || '',
      authDomain: runtimeConfig.FIREBASE_AUTH_DOMAIN || '',
      projectId,
      storageBucket: normalizeStorageBucket(runtimeConfig.FIREBASE_STORAGE_BUCKET, projectId),
      messagingSenderId: runtimeConfig.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: runtimeConfig.FIREBASE_APP_ID || ''
    };
  }

  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId,
    storageBucket: normalizeStorageBucket(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, projectId),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
  };
};

const logMissingConfig = (config: ReturnType<typeof getFirebaseConfig>, requireBucket: boolean) => {
  const missingKeys: string[] = [];

  if (!config.apiKey) missingKeys.push('FIREBASE_API_KEY');
  if (!config.projectId) missingKeys.push('FIREBASE_PROJECT_ID');
  if (requireBucket && !config.storageBucket) missingKeys.push('FIREBASE_STORAGE_BUCKET (expected <project>.appspot.com)');

  if (missingKeys.length > 0) {
    console.warn(`Firebase config missing: ${missingKeys.join(', ')}`);
  }
};

const hasAppCredentials = (): boolean => {
  const config = getFirebaseConfig();
  const configured = !!(config.apiKey && config.projectId);

  if (!configured) {
    logMissingConfig(config, false);
  }

  return configured;
};

export const isFirestoreConfigured = (): boolean => hasAppCredentials();

export const isStorageConfigured = (): boolean => {
  const config = getFirebaseConfig();
  const configured = !!(config.apiKey && config.projectId && config.storageBucket);

  if (!configured) {
    logMissingConfig(config, true);
  }

  return configured;
};

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let authReady: Promise<Auth | null> | null = null;

const getOrInitializeApp = (): FirebaseApp | null => {
  if (!hasAppCredentials()) {
    console.log('Firebase not configured');
    return null;
  }

  if (!firebaseApp) {
    const existingApps = getApps();
    firebaseApp = existingApps[0] ?? initializeApp(getFirebaseConfig());
  }

  return firebaseApp;
};

export const getFirebaseApp = (): FirebaseApp | null => getOrInitializeApp();

export const getFirebaseAppWithAuth = async (): Promise<FirebaseApp | null> => {
  if (!hasAppCredentials()) {
    logMissingConfig(getFirebaseConfig(), false);
    return null;
  }

  const app = getOrInitializeApp();
  if (!app) {
    return null;
  }

  if (!authReady) {
    authReady = new Promise<Auth | null>((resolve) => {
      firebaseAuth = getAuth(app);

      // If already signed in, resolve immediately
      if (firebaseAuth.currentUser) {
        resolve(firebaseAuth);
        return;
      }

      // Listen for sign-in (covers successful anonymous auth)
      const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
        if (user) {
          unsubscribe();
          resolve(firebaseAuth);
        }
      });

      // Attempt anonymous auth so Storage/Firestore rules requiring auth will pass
      signInAnonymously(firebaseAuth).catch((error) => {
        console.warn('Anonymous Firebase auth failed:', error);
        unsubscribe();
        resolve(null);
      });
    });
  }

  // Even if auth fails, continue returning the initialized app so Firestore can attempt writes
  await authReady;
  return app;
};
