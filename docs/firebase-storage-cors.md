# Firebase Storage CORS — Setup and Testing

This document explains how to add CORS configuration to your Google Cloud Storage bucket backing Firebase Storage. You only need this if you want the browser to PUT/POST directly to signed upload URLs. The app currently uploads images via a server-side endpoint, so CORS is optional unless you switch to client-side signed URL PUTs.

## Recommended CORS JSON (development)

This example allows common methods from any origin. For production, replace `"*"` with your exact domain(s).

```json
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
    "responseHeader": ["Content-Type", "x-goog-resumable", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
```

## Using `gsutil` (Google Cloud SDK)

1. Install and authenticate the Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Create a file `cors.json` with the JSON above.
3. Run:

```bash
# Replace BUCKET_NAME with your bucket (e.g. project-id.appspot.com)
gsutil cors set cors.json gs://BUCKET_NAME
```

Windows PowerShell example (one-liner):

```powershell
@'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST", "DELETE", "OPTIONS"],
    "responseHeader": ["Content-Type", "x-goog-resumable", "Content-Length"],
    "maxAgeSeconds": 3600
  }
]
'@ > cors.json; gsutil cors set cors.json gs://BUCKET_NAME
```

## Using Google Cloud Console

1. Go to the Cloud Storage Browser: https://console.cloud.google.com/storage/browser
2. Click your bucket name.
3. Click the `CONFIGURATION` tab and choose `Edit CORS configuration`.
4. Paste the JSON and save.

## Bucket name

If you used a service account file, the bucket is commonly `YOUR_PROJECT_ID.appspot.com`. You can confirm the bucket name from `service-account.json` `project_id` or within `lib/firebaseAdmin.ts` which sets `storageBucket` when initializing admin SDK.

## Testing CORS

- Use a browser `fetch` from your app to `PUT` to the signed URL and check the network tab for `Access-Control-Allow-Origin` and whether the `OPTIONS` preflight is successful.

- Quick curl test (replace `SIGNED_URL`):

```bash
curl -X OPTIONS -i "SIGNED_URL"
```

## Notes and security

- Using `"origin": ["*"]` is OK for local development but not recommended for production. Use your production origin(s) instead.
- If you keep the server-side upload flow (current default), you do not need to set CORS on the bucket.

## When to use CORS

- Needed when the browser directly uploads to a signed URL (PUT/POST). Not needed when uploading via the server-side endpoint (`/api/upload-image`) as the server performs the upload to Storage.

---
Created to help enable direct client uploads if you choose that path. If you want, I can add a small script `scripts/set-storage-cors.*` to automate this in the repo and show how to fetch the bucket name automatically.