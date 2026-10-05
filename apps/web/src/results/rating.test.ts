import { describe, expect, it } from 'vitest';
import { ratingFor } from './rating';

describe('ratingFor', () => {
  it.each([
    [1, 'Perfeito! Gênio Geográfico', 5],
    [0.95, 'Excelente!', 5],
    [0.9, 'Excelente!', 5],
    [0.8, 'Muito Bom', 4],
    [0.5, 'Bom', 3],
    [0.3, 'Em Desenvolvimento', 2],
    [0.1, 'Iniciante', 1],
    [0, 'Iniciante', 1],
  ])('rates %f as %s', (ratio, label, stars) => {
    expect(ratingFor(ratio)).toEqual({ label, stars });
  });
});
