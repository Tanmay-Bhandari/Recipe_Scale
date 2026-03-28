const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function diagnostic() {
  console.log('--- Firebase Diagnostic ---');
  console.log('CWD:', process.cwd());
  
  const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
  console.log('Looking for service-account.json at:', serviceAccountPath);
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('ERROR: service-account.json NOT FOUND');
    process.exit(1);
  }
  
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  console.log('Service Account Project ID:', serviceAccount.project_id);

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin Initialized successfully');
    
    const db = admin.firestore();
    console.log('Fetching "recipes" collection...');
    const snap = await db.collection('recipes').get();
    console.log('Number of recipes found:', snap.size);
    
    snap.forEach(doc => {
      console.log(' - Found recipe:', doc.id, doc.data().name);
    });
    
    if (snap.size === 0) {
      console.log('WARNING: Collection "recipes" is EMPTY.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('DIAGNOSTIC FAILED:', err);
    process.exit(1);
  }
}

diagnostic();
