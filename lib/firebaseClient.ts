import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const clientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function initClientFirestore() {
  if (!getApps().length) {
    // Minimal initialization; missing values will cause runtime errors — caller should provide env vars
    initializeApp(clientConfig)
  }
  return getFirestore()
}

export async function fetchIngredientNamesFromFirestore(): Promise<string[]> {
  try {
    const db = initClientFirestore()
    const snap = await getDocs(collection(db, 'recipes'))
    const names = new Set<string>()
    snap.forEach((doc) => {
      const data: any = doc.data() || {}
      const ings = data.ingredients || []
      for (const ing of ings) {
        if (ing && typeof ing.name === 'string' && ing.name.trim()) names.add(ing.name.trim())
      }
    })
    return Array.from(names).sort()
  } catch (err) {
    // allow caller to handle fallback
    throw err
  }
}

export default fetchIngredientNamesFromFirestore

export async function deleteRecipeClient(id: string) {
  if (!id) throw new Error('Missing id')

  const deviceId = ((): string | null => {
    try {
      if (typeof window === 'undefined') return null
      return window.localStorage.getItem('deviceId')
    } catch (e) {
      return null
    }
  })()

  const res = await fetch(`/api/recipes/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const msg = data?.error || `Delete failed with status ${res.status}`
    throw new Error(msg)
  }

  return data
}

export async function fetchRecipes(): Promise<any[]> {
  const db = initClientFirestore()
  const snap = await getDocs(collection(db, 'recipes'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
}
