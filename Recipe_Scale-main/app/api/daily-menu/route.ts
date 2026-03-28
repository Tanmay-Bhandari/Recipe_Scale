import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'
import applyCorsHeaders from '@/lib/cors'

export async function OPTIONS(req: NextRequest) {
  const res = NextResponse.json({})
  return applyCorsHeaders(res, req.headers.get('origin'))
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const fb = initFirebaseAdmin()
    if (!fb?.firestore) return NextResponse.json({ error: 'Firebase Firestore not initialized' }, { status: 500 })
    const firestore = fb.firestore()

    // Basic validation
    if (!data || typeof data.dayKey !== 'string' || typeof data.state !== 'object') {
      const res = NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
      return applyCorsHeaders(res, req.headers.get('origin'))
    }

    const docId = String(data.dayKey)
    const docRef = firestore.collection('daily_menus').doc(docId)

    // Preserve createdAt on first write, update updatedAt on subsequent writes
    const existing = await docRef.get()
    if (existing && existing.exists) {
      await docRef.set(
        {
          dayKey: data.dayKey,
          state: data.state,
          deviceId: data.deviceId || null,
          updatedAt: fb.firestore.FieldValue.serverTimestamp(),
        },
        { merge: false }
      )
    } else {
      await docRef.set({
        dayKey: data.dayKey,
        state: data.state,
        deviceId: data.deviceId || null,
        createdAt: fb.firestore.FieldValue.serverTimestamp(),
      })
    }

    const res = NextResponse.json({ id: docId }, { status: 201 })
    return applyCorsHeaders(res, req.headers.get('origin'))
  } catch (err: any) {
    const res = NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
    return applyCorsHeaders(res, (_req || req)?.headers.get('origin'))
  }
}

export async function GET() {
  // Optional: allow listing recent daily_menus for admin/debug - keep minimal
  try {
    const fb = initFirebaseAdmin()
    if (!fb?.firestore) return NextResponse.json({ error: 'Firebase Firestore not initialized' }, { status: 500 })
    const firestore = fb.firestore()
    const snap = await firestore.collection('daily_menus').orderBy('createdAt', 'desc').limit(50).get()
    const items: any[] = []
    snap.forEach((d: any) => items.push({ id: d.id, ...(d.data() || {}) }))
    return NextResponse.json(items)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
