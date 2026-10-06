import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WithAuth } from '../test-auth';
import { fakeAuth } from '../test-utils';
import { AccountScreen } from './AccountScreen';
import type { AuthContextValue } from './authContext';

function renderAccount(auth: Partial<AuthContextValue>) {
  const onLogin = vi.fn();
  const onContinue = vi.fn();
  const value = fakeAuth(auth);
  render(
    <WithAuth value={value}>
      <AccountScreen onLogin={onLogin} onContinue={onContinue} />
    </WithAuth>,
  );
  return { onLogin, onContinue, value };
}

describe('AccountScreen', () => {
  it('invites a visitor to sign in, or to carry on without an account', async () => {
    const { onLogin, onContinue } = renderAccount({ status: 'anonymous' });

    expect(screen.getByText('Jogue valendo no ranking')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continuar sem conta' }));

    expect(onLogin).toHaveBeenCalledOnce();
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('shows the signed-in player and lets them sign out', async () => {
    const { value } = renderAccount({ status: 'signedIn', user: { id: 1, name: 'Ana' } });

    expect(screen.getByText('Ana')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));

    expect(value.logout).toHaveBeenCalledOnce();
  });

  it('asks before deleting the account, and deletes it once confirmed', async () => {
    const { value } = renderAccount({ status: 'signedIn', user: { id: 1, name: 'Ana' } });

    await userEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
    expect(screen.getByRole('alertdialog', { name: 'Excluir sua conta?' })).toBeInTheDocument();
    expect(value.deleteAccount).not.toHaveBeenCalled();

    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));
    expect(value.deleteAccount).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('can back out of deleting the account', async () => {
    const { value } = renderAccount({ status: 'signedIn', user: { id: 1, name: 'Ana' } });

    await userEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

    expect(value.deleteAccount).not.toHaveBeenCalled();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('says why the account could not be deleted', async () => {
    const { value } = renderAccount({ status: 'signedIn', user: { id: 1, name: 'Ana' } });
    vi.mocked(value.deleteAccount).mockRejectedValue(new Error('boom'));

    await userEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
