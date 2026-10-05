import { describe, expect, it } from 'vitest';
import { shuffle } from './random';
import { seededRandom } from './test-support';

describe('shuffle', () => {
  it('keeps the same items without mutating the input', () => {
    const items = [1, 2, 3, 4, 5, 6];
    const shuffled = shuffle(items, seededRandom(1));

    expect(items).toEqual([1, 2, 3, 4, 5, 6]);
    expect([...shuffled].sort()).toEqual(items);
  });

  it('is deterministic for a given random source', () => {
    expect(shuffle([1, 2, 3, 4, 5, 6], seededRandom(7))).toEqual(shuffle([1, 2, 3, 4, 5, 6], seededRandom(7)));
  });
});
