import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'
import applyCorsHeaders from '@/lib/cors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const { admin: fb, error } = initFirebaseAdmin()
    if (error || !fb) {
      return NextResponse.json({ 
        error: 'Firebase Configuration Error', 
        details: error,
        help: 'Please add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to Vercel Environment Variables.'
      }, { status: 500 })
    }
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

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const data = await req.json()
    const { admin: fb, error } = initFirebaseAdmin()
    if (error || !fb) {
      return NextResponse.json({ 
        error: 'Firebase Configuration Error', 
        details: error,
        help: 'Please add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to Vercel Environment Variables.'
      }, { status: 500 })
    }
    const firestore = fb.firestore()

    // Convert explicit nulls for image/imagePath into Firestore deletes
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

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params
    const { admin: fb, error } = initFirebaseAdmin()
    if (error || !fb) {
      return NextResponse.json({ 
        error: 'Firebase Configuration Error', 
        details: error,
        help: 'Please add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to Vercel Environment Variables.'
      }, { status: 500 })
    }
    const firestore = fb.firestore()

    const docRef = firestore.collection('recipes').doc(id)
    const doc = await docRef.get()
    if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    await docRef.delete()
    return NextResponse.json({ id })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
