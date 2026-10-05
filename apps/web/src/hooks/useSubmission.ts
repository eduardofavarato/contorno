import { useEffect, useRef, useState } from 'react';

export type Submission<T> =
  | { readonly status: 'idle' }
  | { readonly status: 'sending' }
  | { readonly status: 'done'; readonly result: T }
  | { readonly status: 'failed'; readonly error: unknown };

/**
 * Sends something once, as soon as `ready`, and keeps the outcome. `retry` sends it again after a failure.
 * Each attempt runs once even when React re-runs effects (StrictMode), since a duplicate send would be refused.
 */
export function useSubmission<T>(
  ready: boolean,
  send: (() => Promise<T>) | null,
): { submission: Submission<T>; retry: () => void } {
  const [submission, setSubmission] = useState<Submission<T>>({ status: 'idle' });
  const [attempt, setAttempt] = useState(0);
  const started = useRef(-1);

  useEffect(() => {
    if (!ready || !send || started.current === attempt) return;
    started.current = attempt;
    setSubmission({ status: 'sending' });
    send().then(
      (result) => {
        setSubmission({ status: 'done', result });
      },
      (error: unknown) => {
        setSubmission({ status: 'failed', error });
      },
    );
  }, [ready, send, attempt]);

  return {
    submission,
    retry: () => {
      setAttempt((current) => current + 1);
    },
  };
}
