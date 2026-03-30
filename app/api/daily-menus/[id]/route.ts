import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'
import applyCorsHeaders from '@/lib/cors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop() || ''
    const fb = initFirebaseAdmin()
    if (!fb?.firestore) return NextResponse.json({ error: 'Firebase Firestore not initialized' }, { status: 500 })
    
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

export async function PUT(req: NextRequest) {
  try {
    const id = req.nextUrl.pathname.split('/').pop() || ''
    const data = await req.json()
    const fb = initFirebaseAdmin()
    if (!fb?.firestore) return NextResponse.json({ error: 'Firebase Firestore not initialized' }, { status: 500 })
    
    const firestore = fb.firestore()
    await firestore.collection('daily-menus').doc(id).set(data)
    
    const res = NextResponse.json({ id })
    return applyCorsHeaders(res, req.headers.get('origin'))
  } catch (err: any) {
    const res = NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
    return applyCorsHeaders(res, req.headers.get('origin'))
  }
}
