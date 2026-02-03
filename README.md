# MHCC Dashboard (Vite + Express)

A lightweight, production-ready internal church dashboard. The Express server serves a static Vite React UI and provides authenticated API routes for Google Sheets data. Designed for Docker images built in GitHub Actions and deployed via Coolify by pulling from GHCR.

## Sheet Schema (Tab: `Events`)
Header columns must match **exactly** and in this order:
1. `Date`
2. `Title`
3. `IsSunday`
4. `Speaker`
5. `StaffGone`
6. `IsCommunion`
7. `Notes`

## Environment Variables
```
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
APP_PASSWORD=
SESSION_SECRET=
NODE_ENV=production
PORT=3000
```

Notes:
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` must preserve newlines (replace newlines with `\n`).
- `SESSION_SECRET` should be a long random string.
- `NODE_ENV=production` enables `SameSite=None; Secure` cookies for iframe use.

## Google Service Account Setup
1. In Google Cloud Console, create a service account.
2. Create a JSON key for it.
3. Copy `client_email` into `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
4. Copy `private_key` into `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (escape newlines as `\n`).
5. Share the Google Sheet with the service account email (Viewer access).

## Local Development
```
npm install
npm run dev
```

The client runs on Vite’s dev server and the API runs on Express. In development, the client will call `/api/*` against the same host.

## API Routes
- `POST /api/login` → `{ password }` sets the session cookie.
- `POST /api/logout` clears the cookie.
- `GET /api/events?start=YYYY-MM-DD&end=YYYY-MM-DD` returns `{ events, etag }`.

## Docker Build + Run (Local)
```
docker build -t mhcc-dashboard .
docker run -p 3000:3000 --env-file .env mhcc-dashboard
```

## GitHub Actions → GHCR
The workflow builds and publishes images on every push to `main`:
- `ghcr.io/<owner>/<repo>:latest`
- `ghcr.io/<owner>/<repo>:<sha>`

## Coolify Deployment (Image from Registry)
1. In Coolify, create a new app and choose **Docker Image from Registry**.
2. Image: `ghcr.io/<owner>/<repo>:latest`.
3. Expose port `3000`.
4. Add environment variables listed above.
5. Enable HTTPS (required for iframe cookies).

## Squarespace Embed
```
<iframe
  src="https://your-dashboard-domain.com"
  width="100%"
  height="900"
  style="border: none;"
  loading="lazy"
  referrerpolicy="no-referrer"
></iframe>
```

## Cookie Notes
- Cookies are `httpOnly`, `SameSite=None`, and `Secure` in production.
- This is required for third-party iframe contexts like Squarespace.

## Project Structure
- `server/` Express API + Google Sheets integration
- `client/` Vite React UI
- `Dockerfile` multi-stage build for server + client
- `.github/workflows/` GH Actions for GHCR
