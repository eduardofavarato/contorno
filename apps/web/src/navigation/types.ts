import type { GameFormat, GameSetup } from '@contorno/core';

/** Where a duel is played: both players on this device, or each on their own over the network. */
export type Venue = 'local' | 'online';

export type GameRequest =
  | { readonly setup: GameSetup; readonly format: 'individual' }
  | { readonly setup: GameSetup; readonly format: 'duel'; readonly venue: Venue };

/** The three main screens, switched from the navigation bar. */
export type Tab = 'play' | 'ranking' | 'account';

export type Screen =
  /** `board` is the ranking to open first, e.g. the one a player just finished a game on. */
  | { readonly name: 'home'; readonly tab: Tab; readonly board?: GameSetup }
  /** `run` changes on "play again" so the game restarts from scratch. */
  | { readonly name: 'game'; readonly request: GameRequest; readonly run: number }
  | { readonly name: 'free' }
  | { readonly name: 'login' };

export type { GameFormat };
