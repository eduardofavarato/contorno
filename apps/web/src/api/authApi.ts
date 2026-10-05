import {
  authResponseSchema,
  serverConfigSchema,
  type AuthResponse,
  type LoginRequest,
  type ServerConfig,
  type SignupRequest,
} from '@contorno/core';
import { request } from './http';

export const authApi = {
  config: (): Promise<ServerConfig> => request('/config', { schema: serverConfigSchema }),
  signup: (body: SignupRequest): Promise<AuthResponse> =>
    request('/auth/signup', { method: 'POST', body, schema: authResponseSchema }),
  login: (body: LoginRequest): Promise<AuthResponse> =>
    request('/auth/login', { method: 'POST', body, schema: authResponseSchema }),
  google: (idToken: string): Promise<AuthResponse> =>
    request('/auth/google', { method: 'POST', body: { idToken }, schema: authResponseSchema }),
  refresh: (): Promise<AuthResponse> => request('/auth/refresh', { method: 'POST', schema: authResponseSchema }),
  logout: (): Promise<void> => request('/auth/logout', { method: 'POST' }),
  deleteAccount: (token: string): Promise<void> => request('/me', { method: 'DELETE', token }),
};
