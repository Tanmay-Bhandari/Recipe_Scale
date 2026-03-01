import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const id = req.nextUrl.pathname.split('/').pop() || ''
    const fb = initFirebaseAdmin()
    if (!fb?.firestore) return NextResponse.json({ error: 'Firebase Firestore not initialized' }, { status: 500 })
    const firestore = fb.firestore()
    const doc = await firestore.collection('recipes').doc(id).get()
    if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(doc.data())
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop() || ''
    const data = await req.json()
    const fb = initFirebaseAdmin()
    if (!fb?.firestore) return NextResponse.json({ error: 'Firebase Firestore not initialized' }, { status: 500 })
    const firestore = fb.firestore()

    // Convert explicit nulls for image/imagePath into Firestore deletes so
    // editing a recipe and removing its photo actually deletes the stored fields.
    const processed: Record<string, any> = { ...data }
    if (Object.prototype.hasOwnProperty.call(data, 'image') && data.image === null) {
      processed.image = fb.firestore.FieldValue.delete()
    }
    if (Object.prototype.hasOwnProperty.call(data, 'imagePath') && data.imagePath === null) {
      processed.imagePath = fb.firestore.FieldValue.delete()
    }

    await firestore.collection('recipes').doc(id).set(processed, { merge: true })
    return NextResponse.json({ id })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop() || ''
    const fb = initFirebaseAdmin()
    if (!fb?.firestore) return NextResponse.json({ error: 'Firebase Firestore not initialized' }, { status: 500 })
    const firestore = fb.firestore()

    const docRef = firestore.collection('recipes').doc(id)
    const doc = await docRef.get()
    if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Delete regardless of deviceId ownership (allow deletion from any device)
    await docRef.delete()
    return NextResponse.json({ id })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
