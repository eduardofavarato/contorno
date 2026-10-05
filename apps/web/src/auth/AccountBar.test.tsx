import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WithAuth } from '../test-auth';
import { fakeAuth } from '../test-utils';
import { AccountBar } from './AccountBar';
import type { AuthContextValue } from './authContext';

function renderBar(auth: Partial<AuthContextValue>) {
  const onLogin = vi.fn();
  const onOpenRanking = vi.fn();
  const value = fakeAuth(auth);
  render(
    <WithAuth value={value}>
      <AccountBar onLogin={onLogin} onOpenRanking={onOpenRanking} />
    </WithAuth>,
  );
  return { onLogin, onOpenRanking, value };
}

describe('AccountBar', () => {
  it.each(['loading', 'unavailable'] as const)('is hidden while accounts are %s', (status) => {
    const { container } = render(
      <WithAuth value={fakeAuth({ status })}>
        <AccountBar onLogin={vi.fn()} onOpenRanking={vi.fn()} />
      </WithAuth>,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('offers the ranking and signing in to a visitor', async () => {
    const { onLogin, onOpenRanking } = renderBar({ status: 'anonymous' });

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    await userEvent.click(screen.getByRole('button', { name: '🏆 Ranking' }));

    expect(onLogin).toHaveBeenCalledOnce();
    expect(onOpenRanking).toHaveBeenCalledOnce();
  });

  it('shows the signed-in player and lets them sign out', async () => {
    const { value } = renderBar({ status: 'signedIn', user: { id: 1, name: 'Ana' } });

    await userEvent.click(screen.getByRole('button', { name: '👤 Ana' }));
    const dialog = within(screen.getByRole('alertdialog', { name: 'Ana' }));
    await userEvent.click(dialog.getByRole('button', { name: 'Sair da conta' }));

    expect(value.logout).toHaveBeenCalledOnce();
  });

  it('asks before deleting the account, and deletes it once confirmed', async () => {
    const { value } = renderBar({ status: 'signedIn', user: { id: 1, name: 'Ana' } });

    await userEvent.click(screen.getByRole('button', { name: '👤 Ana' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
    expect(screen.getByRole('alertdialog', { name: 'Excluir sua conta?' })).toBeInTheDocument();
    expect(value.deleteAccount).not.toHaveBeenCalled();

    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Excluir' }));
    expect(value.deleteAccount).toHaveBeenCalledOnce();
  });

  it('can back out of deleting the account', async () => {
    const { value } = renderBar({ status: 'signedIn', user: { id: 1, name: 'Ana' } });

    await userEvent.click(screen.getByRole('button', { name: '👤 Ana' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir minha conta' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancelar' }));

    expect(value.deleteAccount).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Ana' })).toBeInTheDocument();
  });
});
