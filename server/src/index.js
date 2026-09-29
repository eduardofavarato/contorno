import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createContornoServer } from './server.js';

const port = Number(process.env.PORT ?? 8080);
const publicDir = process.env.PUBLIC_DIR ?? path.resolve(fileURLToPath(import.meta.url), '../../..');
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(origin => origin.trim()).filter(Boolean);

const { server, close } = createContornoServer({ publicDir, allowedOrigins });

server.listen(port, () => {
  console.log(JSON.stringify({ event: 'listening', port, publicDir, allowedOrigins }));
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, async () => {
    await close();
    process.exit(0);
  });
}
