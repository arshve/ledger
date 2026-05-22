# Ledger

Personal expense tracker. Farid reviews every expense — OpenClaw AI agent reads emails / transaction screenshots and POSTs them into a pending queue here for confirmation, rejection, or editing.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 5, PWA (vite-plugin-pwa / Workbox) |
| Backend | Node 20 + Express 5 |
| Database | SQLite via `better-sqlite3` (WAL mode, file: `server/ledger.db`) |
| Styling | CSS custom properties (design tokens), no CSS framework |
| Auth | Bearer token — required only for OpenClaw write endpoint |

---

## Project layout

```
ExpanseTracker/
├── server/
│   ├── index.js        # Express API server (port 3001)
│   ├── db.js           # SQLite setup, table creation, auto-seed on first run
│   └── seed.js         # 10 sample expenses seeded when DB is empty
├── src/
│   ├── api.js          # Thin fetch wrappers for all /api routes
│   ├── App.jsx         # Root — routing, state, mobile layout
│   ├── lib/
│   │   └── date.js     # Date helpers: formatTime, groupLabel, decorate,
│   │                   #   getWeekDates, getDayAbbr, getDayLabel, computeCats
│   ├── hooks/
│   │   └── useHotkeys.js  # Keyboard shortcuts (Enter/X/E/Esc)
│   ├── components/
│   │   ├── ExpenseForm.jsx  # Controlled edit form (merchant/amount/cat/…)
│   │   ├── Icon.jsx         # SVG icon set
│   │   ├── StatusBar.jsx
│   │   ├── TabBar.jsx
│   │   └── ThemeToggle.jsx
│   ├── screens/
│   │   ├── DesktopApp.jsx   # Full desktop layout (>=900px) — 5-pane sidebar nav
│   │   ├── InboxFocused.jsx # Mobile inbox (focused card review)
│   │   ├── ExpenseDetail.jsx# Mobile expense detail + edit mode
│   │   ├── History.jsx      # Mobile history — month filter, swipe-to-delete
│   │   ├── Dashboard.jsx    # Mobile insights — interactive weekly bar chart
│   │   ├── EmailSource.jsx  # Mobile raw payload viewer
│   │   └── Settings.jsx     # Mobile settings
│   └── data/
│       └── expenses.js      # CATS map + formatIDR helpers (no hardcoded data)
├── .env.example        # API_TOKEN=, PORT=3001
├── vite.config.js      # Vite config + /api proxy to localhost:3001
└── package.json
```

---

## Running locally

```bash
cp .env.example .env
# Set API_TOKEN to any secret string in .env

npm install          # compiles better-sqlite3 native module
npm run start        # starts both API (:3001) and Vite dev server (:5173)
```

`npm run start` uses `concurrently` to run both processes. Vite proxies `/api/*` to `http://localhost:3001` so the frontend never hardcodes the API port.

On first run `server/db.js` auto-seeds 10 sample expenses (5 pending, 5 confirmed).

---

## API reference

### Authentication

Only `POST /api/expenses` requires auth. All other routes are unauthenticated (localhost trust — single-user, self-hosted).

```
Authorization: Bearer <API_TOKEN>
```

---

### POST /api/expenses — submit an expense for review
**Requires Bearer token.**

```json
{
  "merchant":    "Gojek",
  "amount":      47500,
  "cat":         "food",
  "occurred_at": "2026-05-22T08:30:00+07:00",

  "place":       "Padang Sederhana",
  "method":      "GoPay",
  "loc":         "",
  "note":        "",
  "source":      "email",
  "source_ref":  "receipt@gojek.com",
  "raw":         "<full email or screenshot text>",
  "confidence":  0.97
}
```

**Required fields:** `merchant` (string), `amount` (positive integer IDR — no decimals), `cat` (see table below), `occurred_at` (ISO 8601 datetime).

**Optional fields:** `place`, `method`, `loc`, `note`, `source` (default `"email"`), `source_ref`, `raw`, `confidence` (0–1 float).

**Valid `cat` values:**

| Key | Label |
|-----|-------|
| `food` | Food & dining |
| `coffee` | Coffee |
| `shopping` | Shopping |
| `transport` | Transport |
| `subscription` | Subscriptions |
| `utility` | Utilities |
| `travel` | Travel |
| `groceries` | Groceries |

**Response:** `201` with the created expense object (includes derived `date` and `time` fields).

**Error responses:**
- `400` — missing or invalid required field
- `401` — missing or wrong Bearer token
- `500` — `API_TOKEN` not set in `.env`

---

### GET /api/expenses
List expenses. Optional query params: `status` (`pending`|`confirmed`|`rejected`), `source`.

