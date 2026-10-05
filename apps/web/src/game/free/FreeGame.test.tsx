import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryRequired, stubResizeObserver } from '../../test-utils';
import { FreeGame } from './FreeGame';

const BRASIL = 76;
const ARGENTINA = 32;

async function renderGame() {
  const onQuit = vi.fn();
  const user = userEvent.setup();
  render(<FreeGame onQuit={onQuit} />);
  const map = await screen.findByRole('img', { name: 'Mapa-múndi' });
  const pick = (id: number) => {
    fireEvent.click(queryRequired(map, `[data-country-id="${String(id)}"]`));
  };
  return { user, onQuit, pick };
}

const answerBox = () => screen.getByRole('textbox', { name: 'Nome do país' });

beforeEach(() => {
  stubResizeObserver();
});

describe('FreeGame', () => {
  it('waits for a country to be picked before accepting answers', async () => {
    await renderGame();

    expect(screen.getByText('Clique em um país no mapa para adivinhar')).toBeInTheDocument();
    expect(answerBox()).toBeDisabled();
  });

  it('records a correct answer', async () => {
    const { user, pick } = await renderGame();

    pick(BRASIL);
    expect(screen.getByText('País selecionado — qual é o nome dele?')).toBeInTheDocument();
    await user.type(answerBox(), 'brasil{Enter}');

    expect(screen.getByRole('status')).toHaveTextContent('✓ Correto! Brasil');
    expect(screen.getByText('Clique em outro país para continuar')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Acertos' })).getByText('1')).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Tentativas' })).getByText('1')).toBeInTheDocument();
  });

  it('reveals the country after a wrong answer, and does not let it be answered again', async () => {
    const { user, pick } = await renderGame();

    pick(ARGENTINA);
    await user.type(answerBox(), 'chile{Enter}');
    expect(screen.getByRole('status')).toHaveTextContent('✗ Era: Argentina');
    expect(within(screen.getByRole('group', { name: 'Acertos' })).getByText('0')).toBeInTheDocument();

    pick(ARGENTINA);
    expect(screen.queryByText('País selecionado — qual é o nome dele?')).not.toBeInTheDocument();
  });

  it('confirms before quitting', async () => {
    const { user, onQuit } = await renderGame();

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.getByRole('alertdialog', { name: 'Sair do Modo Livre?' })).toBeInTheDocument();
    expect(onQuit).not.toHaveBeenCalled();
  });
});
