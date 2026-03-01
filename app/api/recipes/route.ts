import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'

export async function GET(_req: NextRequest) {
  try {
    const fb = initFirebaseAdmin()
    if (!fb?.firestore) return NextResponse.json({ error: 'Firebase Firestore not initialized' }, { status: 500 })
    const firestore = fb.firestore()
    const snap = await firestore.collection('recipes').get()
    const val: Record<string, any> = {}
    snap.forEach((doc: any) => { val[doc.id] = doc.data() })
    return NextResponse.json(val)
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
      return NextResponse.json({ id }, { status: 201 })
    }

    const ref = await firestore.collection('recipes').add(data)
    return NextResponse.json({ id: ref.id }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
