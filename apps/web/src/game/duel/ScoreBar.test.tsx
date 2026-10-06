import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScoreBar } from './ScoreBar';

const names = ['Jogador A', 'Jogador B'] as const;

describe('ScoreBar', () => {
  it('shows both players with their scores', () => {
    render(<ScoreBar names={names} scores={[2000, 1000]} active={null} />);

    expect(screen.getByRole('group', { name: 'Jogador A' })).toHaveTextContent('2.000');
    expect(screen.getByRole('group', { name: 'Jogador B' })).toHaveTextContent('1.000');
  });

  it('highlights only the player whose turn it is', () => {
    render(<ScoreBar names={names} scores={[0, 0]} active={1} />);

    expect(screen.getByRole('group', { name: 'Jogador B' }).className).toMatch(/active/);
    expect(screen.getByRole('group', { name: 'Jogador A' }).className).not.toMatch(/active/);
  });

  it('pulses the score of the player who just scored', () => {
    const { rerender } = render(<ScoreBar names={names} scores={[0, 0]} active={0} bump={null} />);
    const scoreOf = (name: string) => screen.getByRole('group', { name }).querySelector('[class*="score"]');
    expect(scoreOf('Jogador A')?.className).not.toMatch(/bump/);

    rerender(<ScoreBar names={names} scores={[2000, 0]} active={1} bump={{ player: 0, key: 1 }} />);

    expect(scoreOf('Jogador A')?.className).toMatch(/bump/);
    expect(scoreOf('Jogador B')?.className).not.toMatch(/bump/);
  });
});
