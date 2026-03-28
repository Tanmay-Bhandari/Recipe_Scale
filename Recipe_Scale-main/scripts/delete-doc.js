const admin = require('firebase-admin')
const path = require('path')
const fs = require('fs')

function loadServiceAccount() {
  const p = path.resolve(process.cwd(), 'service-account.json')
  if (!fs.existsSync(p)) {
    console.error('service-account.json not found at', p)
    process.exit(1)
  }
  return require(p)
}

async function main() {
  try {
    const serviceAccount = loadServiceAccount()
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
    const db = admin.firestore()
    const id = process.argv[2] || 'sample-1'
    await db.collection('recipes').doc(id).delete()
    console.log('Deleted document', id)
    process.exit(0)
  } catch (err) {
    console.error('Error deleting document:', err)
    process.exit(2)
  }
}

main()
