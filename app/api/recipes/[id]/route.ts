import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'
import applyCorsHeaders from '@/lib/cors'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl
    const id = req.nextUrl.pathname.split('/').pop() || ''
    const fb = initFirebaseAdmin()
    if (!fb?.firestore) return NextResponse.json({ error: 'Firebase Firestore not initialized' }, { status: 500 })
    const firestore = fb.firestore()
    const doc = await firestore.collection('recipes').doc(id).get()
    if (!doc.exists) {
      const res = NextResponse.json({ error: 'Not found' }, { status: 404 })
      return applyCorsHeaders(res, req.headers.get('origin'))
    }
    const res = NextResponse.json(doc.data())
    return applyCorsHeaders(res, req.headers.get('origin'))
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
    const res = NextResponse.json({ id })
    return applyCorsHeaders(res, req.headers.get('origin'))
  } catch (err: any) {
    const res = NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
    return applyCorsHeaders(res, req.headers.get('origin'))
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
