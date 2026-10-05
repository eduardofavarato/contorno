import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../api/http';
import { WithAuth } from '../test-auth';
import { fakeAuth, required } from '../test-utils';
import type { AuthContextValue } from './authContext';
import { LoginScreen } from './LoginScreen';

vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  GoogleLogin: () => <button type="button">Google (mock)</button>,
}));

function renderLogin(auth: Partial<AuthContextValue> = {}) {
  const onDone = vi.fn();
  const onBack = vi.fn();
  const value = fakeAuth({ status: 'anonymous', ...auth });
  render(
    <WithAuth value={value}>
      <LoginScreen onDone={onDone} onBack={onBack} />
    </WithAuth>,
  );
  return { onDone, onBack, value };
}

describe('LoginScreen', () => {
  it('signs in with e-mail and password', async () => {
    const { onDone, value } = renderLogin();

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(value.login).toHaveBeenCalledWith('ana@example.com', 'segredo123');
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('switches to creating an account, which also asks for the name', async () => {
    const { onDone, value } = renderLogin();

    expect(screen.queryByLabelText('Nome no ranking')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    await userEvent.type(screen.getByLabelText('Nome no ranking'), 'Ana');
    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
    await userEvent.click(required(screen.getAllByRole('button', { name: 'Criar conta' }).at(-1)));

    expect(value.signup).toHaveBeenCalledWith('Ana', 'ana@example.com', 'segredo123');
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('says why a sign-in failed and stays on the screen', async () => {
    const login = vi.fn(() => Promise.reject(new ApiRequestError('INVALID_CREDENTIALS', 401, 'x')));
    const { onDone } = renderLogin({ login });

    await userEvent.type(screen.getByLabelText('E-mail'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Senha'), 'errada');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
    expect(onDone).not.toHaveBeenCalled();
  });

  it('warns that passwords cannot be recovered when signing up', async () => {
    renderLogin();

    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    expect(screen.getByText(/Não há recuperação de senha/)).toBeInTheDocument();
  });

  it('offers Google only when the server has a client for it', () => {
    const { container } = render(
      <WithAuth value={fakeAuth({ status: 'anonymous', googleClientId: null })}>
        <LoginScreen onDone={vi.fn()} onBack={vi.fn()} />
      </WithAuth>,
    );
    expect(screen.queryByText('Google (mock)')).not.toBeInTheDocument();
    container.remove();
  });

  it('shows the Google button when configured', () => {
    renderLogin({ googleClientId: 'client-id' });

    expect(screen.getByText('Google (mock)')).toBeInTheDocument();
  });

  it('goes back', async () => {
    const { onBack } = renderLogin();

    await userEvent.click(screen.getByRole('button', { name: '← Voltar' }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
