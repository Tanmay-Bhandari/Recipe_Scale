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
    const snap = await firestore.collection('daily-menus').get()
    const keys: string[] = []
    snap.forEach((doc: any) => { keys.push(doc.id) })

    keys.sort((a, b) => (a < b ? 1 : -1))
    
    const res = NextResponse.json(keys)
    return applyCorsHeaders(res, req.headers.get('origin'))
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
