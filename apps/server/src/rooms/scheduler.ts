/** Delayed callbacks owned by one room, so closing the room cancels everything it scheduled. */
export class Scheduler {
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  after(delayMs: number, callback: () => void): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delayMs);
    this.timers.add(timer);
  }

  dispose(): void {
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
  }
}
