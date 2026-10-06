import { cx } from '../../ui/cx';
import type { Feedback } from '../individual/messages';
import styles from './panel.module.css';

/** One line under the controls; always rendered so the layout does not jump when it fills in. */
export function FeedbackLine({ feedback }: { readonly feedback: Feedback | null }) {
  return (
    <div
      role="status"
      className={cx(styles.feedback, feedback && (feedback.tone === 'ok' ? styles.feedbackOk : styles.feedbackBad))}
    >
      {feedback?.text}
    </div>
  );
}
