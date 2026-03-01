import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'

function loadFromEnvOrFile() {
  // Priority: FIREBASE_ADMIN_CREDENTIALS (JSON string) -> FIREBASE_ADMIN_KEY_BASE64 -> FIREBASE_SERVICE_ACCOUNT -> service-account.json -> GOOGLE_APPLICATION_CREDENTIALS -> separated env fields
  const jsonEnv = process.env.FIREBASE_ADMIN_CREDENTIALS
  if (jsonEnv) {
    try { return JSON.parse(jsonEnv) } catch (e) { /* fallthrough */ }
  }

  const b64 = process.env.FIREBASE_ADMIN_KEY_BASE64
  if (b64) {
    try { return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) } catch (e) { /* fallthrough */ }
  }

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT
  if (serviceAccountEnv) {
    try {
      if (serviceAccountEnv.trim().startsWith('{')) return JSON.parse(serviceAccountEnv)
      const p = path.resolve(serviceAccountEnv)
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'))
    } catch (e) { /* ignore */ }
  }

  const diskPath = path.resolve(process.cwd(), 'service-account.json')
  if (fs.existsSync(diskPath)) {
    try { return JSON.parse(fs.readFileSync(diskPath, 'utf8')) } catch (e) { /* ignore */ }
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Let Google SDK resolve this automatically by returning null and letting admin.initializeApp() use ADC
    return null
  }

  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PROJECT_ID) {
    return {
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      project_id: process.env.FIREBASE_PROJECT_ID,
    }
  }

  return null
}

export function initFirebaseAdmin() {
  if (admin.apps && admin.apps.length) return admin

  const creds = loadFromEnvOrFile()
  const opts: any = {}

  if (creds) {
    opts.credential = admin.credential.cert(creds as any)
    if ((creds as any).project_id) opts.storageBucket = `${(creds as any).project_id}.appspot.com`
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // ADC: the Admin SDK will pick up the service account from the env var
    admin.initializeApp()
    return admin
  }

  if (process.env.FIREBASE_STORAGE_BUCKET) opts.storageBucket = process.env.FIREBASE_STORAGE_BUCKET

  if (Object.keys(opts).length) admin.initializeApp(opts)
  else admin.initializeApp()

  // Optional: async check for storage bucket existence (non-blocking)
  try {
    const bucketName = opts.storageBucket
    if (bucketName && admin.storage) {
      void admin.storage().bucket(bucketName).exists().then(([exists]) => {
        if (!exists) console.warn(`Firebase Storage bucket "${bucketName}" not found.`)
      }).catch(() => {})
    }
  } catch {}

  return admin
}

export function getFirebaseAdmin() {
  if (!admin.apps || !admin.apps.length) initFirebaseAdmin()
  return admin
}

export default initFirebaseAdmin
