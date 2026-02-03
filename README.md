# Church Calendar Dashboard

Production-ready internal dashboard that reads events from a Google Sheet and renders a two-column calendar view with per-user date range filtering. Designed for self-hosting (Hetzner + Coolify) and embedding via Squarespace iframe.

## Sheet Schema (Tab: `Events`)
Header columns must match exactly:
- `Date` (YYYY-MM-DD) **required**
- `Title` **required**
- `EventType` **required** (`Sunday` or `Other`)
- `SermonSeries` (optional)
- `Speaker` (optional)
- `StaffGone` (optional)
- `SpecialNotes` (optional)

The app is read-only; editing happens only in Google Sheets.

## Environment Variables
Create a `.env` file or set these in Coolify:

```
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
APP_PASSWORD=
SESSION_SECRET=
NODE_ENV=production
APP_BASE_URL=
```

Notes:
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` must preserve newlines. If you copy from JSON, replace literal newlines with `\n`.
- `SESSION_SECRET` should be a long random string.
- `APP_BASE_URL` is optional; if set, use your public URL.

## Google Service Account Setup
1. In Google Cloud Console, create a service account.
2. Create a JSON key for it.
3. Copy the `client_email` into `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
4. Copy the `private_key` into `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (escape newlines as `\n`).
5. Share the Google Sheet with the service account email (Viewer access).

## Local Development
```
npm install
npm run dev
```

## API
- `GET /api/events?start=YYYY-MM-DD&end=YYYY-MM-DD`
  - Returns `{ events: Event[] }`
  - Filters by inclusive date range and sorts by date then title.

## Deployment (Coolify)
1. Create a new app in Coolify and connect the repo.
2. Set the environment variables listed above.
3. Use the provided `Dockerfile` (Coolify will build and run it).
4. Expose port `3000`.
5. Ensure HTTPS is enabled (required for iframe cookies with `SameSite=None`).

## Squarespace Embed Snippet
Use an Embed block with something like:

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

## Behavior Notes
- Date range defaults to today through +30 days (America/New_York).
- Range persists in URL params and localStorage per browser.
- Polling refreshes every 60 seconds, plus a manual Refresh button.
- Non-Sunday events are visually distinguished.
- Cookies are `SameSite=None; Secure` in production to allow iframe usage.
