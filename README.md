# StockPilot Web

React frontend for StockPilot (inventory and order management). It talks to the Spring Boot API in
[StockPilot-BE](https://github.com/sanat-buyya/StockPilot-BE), whose README documents the business rules in full
(order lifecycle and stock strategy, roles, dashboard metric definitions, API, deployment, limitations, AI disclosure).

**Stack:** React 19 · JavaScript (JSX) · Vite · Tailwind CSS 4 · Redux Toolkit (slices + thunks) · Axios · react-router · lucide-react icons · Vitest

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
Product detail (stock, adjust with confirmation, history with date filters; dates are IST days) · Stock history (all products) ·
Orders (status, order number and date filters) · New order (multi-line, live estimate, idempotent submit) ·
Order detail (confirm / complete / cancel with confirmations) · Team (owner only).

Loading, empty, error and success states are handled on every screen; layouts work down to phone width.

## Architecture

```
src/
  api/        client.js: Axios instance, interceptors (bearer token, error normalisation, 401 handling), get/post/patch/del helpers
  store/      Redux Toolkit: one slice per feature + thunks (see below); thunkUtils.js shared helpers; index.js configureStore
  auth/       useAuth.js: hook over the auth slice (user, workspaces, selected workspace, role, actions)
  components/ ui.jsx (Button, Field, Modal, ConfirmDialog, Pagination, Toaster, badges), ProductForm
  components/layout/ Layout shell: Sidebar.jsx (brand, workspace switcher, navigation, sign out), Header.jsx (active page name, profile avatar + name)
  lib/        format.js (money in integer cents, dates), hooks.js (useDebounced), pageTitle.js (URL to page name, avatar initials)
  pages/      one file per screen
```

**State management (Redux Toolkit).** All server data lives in the store; components dispatch thunks and read with selectors.

| Slice | Holds | Thunks |
|---|---|---|
| `auth` | session, workspaces, selected workspace | `bootstrapAuth`, `login`, `register`, `createWorkspace` |
| `products` | list, picker options, open product | `fetchProducts`, `fetchProductOptions`, `fetchProduct`, `createProduct`, `updateProduct`, `adjustStock` |
| `inventory` | workspace-wide and per-product stock history | `fetchAdjustments`, `fetchProductHistory` |
| `orders` | list, open order | `fetchOrders`, `fetchOrder`, `createOrder`, `transitionOrder` |
| `dashboard` | metrics | `fetchDashboard` |
| `team` | members | `fetchMembers`, `addMember`, `changeMemberRole`, `removeMember` |
| `ui` | toasts | `showToast` (plain thunk) |

**Axios layer.** One `http` instance. A request interceptor adds `Authorization: Bearer <token>`; a response interceptor converts every failure into an `ApiError` (`code`, `message`, `details`, `fieldErrors`) and signs the user out on a 401.

**Thunks.** Built with `createAsyncThunk` through `apiThunk`, which turns any failure into a serialisable rejection value. Thunks resolve the current workspace from the store (`wsPath`), so pages never pass workspace ids around. Mutations are awaited with `dispatch(thunk()).unwrap()` and surface field errors in forms.

- **Layout:** `Layout.jsx` composes three regions: **Sidebar** (left; a slide-over drawer on mobile), **Header** (top; page name on the left, avatar + name on the right) and **Content** (the routed page).
- **Routing:** `react-router`. `Protected` redirects to `/login`; `OwnerOnly` guards the Team page. Screens re-mount when the workspace changes.
- **No cross-workspace leaks:** every data slice resets itself on `selectWorkspace`, `logout` and `createWorkspace`.
- **Out-of-order protection:** list slices remember the latest `requestId`; a slow, superseded response is ignored (tested).
- **State in the URL:** list filters, sort and page live in the query string, so views are shareable and dashboard cards can deep-link (for example `/products?lowStock=true`).

## Technical decisions

| Decision | Why |
|---|---|
| **Redux Toolkit (slices + thunks)** | A shared, predictable store for server data used across screens (a product edited on one page is current on the next; a cancelled order updates the detail view immediately). Slices keep status/error/data uniform and testable without rendering components. |
| **Axios with interceptors** | Auth header, error normalisation and 401 handling live in one place instead of in every call. |
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

Unit tests (12) cover the money helpers and the data layer: the Axios interceptors (bearer token, error mapping, 401 sign-out), thunks (idempotency key sent, no totals sent, serialisable rejections, order transitions updating the store) and slice behaviour (stale responses ignored, data cleared on workspace switch/logout). A fake Axios adapter is used, so tests need no network.
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
- Amounts are displayed in Indian Rupees (₹) and dates/times in IST (Asia/Kolkata); the backend does not model currencies or per-user timezones.
