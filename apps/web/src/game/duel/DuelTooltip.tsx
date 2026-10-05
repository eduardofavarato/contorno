import type { DuelResult } from '@contorno/core';
import { formatPoints } from '../../utils/format';
import { questionTitle } from '../../utils/question';
import { ResultTooltip } from '../ResultTooltip';

interface DuelTooltipProps {
  readonly result: DuelResult;
  readonly names: readonly [string, string];
}

export function DuelTooltip({ result, names }: DuelTooltipProps) {
  const name = questionTitle(result.question);
  if (result.player === null) return <ResultTooltip tone="bad" heading="✗ Sem ponto" name={name} />;

  const tone = result.player === 0 ? 'playerA' : 'playerB';
  const owner = names[result.player];
  return (
    <ResultTooltip
      tone={tone}
      heading={result.stolen ? `🔥 Roubo — ${owner}` : `✓ ${owner}`}
      name={name}
      detail={`+${formatPoints(result.points)} pts`}
    />
  );
}
