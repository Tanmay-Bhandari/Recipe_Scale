import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'
import applyCorsHeaders from '@/lib/cors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const fb = initFirebaseAdmin()
    if (!fb?.firestore) return NextResponse.json({ error: 'Firebase Firestore not initialized' }, { status: 500 })
    
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
