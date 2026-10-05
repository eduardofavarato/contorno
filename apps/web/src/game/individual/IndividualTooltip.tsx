import { getCountry, type IndividualResult } from '@contorno/core';
import { formatPoints, plural } from '../../utils/format';
import { ResultTooltip } from '../ResultTooltip';

export function IndividualTooltip({ result }: { readonly result: IndividualResult }) {
  const name = getCountry(result.countryId).name;
  switch (result.outcome) {
    case 'correct': {
      const attempt = result.wrongs === 0 ? 'De primeira!' : plural(result.wrongs, 'erro');
      return (
        <ResultTooltip
          tone="ok"
          heading="✓ Correto"
          name={name}
          detail={`${attempt} · +${formatPoints(result.points)} pts`}
        />
      );
    }
    case 'gave_up':
      return <ResultTooltip tone="bad" heading="✗ Desistiu" name={name} />;
    case 'failed':
      return <ResultTooltip tone="bad" heading="✗ Incorreto" name={name} detail="Tentativas esgotadas" />;
  }
}
