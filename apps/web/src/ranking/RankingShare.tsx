import type { GameSetup, RankingEntry } from '@contorno/core';
import { useRef, useState } from 'react';
import { shareOrDownloadImage, supportsFileShare } from '../share/shareImage';
import { shareText } from '../share/shareText';
import { ShareButton } from '../ui/ShareButton';
import { rankingCaption, rankingMessage } from './shareContent';
import { RankingShareCard } from './RankingShareCard';

interface RankingShareProps {
  readonly setup: GameSetup;
  readonly entries: readonly RankingEntry[];
}

/** Share button for a ranking, plus the off-screen card that becomes the shared picture. */
export function RankingShare({ setup, entries }: RankingShareProps) {
  const card = useRef<HTMLDivElement>(null);
  const [canShareFile] = useState(supportsFileShare);
  const [date] = useState(() => new Date());

  const shareImage = () => {
    if (card.current) void shareOrDownloadImage(card.current, 'ranking-contorno.png', rankingCaption(setup));
  };

  return (
    <>
      <ShareButton
        label={canShareFile ? 'Compartilhar ranking' : 'Baixar imagem'}
        onShareImage={shareImage}
        onShareText={() => {
          shareText(rankingMessage(setup, entries));
        }}
      />
      {/* Off-screen but laid out: the image capture needs a real render, which `display: none` would skip. */}
      <div aria-hidden="true" style={{ position: 'fixed', top: -10_000, left: -10_000, pointerEvents: 'none' }}>
        <RankingShareCard ref={card} setup={setup} entries={entries} date={date} />
      </div>
    </>
  );
}
