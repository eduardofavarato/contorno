import type { AuthResponse, User } from '@contorno/core';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authApi } from '../api/authApi';
import { ApiRequestError } from '../api/http';
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext';
import { tokenExpiry } from './jwt';

/** A token this close to expiring is renewed before use, so a request never leaves with one that dies on the way. */
const RENEW_MARGIN_MS = 30_000;

interface Session {
  readonly token: string;
  readonly expiresAt: number;
}

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  // The access token lives in memory only; the refresh token is an httpOnly cookie the page cannot read.
  const session = useRef<Session | null>(null);
  const renewing = useRef<Promise<string> | null>(null);

  const signIn = useCallback(({ accessToken, user: signedIn }: AuthResponse) => {
    session.current = { token: accessToken, expiresAt: tokenExpiry(accessToken) };
    setUser(signedIn);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(() => {
    session.current = null;
    setUser(null);
    setStatus('anonymous');
  }, []);

  /** Refresh tokens rotate on use, so concurrent renewals must share one request or the loser kills the session. */
  const renew = useCallback((): Promise<string> => {
    renewing.current ??= authApi
      .refresh()
      .then((response) => {
        signIn(response);
        return response.accessToken;
      })
      .catch((error: unknown) => {
        signOut();
        throw error;
      })
      .finally(() => {
        renewing.current = null;
      });
    return renewing.current;
  }, [signIn, signOut]);

  const load = useCallback(() => {
    authApi
      .config()
      .then(async (config) => {
        if (!config.auth.enabled) {
          setStatus('unavailable');
          return;
        }
        setGoogleClientId(config.auth.googleClientId);
        await renew().catch(() => undefined);
        setStatus((current) => (current === 'signedIn' ? current : 'anonymous'));
      })
      .catch(() => {
        setStatus('unavailable');
      });
  }, [renew]);

  useEffect(() => {
    load();
  }, [load]);

  // Opened offline (e.g. the Android app): try again once the connection is back.
  useEffect(() => {
    if (status !== 'unavailable') return;
    window.addEventListener('online', load);
    return () => {
      window.removeEventListener('online', load);
    };
  }, [status, load]);

  const withToken = useCallback(
    async <T,>(run: (token: string) => Promise<T>): Promise<T> => {
      const current = session.current;
      const token = current && current.expiresAt - Date.now() > RENEW_MARGIN_MS ? current.token : await renew();
      try {
        return await run(token);
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 401) return run(await renew());
        throw error;
      }
    },
    [renew],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      googleClientId,
      signup: async (name, email, password) => {
        signIn(await authApi.signup({ name, email, password }));
      },
      login: async (email, password) => {
        signIn(await authApi.login({ email, password }));
      },
      loginWithGoogle: async (idToken) => {
        signIn(await authApi.google(idToken));
      },
      logout: async () => {
        await authApi.logout().catch(() => undefined);
        signOut();
      },
      deleteAccount: async () => {
        await withToken((token) => authApi.deleteAccount(token));
        signOut();
      },
      withToken,
    }),
    [status, user, googleClientId, signIn, signOut, withToken],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
