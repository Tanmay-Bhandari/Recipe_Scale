import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'
import applyCorsHeaders from '@/lib/cors'

export async function GET(req: NextRequest) {
  try {
    const fb = initFirebaseAdmin()
    if (!fb?.firestore) return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 })
    const firestore = fb.firestore()

    // Collect ingredient names from `recipes` collection as fallback
    const names = new Set<string>()
    const snap = await firestore.collection('recipes').get()
    snap.forEach((doc: any) => {
      const data = doc.data() || {}
      const ings = data.ingredients || []
      for (const ing of ings) {
        if (ing && typeof ing.name === 'string' && ing.name.trim()) names.add(ing.name.trim())
      }
    })

    const arr = Array.from(names).sort()
    const res = NextResponse.json(arr)
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
