# SOCAR SASIS — Sales & Staff Intelligence System

Internal dashboard for SOCAR petrol-station operations: sales, workforce
performance, station health and fraud alerts. Next.js 16 + Firebase, with the
UI built entirely from shadcn (`base-rhea` style, Base UI primitives).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Needs a populated `.env.local` — see [Firebase setup](#firebase-setup).

> `dev` runs webpack, not Turbopack. Turbopack currently crashes on Windows
> trying to junction-point `firebase-admin` into `.next/dev/node_modules`
> ("failed to create junction point … os error 80"), which 500s every route.
> `npm run dev:turbopack` is kept for when that is fixed upstream.

## Pages

| Page | What it shows |
|---|---|
| **Dashboard** | KPIs, revenue target, risk overview, hourly trend, charts, executive brief |
| **Operators** | Sortable, searchable table of staff → click for a full profile with assessment |
| **Leaderboard** | Top-3 podium, champions, full ranking |
| **Stations** | Per-station cards with health meters + comparison |
| **Alerts** | Sales recorded outside working hours, with priorities and actions |

Station / department / shift filters sit above every page and scope everything
below them. Filter state lives in the URL, so a filtered view is shareable.

## Firebase setup

Project: **`socar-petrolium`**. Firestore rules and indexes are already deployed.

```bash
npx firebase login                     # once, interactive
npm run seed -- --reset                # generated test data -> Firestore
npm run seed-users                     # 8 station managers + 64 workers
npm run create-user -- --email you@socar.az --password '<12+ chars>' --role admin
```

The seed writes **8 stations, 64 workers, 28 operational days** (~1,700 daily
reports, ~45,000 transactions) of deterministic synthetic data, including
planted fraud cases (see `PLANTED_FRAUD` in `lib/testdata.ts` for the answer
key). `seed-users` provisions a real Auth account for every station manager and
worker; credentials land in `test-accounts.csv` (gitignored).

`.env.local` holds the web SDK config plus `GOOGLE_APPLICATION_CREDENTIALS`
pointing at a service-account JSON. Both that key and `.env.local` are
gitignored. See `.env.example` for the full list.

### Roles

Roles are **custom claims**, set only by the Admin SDK — never stored anywhere a
client could write, so a user cannot widen their own visibility.

| Role | Sees |
|---|---|
| `admin` | Everything, including import metadata and settings |
| `supervisor` | Every station (regional) |
| `manager` | One station — its head (`--station "Baku Station 1"`) |
| `staff` | One station only (`--station "Baku Station 1"`) |

Station-pinned accounts (`manager`, `staff`) carry two claims: `station` (display name, for the UI) and
`stationId` (slug, which the rules compare against the document path).

## Security model

- **Email/password → httpOnly session cookie.** The ID token is exchanged for a
  Firebase session cookie server-side and never persisted where scripts can read
  it, so XSS cannot lift a reusable credential. `sameSite=strict`, 8-hour
  expiry — one shift. Sign-out revokes refresh tokens, killing sibling sessions.
- **Two-layer route protection.** `proxy.ts` (Edge) does a cheap cookie-presence
  check; `app/(app)/layout.tsx` does the authoritative verification — signature,
  expiry, revocation, role claim — on every request. The proxy matcher is a
  negative lookahead, so new pages are protected by default.
- **Server-only data access.** Every read goes through the Admin SDK in a server
  component. The browser never holds a Firestore handle.
- **Station scoping at the query.** A `staff` request never pulls another
  station's documents into the server process, and a direct
  `/operators/<other station's id>` returns 404 rather than confirming the
  record exists.
- **Rules deny by default.** Data is nested under `/stations/{stationId}/…` so
  per-station reads are authorised from the document *path* — rules cannot
  inspect a query's `where` clauses, so a flat layout could not safely allow
  station-scoped `list`. Client writes are refused everywhere; ingestion is
  server-only.

## Verification

```bash
npm run verify:analytics   # metrics parity against the original prototype
npm run rules:verify       # 14 assertions against the DEPLOYED rules
npm run rules:test         # same idea via the emulator (needs JDK 21+)
npm run build && npm run lint
```

`rules:verify` reads credentials from `RULES_ADMIN_EMAIL` / `RULES_ADMIN_PASSWORD`
and `RULES_STAFF_EMAIL` / `RULES_STAFF_PASSWORD`; the staff account must be
`role=staff` at Baku Station 1.

## Business rules

Ported verbatim from the Python prototype and documented at the top of
[`lib/analytics.ts`](lib/analytics.ts):

- Shift from entry hour: `<12` Morning, `<17` Evening, else Night
- Suspicious sale = timestamp outside the operator's entry/exit window
- Attendance = worked hours vs an 8-hour shift, capped at 100
- Risk: ≥2 suspicious → HIGH; 1 suspicious or attendance <90 → MEDIUM;
  attendance <70 → HIGH; else LOW
- Score = `(attendance + min(productivity / 15, 100)) / 2`
- Operational health = `100 - 10 × suspicious`, floor 0
- Daily revenue target = `max(revenue × 1.15, 60000)` AZN

## Layout

```
app/
  (app)/            signed-in routes — auth boundary in layout.tsx
  api/auth/session  ID token -> session cookie; DELETE signs out
  login/
components/
  ui/               shadcn components (unmodified registry output)
lib/
  analytics.ts      all business metrics
  data.ts           Firestore reads, station-scoped
  firebase/         client + admin SDK, schema
  auth.ts           session verification
proxy.ts            optimistic auth gate (Next 16 renamed middleware -> proxy)
scripts/            seed, create-user, verification
data/               source CSVs
```

## Further reading

- [docs/IDEAS-SIMPLE.md](docs/IDEAS-SIMPLE.md) — **the plan**: the agreed
  shortlist of 17 ideas in plain words, with build order. Start here.
- [docs/IDEAS.md](docs/IDEAS.md) — the full market scan behind it: what
  Azerbaijani, regional, and global fuel retailers do, with sources. Includes
  ideas that were reviewed and set aside.

## The 3D button

`btn-3d` is a Tailwind v4 `@utility` in
[`app/globals.css`](app/globals.css), for the one primary action on a screen:

```tsx
<Button className="btn-3d">Dispatch nomination</Button>
```

It paints with `background-image` + stacked `box-shadow` rather than
`background-color`, so it layers over any Button variant instead of fighting it.
The rule is doubled (`&.btn-3d`) for `border-color` only, because Button ships
`border-transparent` in the same cascade layer.
