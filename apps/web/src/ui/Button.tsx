import type { ButtonHTMLAttributes, Ref } from 'react';
import styles from './Button.module.css';
import { cx } from './cx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: 'primary' | 'secondary' | 'online';
  /** `large` is the main action of a screen. */
  readonly size?: 'normal' | 'large';
  readonly ref?: Ref<HTMLButtonElement>;
}

export function Button({ variant = 'primary', size = 'normal', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(styles.button, styles[variant], size === 'large' && styles.large, className)}
      {...rest}
    />
  );
}
