import type { GameFormat, GameSetup } from '@contorno/core';

/** Where a duel is played: both players on this device, or each on their own over the network. */
export type Venue = 'local' | 'online';

export type GameRequest =
  | { readonly setup: GameSetup; readonly format: 'individual' }
  | { readonly setup: GameSetup; readonly format: 'duel'; readonly venue: Venue };

export type Screen =
  | { readonly name: 'home' }
  /** `run` changes on "play again" so the game restarts from scratch. */
  | { readonly name: 'game'; readonly request: GameRequest; readonly run: number }
  | { readonly name: 'free' }
  | { readonly name: 'login' }
  /** `board` is the ranking to open first. */
  | { readonly name: 'ranking'; readonly board?: GameSetup };

export type { GameFormat };
