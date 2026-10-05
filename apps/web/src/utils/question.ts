import type { QuestionInfo } from '@contorno/core';

/** How a settled question is named in lists and tooltips: "Brasil", or "Goiás → Goiânia" when the answer differs. */
export function questionTitle({ subject, answer }: QuestionInfo): string {
  return subject === answer ? answer : `${subject} → ${answer}`;
}
