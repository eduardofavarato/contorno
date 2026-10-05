import { describe, expect, it } from 'vitest';
import { ApiRequestError, NetworkError } from './http';
import { errorMessage } from './messages';

describe('errorMessage', () => {
  it('explains the errors a player can cause', () => {
    expect(errorMessage(new ApiRequestError('INVALID_CREDENTIALS', 401, 'x'))).toBe('E-mail ou senha incorretos.');
    expect(errorMessage(new ApiRequestError('EMAIL_USES_GOOGLE', 409, 'x'))).toContain('Entrar com Google');
  });

  it('tells the player when they are offline', () => {
    expect(errorMessage(new NetworkError())).toContain('Sem conexão');
  });

  it('falls back for anything else', () => {
    expect(errorMessage(new ApiRequestError('INTERNAL_ERROR', 500, 'x'))).toBe('Algo deu errado. Tente novamente.');
    expect(errorMessage(new Error('boom'), 'Falhou.')).toBe('Falhou.');
  });
});
