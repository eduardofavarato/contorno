import {
  duelReducer,
  startDuel,
  toDuelView,
  type DuelEvent,
  type DuelView,
  type GameSetup,
  type ServerMessage,
} from '@contorno/core';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeWebSocket, pickQuestions, stubResizeObserver } from '../test-utils';
import { OnlineDuel } from './OnlineDuel';

const setup: GameSetup = { mode: 'perguntas', pool: { kind: 'level', level: 1 } };
const BRASIL = 76;
const ARGENTINA = 32;

const viewAfter = (...events: DuelEvent[]): DuelView =>
  toDuelView(
    events.reduce(
      duelReducer,
      startDuel({ questions: pickQuestions(setup, [BRASIL, ARGENTINA]), tiebreakOrder: pickQuestions(setup, [152]) }),
    ),
  );

function renderLobby() {
  const onQuit = vi.fn();
  render(<OnlineDuel setup={setup} onQuit={onQuit} />);
  return { onQuit, user: userEvent.setup() };
}

/** Plays the part of the server: whatever it would send arrives on the client's socket. */
const server = {
  send: (message: ServerMessage) => {
    act(() => {
      FakeWebSocket.latest().receive(message);
    });
  },
  open: () => {
    act(() => {
      FakeWebSocket.latest().open();
    });
  },
};

const seated = (player: 0 | 1): ServerMessage => ({ type: 'room', code: 'AB23', player, setup });
const answerBox = () => screen.getByRole('textbox', { name: 'Nome do país' });

beforeEach(() => {
  FakeWebSocket.reset();
  vi.stubGlobal('WebSocket', FakeWebSocket);
  stubResizeObserver(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('lobby', () => {
  it('offers to create a room for the chosen mode, or to join one', () => {
    renderLobby();

    expect(screen.getByText('Modo Perguntas · Fácil')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar Sala' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Código da sala' })).toBeInTheDocument();
  });

  it('asks for a code before joining', async () => {
    const { user } = renderLobby();

    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Digite o código da sala.');
    expect(FakeWebSocket.count).toBe(0);
  });

  it('goes back', async () => {
    const { user, onQuit } = renderLobby();

    await user.click(screen.getByRole('button', { name: '← Voltar' }));
    expect(onQuit).toHaveBeenCalledOnce();
  });
});

describe('hosting', () => {
  it('connects, asks for a room, shows its code and waits for the opponent', async () => {
    const { user } = renderLobby();
    await user.click(screen.getByRole('button', { name: 'Criar Sala' }));

    expect(screen.getByText('Conectando…')).toBeInTheDocument();
    server.open();
    expect(FakeWebSocket.latest().messages).toEqual([{ type: 'create', setup }]);

    server.send(seated(0));
    expect(screen.getByLabelText('Código da sala: AB23')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Aguardando adversário…');

    server.send({ type: 'opponent_joined' });
    expect(screen.getByRole('status')).toHaveTextContent('Conectado! Aguardando início…');
  });

  it('returns to the lobby on cancel and closes the connection', async () => {
    const { user } = renderLobby();
    await user.click(screen.getByRole('button', { name: 'Criar Sala' }));

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: 'Criar Sala' })).toBeInTheDocument();
    expect(FakeWebSocket.latest().readyState).toBe(3);
  });
});

describe('joining', () => {
  it('asks the server for the room by its code', async () => {
    const { user } = renderLobby();
    await user.type(screen.getByRole('textbox', { name: 'Código da sala' }), 'ab23');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    server.open();

    expect(FakeWebSocket.latest().messages).toEqual([{ type: 'join', room: 'ab23' }]);
  });

  it.each([
    ['room_not_found', 'Sala não encontrada. Confira o código.'],
    ['room_full', 'Sala cheia! Tente outro código.'],
    ['server_busy', 'O servidor está ocupado. Tente novamente em instantes.'],
  ] as const)('explains a refusal (%s)', async (code, message) => {
    const { user } = renderLobby();
    await user.type(screen.getByRole('textbox', { name: 'Código da sala' }), 'ZZZZ');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    server.open();

    server.send({ type: 'error', code });

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    await user.click(screen.getByRole('button', { name: '← Voltar' }));
    expect(screen.getByRole('button', { name: 'Criar Sala' })).toBeInTheDocument();
  });
});

describe('playing', () => {
  async function startMatch(player: 0 | 1, view = viewAfter()) {
    const fixture = renderLobby();
    await fixture.user.click(screen.getByRole('button', { name: 'Criar Sala' }));
    server.open();
    server.send(seated(player));
    server.send({ type: 'state', view });
    return fixture;
  }

  it('lets the player whose turn it is answer, sending the guess to the server', async () => {
    const { user } = await startMatch(0);

    expect(within(screen.getByRole('group', { name: 'Turno' })).getByText('Jogador A (você)')).toBeInTheDocument();
    expect(answerBox()).toBeEnabled();
    await user.type(answerBox(), 'brasil{Enter}');

    expect(FakeWebSocket.latest().messages.at(-1)).toEqual({ type: 'guess', guess: { type: 'text', value: 'brasil' } });
  });

  it('locks the controls while it is the opponent’s turn', async () => {
    await startMatch(1);

    expect(answerBox()).toBeDisabled();
    expect(answerBox()).toHaveAttribute('placeholder', 'Vez do adversário…');
  });

  it('shows what the server decided', async () => {
    await startMatch(0);

    server.send({
      type: 'state',
      view: viewAfter({ type: 'guess', player: 0, guess: { type: 'text', value: 'brasil' } }),
    });

    expect(screen.getByRole('status')).toHaveTextContent('✓ Correto! +2.000 pts');
    expect(within(screen.getByRole('group', { name: 'Jogador A (você)' })).getByText('2.000')).toBeInTheDocument();
  });

  it('shows the final result and goes back to the lobby to play again', async () => {
    const { user } = await startMatch(1);
    const finished = viewAfter(
      { type: 'guess', player: 0, guess: { type: 'text', value: 'brasil' } },
      { type: 'next' },
      { type: 'guess', player: 1, guess: { type: 'text', value: 'peru' } },
      { type: 'next' },
      { type: 'guess', player: 0, guess: { type: 'text', value: 'argentina' } },
      { type: 'next' },
    );
    server.send({ type: 'state', view: finished });

    expect(screen.getByText('🏆 Jogador A vence!')).toBeInTheDocument();
    // The opponent leaving after the result is not an interruption.
    server.send({ type: 'opponent_left' });
    expect(screen.getByText('🏆 Jogador A vence!')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Jogar Novamente' }));
    expect(screen.getByRole('button', { name: 'Criar Sala' })).toBeInTheDocument();
  });

  it('tells the player when the opponent leaves mid-match', async () => {
    await startMatch(0);

    server.send({ type: 'opponent_left' });

    expect(screen.getByRole('alert')).toHaveTextContent('Seu adversário saiu da partida.');
  });

  it('tells the player when the connection drops', async () => {
    await startMatch(0);

    act(() => {
      FakeWebSocket.latest().onclose?.();
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Conexão perdida.');
  });

  it('confirms before quitting, and quits to the home', async () => {
    const { user, onQuit } = await startMatch(0);

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.getByRole('alertdialog', { name: 'Sair da disputa?' })).toBeInTheDocument();
    await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sair' }));

    expect(onQuit).toHaveBeenCalledOnce();
  });
});
