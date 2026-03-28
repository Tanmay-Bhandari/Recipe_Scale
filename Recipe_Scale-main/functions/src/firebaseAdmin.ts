import * as admin from "firebase-admin";
import path from "path";
import fs from 'fs'


let initialized = false;

function loadServiceAccountFromEnv() {
  const env = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!env) return null
  try {
    // If env contains JSON, parse it; otherwise treat it as a path
    if (env.trim().startsWith('{')) return JSON.parse(env)
    const envPath = path.resolve(env)
    if (fs.existsSync(envPath)) {
      const raw = fs.readFileSync(envPath, 'utf8')
      return JSON.parse(raw)
    }
    return null
  } catch (e) {
    console.warn('Failed to load FIREBASE_SERVICE_ACCOUNT:', e)
    return null
  }
}

export function initFirebaseAdmin() {
  if (initialized) return admin;

  // Prefer explicit env JSON, then GOOGLE_APPLICATION_CREDENTIALS, then repo file
  const fromEnv = loadServiceAccountFromEnv()

  // Also support separated env fields (useful on hosts like Render)
  if (!fromEnv && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    try {
      const sa = {
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        project_id: process.env.FIREBASE_PROJECT_ID,
      }
      admin.initializeApp({ credential: admin.credential.cert(sa as any) });
      initialized = true;
      console.log('initFirebaseAdmin: initialized using separated FIREBASE_* env fields')
      return admin;
    } catch (e) {
      console.warn('initFirebaseAdmin: failed to init from separated env fields', e)
    }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !fromEnv) {
    // Let google-auth pick up the credentials from the file path
    admin.initializeApp();
    initialized = true;
    return admin;
  }

  // Try env JSON or repo-root service-account.json
  const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
  const serviceAccount = fromEnv ?? (() => {
    try {
      if (fs.existsSync(serviceAccountPath)) {
        const raw = fs.readFileSync(serviceAccountPath, 'utf8')
        return JSON.parse(raw)
      }
      return null
    } catch { return null }
  })();

  if (!serviceAccount) {
    // Initialize without explicit credentials and rely on ADC if available
    admin.initializeApp();
    initialized = true;
    console.log('initFirebaseAdmin: initialized using Application Default Credentials')
    return admin;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  initialized = true;
  console.log('initFirebaseAdmin: initialized using service account JSON')
  return admin;
}

export default initFirebaseAdmin;
