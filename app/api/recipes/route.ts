import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'
import applyCorsHeaders from '@/lib/cors'

export async function GET(_req: NextRequest) {
  try {
    const fb = initFirebaseAdmin()
    if (!fb?.firestore) return NextResponse.json({ error: 'Firebase Firestore not initialized' }, { status: 500 })
    const firestore = fb.firestore()
    const snap = await firestore.collection('recipes').get()
    const val: Record<string, any> = {}
    snap.forEach((doc: any) => { val[doc.id] = doc.data() })
    const res = NextResponse.json(val)
    return applyCorsHeaders(res, _req.headers.get('origin'))
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const fb = initFirebaseAdmin()
    if (!fb?.firestore) return NextResponse.json({ error: 'Firebase Firestore not initialized' }, { status: 500 })
    const firestore = fb.firestore()
    // If client provided an `id` field and intends to use it as the document ID,
    // respect that by writing to `collection.doc(id)`. Otherwise use server-generated ID.
    if (data && data.id && typeof data.id === 'string') {
      const id = data.id
      await firestore.collection('recipes').doc(id).set(data)
      const res = NextResponse.json({ id }, { status: 201 })
      return applyCorsHeaders(res, req.headers.get('origin'))
    }

    const ref = await firestore.collection('recipes').add(data)
    const res = NextResponse.json({ id: ref.id }, { status: 201 })
    return applyCorsHeaders(res, req.headers.get('origin'))
  } catch (err: any) {
    const res = NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
    return applyCorsHeaders(res, (_req || req)?.headers.get('origin'))
  }
}
