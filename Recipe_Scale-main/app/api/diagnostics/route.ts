import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'
import applyCorsHeaders from '@/lib/cors'

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const admin = initFirebaseAdmin()
    if (!admin?.firestore) return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 })
    const firestore = admin.firestore()

    const doc = {
      source: data?.source || 'client',
      message: data?.message || null,
      stack: data?.stack || null,
      user: data?.user || null,
      payload: data?.payload || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      tsClient: data?.ts || null,
    }

    // Write to diagnostics collection for later inspection
    await firestore.collection('diagnostics').add(doc)
    console.debug('diagnostics: saved report', { source: doc.source })
    const res = NextResponse.json({ ok: true }, { status: 201 })
    return applyCorsHeaders(res, req.headers.get('origin'))
  } catch (err: any) {
    const res = NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
    return applyCorsHeaders(res, req.headers.get('origin'))
  }
}

export async function OPTIONS(req: NextRequest) {
  const res = NextResponse.json({})
  return applyCorsHeaders(res, req.headers.get('origin'))
}
