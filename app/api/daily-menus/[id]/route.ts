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
    const docRef = await firestore.collection('daily-menus').doc(id).get()
    
    if (!docRef.exists) {
      const res = NextResponse.json({ error: 'Not found' }, { status: 404 })
      return applyCorsHeaders(res, req.headers.get('origin'))
    }
    
    const res = NextResponse.json(docRef.data())
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
    await firestore.collection('daily-menus').doc(id).set(data)
    
    const res = NextResponse.json({ id })
    return applyCorsHeaders(res, req.headers.get('origin'))
  } catch (err: any) {
    const res = NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
    return applyCorsHeaders(res, req.headers.get('origin'))
  }
}
