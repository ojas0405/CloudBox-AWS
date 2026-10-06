# CloudBox verification

Verified locally on 5 October 2026 with Node.js 24.21.0.

## Completed

- Installed workspace dependencies; installation audit reported zero known vulnerabilities.
- Production frontend build completed successfully with Vite.
- All 8 backend tests passed. Tests cover missing configuration, the upload/list/URL/delete API flow with injected storage, upload limits and content validation, CORS, invalid keys, sanitized errors, paginated S3 listing, unique keys, SSE-S3 and presigned URL commands, status behavior, and filename sanitization.
- Actual Express server started without an AWS `.env`; `/api/health` returned `ok`.
- Vite proxy communicated with the actual backend; `/api/cloud/status` returned `not_configured`.
- Browser dashboard displayed Not configured, explanatory errors, and dashes for unavailable statistics.
- Dashboard, My Files, Cloud Architecture and About navigation verified in the browser.
- Search, sorting and type filter controls responded correctly. Real file filtering still needs a populated S3 bucket to demonstrate with live data.
- Upload dialog showed the selected local test filename and size. Submitting that TXT file returned the clear missing-AWS error; no false success appeared.
- Checked laptop layouts at 1440 × 1000 and 1366 × 900, and mobile at 390 × 844. Mobile document width did not exceed its viewport. Narrow navigation scrolls horizontally; populated file tables are designed to scroll inside their panel.
- No browser console warnings/errors were captured during the initial navigation checks.

## Not tested against live AWS

No real AWS credentials were supplied or configured. S3 upload, real object listing, signed-link retrieval, and deletion were **not tested against AWS**. Automated tests use explicit test doubles only and do not replace a live AWS check.

Configure `backend/.env` and follow the README demonstration to verify actual S3 operations and all four IAM permissions. This is the remaining external setup requirement, not a simulated storage mode.

## Local environment notes

The computer's normal npm launcher referenced a missing npm file. Installation/build/tests used the installed npm CLI directly; README and Windows start scripts include the fallback. Windows sandbox restrictions required running the Vite build and development server outside the restricted filesystem sandbox. The completed build succeeded there; no code import errors remained.
