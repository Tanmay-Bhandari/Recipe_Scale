import admin from 'firebase-admin'

export function initFirebaseAdmin() {
  // If already initialized and has an admin instance, return it
  if (admin.apps && admin.apps.length > 0) {
    return { admin, error: null }
  }

  try {
    const pk = process.env.FIREBASE_PRIVATE_KEY
    const ce = process.env.FIREBASE_CLIENT_EMAIL
    const pi = process.env.FIREBASE_PROJECT_ID

    // Case 1: Environment Variables exist (Production/Vercel)
    if (pk && ce && pi) {
      // Fix private key formatting: 
      // Vercel UI sometimes adds extra quotes or escapes newlines differently.
      let privateKey = pk.trim()
      
      // Remove wrapping double or single quotes if present (Vercel UI sometimes adds these)
      if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || 
          (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
        privateKey = privateKey.substring(1, privateKey.length - 1)
      }
      
      // Replace literal \n string (escaped) with actual newline characters
      // We do this globally to catch all occurrences. 
      // Vercel environment variables often escape newlines when pasted manually.
      privateKey = privateKey.replace(/\\n/g, '\n')
      
      // Ensure the key has the correct headers/footers if missing
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        console.log('initFirebaseAdmin: Adding missing headers to private key')
        privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`
      }

      try {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: pi,
            clientEmail: ce,
            privateKey: privateKey,
          }),
        })
        console.log('initFirebaseAdmin: Successfully initialized using separated FIREBASE_* env fields')
        return { admin, error: null }
      } catch (initErr: any) {
        console.error('initFirebaseAdmin: Initialization failed with env vars', initErr.message)
        throw initErr // Catch block below will handle this
      }
    }

    // Case 2: Local development using service-account.json
    // We try to load this ONLY if env vars are missing
    try {
      const fs = require('fs')
      const path = require('path')
      const saPath = path.resolve(process.cwd(), 'service-account.json')
      if (fs.existsSync(saPath)) {
        const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'))
        admin.initializeApp({
          credential: admin.credential.cert(sa),
        })
        console.log('initFirebaseAdmin: initialized using service-account.json file')
        return { admin, error: null }
      }
    } catch (e) {
      // Ignore if file doesn't exist locally
    }

    // Case 3: Application Default Credentials (ADC) fallback
    // Case 3: Application Default Credentials (ADC) fallback
    // Avoid attempting ADC in production (e.g., Vercel) because it often
    // results in confusing errors when no ADC is configured. Instead return
    // a clear configuration error so the deployer can set the required env vars.
    const runningInProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
    if (!runningInProd) {
      try {
        admin.initializeApp()
        console.log('initFirebaseAdmin: initialized using Application Default Credentials')
        return { admin, error: null }
      } catch (e) {
        // Ignore fallback failure in non-production
      }
    }

    // If we reach here, zero configuration was found
    return { 
      admin: null, 
      error: 'Firebase Admin not initialized: No valid configuration found. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables (see https://cloud.google.com/docs/authentication/getting-started).' 
    }

  } catch (e: any) {
    // If it's a "duplicate-app" error, we just return the existing one
    if (e.code === 'app/duplicate-app') {
      return { admin, error: null }
    }
    console.error('initFirebaseAdmin: unexpected error', e)
    return { admin: null, error: `Initialization failed: ${e.message}` }
  }
}

export function getFirebaseAdmin() {
  if (!admin.apps || !admin.apps.length) {
    const { error } = initFirebaseAdmin()
    if (error) console.error("getFirebaseAdmin failed to init:", error)
  }
  return admin
}

export default initFirebaseAdmin
