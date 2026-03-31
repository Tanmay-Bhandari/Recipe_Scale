import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { admin, error } = initFirebaseAdmin()
  
  const status: any = {
    initialized: !!admin,
    env: {
      projectId: !!process.env.FIREBASE_PROJECT_ID,
      clientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    }
  }

  if (error) {
    status.error = error
  }

  if (admin) {
    try {
      const db = admin.firestore()
      // Try a simple read
      const testSnap = await db.collection('recipes').limit(1).get()
      status.firestore = {
        connected: true,
        recipeCount: testSnap.size,
      }
    } catch (e: any) {
      status.firestore = {
        connected: false,
        error: e.message,
      }
    }
  }

  return NextResponse.json(status)
}
