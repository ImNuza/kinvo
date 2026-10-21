// Entry point: node server/index.ts
// Env: KINVO_PORT (8790), KINVO_HOST (127.0.0.1), KINVO_DB (server/data/kinvo.sqlite).

import { join } from 'node:path';
import { createApp } from './app.ts';

const port = Number(process.env.KINVO_PORT ?? 8790);
const host = process.env.KINVO_HOST ?? '127.0.0.1';
// Resolved from the server folder, not from the current directory.
const dbPath = process.env.KINVO_DB ?? join(import.meta.dirname, 'data', 'kinvo.sqlite');

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  process.stderr.write(`kinvo: invalid KINVO_PORT "${process.env.KINVO_PORT}"\n`);
  process.exit(1);
}

const app = createApp({ dbPath });

app.server.once('error', (err) => {
  process.stderr.write(`kinvo: cannot listen on ${host}:${port}: ${err.message}\n`);
  process.exit(1);
});

app.server.listen(port, host, () => {
  process.stdout.write(`kinvo api listening on http://${host}:${port} (db ${dbPath})\n`);
});

let stopping = false;
function stop(signal: string) {
  if (stopping) return;
  stopping = true;
  process.stderr.write(`kinvo: ${signal}, closing\n`);
  app.close().then(
    () => process.exit(0),
    (err: unknown) => {
      process.stderr.write(`kinvo: close failed: ${String(err)}\n`);
      process.exit(1);
    },
  );
}
process.on('SIGTERM', () => stop('SIGTERM'));
process.on('SIGINT', () => stop('SIGINT'));
