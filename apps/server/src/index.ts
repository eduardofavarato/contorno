import { buildApp } from './app';
import { loadConfig } from './config';
import { RoomRegistry } from './rooms/RoomRegistry';

const config = loadConfig(process.env);
const registry = new RoomRegistry({
  onFinished: (outcome) => {
    app.log.info({ event: 'match_finished', ...outcome });
  },
});
const app = await buildApp({
  publicDir: config.publicDir,
  allowedOrigins: config.allowedOrigins,
  registry,
  logger: true,
});

await app.listen({ port: config.port, host: config.host });

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });
}
