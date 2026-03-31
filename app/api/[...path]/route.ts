import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import applyCorsHeaders from '@/lib/cors'

export async function OPTIONS(req: NextRequest, props: { params: Promise<{ path: string[] }> }) {
  await props.params // Await params for Next.js 15 compatibility if needed
  const res = NextResponse.json(null, { status: 204 })
  return applyCorsHeaders(res, req.headers.get('origin'))
}
