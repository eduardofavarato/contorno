export type BackAction = () => void;

const stack: BackAction[] = [];

/** Registers what "back" does for the screen on top; returns the function that unregisters it. */
export function pushBackAction(action: BackAction): () => void {
  stack.push(action);
  return () => {
    const index = stack.lastIndexOf(action);
    if (index !== -1) stack.splice(index, 1);
  };
}

/** Runs the most recently registered action. Returns `false` when nothing is registered (the home screen). */
export function runBackAction(): boolean {
  const action = stack.at(-1);
  if (!action) return false;
  action();
  return true;
}
