import type { ApiError, ApiErrorCode } from '@contorno/core';
import type { FastifyInstance } from 'fastify';
import type { ZodType } from 'zod';

/** An expected failure the client should understand: it travels as `{ code, message }` with an HTTP status. */
export class ApiException extends Error {
  constructor(
    readonly code: ApiErrorCode,
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = (message = 'Faça login para continuar.') => new ApiException('UNAUTHORIZED', 401, message);

/** Validates a request body or query; anything malformed is a 400 with the schema untouched by the caller. */
export function parse<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiException('INVALID_REQUEST', 400, 'Requisição inválida.');
  return result.data;
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiException) {
      return reply.code(error.status).send({ code: error.code, message: error.message } satisfies ApiError);
    }
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 429) {
      return reply
        .code(429)
        .send({ code: 'RATE_LIMITED', message: 'Muitas tentativas. Aguarde um pouco.' } satisfies ApiError);
    }
    if (status !== undefined && status >= 400 && status < 500) {
      return reply.code(status).send({ code: 'INVALID_REQUEST', message: 'Requisição inválida.' } satisfies ApiError);
    }
    request.log.error({ err: error }, 'unhandled error');
    return reply.code(500).send({ code: 'INTERNAL_ERROR', message: 'Erro interno.' } satisfies ApiError);
  });
}
