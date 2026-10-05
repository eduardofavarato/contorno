import type { User } from '@contorno/core';
import { createContext, useContext } from 'react';

/**
 * `loading`: still asking the server. `unavailable`: the server has no accounts, or cannot be reached (the game
 * works anyway, just without login and ranking). Otherwise the player is signed in or not.
 */
export type AuthStatus = 'loading' | 'unavailable' | 'anonymous' | 'signedIn';

export interface AuthContextValue {
  readonly status: AuthStatus;
  readonly user: User | null;
  /** OAuth client for Google sign-in; `null` when Google login is off. */
  readonly googleClientId: string | null;
  readonly signup: (name: string, email: string, password: string) => Promise<void>;
  readonly login: (email: string, password: string) => Promise<void>;
  readonly loginWithGoogle: (idToken: string) => Promise<void>;
  readonly logout: () => Promise<void>;
  readonly deleteAccount: () => Promise<void>;
  /** Runs an authenticated request; if the access token has expired it is renewed first (or once, on a 401). */
  readonly withToken: <T>(run: (token: string) => Promise<T>) => Promise<T>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside an AuthProvider');
  return value;
}
