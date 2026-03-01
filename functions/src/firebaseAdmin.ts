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
    return admin;
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  initialized = true;
  return admin;
}

export default initFirebaseAdmin;
