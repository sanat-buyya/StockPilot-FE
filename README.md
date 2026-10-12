# StockPilot Web

React frontend for StockPilot (inventory and order management). It talks to the Spring Boot API in
[StockPilot-BE](https://github.com/sanat-buyya/StockPilot-BE), whose README documents the business rules in full
(order lifecycle and stock strategy, roles, dashboard metric definitions, API, deployment, limitations, AI disclosure).

**Stack:** React 19 · JavaScript (JSX) · Vite · Tailwind CSS 4 · react-router · lucide-react icons · Vitest

## Setup

Requirements: Node 20+ and a running StockPilot API (see the backend README).

```bash
npm install
cp .env.example .env     # set VITE_API_URL (default http://localhost:8090)
npm run dev              # http://localhost:5173
```

The API must allow this origin: set `CORS_ORIGINS` on the backend (default `http://localhost:5173`).

| Script | Purpose |
|---|---|
| `npm run dev` | development server |
| `npm run build` | production build to `dist/` |
| `npm test` | unit tests |

| Environment variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the API, no trailing slash. Baked in at build time. |

**Demo logins** (when the backend runs with `SEED_DEMO_DATA=true`): `owner@stockpilot.demo` and `staff@stockpilot.demo`, password `Demo@12345`.
Or register your own account and workspace on the sign-up page.

## Screens

Login/Register · workspace switcher and "New workspace" · Dashboard (date range) · Products (search, filters, sort, pagination, create/edit) ·
Product detail (stock, adjust with confirmation, history with date filters) · Stock history (all products) ·
Orders (status, order number and date filters) · New order (multi-line, live estimate, idempotent submit) ·
Order detail (confirm / complete / cancel with confirmations) · Team (owner only).

Loading, empty, error and success states are handled on every screen; layouts work down to phone width.

## Architecture

```
src/
  api/        client.js (fetch wrapper, ApiError, token storage)
  auth/       AuthContext: session, workspace list, selected workspace, role
  components/ ui.jsx (Button, Field, Modal, ConfirmDialog, Pagination, Toasts, badges), Layout, ProductForm
  lib/        format.js (money in integer cents, dates), hooks.js (useAsync, useDebounced)
  pages/      one file per screen
```

- **Routing:** `react-router`. `Protected` redirects to `/login`; `OwnerOnly` guards the Team page. Every screen under `Layout` is re-mounted when the workspace changes, so no data from one workspace lingers in another.
- **Data loading:** `useAsync` runs a loader when its inputs change, ignores stale responses (fast typing/filtering cannot show out-of-order results), and exposes `loading`, `error` and `reload`.
- **State in the URL:** list filters, sort and page live in the query string, so views are shareable, survive reload, and dashboard cards can deep-link (for example `/products?lowStock=true`).

## Technical decisions

| Decision | Why |
|---|---|
| **No state library** | The app is request/response over a REST API; a small context for auth plus `useAsync` is enough and easier to follow. |
| **Server is the source of truth** | All filtering, pagination and totals happen on the API. The order screen shows only an *estimated* total (integer-cent math) and the server recalculates the real one. |
| **Money never uses floats** | Prices are decimal strings from the API; arithmetic uses integer cents (`lib/format.js`, unit-tested). |
| **Bearer token in `localStorage`** | Works across origins without cookie/`SameSite` configuration. Trade-off: readable by XSS (documented in the backend README). A 401 clears the session and returns to login. |
| **Idempotency key per order form** | One key is generated per New-order form instance and sent as `Idempotency-Key`, so a double click or retry cannot create two orders. |
| **Confirm before consequential actions** | Cancelling an order, completing it, deactivating a product and adjusting stock all show a confirmation that explains the effect. |
| **Field-level server errors** | API `details` are mapped back to the form fields they belong to; client validation mirrors the server rules for fast feedback but the server remains authoritative. |
| **UI hides forbidden actions but does not rely on it** | Role checks in the UI are convenience only; every rule is enforced by the API (403/404). |
| **Tailwind + lucide-react** | Utility styling keeps components self-contained and responsive with little CSS; icons are tree-shaken. |

## Testing

```bash
npm test          # Vitest (unit)
npm run lint      # oxlint
```

Unit tests cover the money helpers (exact decimal parsing/summing, formatting). Business rules (stock, order lifecycle,
isolation, concurrency) are tested where they are enforced, in the backend: `./mvnw test` runs 36 tests against a real
PostgreSQL (see the backend README for the scenario map).

The UI was also exercised manually in a browser against the running API: login, dashboard, filtered product list, creating a
multi-item order, cancelling it (stock returned), and the mobile layout.

## Deploy

Any static host. Set `VITE_API_URL` to the deployed API and build. `vercel.json` and `public/_redirects` provide SPA
fallback for Vercel and Netlify. Set the backend's `CORS_ORIGINS` to the exact frontend origin.

## Known limitations

- No end-to-end (browser) test suite; UI behaviour beyond the money helpers was verified manually.
- Plain JavaScript (no static types): API response shapes are documented in the backend README rather than enforced at compile time.
- Token is not refreshed; after it expires (8 h) the user is sent back to the login page.
- Currency is displayed as USD; the backend does not model currencies.
