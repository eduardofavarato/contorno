import { CONTINENTS, type GameFormat, type GameMode, type GameSetup, type Level } from '@contorno/core';

/** User-facing text (pt-BR), kept in one place so the UI can be translated later. */
export const LEVEL_LABELS: Readonly<Record<Level, string>> = { 1: 'Fácil', 2: 'Médio', 3: 'Difícil' };

export const FORMAT_LABELS: Readonly<Record<GameFormat, string>> = { individual: 'Individual', duel: 'Disputa' };

export interface ModeCopy {
  readonly icon: string;
  readonly title: string;
  /** One line shown in the compact mode list. */
  readonly summary: string;
  readonly description: Readonly<Record<GameFormat, string>>;
  readonly details: Readonly<Record<GameFormat, readonly string[]>>;
}

const DUEL_RULES = [
  '10 perguntas, jogadores alternados',
  '1 tentativa por pergunta',
  'Roubo vale 1.000 pts',
  'Empate: Rodadas de Fogo!',
];

export const MODE_COPY: Readonly<Record<GameMode, ModeCopy>> = {
  perguntas: {
    icon: '❓',
    title: 'Modo Perguntas',
    summary: 'Adivinhe países pelo contorno',
    description: {
      individual: 'Um país é destacado no mapa a cada rodada. Adivinhe o nome antes que os pontos acabem!',
      duel: 'Dois jogadores, um país por vez: quem errar deixa o adversário roubar os pontos.',
    },
    details: {
      individual: [
        '10 países por rodada',
        'Até 2.000 pts por acerto',
        '–200 pts por resposta errada',
        'Máximo de 3 tentativas por país',
      ],
      duel: DUEL_RULES,
    },
  },
  continentes: {
    icon: '🌎',
    title: 'Modo Continentes',
    summary: 'Todos os países de um continente',
    description: {
      individual: 'Escolha um continente e tente acertar todos os países que fazem parte dele!',
      duel: 'Dois jogadores disputam países de um continente: quem errar deixa o adversário roubar os pontos.',
    },
    details: {
      individual: [
        'Todos os países do continente',
        'Até 2.000 pts por acerto',
        '–200 pts por resposta errada',
        'Máximo de 3 tentativas por país',
      ],
      duel: ['Até 10 países sorteados do continente', ...DUEL_RULES.slice(1)],
    },
  },
  localizar: {
    icon: '🎯',
    title: 'Modo Localizar',
    summary: 'Encontre o país no mapa pelo nome',
    description: {
      individual: 'O nome do país é revelado — encontre-o no mapa clicando no lugar certo!',
      duel: 'Dois jogadores encontram países no mapa: quem errar deixa o adversário roubar os pontos.',
    },
    details: {
      individual: [
        '10 países por rodada',
        'Até 2.000 pts por acerto',
        '–200 pts por clique errado',
        'Máximo de 3 tentativas por país',
      ],
      duel: DUEL_RULES,
    },
  },
};

export const FREE_MODE_COPY = {
  icon: '🔍',
  title: 'Modo Livre',
  summary: 'Explore o mapa sem pressão',
  description: 'Explore o mapa e clique em qualquer país para tentar adivinhar o nome dele.',
  details: ['Clique em qualquer país', 'Uma tentativa por país', 'Acertos são contabilizados', 'Sem pressão de tempo'],
} as const;

/** Short label for a game's pool, e.g. "Fácil" or "Europa". */
export function describePool({ pool }: GameSetup): string {
  if (pool.kind === 'level') return LEVEL_LABELS[pool.level];
  return CONTINENTS.find((continent) => continent.id === pool.continent)?.name ?? pool.continent;
}

/** Title of a game's setup, e.g. "Modo Perguntas · Fácil" or "Modo Continentes · Europa". */
export function describeSetup(setup: GameSetup): string {
  return `${MODE_COPY[setup.mode].title} · ${describePool(setup)}`;
}

/** Display names of the two duel players; the online mode will replace them with the players' own. */
export const PLAYER_NAMES: readonly [string, string] = ['Jogador A', 'Jogador B'];

/** What the narrow scoreboard shows instead of the full names. */
export const PLAYER_SHORT_NAMES: readonly [string, string] = ['A', 'B'];

/** Marks one seat as the viewer's own ("Jogador A (você)"), so players know which side of the scoreboard is theirs. */
export function markAsMe(names: readonly [string, string], me: 0 | 1): readonly [string, string] {
  const [a, b] = names;
  return me === 0 ? [`${a} (você)`, b] : [a, `${b} (você)`];
}
