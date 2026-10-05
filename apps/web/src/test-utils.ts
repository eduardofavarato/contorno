import { quizFor, type GameSetup, type Guess, type Question } from '@contorno/core';
import { vi } from 'vitest';

/** Like `querySelector`, but fails the test loudly when the element is missing. */
export function queryRequired(root: ParentNode, selector: string): Element {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`No element matches "${selector}"`);
  return element;
}

/**
 * jsdom has no layout engine, so ResizeObserver is faked: observed elements report `size` right away,
 * or never report anything when `size` is `null`.
 */
export function stubResizeObserver(size: { width: number; height: number } | null = { width: 800, height: 400 }) {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private readonly callback: ResizeObserverCallback) {}
      observe = vi.fn((target: Element) => {
        if (size) this.callback([{ target, contentRect: size } as ResizeObserverEntry], this);
      });
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
}

/** Narrows `T | undefined` for values a test knows exist, failing loudly otherwise. */
export function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('Expected a value, got undefined');
  return value;
}

/** Stand-in for the browser's WebSocket: tests open it, feed it server messages and read what the client sent. */
export class FakeWebSocket {
  static readonly OPEN = 1;
  private static instances: FakeWebSocket[] = [];
  readyState = 0;
  readonly sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  static reset(): void {
    FakeWebSocket.instances = [];
  }

  /** How many sockets have been opened since the last reset. */
  static get count(): number {
    return FakeWebSocket.instances.length;
  }

  static latest(): FakeWebSocket {
    return required(FakeWebSocket.instances.at(-1));
  }

  /** Messages the client sent, decoded. */
  get messages(): unknown[] {
    return this.sent.map((raw) => JSON.parse(raw) as unknown);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
    this.onclose?.();
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  receive(message: unknown): void {
    this.onmessage?.({ data: typeof message === 'string' ? message : JSON.stringify(message) });
  }
}

/** The questions of a setup about the given regions, in the order given. */
export function pickQuestions(setup: GameSetup, regionIds: readonly number[]): Question[] {
  const { questions } = quizFor(setup);
  return regionIds.map((id) => required(questions.find((question) => question.regionId === id)));
}

/** A guess that answers the question right: its first accepted answer, or a click on its region. */
export function correctGuess(question: Question): Guess {
  return question.challenge === 'type'
    ? { type: 'text', value: required(question.accepts[0]) }
    : { type: 'region', id: question.regionId };
}

/** A guess that answers the question wrong. */
export function wrongGuess(question: Question): Guess {
  return question.challenge === 'type' ? { type: 'text', value: 'zzz' } : { type: 'region', id: question.regionId + 1 };
}

/** Small deterministic PRNG (mulberry32) so shuffles are reproducible in tests. */
export function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
