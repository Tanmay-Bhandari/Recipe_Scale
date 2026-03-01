#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

async function main() {
  try {
    const bucketArg = process.argv[2] || process.env.FIREBASE_STORAGE_BUCKET
    if (!bucketArg) {
      console.error('Usage: node scripts/setup-firebase-env.js <FIREBASE_STORAGE_BUCKET>')
      process.exit(1)
    }

    const saPath = path.join(process.cwd(), 'service-account.json')
    if (!fs.existsSync(saPath)) {
      console.error('service-account.json not found in project root. Place the file and re-run.')
      process.exit(1)
    }

    const raw = fs.readFileSync(saPath, 'utf8')
    // Escape newlines for .env single-line value
    const escaped = raw.replace(/\r?\n/g, '\\n')

    const envContent = `FIREBASE_SERVICE_ACCOUNT=${escaped}\nFIREBASE_STORAGE_BUCKET=${bucketArg}\n`
    fs.writeFileSync(path.join(process.cwd(), '.env.local'), envContent, 'utf8')
    console.log('.env.local created successfully')
  } catch (err) {
    console.error('Failed to create .env.local:', err)
    process.exit(1)
  }
}

main()
