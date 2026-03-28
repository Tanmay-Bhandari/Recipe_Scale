import { NextResponse } from 'next/server'

export function applyCorsHeaders(res: NextResponse, origin: string | null | undefined) {
  if (origin) {
    res.headers.set('Access-Control-Allow-Origin', origin)
  } else {
    res.headers.set('Access-Control-Allow-Origin', '*')
  }
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  res.headers.set('Access-Control-Allow-Credentials', 'true')
  return res
}

export default applyCorsHeaders