```
GET /api/expenses?status=pending
GET /api/expenses?status=confirmed
```

Returns array sorted by `occurred_at DESC`.

---

### GET /api/expenses/:id
Single expense by ID.

---

### PATCH /api/expenses/:id
Edit fields or change status. Used by the frontend for confirm / reject / edit.

```json
{ "status": "confirmed" }
{ "status": "rejected" }
{ "merchant": "Updated name", "amount": 50000, "cat": "coffee" }
```

Patchable fields: `merchant`, `place`, `amount`, `cat`, `method`, `occurred_at`, `loc`, `note`, `status`.

When `status` transitions away from `pending`, `reviewed_at` is set automatically.

Returns the updated expense object.

---

### DELETE /api/expenses/:id
Permanently delete an expense.

Returns `{ "deleted": "<id>" }`.

---

### GET /api/stats?month=YYYY-MM
Aggregated stats for a month (defaults to current month). Computed from **confirmed** expenses only.

```json
{
  "total": 2619750,
  "budget": 5000000,
  "byCategory": [
    { "cat": "travel", "amount": 1250000, "pct": 48 }
  ],
  "weekly": [12, 45, 30, 0, 8, 0, 5]
}
```

`weekly` — 7 integers (0–100), percentage of the highest-day amount. Index 0 = 6 days ago, index 6 = today.

---

### GET /api/settings
Returns `{ "budget": "5000000" }`.

### PATCH /api/settings
```json
{ "budget": 6000000 }
```

---

## Expense object shape

All API responses include these fields:

```json
{
  "id":          "uuid",
  "merchant":    "Gojek",
  "place":       "Padang Sederhana",
  "amount":      47500,
  "cat":         "food",
  "method":      "GoPay",
  "occurred_at": "2026-05-22T08:30:00+07:00",
  "loc":         "",
  "note":        "",
  "status":      "pending",
  "source":      "email",
  "source_ref":  "receipt@gojek.com",
  "raw":         "<original payload>",
  "confidence":  0.97,
  "created_at":  "2026-05-22T01:30:00.000Z",
  "reviewed_at": null,

  "date": "2026-05-22",
  "time": "Today · 08:30"
}
```

`date` and `time` are derived server-side from `occurred_at` (Asia/Jakarta timezone). `time` uses relative labels: `Today · HH:MM`, `Yest · HH:MM`, or `Day · HH:MM`.

---

## Review workflow

1. OpenClaw reads an email or processes a screenshot
2. Extracts: merchant, amount, category, datetime, and the raw source text
3. POSTs to `POST /api/expenses` with Bearer token — expense lands in the **pending** queue
4. Farid opens Ledger (mobile or desktop) and reviews each pending expense
5. Actions: **Confirm** (`Enter` / button), **Reject** (`X` / button), **Edit** (`E` / button) then Save
6. Confirmed expenses appear in History and count toward Insights stats
7. The Sources tab shows every raw payload OpenClaw submitted — full audit log

---

## Desktop layout (>= 900px)

5-pane sidebar navigation rendered by `src/screens/DesktopApp.jsx`:

- **Inbox** — 3-column (sidebar + list + detail). Pending-only queue; confirm/reject/edit with keyboard shortcuts
- **History** — 2-column (list + detail). Month filter dropdown, delete button in detail panel
- **Insights** — Stats cards + interactive weekly bar chart (click a day to filter category breakdown). Data from `/api/stats`
- **Sources** — Audit log of OpenClaw submissions with raw payload preview
- **Settings** — Appearance (theme/density), Budget, Accounts, OpenClaw API reference

## Mobile layout (< 900px)

Tab bar navigation: Inbox → History → Insights → Settings.

- **Inbox** — focused single-card review; swipe or tap confirm/reject
- **History** — scrollable list with month filter; swipe left on any row to delete; tap row to open detail/edit overlay
- **Insights** — tap any bar in the weekly chart to filter category breakdown to that day
- **Settings** — theme, density, budget

---

## Keyboard shortcuts (desktop + mobile detail overlay)

| Key | Action |
|-----|--------|
| `Enter` | Confirm expense (when not editing) |
| `X` | Reject expense (when not editing) |
| `E` | Open edit form |
| `Enter` (in edit form, single-line input) | Save changes |
| `Esc` | Exit edit mode / deselect row |

---

## Environment variables

```env
API_TOKEN=your-secret-token-here   # Required — used by OpenClaw to POST expenses
PORT=3001                          # Optional — defaults to 3001
```

`.env` is gitignored. Share `API_TOKEN` only with OpenClaw.
