# CloudBox

Cloud storage made simple. CloudBox is a single-user college project for uploading, browsing, viewing, downloading, and deleting files in a **real private Amazon S3 bucket**. The website and backend run on your computer; files live in AWS. No database or login is needed.

## Features

- Light, responsive dashboard with sidebar navigation, architecture and about pages.
- Real file count, storage size, recent files and file-type counts calculated from S3 objects. No sample files or fabricated connected state.
- File selection or drag and drop, filename and size preview, upload progress, and notifications.
- PDF, JPG/JPEG, PNG, TXT, DOC/DOCX and PPT/PPTX uploads, up to **10 MiB (10 × 1024 × 1024 bytes)**, shown as 10 MB in the UI.
- Filename search, type filtering and sorting by name, date or size.
- Five-minute presigned links to view or download private objects.
- Delete confirmation, list refresh, and loading, empty and error states.
- Missing AWS configuration is handled without crashing.

## Technologies used

React + Vite, Node.js + Express, Amazon S3, AWS SDK for JavaScript v3, Lucide React and plain CSS. Requires Node.js **22 or newer** and npm. Tested runtime: Node.js 24.

## Project structure

```text
cloudbox/
  backend/
    config.js              # Backend environment configuration
    app.js                 # Express app and CORS
    server.js              # Local server entry point
    routes/files.js        # File REST endpoints
    services/s3.js         # AWS SDK operations
    middleware/            # Upload validation and safe errors
    test/                  # API and storage tests using test doubles
    .env.example           # Configuration template; contains no credentials
  frontend/
    src/components/        # Upload dialog, file icons, reusable modal
    src/pages/             # Architecture and About
    src/services/api.js    # Browser-to-backend requests
    src/App.jsx            # Dashboard and file management
    src/styles.css         # Responsive light theme
    vite.config.js         # Local /api proxy
  package.json             # npm workspaces and convenience commands
  package-lock.json        # Locked dependencies
  .gitignore
  README.md
```

## Architecture

```text
Browser → React frontend → Express backend → AWS SDK → Amazon S3
```

The React interface requests file operations from Express. Express validates uploads and calls S3 with backend-only credentials. S3 stores each file as an object identified by its key. CloudBox adds a UUID to each new key so two uploads with the same filename do not overwrite each other. The UI removes this UUID when showing names. Files uploaded directly to the dedicated bucket are also listed, including nested keys. Listing follows S3 pagination; statistics cover all current objects, excluding folder markers.

For viewing/downloading, React asks Express for a URL. Express checks that the object exists and uses `GetObjectCommand` with the presigner to create a link lasting **300 seconds**. The browser then reads the file directly from S3. The bucket remains private. Anyone possessing the link can use it until expiry (or until its credentials expire), so keep links private. PDF, images and text can open in the browser; Office and other files download. Actual inline rendering depends on browser support and the object's content type.

## AWS setup — step by step

You need permission to create a bucket and configure IAM. If using an AWS Academy/Learner Lab, start your lab first and use the provided temporary credentials instead of creating an IAM user; those credentials also require `AWS_SESSION_TOKEN`. If the lab restricts IAM, ask your instructor for the required S3 access.

