// Usage: node scripts/list-daily-menus.js
// Requires: npm install firebase-admin

const admin = require('firebase-admin')
const path = require('path')

const keyPath = path.join(__dirname, '..', 'service-account.json')
try {
  const serviceAccount = require(keyPath)
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  })
} catch (err) {
  console.error('Failed to load service-account.json from project root:', keyPath)
  console.error(err)
  process.exit(1)
}

async function listDailyMenus() {
  const db = admin.firestore()
  try {
    const snap = await db.collection('daily_menus').orderBy('createdAt', 'desc').limit(50).get()
    if (snap.empty) {
      console.log('No documents found in collection daily_menus')
      return
    }
    console.log(`Found ${snap.size} documents (showing up to 50):`)
    snap.forEach((doc) => {
      const d = doc.data()
      console.log('---')
      console.log('id:', doc.id)
      console.log('dayKey:', d.dayKey)
      console.log('deviceId:', d.deviceId)
      console.log('createdAt:', d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : d.createdAt)
      console.log('state keys:', d.state ? Object.keys(d.state.meals || {}) : 'no state')
    })
  } catch (err) {
    console.error('Error reading daily_menus collection:', err)
  }
}

listDailyMenus()
