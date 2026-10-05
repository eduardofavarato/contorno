import { apiErrorSchema, type ApiErrorCode } from '@contorno/core';
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

export async function request<T = void>(path: string, options: RequestOptions<T> = {}): Promise<T> {
  const { method = 'GET', body, token, schema } = options;
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: 'same-origin',
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  } catch {
    throw new NetworkError();
  }

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
    throw parsed.success
      ? new ApiRequestError(parsed.data.code, response.status, parsed.data.message)
      : new ApiRequestError('INTERNAL_ERROR', response.status, 'Erro inesperado.');
  }
  if (!schema) return undefined as T;
  return schema.parse(await response.json());
}
