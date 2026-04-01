import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'
import applyCorsHeaders from '@/lib/cors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { admin: fb, error } = initFirebaseAdmin()
    if (error || !fb) {
      return NextResponse.json({ 
        error: 'Firebase Configuration Error', 
        details: error,
        help: 'Please add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to Vercel Environment Variables.'
      }, { status: 500 })
    }
    
    const firestore = fb.firestore()

    // Try to read a small index doc first to avoid a large collection scan
    const keys: string[] = []
    try {
      const idxDoc = await firestore.collection('meta').doc('daily-menus-index').get()
      if (idxDoc.exists) {
        const data = idxDoc.data() as any
        if (Array.isArray(data?.keys)) {
          data.keys.forEach((k: string) => keys.push(k))
        }
      } else {
        const snap = await firestore.collection('daily-menus').get()
        snap.forEach((doc: any) => { keys.push(doc.id) })
      }
    } catch (e: any) {
      // If index read fails, fall back to collection scan
      try {
        const snap = await firestore.collection('daily-menus').get()
        snap.forEach((doc: any) => { keys.push(doc.id) })
      } catch (innerErr) {
        throw innerErr
      }
    }

    keys.sort((a, b) => (a < b ? 1 : -1))
    
    const res = NextResponse.json(keys)
    return applyCorsHeaders(res, req.headers.get('origin'))
  } catch (err: any) {
    const msg = err?.message || String(err)
    if (err?.code === 8 || err?.code === 'resource-exhausted' || msg?.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({ error: 'Quota exceeded: Firestore quota exhausted. Please enable billing or reduce requests.' }, { status: 429 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
