// Firestore CRUD functions using Firebase v9 (modular)
import initFirestoreClient from './firestoreClient'
// Attempt to read auth state when running in browser to help diagnose rules failures
let _diagnoseAuth = async () => {
  try {
    if (typeof window === 'undefined') return null
    // Lazy-import firebase/auth to avoid server-side errors
    const mod = await import('firebase/auth')
    const { getAuth } = mod
    const auth = getAuth()
    return auth?.currentUser || null
  } catch (e) {
    return null
  }
}
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from 'firebase/firestore'

const db = initFirestoreClient()

// Default collection name for daily menus
export const COLLECTION_NAME = 'daily_menus'

/**
 * Add a document to the configured collection.
 * Accepts a flexible payload — we'll add `createdAt` automatically.
 */
export async function addDocument(payload: Record<string, any>) {
  try {
    const user = await _diagnoseAuth().catch(() => null)
    if (user) console.debug('addDocument: currentUser', { uid: user.uid, email: user.email })
    const col = collection(db, COLLECTION_NAME)
    const data = { ...payload, createdAt: serverTimestamp() }
    const ref = await addDoc(col, data)
    return { id: ref.id }
  } catch (err) {
    console.error('addDocument error', err)
    // Report error to server diagnostics endpoint (best-effort)
    try {
      const user = await _diagnoseAuth().catch(() => null)
      const report = {
        source: 'lib/firestoreApi.addDocument',
        message: err?.message || String(err),
        stack: err?.stack || null,
        user: user ? { uid: user.uid, email: user.email } : null,
        payload: payload || null,
        ts: new Date().toISOString(),
      }
      // Fire-and-forget; do not block failure path
      if (typeof fetch !== 'undefined') {
        fetch('/api/diagnostics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
        }).catch(() => {})
      }
    } catch (e) {
      // ignore
    }
    throw err
  }
}

export async function fetchAllDocuments() {
  try {
    const col = collection(db, COLLECTION_NAME)
    const q = query(col, orderBy('createdAt', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
  } catch (err) {
    console.error('fetchAllDocuments error', err)
    throw err
  }
}

export async function deleteDocumentById(id: string) {
  if (!id) throw new Error('Missing id')
  try {
    const dref = doc(db, COLLECTION_NAME, id)
    await deleteDoc(dref)
    return true
  } catch (err) {
    console.error('deleteDocumentById error', err)
    throw err
  }
}

export async function updateDocumentById(id: string, patch: Partial<any>) {
  if (!id) throw new Error('Missing id')
  try {
    const dref = doc(db, COLLECTION_NAME, id)
    await updateDoc(dref, patch)
    return true
  } catch (err) {
    console.error('updateDocumentById error', err)
    throw err
  }
}
