import type { ReactNode } from 'react';
import { cx } from '../../ui/cx';
import type { Feedback } from '../individual/messages';
import styles from './panel.module.css';

interface FeedbackLineProps {
  readonly feedback: Feedback | null;
  /** Control at the end of the line, e.g. the give-up button. */
  readonly action?: ReactNode;
}

/** One line under the controls; always rendered so the layout does not jump when it fills in. */
export function FeedbackLine({ feedback, action }: FeedbackLineProps) {
  return (
    <div className={styles.feedbackRow}>
      <div
        role="status"
        className={cx(styles.feedback, feedback && (feedback.tone === 'ok' ? styles.feedbackOk : styles.feedbackBad))}
      >
        {feedback?.text}
      </div>
      {action}
    </div>
  );
}
