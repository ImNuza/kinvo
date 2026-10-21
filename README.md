# kinvo
hokkien learning app

## Deploy

Every push to `main` goes live at https://kinvo.nuza.dev within about a minute.

- Check your deploy at https://kinvo.nuza.dev/deploy.json. `result` is `building`, `live` or `failed`, with the commit and author.
- If the build fails, the previous version stays live. Fix it and push again. Ask Dewa for the build log.
- The build runs `npm ci` (or `npm install` with no lockfile), then `npm run build`, and publishes `dist/` (or `build/`). The output must contain `index.html`. A Vite app at the repo root works as is.
- With no `package.json`, the repo root is published as static files.
- Frontend only for now. Ask Dewa before you add a backend.
- Work on a branch and merge to `main` only when it builds locally (`npm run build`).
