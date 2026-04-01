#!/usr/bin/env node
/**
 * Backfill script to build `meta/daily-menus-index` document.
 * Usage: node scripts/backfill-daily-menus-index.js
 * It prefers service-account.json in the repo root; otherwise uses env vars.
 */
const fs = require('fs')
const path = require('path')
const admin = require('firebase-admin')

function initAdmin() {
  const saPath = path.resolve(process.cwd(), 'service-account.json')
  if (fs.existsSync(saPath)) {
    const sa = JSON.parse(fs.readFileSync(saPath, 'utf8'))
    admin.initializeApp({ credential: admin.credential.cert(sa) })
    console.log('Initialized Firebase Admin using service-account.json')
    return admin
  }

  const pk = process.env.FIREBASE_PRIVATE_KEY
  const ce = process.env.FIREBASE_CLIENT_EMAIL
  const pi = process.env.FIREBASE_PROJECT_ID
  if (pk && ce && pi) {
    let privateKey = pk.trim()
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.substring(1, privateKey.length - 1)
    }
    privateKey = privateKey.replace(/\\n/g, '\n')
    admin.initializeApp({
      credential: admin.credential.cert({ projectId: pi, clientEmail: ce, privateKey }),
    })
    console.log('Initialized Firebase Admin using env FIREBASE_* variables')
    return admin
  }

  console.error('No service-account.json found and FIREBASE_* env vars are not set. Aborting.')
  process.exit(2)
}

async function backfill() {
  initAdmin()
  const db = admin.firestore()

  console.log('Fetching daily-menus document ids...')
  const keys = []

  try {
    // Use pagination to avoid memory issues on very large collections
    let query = db.collection('daily-menus').orderBy('__name__').limit(500)
    while (true) {
      const snap = await query.get()
      if (snap.empty) break
      snap.forEach(doc => keys.push(doc.id))
      const last = snap.docs[snap.docs.length - 1]
      if (!last) break
      query = db.collection('daily-menus').orderBy('__name__').startAfter(last.id).limit(500)
      if (snap.size < 500) break
    }

    console.log(`Found ${keys.length} daily-menus docs. Writing index...`)
    await db.collection('meta').doc('daily-menus-index').set({ keys }, { merge: false })
    console.log('Wrote meta/daily-menus-index successfully.')
    process.exit(0)
  } catch (err) {
    console.error('Backfill failed:', err)
    process.exit(1)
  }
}

backfill()
