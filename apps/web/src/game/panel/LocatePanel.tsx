import type { ReactNode } from 'react';
import type { Feedback } from '../individual/messages';
import { FeedbackLine } from './FeedbackLine';
import { PanelInfo } from './PanelInfo';
import panel from './panel.module.css';

interface LocatePanelProps {
  /** Heading above the prompt, e.g. "Encontre no mapa:". */
  readonly label: string;
  /** What to find on the map. */
  readonly prompt: string;
  readonly info: ReactNode;
  /** Right-aligned warning next to the info line, e.g. the mistakes so far. */
  readonly warning?: string;
  readonly feedback: Feedback | null;
}

/** Controls of the click-on-the-map challenge: which country to find. */
export function LocatePanel({ label, prompt, info, warning, feedback }: LocatePanelProps) {
  return (
    <>
      <div className={panel.target}>
        <div className={panel.targetLabel}>{label}</div>
        <div className={panel.targetName}>{prompt}</div>
      </div>
      <PanelInfo {...(warning !== undefined && { warning })}>{info}</PanelInfo>
      <FeedbackLine feedback={feedback} />
    </>
  );
}
