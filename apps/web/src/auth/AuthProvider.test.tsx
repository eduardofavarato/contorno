import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authApi } from '../api/authApi';
import { ApiRequestError } from '../api/http';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './authContext';

vi.mock('../api/authApi');

const encode = (value: object) => btoa(JSON.stringify(value)).replaceAll('=', '');
/** A token that expires `seconds` from now. */
const tokenFor = (seconds: number) =>
  `${encode({ alg: 'HS256' })}.${encode({ sub: '1', exp: Math.floor(Date.now() / 1000) + seconds })}.sig`;
const session = (name = 'Ana', seconds = 900) => ({ accessToken: tokenFor(seconds), user: { id: 1, name } });

const enabled = { auth: { enabled: true, googleClientId: 'client-id' } };

function Probe() {
  const auth = useAuth();
  return (
    <div>
      <p data-testid="status">{auth.status}</p>
      <p data-testid="user">{auth.user?.name ?? '-'}</p>
      <p data-testid="google">{auth.googleClientId ?? '-'}</p>
      <button onClick={() => void auth.login('a@b.co', 'senha1')}>login</button>
      <button onClick={() => void auth.logout()}>logout</button>
      <button
        onClick={() =>
          void auth
            .withToken((token) => Promise.resolve(token))
            .then((token) => {
              document.title = token;
            })
        }
      >
        use
      </button>
    </div>
  );
}

const renderProvider = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
const status = () => screen.getByTestId('status').textContent;

beforeEach(() => {
  vi.resetAllMocks();
});

describe('AuthProvider', () => {
  it('is unavailable when the server has no accounts', async () => {
    vi.mocked(authApi.config).mockResolvedValue({ auth: { enabled: false, googleClientId: null } });
    renderProvider();

    await waitFor(() => {
      expect(status()).toBe('unavailable');
    });
    expect(authApi.refresh).not.toHaveBeenCalled();
  });

  it('is unavailable when the server cannot be reached', async () => {
    vi.mocked(authApi.config).mockRejectedValue(new Error('offline'));
    renderProvider();

    await waitFor(() => {
      expect(status()).toBe('unavailable');
    });
  });

  it('restores the session from the refresh cookie', async () => {
    vi.mocked(authApi.config).mockResolvedValue(enabled);
    vi.mocked(authApi.refresh).mockResolvedValue(session('Ana'));
    renderProvider();

    await waitFor(() => {
      expect(status()).toBe('signedIn');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('Ana');
    expect(screen.getByTestId('google')).toHaveTextContent('client-id');
  });

  it('is anonymous when there is no session to restore', async () => {
    vi.mocked(authApi.config).mockResolvedValue(enabled);
    vi.mocked(authApi.refresh).mockRejectedValue(new ApiRequestError('UNAUTHORIZED', 401, 'x'));
    renderProvider();

    await waitFor(() => {
      expect(status()).toBe('anonymous');
    });
  });

  it('signs in and out', async () => {
    vi.mocked(authApi.config).mockResolvedValue(enabled);
    vi.mocked(authApi.refresh).mockRejectedValue(new ApiRequestError('UNAUTHORIZED', 401, 'x'));
    vi.mocked(authApi.login).mockResolvedValue(session('Beto'));
    vi.mocked(authApi.logout).mockResolvedValue();
    renderProvider();
    await waitFor(() => {
      expect(status()).toBe('anonymous');
    });

    await userEvent.click(screen.getByText('login'));
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('Beto');
    });
    expect(authApi.login).toHaveBeenCalledWith({ email: 'a@b.co', password: 'senha1' });

    await userEvent.click(screen.getByText('logout'));
    await waitFor(() => {
      expect(status()).toBe('anonymous');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('-');
  });

  it('uses the current token while it is fresh, and renews it when it is about to expire', async () => {
    vi.mocked(authApi.config).mockResolvedValue(enabled);
    const fresh = session('Ana', 900);
    vi.mocked(authApi.refresh).mockResolvedValueOnce(fresh);
    renderProvider();
    await waitFor(() => {
      expect(status()).toBe('signedIn');
    });

    await userEvent.click(screen.getByText('use'));
    expect(authApi.refresh).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(document.title).toBe(fresh.accessToken);
    });

    const renewed = session('Ana', 900);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(Date.now() + 880_000);
    vi.mocked(authApi.refresh).mockResolvedValueOnce(renewed);
    await userEvent.click(screen.getByText('use'));
    await waitFor(() => {
      expect(document.title).toBe(renewed.accessToken);
    });
    vi.useRealTimers();
  });

  it('shares one renewal between simultaneous requests', async () => {
    vi.mocked(authApi.config).mockResolvedValue(enabled);
    vi.mocked(authApi.refresh).mockResolvedValueOnce(session('Ana', 5));
    let release: (value: ReturnType<typeof session>) => void = () => undefined;
    renderProvider();
    await waitFor(() => {
      expect(status()).toBe('signedIn');
    });
    vi.mocked(authApi.refresh).mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    await act(async () => {
      screen.getByText('use').click();
      screen.getByText('use').click();
      await Promise.resolve();
    });
    release(session('Ana', 900));

    await waitFor(() => {
      expect(authApi.refresh).toHaveBeenCalledTimes(2);
    });
  });
});
