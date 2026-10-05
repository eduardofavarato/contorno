import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HomeScreen } from './HomeScreen';

function renderHome() {
  const onPlay = vi.fn();
  const onPlayFree = vi.fn();
  render(<HomeScreen onPlay={onPlay} onPlayFree={onPlayFree} />);
  return { onPlay, onPlayFree };
}

const card = (title: string) => within(screen.getByRole('region', { name: title }));

describe('HomeScreen (desktop)', () => {
  it('shows a card per mode, with Disputa as a format and not as a mode', () => {
    renderHome();

    for (const title of ['Modo Perguntas', 'Modo Continentes', 'Modo Localizar', 'Especial Brasil', 'Modo Livre']) {
      expect(screen.getByRole('region', { name: title })).toBeInTheDocument();
    }
    expect(screen.queryByRole('region', { name: 'Modo Disputa' })).not.toBeInTheDocument();
  });

  it('starts an individual game at the chosen level', async () => {
    const { onPlay } = renderHome();
    const perguntas = card('Modo Perguntas');

    await userEvent.click(perguntas.getByRole('radio', { name: 'Médio' }));
    await userEvent.click(perguntas.getByRole('button', { name: 'Jogar' }));

    expect(onPlay).toHaveBeenCalledExactlyOnceWith({
      setup: { mode: 'perguntas', pool: { kind: 'level', level: 2 } },
      format: 'individual',
    });
  });

  it('offers local and online play once the Disputa format is chosen', async () => {
    const { onPlay } = renderHome();
    const localizar = card('Modo Localizar');

    expect(localizar.queryByRole('button', { name: /Online/ })).not.toBeInTheDocument();
    await userEvent.click(localizar.getByRole('radio', { name: 'Disputa' }));
    expect(localizar.queryByRole('button', { name: 'Jogar' })).not.toBeInTheDocument();

    await userEvent.click(localizar.getByRole('button', { name: /Online/ }));
    expect(onPlay).toHaveBeenLastCalledWith({
      setup: { mode: 'localizar', pool: { kind: 'level', level: 1 } },
      format: 'duel',
      venue: 'online',
    });

    await userEvent.click(localizar.getByRole('button', { name: 'Jogar (Local)' }));
    expect(onPlay).toHaveBeenLastCalledWith({
      setup: { mode: 'localizar', pool: { kind: 'level', level: 1 } },
      format: 'duel',
      venue: 'local',
    });
  });

  it('picks a continent for the Continentes mode instead of a level', async () => {
    const { onPlay } = renderHome();
    const continentes = card('Modo Continentes');

    expect(continentes.queryByRole('radio', { name: 'Médio' })).not.toBeInTheDocument();
    await userEvent.click(continentes.getByRole('radio', { name: 'Europa' }));
    await userEvent.click(continentes.getByRole('button', { name: 'Jogar' }));

    expect(onPlay).toHaveBeenCalledExactlyOnceWith({
      setup: { mode: 'continentes', pool: { kind: 'continent', continent: 'europe' } },
      format: 'individual',
    });
  });

  it('offers states, capitals and cities instead of difficulty levels in Especial Brasil', async () => {
    const { onPlay } = renderHome();
    const brasil = card('Especial Brasil');

    expect(brasil.queryByRole('radio', { name: 'Médio' })).not.toBeInTheDocument();
    for (const topic of ['Estados', 'Capitais', 'Cidades']) {
      expect(brasil.getByRole('radio', { name: topic })).toBeInTheDocument();
    }

    await userEvent.click(brasil.getByRole('radio', { name: 'Cidades' }));
    await userEvent.click(brasil.getByRole('button', { name: 'Jogar' }));
    expect(onPlay).toHaveBeenLastCalledWith({
      setup: { mode: 'brasil', pool: { kind: 'brasil', topic: 'cidades' } },
      format: 'individual',
    });
  });

  it('plays Especial Brasil as a duel too', async () => {
    const { onPlay } = renderHome();
    const brasil = card('Especial Brasil');

    await userEvent.click(brasil.getByRole('radio', { name: 'Capitais' }));
    await userEvent.click(brasil.getByRole('radio', { name: 'Disputa' }));
    await userEvent.click(brasil.getByRole('button', { name: /Online/ }));

    expect(onPlay).toHaveBeenLastCalledWith({
      setup: { mode: 'brasil', pool: { kind: 'brasil', topic: 'capitais' } },
      format: 'duel',
      venue: 'online',
    });
  });

  it('describes the rules of the selected format', async () => {
    renderHome();
    const perguntas = card('Modo Perguntas');

    expect(perguntas.getByText(/Um país é destacado/)).toBeInTheDocument();
    await userEvent.click(perguntas.getByRole('radio', { name: 'Disputa' }));
    expect(perguntas.getByText(/quem errar deixa o adversário roubar/)).toBeInTheDocument();
  });

  it('starts the free mode', async () => {
    const { onPlayFree } = renderHome();

    await userEvent.click(card('Modo Livre').getByRole('button', { name: 'Jogar' }));
    expect(onPlayFree).toHaveBeenCalledOnce();
  });
});

describe('HomeScreen (compact)', () => {
  function useCompactLayout() {
    window.matchMedia = vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as unknown as typeof window.matchMedia;
  }

  it('lists the modes first, then configures the chosen one on its own screen', async () => {
    useCompactLayout();
    const { onPlay } = renderHome();

    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Modo Continentes/ }));
    await userEvent.click(screen.getByRole('radio', { name: 'Ásia' }));
    await userEvent.click(screen.getByRole('radio', { name: 'Disputa' }));
    await userEvent.click(screen.getByRole('button', { name: 'Jogar (Local)' }));

    expect(onPlay).toHaveBeenCalledExactlyOnceWith({
      setup: { mode: 'continentes', pool: { kind: 'continent', continent: 'asia' } },
      format: 'duel',
      venue: 'local',
    });
  });

  it('goes back to the mode list', async () => {
    useCompactLayout();
    renderHome();

    await userEvent.click(screen.getByRole('button', { name: /Modo Perguntas/ }));
    await userEvent.click(screen.getByRole('button', { name: '← Voltar' }));

    expect(screen.getByRole('button', { name: /Modo Perguntas/ })).toBeInTheDocument();
  });

  it('starts the free mode straight from the list', async () => {
    useCompactLayout();
    const { onPlayFree } = renderHome();

    await userEvent.click(screen.getByRole('button', { name: /Modo Livre/ }));
    expect(onPlayFree).toHaveBeenCalledOnce();
  });
});
