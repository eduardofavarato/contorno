export function formatPoints(points: number): string {
  return points.toLocaleString('pt-BR');
}

/** `plural(2, 'erro')` is "2 erros"; `plural(1, 'tentativa restante', 'tentativas restantes')` picks the given plural form. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${String(count)} ${count === 1 ? singular : pluralForm}`;
}
