# Kinvo API

Small JSON API that lets every phone share one family. Owner: W5. Code in `server/`.

## Runtime

- Node 22.18 or later, `node server/index.ts` (type stripping). Erasable TypeScript only: no enums, no namespaces, no parameter properties.
- Built-ins only: `node:http` and `node:sqlite`. No npm runtime dependencies.
- Listens on `127.0.0.1:8790`. Env overrides: `KINVO_PORT`, `KINVO_HOST`, `KINVO_DB` (SQLite file path, default `server/data/kinvo.sqlite`).
- Production: Caddy proxies `https://kinvo.nuza.dev/api/*` to it. In dev, Vite proxies `/api`.
- The server imports the reducer, validator and seed from `src/shared/` (relative `.ts` imports). It never has its own copy of the rules.

## Storage

One SQLite table holds the current snapshot: `state(id INTEGER PRIMARY KEY CHECK (id = 1), version INTEGER, json TEXT, updated_at TEXT)`.
An append-only `actions` log is optional, for debugging. Each accepted action runs `reduce()` and writes the new
snapshot in one transaction and adds 1 to `version` only when the state changed.

## Endpoints

All responses are `application/json; charset=utf-8` with `cache-control: no-store`.

### GET /api/health

`200 { "ok": true, "version": <number> }`

### GET /api/state

`200 { "version": <number>, "state": <AppState> }`

### POST /api/actions

Body: `{ "action": <Action> }`, at most 32 KB.

- `200 { "version", "state" }` when the action is valid. If the reducer ignores it (for example a duplicate id), the version stays the same.
- `400 { "error": "invalid action" }` when `parseAction()` returns null or the body is not JSON.
- `413 { "error": "body too large" }` above 32 KB.
- `429 { "error": "too many requests" }` above the rate limit.

### POST /api/reset

Body: `{}`. Puts the seed back, adds 1 to `version`.
`200 { "version", "state" }`.

### POST /api/study/assign

Iter2.05 A/B study. Body is ignored. Saves one assignment and answers `200 { "version": "a" | "b" }`:
the version with fewer assignments so far, or a random one on a tie, so A and B stay within one of each other.
Rate limited like the other POST routes. Caddy exposes it outside the login gate as `POST https://kinvo.nuza.dev/go/assign`,
which `public/go.html` (`/go`) calls.

### GET /api/study/counts

`200 { "a": <number>, "b": <number>, "total": <number>, "lastAt": <ISO string | null> }`. Caddy exposes it outside the login gate as `GET https://kinvo.nuza.dev/go/counts`, which `public/go-results.html` (`/go/results`) reads.
The `study_assignments` table is separate from `state`, so the nightly reset does not clear it.

### Anything else under /api

`404 { "error": "not found" }`. Wrong method on a known path: `405 { "error": "method not allowed" }`.

## Limits and safety

- Rate limit per client IP (use `X-Forwarded-For` first value when the peer is 127.0.0.1, else the socket address): 60 POST requests per minute. GET is not limited.
- Body limit 32 KB. Stop reading and answer 413 as soon as the limit passes.
- Validate every action with `parseAction()` from `src/shared/validate.ts`. Never trust ids, lengths or types from the client.
- Nightly reset to the seed at 04:00 Asia/Singapore, so a public demo starts clean every day.
- No secrets, no accounts. Data is demo data only. Audio never reaches the server.

## Tests

`server/*.test.ts` with `node:test` and `node:assert`. `npm test` runs them.
Cover the reducer (whole scenario, duplicate ids, unknown story), `parseAction` (good and bad input),
and every endpoint against a server started on a free port with a temporary SQLite file.
