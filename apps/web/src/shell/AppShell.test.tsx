import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { AuthContextValue } from '../auth/authContext';
import { runBackAction } from '../native/backStack';
import { WithAuth } from '../test-auth';
import { fakeAuth } from '../test-utils';
import { AppShell } from './AppShell';

function renderShell(auth: Partial<AuthContextValue>, tab: 'play' | 'ranking' | 'account' = 'play') {
  const onTab = vi.fn();
  render(
    <WithAuth value={fakeAuth(auth)}>
      <AppShell tab={tab} onTab={onTab}>
        <p>conteúdo</p>
      </AppShell>
    </WithAuth>,
  );
  return { onTab };
}

describe('AppShell', () => {
  it('switches between Jogar, Ranking and Conta, marking the current one', async () => {
    const { onTab } = renderShell({ status: 'anonymous' }, 'ranking');

    expect(screen.getByRole('button', { name: 'Ranking' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Jogar' })).not.toHaveAttribute('aria-current');

    await userEvent.click(screen.getByRole('button', { name: 'Conta' }));
    expect(onTab).toHaveBeenCalledExactlyOnceWith('account');
  });

  it('does nothing when the current tab is tapped again', async () => {
    const { onTab } = renderShell({ status: 'signedIn', user: { id: 1, name: 'Ana' } });

    await userEvent.click(screen.getByRole('button', { name: 'Jogar' }));

    expect(onTab).not.toHaveBeenCalled();
  });

  it('has no bar without accounts: there is only the game', () => {
    renderShell({ status: 'unavailable' });

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('takes the system back button from Ranking and Conta to the game list, but not from the list itself', () => {
    const { onTab } = renderShell({ status: 'anonymous' }, 'account');

    act(() => {
      runBackAction();
    });
    expect(onTab).toHaveBeenCalledExactlyOnceWith('play');
  });

  it('lets the system back button leave the app from the game list', () => {
    renderShell({ status: 'anonymous' }, 'play');

    expect(runBackAction()).toBe(false);
  });
});
