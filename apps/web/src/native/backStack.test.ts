import { describe, expect, it, vi } from 'vitest';
import { pushBackAction, runBackAction } from './backStack';

describe('back stack', () => {
  it('runs nothing when nothing is registered', () => {
    expect(runBackAction()).toBe(false);
  });

  it('runs the most recent action, then the previous one once it is gone', () => {
    const screen = vi.fn();
    const dialog = vi.fn();
    const removeScreen = pushBackAction(screen);
    const removeDialog = pushBackAction(dialog);

    expect(runBackAction()).toBe(true);
    expect(dialog).toHaveBeenCalledOnce();
    expect(screen).not.toHaveBeenCalled();

    removeDialog();
    runBackAction();
    expect(screen).toHaveBeenCalledOnce();

    removeScreen();
    expect(runBackAction()).toBe(false);
  });

  it('keeps registrations independent when removed out of order', () => {
    const first = vi.fn();
    const second = vi.fn();
    const removeFirst = pushBackAction(first);
    const removeSecond = pushBackAction(second);

    removeFirst();
    runBackAction();

    expect(second).toHaveBeenCalledOnce();
    removeSecond();
  });
});
