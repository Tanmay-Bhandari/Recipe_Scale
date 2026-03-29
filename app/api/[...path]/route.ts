import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import applyCorsHeaders from '@/lib/cors'

export async function OPTIONS(req: NextRequest) {
  const res = NextResponse.json(null, { status: 204 })
  return applyCorsHeaders(res, req.headers.get('origin'))
}

export default OPTIONS
