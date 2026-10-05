import { buildApp } from './app';
import { loadConfig } from './config';
import { RoomRegistry } from './rooms/RoomRegistry';
import { connectAccounts } from './services';

const config = loadConfig(process.env);
const registry = new RoomRegistry({
  onFinished: (outcome) => {
    app.log.info({ event: 'match_finished', ...outcome });
  },
});
const accounts = config.accounts ? await connectAccounts(config.accounts) : null;
const app = await buildApp({
  publicDir: config.publicDir,
  allowedOrigins: config.allowedOrigins,
  registry,
  accounts: accounts?.services ?? null,
  secureCookies: process.env.NODE_ENV === 'production',
  logger: true,
});
app.log.info({ event: 'accounts', enabled: accounts !== null, google: accounts?.services.googleClientId !== null });

await app.listen({ port: config.port, host: config.host });

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    void app
      .close()
      .then(() => accounts?.database.close())
      .then(() => process.exit(0));
  });
}
