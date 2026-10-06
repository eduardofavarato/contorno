import { apiErrorSchema, type ApiErrorCode } from '@contorno/core';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { ZodType } from 'zod';

const BASE = '/api/v1';

/** The server answered with an error the client can act on. */
export class ApiRequestError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** The request never got an answer: offline, DNS, server down. */
export class NetworkError extends Error {
  constructor() {
    super('Sem conexão com o servidor.');
  }
}

interface RequestOptions<T> {
  readonly method?: 'GET' | 'POST' | 'DELETE';
  readonly body?: unknown;
  /** Access token to send as a Bearer credential. */
  readonly token?: string | null;
  /** Shape of the answer; omit for endpoints that answer with no content. */
  readonly schema?: ZodType<T>;
}

interface Reply {
  readonly status: number;
  /** The parsed JSON body; `undefined` when there is none. */
  readonly body: unknown;
}

interface Outgoing {
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: unknown;
}

/**
 * In the Android app the page is served by Capacitor under the server's own host, so the WebView answers every
 * request to that host from the app's files, API included. Native HTTP goes straight to the network instead.
 */
async function sendNative(path: string, { method, headers, body }: Outgoing): Promise<Reply> {
  const response = await CapacitorHttp.request({
    url: `${window.location.origin}${BASE}${path}`,
    method,
    headers,
    ...(body !== undefined && { data: body }),
  });
  return { status: response.status, body: response.data as unknown };
}

async function sendWeb(path: string, { method, headers, body }: Outgoing): Promise<Reply> {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    credentials: 'same-origin',
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json().catch(() => undefined) };
}

export async function request<T = void>(path: string, options: RequestOptions<T> = {}): Promise<T> {
  const { method = 'GET', token, schema } = options;
  // Anything but a GET carries a JSON body, even an empty one: without a content type the server (and, in the
  // Android app, the native HTTP client's default of form data) answers 415.
  const body = options.body ?? (method === 'GET' ? undefined : {});
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let reply: Reply;
  try {
    reply = await (Capacitor.isNativePlatform() ? sendNative : sendWeb)(path, { method, headers, body });
  } catch {
    throw new NetworkError();
  }

  if (reply.status < 200 || reply.status >= 300) {
    const parsed = apiErrorSchema.safeParse(reply.body);
    throw parsed.success
      ? new ApiRequestError(parsed.data.code, reply.status, parsed.data.message)
      : new ApiRequestError('INTERNAL_ERROR', reply.status, 'Erro inesperado.');
  }
  if (!schema) return undefined as T;
  return schema.parse(reply.body);
}
