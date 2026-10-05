export function formatPoints(points: number): string {
  return points.toLocaleString('pt-BR');
}

/** `plural(2, 'erro')` is "2 erros"; `plural(1, 'tentativa restante', 'tentativas restantes')` picks the given plural form. */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${String(count)} ${count === 1 ? singular : pluralForm}`;
}

/** A game's duration as m:ss, e.g. 62_000 → "1:02". */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  return `${String(Math.floor(totalSeconds / 60))}:${String(seconds).padStart(2, '0')}`;
}
