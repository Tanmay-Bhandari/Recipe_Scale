import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'
import { apiUrl } from './api'

const clientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function initClientFirestore() {
  try {
    if (!getApps().length) {
      // Minimal initialization; missing values will cause runtime errors — caller should provide env vars
      initializeApp(clientConfig)
    }
  } catch (err) {
    if (typeof console !== 'undefined') console.debug('Firebase client init warning', err)
  }
  return getFirestore()
}

async function retryOnAbort<T>(fn: () => Promise<T>, attempts = 3, delay = 200): Promise<T> {
  let lastErr: any
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err: any) {
      lastErr = err
      const name = err?.name || err?.code || ''
      if (name === 'AbortError' && i < attempts - 1) {
        // wait and retry
        await new Promise((r) => setTimeout(r, delay * (i + 1)))
        continue
      }
      throw err
    }
  }
  throw lastErr
}

export async function fetchIngredientNamesFromFirestore(): Promise<string[]> {
  // Use server API to fetch ingredient names to avoid client rules issues.
  try {
    const url = apiUrl('/api/ingredients')
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Failed to fetch ingredient names: ${res.status}`)
    const data = await res.json().catch(() => null)
    if (!Array.isArray(data)) return []
    return data as string[]
  } catch (err) {
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
  const snap = await retryOnAbort(() => getDocs(collection(db, 'recipes')))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
}

export async function saveDailyMenuToFirestore(dayKey: string, state: any) {
  try {
    const deviceId = ((): string | null => {
      try {
        if (typeof window === 'undefined') return null
        return window.localStorage.getItem('deviceId')
      } catch (e) {
        return null
      }
    })()

    const url = apiUrl('/api/daily-menu')
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayKey, state, deviceId }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) {
      if (typeof console !== 'undefined') console.debug('saveDailyMenuToFirestore failed', data)
      return
    }
    if (typeof console !== 'undefined') console.debug('saveDailyMenuToFirestore saved', data?.id)
  } catch (err) {
    if (typeof console !== 'undefined') console.debug('saveDailyMenuToFirestore failed', err)
  }
}
