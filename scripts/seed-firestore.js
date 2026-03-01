const admin = require('firebase-admin')
const path = require('path')
const fs = require('fs')

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

async function main() {
  const fromEnv = loadServiceAccountFromEnv()
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

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && !serviceAccount) {
    admin.initializeApp()
  } else if (serviceAccount) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  } else {
    console.error('No service account found. Set FIREBASE_SERVICE_ACCOUNT, GOOGLE_APPLICATION_CREDENTIALS, or add service-account.json in the repo root.')
    process.exit(1)
  }

  const firestore = admin.firestore()

  const SAMPLE_RECIPES = [
    {
      id: 'sample-1',
      name: 'Classic Chocolate Cake',
      baseQuantity: 1,
      baseUnit: 'kg',
      ingredients: [
        { id: 's1', name: 'All-Purpose Flour', amount: 250, unit: 'g' },
        { id: 's2', name: 'Sugar', amount: 200, unit: 'g' },
        { id: 's3', name: 'Cocoa Powder', amount: 75, unit: 'g' },
        { id: 's4', name: 'Butter', amount: 115, unit: 'g' },
        { id: 's5', name: 'Egg', amount: 3, unit: 'pieces' },
        { id: 's6', name: 'Milk', amount: 240, unit: 'ml' },
        { id: 's7', name: 'Baking Powder', amount: 2, unit: 'tsp' },
        { id: 's8', name: 'Vanilla Extract', amount: 1, unit: 'tsp' },
      ],
      createdAt: Date.now() - 100000,
    },
    {
      id: 'sample-2',
      name: 'Banana Bread',
      baseQuantity: 1,
      baseUnit: 'pieces',
      ingredients: [
        { id: 's9', name: 'Ripe Bananas', amount: 3, unit: 'pieces' },
        { id: 's10', name: 'All-Purpose Flour', amount: 190, unit: 'g' },
        { id: 's11', name: 'Sugar', amount: 150, unit: 'g' },
        { id: 's12', name: 'Butter (melted)', amount: 75, unit: 'g' },
        { id: 's13', name: 'Egg', amount: 1, unit: 'pieces' },
        { id: 's14', name: 'Baking Soda', amount: 1, unit: 'tsp' },
        { id: 's15', name: 'Salt', amount: 0.5, unit: 'tsp' },
      ],
      createdAt: Date.now() - 50000,
    },
  ]

  try {
    for (const r of SAMPLE_RECIPES) {
      const docRef = firestore.collection('recipes').doc(r.id)
      const data = { ...r }
      delete data.id
      await docRef.set(data, { merge: true })
      console.log('Seeded recipe', r.id)
    }
    console.log('Seeding complete')
    process.exit(0)
  } catch (err) {
    console.error('Seeding failed:', err)
    process.exit(1)
  }
}

void main()
