import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { WithAuth } from '../test-auth';
import { fakeAuth } from '../test-utils';
import type { AuthContextValue } from '../auth/authContext';
import { HomeScreen } from './HomeScreen';

function renderHome(auth: Partial<AuthContextValue> = {}) {
  const onPlay = vi.fn();
  const onPlayFree = vi.fn();
  const onLogin = vi.fn();
  const onOpenAccount = vi.fn();
  render(
    <WithAuth value={fakeAuth(auth)}>
      <HomeScreen onPlay={onPlay} onPlayFree={onPlayFree} onLogin={onLogin} onOpenAccount={onOpenAccount} />
    </WithAuth>,
  );
  return { onPlay, onPlayFree, onLogin, onOpenAccount };
}

/** Taps a mode's tile and returns the queries of the setup sheet it opens. */
async function openMode(name: RegExp) {
  await userEvent.click(screen.getByRole('button', { name }));
  return within(screen.getByRole('dialog'));
}

describe('HomeScreen', () => {
  it('shows a tile per mode, with Disputa as a format and not as a mode', () => {
    renderHome();

    for (const name of [/Perguntas/, /Continentes/, /Localizar/, /Especial Brasil/, /Modo Livre/]) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: /Modo Disputa/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the setup of a mode on a sheet, and closes it', async () => {
    renderHome();

    const sheet = await openMode(/Perguntas/);
    expect(screen.getByRole('dialog', { name: 'Modo Perguntas' })).toBeInTheDocument();

    await userEvent.click(sheet.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await openMode(/Perguntas/);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('starts an individual game at the chosen level', async () => {
    const { onPlay } = renderHome();
    const sheet = await openMode(/Perguntas/);

    await userEvent.click(sheet.getByRole('radio', { name: 'Médio' }));
    await userEvent.click(sheet.getByRole('button', { name: 'Jogar' }));

    expect(onPlay).toHaveBeenCalledExactlyOnceWith({
      setup: { mode: 'perguntas', pool: { kind: 'level', level: 2 } },
      format: 'individual',
    });
  });

  it('starts every setup from the defaults, not from what was picked on another mode', async () => {
    const { onPlay } = renderHome();
    const first = await openMode(/Perguntas/);
    await userEvent.click(first.getByRole('radio', { name: 'Difícil' }));
    await userEvent.click(first.getByRole('button', { name: 'Fechar' }));

    const second = await openMode(/Localizar/);
    await userEvent.click(second.getByRole('button', { name: 'Jogar' }));

    expect(onPlay).toHaveBeenCalledExactlyOnceWith({
      setup: { mode: 'localizar', pool: { kind: 'level', level: 1 } },
      format: 'individual',
    });
  });

  it('offers local and online play once the Disputa format is chosen', async () => {
    const { onPlay } = renderHome();
    const sheet = await openMode(/Localizar/);

    expect(sheet.queryByRole('button', { name: /Online/ })).not.toBeInTheDocument();
    await userEvent.click(sheet.getByRole('radio', { name: 'Disputa' }));
    expect(sheet.queryByRole('button', { name: 'Jogar' })).not.toBeInTheDocument();

    await userEvent.click(sheet.getByRole('button', { name: /Online/ }));
    expect(onPlay).toHaveBeenLastCalledWith({
      setup: { mode: 'localizar', pool: { kind: 'level', level: 1 } },
      format: 'duel',
      venue: 'online',
    });

    await userEvent.click(sheet.getByRole('button', { name: 'Jogar (mesmo aparelho)' }));
    expect(onPlay).toHaveBeenLastCalledWith({
      setup: { mode: 'localizar', pool: { kind: 'level', level: 1 } },
      format: 'duel',
      venue: 'local',
    });
  });

  it('picks a continent for the Continentes mode instead of a level', async () => {
    const { onPlay } = renderHome();
    const sheet = await openMode(/Continentes/);

    expect(sheet.queryByRole('radio', { name: 'Médio' })).not.toBeInTheDocument();
    await userEvent.click(sheet.getByRole('radio', { name: 'Europa' }));
    await userEvent.click(sheet.getByRole('button', { name: 'Jogar' }));

    expect(onPlay).toHaveBeenCalledExactlyOnceWith({
      setup: { mode: 'continentes', pool: { kind: 'continent', continent: 'europe' } },
      format: 'individual',
    });
  });

  it('offers states, capitals and cities instead of difficulty levels in Especial Brasil', async () => {
    const { onPlay } = renderHome();
    const sheet = await openMode(/Especial Brasil/);

    expect(sheet.queryByRole('radio', { name: 'Médio' })).not.toBeInTheDocument();
    for (const topic of ['Estados', 'Capitais', 'Cidades']) {
      expect(sheet.getByRole('radio', { name: topic })).toBeInTheDocument();
    }

    await userEvent.click(sheet.getByRole('radio', { name: 'Cidades' }));
    await userEvent.click(sheet.getByRole('button', { name: 'Jogar' }));
    expect(onPlay).toHaveBeenLastCalledWith({
      setup: { mode: 'brasil', pool: { kind: 'brasil', topic: 'cidades' } },
      format: 'individual',
    });
  });

  it('plays Especial Brasil as a duel too', async () => {
    const { onPlay } = renderHome();
    const sheet = await openMode(/Especial Brasil/);

    await userEvent.click(sheet.getByRole('radio', { name: 'Capitais' }));
    await userEvent.click(sheet.getByRole('radio', { name: 'Disputa' }));
    await userEvent.click(sheet.getByRole('button', { name: /Online/ }));

    expect(onPlay).toHaveBeenLastCalledWith({
      setup: { mode: 'brasil', pool: { kind: 'brasil', topic: 'capitais' } },
      format: 'duel',
      venue: 'online',
    });
  });

  it('describes the selected format, and lists its rules on demand', async () => {
    renderHome();
    const sheet = await openMode(/Perguntas/);

    expect(sheet.getByText(/Um país é destacado/)).toBeInTheDocument();
    expect(sheet.queryByText('Até 2.000 pts por acerto')).not.toBeInTheDocument();
    await userEvent.click(sheet.getByRole('button', { name: 'Como funciona' }));
    expect(sheet.getByText('Até 2.000 pts por acerto')).toBeInTheDocument();

    await userEvent.click(sheet.getByRole('radio', { name: 'Disputa' }));
    expect(sheet.getByText(/quem errar deixa o adversário roubar/)).toBeInTheDocument();
    expect(sheet.getByText('Roubo vale 1.000 pts')).toBeInTheDocument();
  });

  it('starts the free mode straight from its tile', async () => {
    const { onPlayFree } = renderHome();

    await userEvent.click(screen.getByRole('button', { name: /Modo Livre/ }));

    expect(onPlayFree).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('account button', () => {
    it('invites a visitor to sign in', async () => {
      const { onLogin } = renderHome({ status: 'anonymous' });

      await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

      expect(onLogin).toHaveBeenCalledOnce();
    });

    it('shows the signed-in player, who opens the account tab from it', async () => {
      const { onOpenAccount } = renderHome({ status: 'signedIn', user: { id: 1, name: 'Ana' } });

      await userEvent.click(screen.getByRole('button', { name: '👤 Ana' }));

      expect(onOpenAccount).toHaveBeenCalledOnce();
    });

    it('is absent when the server has no accounts', () => {
      renderHome({ status: 'unavailable' });

      expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
    });
  });
});
