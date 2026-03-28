import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import initFirebaseAdmin from '@/lib/firebaseAdmin'
import applyCorsHeaders from '@/lib/cors'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { filename, data, contentType } = body || {}
    if (!filename || !data || !contentType) {
      return NextResponse.json({ error: 'Missing filename/data/contentType' }, { status: 400 })
    }

    const fb = initFirebaseAdmin()
    if (!fb?.storage) {
      return NextResponse.json({ error: 'Firebase Storage not initialized' }, { status: 500 })
    }

    const bucket = fb.storage().bucket()
    console.log('upload-image: using bucket=', bucket?.name)

    // Ensure bucket exists before attempting to save
    try {
      const [exists] = await bucket.exists()
      if (!exists) {
        console.error('upload-image: bucket does not exist', bucket.name)

        // In development fall back to writing to `public/uploads` so the UI remains functional
        if (process.env.NODE_ENV !== 'production') {
          try {
            const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads')
            await fs.promises.mkdir(uploadsDir, { recursive: true })
            const outPath = path.join(uploadsDir, filename)
            const buffer = Buffer.from(data, 'base64')
            await fs.promises.writeFile(outPath, buffer)
            const url = `/uploads/${encodeURIComponent(filename)}`
            return NextResponse.json({ url, path: `uploads/${filename}` })
          } catch (writeErr: any) {
            console.error('upload-image: local fallback write failed', writeErr)
            return NextResponse.json({ error: writeErr?.message || String(writeErr) }, { status: 500 })
          }
        }

        return NextResponse.json({ error: `Bucket ${bucket.name} does not exist` }, { status: 500 })
      }
    } catch (e: any) {
      console.error('upload-image: failed to check bucket existence', e)
      return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
    }

    const buffer = Buffer.from(data, 'base64')
    const file = bucket.file(filename)
    try {
      await file.save(buffer, { contentType })
    } catch (e: any) {
      console.error('upload-image: failed to save file to bucket', bucket.name, e)
      return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
    }
    // Make the file public-read (optional) and return signed URL
    // Use signed URL for read access (use Date object for expires)
    const expires = new Date(Date.now() + 31536000000) // ~1 year
    const [url] = await file.getSignedUrl({ action: 'read', expires })

    const res = NextResponse.json({ url, path: file.name })
    return applyCorsHeaders(res, req.headers.get('origin'))
  } catch (err: any) {
    console.error('upload-image error:', err)
    const res = NextResponse.json({ error: err?.message || String(err), stack: err?.stack }, { status: 500 })
    return applyCorsHeaders(res, req.headers.get('origin'))
  }
}
