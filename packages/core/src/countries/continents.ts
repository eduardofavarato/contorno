import type { CountryId } from './types';

export const CONTINENT_IDS = [
  'south-america',
  'central-america',
  'north-america',
  'europe',
  'asia',
  'oceania',
] as const;

export type Continent = (typeof CONTINENT_IDS)[number];

export interface ContinentInfo {
  readonly id: Continent;
  readonly name: string;
  readonly countryIds: readonly CountryId[];
}

export const CONTINENTS: readonly ContinentInfo[] = [
  {
    id: 'south-america',
    name: 'América do Sul',
    countryIds: [32, 68, 76, 152, 170, 218, 254, 328, 600, 604, 740, 780, 858, 862],
  },
  {
    id: 'central-america',
    name: 'América Central',
    countryIds: [84, 188, 192, 214, 222, 320, 332, 340, 388, 558, 591],
  },
  { id: 'north-america', name: 'América do Norte', countryIds: [124, 304, 484, 840] },
  {
    id: 'europe',
    name: 'Europa',
    countryIds: [
      8, 40, 56, 70, 100, 112, 191, 203, 208, 233, 246, 250, 276, 300, 348, 352, 372, 380, 383, 428, 440, 442, 498, 499,
      528, 578, 616, 620, 642, 643, 688, 703, 705, 724, 752, 756, 804, 807, 826,
    ],
  },
  {
    id: 'asia',
    name: 'Ásia',
    countryIds: [
      4, 31, 50, 51, 64, 104, 116, 144, 156, 158, 196, 268, 356, 360, 364, 368, 376, 392, 398, 400, 408, 410, 414, 417,
      418, 422, 458, 496, 512, 524, 586, 608, 626, 634, 682, 704, 760, 762, 764, 784, 792, 795, 860, 887,
    ],
  },
  { id: 'oceania', name: 'Oceania', countryIds: [36, 242, 554, 598] },
];
