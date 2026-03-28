#!/usr/bin/env node
// Simple CLI to list recipes and delete a recipe by document ID using the
// server-side Firebase Admin SDK and the existing service-account.json file.
// Usage:
//   node scripts/delete-recipe-cli.js --list
//   node scripts/delete-recipe-cli.js --id=RECIPE_ID
//   or: node scripts/delete-recipe-cli.js RECIPE_ID

const path = require('path')
const admin = require('firebase-admin')

const serviceAccountPath = path.join(__dirname, '..', 'service-account.json')
let serviceAccount
try {
  serviceAccount = require(serviceAccountPath)
} catch (err) {
  console.error(`Failed to load service account from ${serviceAccountPath}:`, err.message)
  process.exit(1)
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
const db = admin.firestore()

async function listRecipes() {
  const snap = await db.collection('recipes').get()
  if (snap.empty) {
    console.log('No recipes found')
    return
  }
  console.log('Recipe ID — Name')
  snap.forEach((doc) => {
    const data = doc.data() || {}
    const name = data.name || data.title || ''
    console.log(`${doc.id} — ${name}`)
  })
}

async function deleteById(id) {
  try {
    await db.collection('recipes').doc(id).delete()
    console.log(`Deleted recipe ${id}`)
  } catch (err) {
    console.error('Delete failed:', err.message || err)
    process.exitCode = 2
  }
}

async function main() {
  const rawArgs = process.argv.slice(2)
  if (!rawArgs.length) {
    console.log('No args provided. Use --list or --id=RECIPE_ID')
    await listRecipes()
    return
  }

  const listFlag = rawArgs.includes('--list')
  const idArg = rawArgs.find((a) => a.startsWith('--id='))
  const positional = rawArgs[0] && !rawArgs[0].startsWith('--') ? rawArgs[0] : null
  const id = idArg ? idArg.split('=')[1] : positional

  if (listFlag) {
    await listRecipes()
    return
  }

  if (!id) {
    console.log('No id provided. Use --id=RECIPE_ID or pass the id as the first argument.')
    await listRecipes()
    return
  }

  await deleteById(id)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
