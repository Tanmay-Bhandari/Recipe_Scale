import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { apiUrl } from './api'

const clientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export function initClientFirestore() {
  if (typeof window === 'undefined') return getFirestore()

  const missingKeys = Object.entries(clientConfig)
    .filter(([_, value]) => !value)
    .map(([key]) => key)

  if (missingKeys.length > 0) {
    console.error("Firebase Initialization Error: The following keys are missing from your .env.local file:", missingKeys.join(", "))
  }

  if (!getApps().length) {
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

  const url = apiUrl(`/api/recipes/${id}`)
  const res2 = await fetch(url, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId }),
  })
  const data = await res2.json().catch(() => null)

  if (!res2.ok) {
    const msg = data?.error || `Delete failed with status ${res2.status}`
    throw new Error(msg)
  }

  return data
}

export async function fetchRecipes(): Promise<any[]> {
  const db = initClientFirestore()
  const snap = await getDocs(collection(db, 'recipes'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
}
