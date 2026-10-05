import {
  decodeServerMessage,
  encodeMessage,
  type ClientMessage,
  type DuelView,
  type ErrorCode,
  type GameSetup,
  type Guess,
  type PlayerIndex,
  type ServerMessage,
} from '@contorno/core';

/** Where the player stands in an online duel, from opening the connection to the end of the match. */
export type SessionState =
  | { readonly phase: 'connecting' }
  | {
      readonly phase: 'waiting';
      readonly code: string;
      readonly player: PlayerIndex;
      readonly setup: GameSetup;
      readonly opponentJoined: boolean;
    }
  | { readonly phase: 'playing'; readonly player: PlayerIndex; readonly setup: GameSetup; readonly view: DuelView }
  /** The match was cut short: the opponent left or the connection dropped. */
  | { readonly phase: 'interrupted'; readonly reason: 'opponent_left' | 'connection_lost' }
  /** The server refused the request (room not found, room full...). */
  | { readonly phase: 'refused'; readonly code: ErrorCode };

export type SessionEvent = ServerMessage | { readonly type: 'socket_closed' };

export const CONNECTING: SessionState = { phase: 'connecting' };

function isFinished(state: SessionState): boolean {
  return state.phase === 'playing' && state.view.status === 'finished';
}

export function sessionReducer(state: SessionState, event: SessionEvent): SessionState {
  switch (event.type) {
    case 'room':
      return { phase: 'waiting', code: event.code, player: event.player, setup: event.setup, opponentJoined: false };
    case 'opponent_joined':
      return state.phase === 'waiting' ? { ...state, opponentJoined: true } : state;
    case 'state':
      if (state.phase === 'waiting' || state.phase === 'playing') {
        return { phase: 'playing', player: state.player, setup: state.setup, view: event.view };
      }
      return state;
    case 'opponent_left':
      // Leaving after the final result is just the normal end of a match.
      return isFinished(state) || state.phase === 'refused' ? state : { phase: 'interrupted', reason: 'opponent_left' };
    case 'error':
      return { phase: 'refused', code: event.code };
    case 'socket_closed':
      return isFinished(state) || state.phase === 'refused' || state.phase === 'interrupted'
        ? state
        : { phase: 'interrupted', reason: 'connection_lost' };
  }
}

/** What to ask the server for when connecting. */
export type Intent = Extract<ClientMessage, { type: 'create' | 'join' }>;

/**
 * The client side of an online duel: one WebSocket and the state it drives. Exposes the
 * `subscribe`/`getSnapshot` pair React's `useSyncExternalStore` expects.
 */
export class OnlineSession {
  private state: SessionState = CONNECTING;
  private socket: WebSocket | null = null;
  private readonly listeners = new Set<() => void>();

  constructor(private readonly url: string) {}

  /** Opens a new connection and asks for a room; any previous connection is dropped. */
  start(intent: Intent): void {
    this.close();
    this.setState(CONNECTING);

    const socket = new WebSocket(this.url);
    this.socket = socket;
    // Events of a socket that has been replaced or closed on purpose are stale and must not touch the state.
    const current = () => this.socket === socket;
    socket.onopen = () => {
      if (current()) socket.send(encodeMessage(intent));
    };
    socket.onmessage = (event: MessageEvent) => {
      const message = typeof event.data === 'string' ? decodeServerMessage(event.data) : null;
      if (message && current()) this.setState(sessionReducer(this.state, message));
    };
    socket.onclose = () => {
      if (!current()) return;
      this.socket = null;
      this.setState(sessionReducer(this.state, { type: 'socket_closed' }));
    };
  }

  guess(guess: Guess): void {
    this.send({ type: 'guess', guess });
  }

  giveUp(): void {
    this.send({ type: 'give_up' });
  }

  /** Disconnects on purpose; the state is left as it was. */
  close(): void {
    const socket = this.socket;
    this.socket = null;
    socket?.close();
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): SessionState => this.state;

  private send(message: ClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(encodeMessage(message));
  }

  private setState(next: SessionState): void {
    if (next === this.state) return;
    this.state = next;
    for (const listener of this.listeners) listener();
  }
}

/** Same-origin WebSocket endpoint: in production the page and the server share the host. */
export function websocketUrl(location: Pick<Location, 'protocol' | 'host'>): string {
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}
