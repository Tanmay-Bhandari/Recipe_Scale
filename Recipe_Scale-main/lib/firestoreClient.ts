// Firebase v9 (modular) client initialization
import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export function initFirestoreClient() {
  try {
    if (!getApps().length) initializeApp(firebaseConfig)
  } catch (err) {
    // IndexedDB can throw during hot-reload or in some browsers (private mode).
    // Log and continue; callers should handle subsequent Firestore errors.
    if (typeof console !== 'undefined') console.debug('Firebase init warning', err)
  }
  return getFirestore(getApp())
}

export default initFirestoreClient
