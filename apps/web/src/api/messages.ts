import type { ApiErrorCode } from '@contorno/core';
import { ApiRequestError, NetworkError } from './http';

const MESSAGES: Partial<Record<ApiErrorCode, string>> = {
  INVALID_REQUEST: 'Confira os dados e tente de novo.',
  INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
  EMAIL_TAKEN: 'Este e-mail já está em uso.',
  EMAIL_USES_GOOGLE: 'Este e-mail já tem uma conta com o Google. Use "Entrar com Google".',
  EMAIL_USES_PASSWORD: 'Este e-mail já tem uma conta com senha. Entre com e-mail e senha.',
  GOOGLE_TOKEN_INVALID: 'Não foi possível entrar com o Google.',
  RATE_LIMITED: 'Muitas tentativas. Aguarde um pouco e tente de novo.',
  AUTH_DISABLED: 'Login indisponível no momento.',
  GAME_ALREADY_FINISHED: 'Esta partida já foi enviada ao ranking.',
  GAME_EXPIRED: 'A partida demorou demais e não entrou no ranking.',
  GAME_REJECTED: 'A partida não pôde ser validada e não entrou no ranking.',
};

/** What to tell the player about a failed request, in Portuguese. */
export function errorMessage(error: unknown, fallback = 'Algo deu errado. Tente novamente.'): string {
  if (error instanceof NetworkError) return 'Sem conexão com o servidor. Verifique sua internet.';
  if (error instanceof ApiRequestError) return MESSAGES[error.code] ?? fallback;
  return fallback;
}
