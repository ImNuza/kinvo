# Kinvo server

Small JSON API that lets several phones share one family state. Spec: [docs/API.md](../docs/API.md).
Node built-ins only (`node:http`, `node:sqlite`). No npm runtime dependencies. Needs Node 22.18 or later.

## Run

```
npm run server        # node server/index.ts, listens on 127.0.0.1:8790
npm run dev           # Vite on 5173, proxies /api to 127.0.0.1:8790
```

Node prints one `ExperimentalWarning` for `node:sqlite` on some versions. It is harmless.

## Environment

| Variable | Default | Meaning |
| --- | --- | --- |
| `KINVO_PORT` | `8790` | Port |
| `KINVO_HOST` | `127.0.0.1` | Bind address |
| `KINVO_DB` | `server/data/kinvo.sqlite` | SQLite file. The default is resolved from the server folder, not the current directory. The folder is created when missing. |

The process closes the server and the database on SIGTERM and SIGINT.

## Endpoints

| Method and path | Answer |
| --- | --- |
| `GET /api/health` | `{ ok: true, version }` |
| `GET /api/state` | `{ version, state }` |
| `POST /api/actions` | Body `{ action }`. `{ version, state }`, or 400, 413, 429 |
| `POST /api/reset` | Puts the seed back, `version + 1` |
| other `/api` paths | 404 `{ error: "not found" }`, wrong method 405 |

Limits: body 32 KB, 60 POST requests per minute per client (first `X-Forwarded-For` value when the peer is
127.0.0.1 or ::1), nightly reset at 04:00 Asia/Singapore. A handler error answers 500 `{ error: "server error" }`.

## Files

| File | Job |
| --- | --- |
| `index.ts` | Entry point, env, start-up line, clean shutdown |
| `app.ts` | `createApp(options)`: HTTP routes, body limit, rate limit. Does not listen. |
| `db.ts` | SQLite snapshot, `apply(action)` in one transaction, `reset()` |
| `nightly.ts` | `nextResetAt(now)` (pure) and the timer |
| `rateLimit.ts` | Fixed-window limiter with bounded memory |

The reducer, validator and seed come from `src/shared/`. The server has no copy of them.

## Tests

```
npm test
```

Runs `node --test "server/**/*.test.ts"`. API tests start the app on port 0 with a temporary SQLite file in
the system temp folder and remove it after.
