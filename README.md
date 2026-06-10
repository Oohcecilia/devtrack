# DevTrack

DevTrack is a React inventory manager backed by CouchDB. The app tracks devices, employees, assignments, QR/barcode lookup, and PDF reports.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Start CouchDB locally. With Docker:

```bash
docker run --rm -p 5984:5984 -e COUCHDB_USER=admin -e COUCHDB_PASSWORD=password couchdb:3
```

3. Copy `.env.example` to `.env` and adjust credentials:

```bash
cp .env.example .env
```

4. Start the API and Vite dev server:

```bash
npm run dev
```

Open `http://localhost:5173`.

## Installable App

DevTrack is a Progressive Web App. Supported desktop and mobile browsers can install it from the browser menu or address bar when the built app is served over `https` or from `localhost` with `npm run build` followed by `npm run start`. The app uses `public/logo.png` as the source logo and generated install icons.

## CouchDB Structure

The API creates these databases automatically using `COUCHDB_DB_PREFIX`:

- `devtrack_users`
- `devtrack_devices`
- `devtrack_employees`
- `devtrack_assignments`

The app stores one document per user, device, employee, or assignment. User records enforce unique `username`; device records enforce unique `asset_tag` and `serial_number`; employee records enforce unique `employee_id`.

## Authentication

Username/password auth is implemented in the local API. Public registration is disabled. Only authenticated administrators can create, edit, deactivate, delete, or reset passwords for users in the User Management section.

For local development, the API seeds an administrator when one does not already exist:

```text
username: admin
password: password
```

In production, set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, and a strong `AUTH_TOKEN_SECRET`. Do not rely on the development defaults outside local development.

## Device Scanner

The scanner looks up the scanned serial number through `GET /api/scanner/device-info?serial_number=...` and returns one normalized JSON object:

```json
{
  "serial_number": "C02X1234",
  "device_type": "laptop",
  "manufacturer": "Apple",
  "model": "A2442",
  "status": "active",
  "warranty": {
    "status": "active",
    "expiry_date": "2027-06-10"
  }
}
```

The API checks the CouchDB devices database first. If `DEVICE_INFO_API_URL` and `DEVICE_INFO_API_KEY` are configured, it can also call an external provider using those placeholder environment values. Unknown or invalid serials still return the same object shape with `unknown` values and an `error` field.

## Scripts

```bash
npm run dev       # API + Vite
npm run build     # production frontend build
npm run start     # API server, serving dist when available
npm run lint      # ESLint
npm run check     # Node syntax checks for server files
```
