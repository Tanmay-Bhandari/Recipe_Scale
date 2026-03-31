import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { admin: fb, error } = initFirebaseAdmin()
    if (error || !fb) {
      return NextResponse.json({ error: 'Firebase not initialized', details: error }, { status: 500 })
    }

    const firestore = fb.firestore()
    const snap = await firestore.collection('recipes').get()
    
    const names = new Set<string>()
    snap.forEach((doc) => {
      const data = doc.data()
      const ings = data.ingredients || []
      for (const ing of ings) {
        if (ing && typeof ing.name === 'string' && ing.name.trim()) {
          names.add(ing.name.trim())
        }
      }
    })

    const result = Array.from(names).sort((a, b) => a.localeCompare(b, 'gu'))
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 })
  }
}
