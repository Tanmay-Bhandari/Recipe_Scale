#!/usr/bin/env node
// Script to OCR images in scripts/images/ and produce lib/ingredient-names.json
// Usage: npm install tesseract.js@2 node-fetch canvas (if needed)
// Then: node scripts/import-ingredients-ocr.js

const fs = require('fs')
const path = require('path')
const { createWorker } = require('tesseract.js')

async function main() {
  const imagesDir = path.join(__dirname, 'images')
  const outFile = path.join(__dirname, '..', 'lib', 'ingredient-names.json')

  if (!fs.existsSync(imagesDir)) {
    console.error('Place image files to OCR in scripts/images/ then re-run this script.')
    process.exit(1)
  }

  const files = fs.readdirSync(imagesDir).filter(f => /\.(png|jpe?g|tif|bmp)$/i.test(f))
  if (!files.length) {
    console.error('No image files found in scripts/images/')
    process.exit(1)
  }

  const worker = await createWorker({ logger: m => console.log(m) })
  await worker.load()
  await worker.loadLanguage('guj')
  await worker.initialize('guj')

  const names = new Set()

  for (const f of files) {
    const p = path.join(imagesDir, f)
    console.log('OCR', p)
    try {
      const { data: { text } } = await worker.recognize(p)
      // Split lines and words, simple heuristics to extract tokens
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
      for (const line of lines) {
        // split on common separators
        const parts = line.split(/[\/,\.\t\|\-–—]+/).map(s => s.trim()).filter(Boolean)
        for (const p of parts) {
          // remove digits and punctuation
          const cleaned = p.replace(/[0-9\(\)\[\]\*]+/g, '').trim()
          if (cleaned.length > 1) names.add(cleaned)
        }
      }
    } catch (e) {
      console.error('Failed OCR for', f, e.message)
    }
  }

  await worker.terminate()

  const arr = Array.from(names).sort()
  fs.writeFileSync(outFile, JSON.stringify(arr, null, 2), 'utf8')
  console.log('Wrote', outFile, 'with', arr.length, 'entries')
}

main().catch(err => { console.error(err); process.exit(1) })
