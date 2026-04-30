import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, browserSessionPersistence, getAuth, inMemoryPersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const getEnv = (key) => {
  const value = import.meta.env[key];
  return typeof value === 'string' ? value.trim() : value;
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID'),
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID')
};

const requiredConfig = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingConfig = requiredConfig.filter((key) => !firebaseConfig[key]);

if (missingConfig.length > 0) {
  throw new Error(
    `Missing Firebase env vars: ${missingConfig.join(', ')}. ` +
      'Make sure all VITE_FIREBASE_* variables are set in Vercel and redeploy.'
  );
}

const app = initializeApp(firebaseConfig);

// Initialize Auth with explicit persistence order to avoid extra setup work
// during the first app bootstrap in production.
let authInstance;

if (typeof window !== 'undefined') {
  try {
    authInstance = initializeAuth(app, {
      persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence]
    });
  } catch {
    authInstance = getAuth(app);
  }
} else {
  authInstance = getAuth(app);
}

export const auth = authInstance;

export const db = getFirestore(app);
