import type { ServerMessage } from '@contorno/core';

/** A player's end of the wire, as the rooms see it; keeps game logic free of sockets and testable. */
export interface Connection {
  send(message: ServerMessage): void;
  close(): void;
}
