export interface Rating {
  readonly label: string;
  readonly stars: number;
}

const RATINGS: readonly (Rating & { readonly minRatio: number })[] = [
  { minRatio: 1, label: 'Perfeito! Gênio Geográfico', stars: 5 },
  { minRatio: 0.9, label: 'Excelente!', stars: 5 },
  { minRatio: 0.75, label: 'Muito Bom', stars: 4 },
  { minRatio: 0.5, label: 'Bom', stars: 3 },
  { minRatio: 0.25, label: 'Em Desenvolvimento', stars: 2 },
  { minRatio: 0, label: 'Iniciante', stars: 1 },
];

/** Rating for a score, given the fraction of the possible points that was earned (0 to 1). */
export function ratingFor(ratio: number): Rating {
  const found = RATINGS.find((rating) => ratio >= rating.minRatio);
  return found ? { label: found.label, stars: found.stars } : { label: 'Iniciante', stars: 1 };
}
