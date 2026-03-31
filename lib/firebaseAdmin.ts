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

  const pk = process.env.FIREBASE_PRIVATE_KEY
  const ce = process.env.FIREBASE_CLIENT_EMAIL
  const pi = process.env.FIREBASE_PROJECT_ID

  if (pk && ce && pi) {
    // Clean the private key: remove wrapping quotes and handle \n
    let privateKey = pk.trim()
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.substring(1, privateKey.length - 1)
    }
    privateKey = privateKey.replace(/\\n/g, '\n')

    return {
      private_key: privateKey,
      client_email: ce,
      project_id: pi,
    }
  }

  // Debug logging for Vercel
  if (process.env.VERCEL) {
    console.warn('initFirebaseAdmin: Missing required environment variables:', {
      has_pk: !!pk,
      has_ce: !!ce,
      has_pi: !!pi,
      has_credentials_json: !!process.env.FIREBASE_ADMIN_CREDENTIALS,
      has_adc: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
    })
  }

  return null
}

export function initFirebaseAdmin() {
  if (admin.apps && admin.apps.length) return { admin, error: null }

  const creds = loadFromEnvOrFile()
  const opts: any = {}
  let error: string | null = null

  if (creds) {
    try {
      opts.credential = admin.credential.cert(creds as any)
      if ((creds as any).project_id) opts.storageBucket = `${(creds as any).project_id}.appspot.com`
      console.log('initFirebaseAdmin: using credentials from', (creds as any).__source || 'env/file')
    } catch (e: any) {
      error = `Invalid Firebase credentials format: ${e.message}`
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log('initFirebaseAdmin: using Application Default Credentials')
    try {
      admin.initializeApp()
      return { admin, error: null }
    } catch (e: any) {
      error = `ADC initialization failed: ${e.message}`
    }
  } else {
    // Collect missing fields for diagnostic
    const missing = []
    if (!process.env.FIREBASE_PRIVATE_KEY) missing.push('FIREBASE_PRIVATE_KEY')
    if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL')
    if (!process.env.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID')
    
    if (missing.length > 0) {
      error = `Missing Firebase environment variables in Vercel: ${missing.join(', ')}`
    } else {
      error = "Firebase credentials could not be resolved from environment."
    }
  }

  if (error) {
     console.error('initFirebaseAdmin Error:', error)
     return { admin: null, error }
  }

  if (process.env.FIREBASE_STORAGE_BUCKET) opts.storageBucket = process.env.FIREBASE_STORAGE_BUCKET

  try {
    admin.initializeApp(opts)
  } catch (e: any) {
    if (e.code === 'app/duplicate-app') return { admin, error: null }
    return { admin: null, error: `Initialization failed: ${e.message}` }
  }

  return { admin, error: null }
}

export function getFirebaseAdmin() {
  if (!admin.apps || !admin.apps.length) initFirebaseAdmin()
  return admin
}

export default initFirebaseAdmin
