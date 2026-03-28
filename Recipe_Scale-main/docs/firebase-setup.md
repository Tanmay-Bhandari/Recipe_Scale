# Firebase Storage Setup & Troubleshooting

If you see the error: `The specified bucket does not exist.` when uploading images, follow these steps to diagnose and fix it.

1) Confirm the bucket name
- By default the app uses `${project_id}.appspot.com` from the service account `project_id`.
- You can override the bucket name with the `FIREBASE_STORAGE_BUCKET` environment variable.

2) Quick checks
- Ensure `service-account.json` exists in the project root or `FIREBASE_SERVICE_ACCOUNT` env var is set.
- Confirm `project_id` inside the service account is correct and that Cloud Storage is enabled for that project.

3) How to set the env var (local dev)

PowerShell:

```powershell
$env:FIREBASE_STORAGE_BUCKET = "your-bucket-name.appspot.com"
npm run dev
```

Command prompt (Windows):

```cmd
set FIREBASE_STORAGE_BUCKET=your-bucket-name.appspot.com
npm run dev
```

Or add to your `.env.local` (Next.js) as:

```
FIREBASE_STORAGE_BUCKET=your-bucket-name.appspot.com
FIREBASE_SERVICE_ACCOUNT=./service-account.json
```

4) Create or verify the bucket
- In Firebase Console > Storage: check if a default bucket exists for your project.
- In Google Cloud Console > Storage Browser: verify the bucket name and permissions.

5) Logs added for debugging
- The server upload endpoints now log the chosen bucket name when called. Check terminal output running `npm run dev` for lines like:

```
upload-image: using bucket= recipescale-4ba26.appspot.com
upload-url: using bucket= recipescale-4ba26.appspot.com
```

6) If the bucket truly doesn't exist
- Create a bucket in the Google Cloud Console (prefer the default `project-id.appspot.com` name) or set `FIREBASE_STORAGE_BUCKET` to an existing bucket you control.

7) If you need help sharing logs
- Share the terminal lines printed when saving a recipe (the `upload-image` log and the error stack). I can help interpret and suggest the exact next step.

---
If you want, I can also add a startup check that validates the bucket exists and prints a friendly error at server start.

## Quick production steps (recommended)

- **Console:** In the Firebase Console -> Storage click "Get Started" and accept the defaults to create a bucket for your project. The default bucket name will be `YOUR_PROJECT_ID.appspot.com`.
- **gcloud:** If you prefer CLI, install and authenticate the Google Cloud SDK and run:

```bash
gcloud config set project YOUR_PROJECT_ID
gsutil mb -p YOUR_PROJECT_ID gs://YOUR_PROJECT_ID.appspot.com
```

- **Permissions:** Ensure your service account (or the credentials used by your server) has `roles/storage.admin` or at minimum `roles/storage.objectAdmin` for the bucket.
- **Env override:** For deployments where the bucket name differs from the project default, set `FIREBASE_STORAGE_BUCKET` to the full bucket name (for example, `my-bucket-name.appspot.com`).

Once created, restart your server. The upload endpoints will use the configured bucket.