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
import { shareText } from '../share/shareText';
import { OnlineDuel } from './OnlineDuel';

vi.mock('../share/shareText', () => ({ shareText: vi.fn() }));

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

async function renderJoin() {
  const fixture = renderLobby();
  await fixture.user.click(screen.getByRole('radio', { name: 'Entrar com código' }));
  return fixture;
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
  it('offers to create a room for the chosen mode, or to join one, in tabs', async () => {
    const { user } = renderLobby();

    expect(screen.getByText('Modo Perguntas · Fácil')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar Sala' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Código da sala' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Entrar com código' }));
    expect(screen.getByRole('textbox', { name: 'Código da sala' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Criar Sala' })).not.toBeInTheDocument();
  });

  it('asks for a code before joining', async () => {
    const { user } = await renderJoin();

    await user.click(screen.getByRole('button', { name: 'Entrar na sala' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Digite o código da sala.');
    expect(FakeWebSocket.count).toBe(0);
  });

  it('asks for the whole code, and clears the warning once the player types again', async () => {
    const { user } = await renderJoin();

    await user.type(screen.getByRole('textbox', { name: 'Código da sala' }), 'ab');
    await user.click(screen.getByRole('button', { name: 'Entrar na sala' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Digite os 4 caracteres do código.');
    expect(FakeWebSocket.count).toBe(0);

    await user.type(screen.getByRole('textbox', { name: 'Código da sala' }), '2');
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('writes the code in capitals and ignores anything that is not a letter or a digit', async () => {
    const { user } = await renderJoin();
    const field = screen.getByRole('textbox', { name: 'Código da sala' });

    await user.type(field, 'a-b 2!3');

    expect(field).toHaveValue('AB23');
  });

  it('goes back', async () => {
    const { user, onQuit } = renderLobby();

    await user.click(screen.getByRole('button', { name: 'Voltar' }));
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

  it('copies the code, and says so', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    const { user } = renderLobby();
    // Set after the user-event session starts: it installs its own clipboard stub.
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await user.click(screen.getByRole('button', { name: 'Criar Sala' }));
    server.open();
    server.send(seated(0));

    await user.click(screen.getByRole('button', { name: 'Copiar' }));

    expect(writeText).toHaveBeenCalledWith('AB23');
    expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument();
  });

  it('shares an invitation with the code', async () => {
    const { user } = renderLobby();
    await user.click(screen.getByRole('button', { name: 'Criar Sala' }));
    server.open();
    server.send(seated(0));

    await user.click(screen.getByRole('button', { name: 'Compartilhar' }));

    expect(shareText).toHaveBeenCalledWith(expect.stringContaining('Código da sala: AB23'));
  });

  it('does not offer the code to the player who joined', async () => {
    const { user } = await renderJoin();
    await user.type(screen.getByRole('textbox', { name: 'Código da sala' }), 'AB23');
    await user.click(screen.getByRole('button', { name: 'Entrar na sala' }));
    server.open();
    server.send(seated(1));

    expect(screen.getByRole('status')).toHaveTextContent('Conectado! Aguardando início…');
    expect(screen.queryByRole('button', { name: 'Copiar' })).not.toBeInTheDocument();
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
    const { user } = await renderJoin();
    await user.type(screen.getByRole('textbox', { name: 'Código da sala' }), 'ab23');
    await user.click(screen.getByRole('button', { name: 'Entrar na sala' }));
    server.open();

    expect(FakeWebSocket.latest().messages).toEqual([{ type: 'join', room: 'AB23' }]);
  });

  it.each([
    ['room_not_found', 'Sala não encontrada. Confira o código.'],
    ['room_full', 'Sala cheia! Tente outro código.'],
    ['server_busy', 'O servidor está ocupado. Tente novamente em instantes.'],
  ] as const)('explains a refusal (%s)', async (code, message) => {
    const { user } = await renderJoin();
    await user.type(screen.getByRole('textbox', { name: 'Código da sala' }), 'ZZZZ');
    await user.click(screen.getByRole('button', { name: 'Entrar na sala' }));
    server.open();

    server.send({ type: 'error', code });

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    await user.click(screen.getByRole('button', { name: 'Voltar' }));
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

    await user.click(screen.getByRole('button', { name: 'Revanche' }));
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