1. Sign in to the [AWS Management Console](https://console.aws.amazon.com/). Use your administrator or classroom identity for setup. Do not use root access keys in the application.
2. Search for **S3** and open **Amazon S3**.
3. Select **Create bucket**. Choose a **General purpose** bucket. Enter a globally unique name, for example `cloudbox-yourname-class-2026` (replace this example with your own name).
4. Select the AWS region you want to use; note its code, such as `ap-south-1`. The backend region must match the bucket. You may use a different region provided by your lab.
5. Keep **Object Ownership: Bucket owner enforced / ACLs disabled** and **Block all public access** enabled. Do not add a public bucket policy.
6. For this simple demo, leave **Bucket Versioning disabled**, **Object Lock disabled**, and choose **SSE-S3** encryption (Amazon S3 managed keys). CloudBox explicitly requests SSE-S3. SSE-KMS would need additional KMS permissions and configuration, which this project does not include. Create the bucket.
7. Search for **IAM**, open **Users**, select **Create user**, and use a name such as `cloudbox-local-demo`. This programmatic user does not need AWS console access. Create it without broad permissions. An administrator must perform these steps if your current identity cannot.
8. Open the user's **Permissions** tab → **Add permissions** → **Create inline policy**. In the JSON editor, paste the policy below, replacing **both** occurrences of `YOUR_BUCKET_NAME`. Name it `CloudBoxBucketAccess` and save it. This grants only the four S3 actions needed by the app and only for this bucket.
9. Open the user's **Security credentials** tab → **Access keys** → **Create access key**. Choose the use case for **Local code** (or the equivalent local application option), follow the console's guidance, and create the key. Save the **Access key ID** and **Secret access key** securely; the secret is only shown at creation. Never paste these into React, a screenshot, or this chat. For longer-term use, AWS recommends temporary credentials; the app also supports the SDK's default profile/role chain when explicitly enabled.
10. In the `backend` folder, copy `.env.example` to `.env`. On Windows PowerShell: `Copy-Item .env.example .env`. On macOS/Linux: `cp .env.example .env`.
11. Edit **backend/.env** locally. Set `AWS_REGION` to your bucket region, `AWS_S3_BUCKET_NAME` to the exact bucket name, and set the access key and secret. For lab/temporary credentials, also fill in `AWS_SESSION_TOKEN`. Leave `USE_AWS_DEFAULT_CREDENTIALS=false` for this method. Do not use quote placeholders as real values.
12. Start the backend using the commands below, then start the frontend in a second terminal. Open [http://localhost:5173](http://localhost:5173). The sidebar should say **Connected** only after S3 answers a list request. This proves list connectivity, not that all object permissions have been tested.
13. Select a small PDF or TXT file, check its name and size, click **Upload file**, and wait for success. The file list and statistics refresh automatically.
14. In the S3 console, open your bucket's **Objects** tab and refresh. Confirm the new object is present. Its key begins with a UUID followed by `--` and your sanitized filename. Test View, Download and Delete from CloudBox; refresh S3 to confirm deletion.

Minimum IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListCloudBoxBucket",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME"
    },
    {
      "Sid": "ManageCloudBoxObjects",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}
```

This policy is for the application identity, not permission to create buckets or administer IAM. The console identity used during setup may need broader setup/console permissions. `HeadObject` uses `s3:GetObject`; the connectivity probe uses `ListObjectsV2` and therefore `s3:ListBucket`. No public ACL or bucket policy is required. No S3 bucket CORS setting is needed for top-level browser navigation through signed URLs; the browser uploads to Express rather than directly to S3.

Optional profile/role method: set region and bucket, leave the explicit key fields empty, set `USE_AWS_DEFAULT_CREDENTIALS=true`, and configure a working AWS SDK profile/role (e.g. an instructor-provided SSO profile). If needed, set `AWS_PROFILE` in the backend environment. This requires the corresponding AWS profile setup outside CloudBox.

Official references: [Create a bucket](https://docs.aws.amazon.com/AmazonS3/latest/userguide/create-bucket-overview.html), [Block public access](https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html), [Manage IAM access keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html), [Secure access keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/securing_access-keys.html), [S3 permissions](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security_iam_service-with-iam.html), and [Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).

## How to run

Extract/open this project folder first. Dependencies are already installed in the provided workspace, but install them after downloading or copying the project to another computer.

**Terminal 1 — backend**, starting from `cloudbox`:

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Edit .env locally with your AWS configuration. Only copy once; do not overwrite existing settings.
npm run dev
```

**Terminal 2 — frontend**, starting from `cloudbox`:

```powershell
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Keep both terminals running. Stop them with Ctrl+C. Changes to `.env` require a backend restart. You can start without `.env`; the interface shows **Not configured** and actionable messages rather than pretending to be connected.

Alternatively install everything once from the project root with `npm install`, then run `npm run dev:backend` and `npm run dev:frontend` in separate terminals. Run `npm test` from the root for backend tests, and `npm run build` for the production frontend build. To preview that build, run `npm run preview --workspace frontend` while the backend is still running.

The frontend uses a Vite `/api` proxy to `127.0.0.1:3001`. Vite listens on port 5173 with `strictPort` so CORS settings stay consistent. The backend allows browser origin `http://localhost:5173`; use that exact address. If changing the backend port, also change the proxy in `frontend/vite.config.js`. If changing the frontend port, update `FRONTEND_ORIGIN` in `backend/.env` and the Vite port. No frontend AWS variables are needed.

**This computer's npm workaround:** the installed `npm` launcher currently resolves a missing npm file. If ordinary `npm` fails with `MODULE_NOT_FOUND`, replace each `npm` command with:

```powershell
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' install
# Example to start backend (inside backend):
& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run dev
```

This uses the working installed npm directly. It does not require changing your system configuration. The included `start-backend.cmd` and `start-frontend.cmd` use this fallback automatically on Windows.

## Backend API

| Method | Endpoint                               | Result                                                 |
| ------ | -------------------------------------- | ------------------------------------------------------ |
| GET    | `/api/health`                          | Local backend health, independent of AWS               |
| GET    | `/api/cloud/status`                    | `connected`, `not_configured`, or `disconnected`       |
| GET    | `/api/files`                           | `{ files: [{ key, name, type, size, lastModified }] }` |
| POST   | `/api/files/upload`                    | Multipart `file` field; 201 and saved file details     |
| GET    | `/api/files/url?key=...&download=true` | `{ url, expiresIn: 300 }`                              |
| DELETE | `/api/files?key=...`                   | Delete object, then success JSON                       |

Keys are URL-encoded query parameters rather than route segments so nested keys and special characters work safely. Use `download=false` for inline viewing where supported. Errors use JSON `{ error, code }` and suitable 400, 403, 404, 413, 415, 503, or 504 status codes. Cloud status responds with HTTP 200 and its explicit status so the UI can display missing configuration. SDK error details and credentials are never returned.

## Classroom demonstration flow

1. Open CloudBox and explain the dashboard statistics come from real S3 objects.
2. Show **Connected** in Cloud storage.
3. Open your private S3 bucket's Objects tab in another browser tab.
4. Upload a small PDF from CloudBox.
5. Refresh S3 and show the newly created object.
6. Return to CloudBox and point out the updated file count and storage usage.
7. Use View or Download on the file.
8. Explain that Express generates a temporary signed URL; the bucket stays private. Do not share the full signed link publicly.
9. Click Delete, show the confirmation, then confirm.
10. Refresh the S3 console and show that the object has disappeared.
11. Open Cloud Architecture and explain the five components and concepts.

### A 30–60 second explanation

“CloudBox is a cloud-based file storage project. React provides the website, and a Node.js Express server handles file requests. The server communicates with Amazon S3 through the AWS SDK. Every uploaded file becomes an object in a private S3 bucket, so it is stored in the cloud rather than only on my laptop. The dashboard calculates its statistics from the actual objects. AWS credentials remain on the server. When I view or download a file, the server generates a temporary presigned URL that expires after five minutes. I can also search, sort, and delete files with confirmation. This demonstrates object storage, on-demand access, scalable storage, cloud APIs, and basic security.”

## Security, limits and troubleshooting

- This app is intentionally **single-user, local only**. Both servers bind to loopback. There is no authentication; do not expose the backend to the internet or treat CORS as authentication. A dedicated bucket keeps the demo away from unrelated files: the app lists and may delete any current object in its configured bucket.
- Upload validation checks extensions, basic magic bytes (PDF, JPEG, PNG, ZIP-based Office, legacy Office), and rejects empty/binary-null TXT files. This is basic validation, not antivirus scanning or a full Office file parser. The server sets its own MIME type based on the validated extension; it does not trust browser MIME strings. Legacy DOC/PPT must be binary Office files; TXT should be UTF-8 without null bytes.
- The backend buffers at most 10 MiB for each upload. This keeps the assignment understandable; it is not a large/concurrent upload service. Upload progress measures browser-to-Express transfer; after 100%, the UI waits for the S3 save before showing success.
- Status and file statistics reflect the last refresh, not a continuous health monitor. The refresh button checks S3 again. A failed refresh clears statistics to dashes, avoiding stale success claims.
- Keep versioning disabled for this demo. If enabled, Delete adds a delete marker; older versions remain and may incur charges. Statistics show current listed objects, not old versions. CloudBox does not purge versions.
- S3 requests have a 15-second timeout and limited retries; failures show readable errors. `Connected` checks listing only; test upload/download/delete to validate all IAM permissions.
- “Not configured”: fill in the four required AWS values and restart the backend. Temporary keys also require a session token.
- “Could not connect”: confirm the exact region/bucket name, IAM policy, internet access, and that lab credentials have not expired. Check the computer's clock if signed links fail.
- “Backend unreachable”: start Terminal 1 and verify port 3001 is free. “Port 5173 already in use”: close the other app or adjust both port and origin settings as described above.
- Files with the wrong extension/signature or files over 10 MB are rejected. No upload success is shown until S3 accepts the object.
- Fonts use Google Fonts with system fallbacks; the app remains usable without font network access.
- AWS storage/requests may incur charges. After the assignment, remove unwanted objects/bucket and deactivate/delete demo access keys using your setup identity. Never commit `.env` or send credentials with the project.

## Verification

See `VERIFICATION.md` for the checks performed on this copy. Automated storage tests use injected test doubles; they do **not** prove AWS access. Real S3 upload, view, download and delete require your AWS configuration and the console demonstration above.
