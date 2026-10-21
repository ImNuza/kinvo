# Kinvo web app

Hokkien family-story app (IS211 IDP, Team 2). Vite + React + TypeScript. Live at https://kinvo.nuza.dev (auto-deploys `main`).

## Commands
- `npm run dev` (port 5173, proxies `/api` to 127.0.0.1:8790)
- `npm run typecheck`, `npm run build`, `npm test`
- `npm run server` (API, Node 22.18+, runs `.ts` directly)

## Layout
- `src/shared/` data types, pure reducer, validator, seed, selectors. Used by client and server. Erasable TS only, `.ts` import extensions.
- `src/data/` DataStore (local or api). `src/components/` shared UI. `src/styles/tokens.css` all colours and fonts.
- `src/screens/<feature>/` one folder per feature, each with `routes.tsx`. `server/` API.
- `docs/CONTRACT.md` ownership, component API, actions. `docs/API.md` server. `docs/figma/` frame PNGs (Figma file M9MZSMGCHLtquAtmpgSOYH, page "Iteration 2").

## Gotchas
- No fake status bar: the app sits 32 px higher than the Figma frames.
- Persona and A/B variant are per tab (sessionStorage). URL: `?as=mum`, `?variant=b`, `?store=local`, `?demo=1`.
- Audio stays in the browser (IndexedDB). Never put audio in AppState.
- No em dashes in UI text, no emoji in code, no console.log.
