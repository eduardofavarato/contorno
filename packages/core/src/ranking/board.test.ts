import { describe, expect, it } from 'vitest';
import { ALL_BOARDS, boardKeyFor, setupForBoard } from './board';

describe('boardKeyFor', () => {
  it('names a board by mode and pool', () => {
    expect(boardKeyFor({ mode: 'perguntas', pool: { kind: 'level', level: 2 } })).toBe('perguntas:level:2');
    expect(boardKeyFor({ mode: 'continentes', pool: { kind: 'continent', continent: 'europe' } })).toBe(
      'continentes:continent:europe',
    );
    expect(boardKeyFor({ mode: 'localizar', pool: { kind: 'level', level: 1 } })).toBe('localizar:level:1');
    expect(boardKeyFor({ mode: 'brasil', pool: { kind: 'brasil', topic: 'capitais' } })).toBe('brasil:brasil:capitais');
  });
});

describe('ALL_BOARDS', () => {
  it('lists every board once: 3 + 6 + 3 + 3', () => {
    const keys = ALL_BOARDS.map(boardKeyFor);

    expect(keys).toHaveLength(15);
    expect(new Set(keys).size).toBe(15);
  });

  it('round-trips through the key', () => {
    for (const setup of ALL_BOARDS) expect(setupForBoard(boardKeyFor(setup))).toEqual(setup);
  });
});

describe('setupForBoard', () => {
  it('rejects keys that are not boards', () => {
    expect(setupForBoard('perguntas:level:9')).toBeNull();
    expect(setupForBoard('hack')).toBeNull();
    expect(setupForBoard('')).toBeNull();
  });
});
