import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { WithAuth } from './test-auth';
import { runBackAction } from './native/backStack';
import { stubResizeObserver } from './test-utils';

describe('App', () => {
  it('opens a game from the home and returns to it once the quit is confirmed', async () => {
    stubResizeObserver(null);
    render(
      <WithAuth>
        <App />
      </WithAuth>,
    );
    expect(screen.getByRole('heading', { name: 'Contorno' })).toBeInTheDocument();

    await userEvent.click(
      within(screen.getByRole('region', { name: 'Modo Perguntas' })).getByRole('button', { name: 'Jogar' }),
    );
    expect(screen.getByText('Modo Perguntas · Fácil')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sair' }));
    expect(screen.getByRole('heading', { name: 'Contorno' })).toBeInTheDocument();
  });

  it('opens the free mode from the home', async () => {
    stubResizeObserver(null);
    render(
      <WithAuth>
        <App />
      </WithAuth>,
    );

    await userEvent.click(
      within(screen.getByRole('region', { name: 'Modo Livre' })).getByRole('button', { name: 'Jogar' }),
    );

    expect(screen.getByText('Clique em um país no mapa para adivinhar')).toBeInTheDocument();
  });

  it('opens a local duel from the home', async () => {
    stubResizeObserver(null);
    render(
      <WithAuth>
        <App />
      </WithAuth>,
    );
    const localizar = within(screen.getByRole('region', { name: 'Modo Localizar' }));

    await userEvent.click(localizar.getByRole('radio', { name: 'Disputa' }));
    await userEvent.click(localizar.getByRole('button', { name: 'Jogar (Local)' }));

    expect(screen.getByText('Modo Localizar · Fácil · Disputa')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Jogador A' })).toBeInTheDocument();
  });

  it('opens the online lobby for an online duel', async () => {
    stubResizeObserver(null);
    render(
      <WithAuth>
        <App />
      </WithAuth>,
    );
    const perguntas = within(screen.getByRole('region', { name: 'Modo Perguntas' }));

    await userEvent.click(perguntas.getByRole('radio', { name: 'Disputa' }));
    await userEvent.click(perguntas.getByRole('button', { name: /Online/ }));

    expect(screen.getByRole('button', { name: 'Criar Sala' })).toBeInTheDocument();
    expect(screen.getByText('Modo Perguntas · Fácil')).toBeInTheDocument();
  });

  describe('system back button (Android app)', () => {
    const back = () => {
      act(() => {
        runBackAction();
      });
    };

    it('does nothing on the home screen, so the app can exit', () => {
      render(
        <WithAuth>
          <App />
        </WithAuth>,
      );

      expect(runBackAction()).toBe(false);
    });

    it('asks to quit a game, closes that dialog, and quits once confirmed', async () => {
      stubResizeObserver(null);
      render(
        <WithAuth>
          <App />
        </WithAuth>,
      );
      await userEvent.click(
        within(screen.getByRole('region', { name: 'Modo Perguntas' })).getByRole('button', { name: 'Jogar' }),
      );

      back();
      expect(screen.getByRole('alertdialog', { name: 'Sair da partida?' })).toBeInTheDocument();
      back();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

      back();
      await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sair' }));
      expect(screen.getByRole('heading', { name: 'Contorno' })).toBeInTheDocument();
      expect(runBackAction()).toBe(false);
    });

    it('leaves the online lobby for the home', async () => {
      stubResizeObserver(null);
      render(
        <WithAuth>
          <App />
        </WithAuth>,
      );
      const perguntas = within(screen.getByRole('region', { name: 'Modo Perguntas' }));
      await userEvent.click(perguntas.getByRole('radio', { name: 'Disputa' }));
      await userEvent.click(perguntas.getByRole('button', { name: /Online/ }));

      back();

      expect(screen.getByRole('heading', { name: 'Contorno' })).toBeInTheDocument();
    });
  });
});
