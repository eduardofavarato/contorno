export interface Config {
  readonly port: number;
  readonly host: string;
  /** Folder with the built web app; when unset, only the API and WebSocket are served. */
  readonly publicDir: string | undefined;
  /** Origins allowed to open the WebSocket; empty means any (local development). */
  readonly allowedOrigins: readonly string[];
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  return {
    port: Number(env.PORT ?? 8080),
    host: env.HOST ?? '0.0.0.0',
    publicDir: env.PUBLIC_DIR === '' ? undefined : env.PUBLIC_DIR,
    allowedOrigins: (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}
