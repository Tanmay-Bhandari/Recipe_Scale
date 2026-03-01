import * as admin from 'firebase-admin'
import path from 'path'
import fs from 'fs'

function loadServiceAccountFromEnv() {
  const env = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!env) return null
  try {
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
  if (admin.apps && admin.apps.length) return admin

  const fromEnv = loadServiceAccountFromEnv()

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !fromEnv) {
    admin.initializeApp()
    return admin
  }

  const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json')
  const serviceAccount = fromEnv ?? (() => {
    try {
      if (fs.existsSync(serviceAccountPath)) {
        const raw = fs.readFileSync(serviceAccountPath, 'utf8')
        return JSON.parse(raw)
      }
      return null
    } catch { return null }
  })()

  const opts: any = {}
  if (serviceAccount) {
    opts.credential = admin.credential.cert(serviceAccount)
    if (serviceAccount.project_id) {
      opts.storageBucket = `${serviceAccount.project_id}.appspot.com`
    }
  }

  // Allow overriding the storage bucket via environment variable
  if (process.env.FIREBASE_STORAGE_BUCKET) {
    opts.storageBucket = process.env.FIREBASE_STORAGE_BUCKET
  }

  if (Object.keys(opts).length) admin.initializeApp(opts)
  else admin.initializeApp()

  // Fire-and-forget: validate the configured storage bucket exists and log a friendly
  // warning at startup (useful in local development when the bucket may be missing).
  try {
    const bucketName = opts.storageBucket ?? (serviceAccount?.project_id ? `${serviceAccount.project_id}.appspot.com` : undefined)
    if (bucketName && admin.storage) {
      try {
        const storage = admin.storage()
        const bucket = storage.bucket(bucketName)
        // check existence asynchronously without blocking initialization
        void bucket.exists()
          .then(([exists]) => {
            if (!exists) {
              console.warn(`Firebase Storage bucket "${bucketName}" not found. Create the bucket or set FIREBASE_STORAGE_BUCKET. See docs/firebase-setup.md`)
            } else {
              console.log(`Firebase Storage bucket "${bucketName}" exists.`)
            }
          })
          .catch((err) => {
            console.warn('Failed to verify Firebase Storage bucket existence:', err)
          })
      } catch (e) {
        console.warn('Storage check skipped (admin.storage not available):', e)
      }
    } else {
      console.warn('No Firebase Storage bucket configured. Set FIREBASE_STORAGE_BUCKET or include project_id in service account.')
    }
  } catch (e) {
    console.warn('Unexpected error during Firebase storage startup check:', e)
  }

  return admin
}

export default initFirebaseAdmin
