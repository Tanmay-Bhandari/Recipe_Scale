import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { filename, contentType } = body || {}
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing filename or contentType' }, { status: 400 })
    }

    const fb = initFirebaseAdmin()
    if (!fb?.storage) {
      return NextResponse.json({ error: 'Firebase Storage not initialized' }, { status: 500 })
    }

    const bucket = fb.storage().bucket()
    console.log('upload-url: using bucket=', bucket?.name)

    // If the configured bucket doesn't exist, provide a local fallback in development
    try {
      const [exists] = await bucket.exists()
      if (!exists) {
        console.error('upload-url: bucket does not exist', bucket.name)
        if (process.env.NODE_ENV !== 'production') {
          // For direct uploads in dev, instruct the client to POST to the server-side endpoint
          const uploadUrl = `/api/upload-image`
          const downloadUrl = `/uploads/${encodeURIComponent(filename)}`
          return NextResponse.json({ uploadUrl, downloadUrl, path: `uploads/${filename}` })
        }
        return NextResponse.json({ error: `Bucket ${bucket.name} does not exist` }, { status: 500 })
      }
    } catch (e: any) {
      console.error('upload-url: failed to check bucket existence', e)
      return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
    }

    const file = bucket.file(filename)

    // Signed URL for uploading (write)
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    })

    // Signed URL for downloading (read) — valid for long duration
    const [downloadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 31536000000, // ~1 year
    })

    return NextResponse.json({ uploadUrl, downloadUrl, path: file.name })
  } catch (err: any) {
    console.error('upload-url error:', err)
    return NextResponse.json({ error: err?.message || String(err), stack: err?.stack }, { status: 500 })
  }
}
