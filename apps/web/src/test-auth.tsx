import type { ReactNode } from 'react';
import { AuthContext, type AuthContextValue } from './auth/authContext';
import { fakeAuth } from './test-utils';

export function WithAuth({ value = fakeAuth(), children }: { value?: AuthContextValue; children: ReactNode }) {
  return <AuthContext value={value}>{children}</AuthContext>;
}
