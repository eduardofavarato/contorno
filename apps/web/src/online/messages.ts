import type { ErrorCode } from '@contorno/core';
import type { SessionState } from './session';

export const REFUSAL_MESSAGES: Readonly<Record<ErrorCode, string>> = {
  room_not_found: 'Sala não encontrada. Confira o código.',
  room_full: 'Sala cheia! Tente outro código.',
  server_busy: 'O servidor está ocupado. Tente novamente em instantes.',
  invalid_message: 'Não foi possível conectar.',
};

export const INTERRUPTION_MESSAGES: Readonly<
  Record<Extract<SessionState, { phase: 'interrupted' }>['reason'], string>
> = {
  opponent_left: '⚠️ Seu adversário saiu da partida.',
  connection_lost: '⚠️ Conexão perdida.',
};
