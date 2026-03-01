# Functions: Run & Deploy

This document explains how to run and deploy the Cloud Functions in this repo. The functions implement a small REST API for `recipes` using Firestore and the Admin SDK.

Prerequisites
- Install Node.js (match `engines.node` in `functions/package.json`, Node 24 recommended).
- Install Firebase CLI and authenticate:
  ```powershell
  npm install -g firebase-tools
  firebase login
  ```

Prepare credentials
- Preferred: set the `FIREBASE_SERVICE_ACCOUNT` environment variable with the full service account JSON (stringified) or a path to the JSON file. Example (PowerShell):
  ```powershell
  $env:FIREBASE_SERVICE_ACCOUNT = Get-Content .\service-account.json -Raw
  ```
- Alternative: set `GOOGLE_APPLICATION_CREDENTIALS` to the path of the service account JSON file. Example:
  ```powershell
  $env:GOOGLE_APPLICATION_CREDENTIALS = "d:\path\to\service-account.json"
  ```
- If neither env is present the code will attempt to read `service-account.json` from the project root.

Install & build
```powershell
cd "d:\recipe\recipe-calculator-app (1)\functions"
npm install
npm run build
```

Run locally with the emulator
- Start the Functions emulator (this builds then runs the emulator):
```powershell
npm run serve
```
-- The emulator output will show a local URL for the `api` function (e.g. `http://localhost:5001/<project>/us-central1/api`). Use that base URL for requests.

Example requests (emulator)
```powershell
# List recipes
curl http://localhost:5001/<project>/us-central1/api/recipes

# Create recipe
curl -X POST -H "Content-Type: application/json" -d '{"name":"Soup"}' http://localhost:5001/<project>/us-central1/api/recipes
```

Deploy to Firebase
- Ensure Firebase project is selected (or run `firebase use --add` to add/select a project).
- Deploy functions:
```powershell
npm run deploy
```
- After deploy the function will be available at a Google Cloud Functions URL shown in the deploy output (or via `firebase functions:log`).

Notes & recommendations
- The functions currently use `service-account.json` for admin credentials in the local repo. For production deployments prefer using the default service account or secret manager rather than committing static keys.
- Firestore is used. The functions read/write to the `recipes` collection via `admin.firestore()`.
- Secure your database rules for production; the admin SDK bypasses rules for server-side usage, but client reads/writes need rules set.

Files of interest
- `functions/src/firebaseAdmin.ts` — initializes the Admin SDK.
- `functions/src/index.ts` — Express routes exported as `api` Cloud Function.
