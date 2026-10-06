import { useEffect, useRef, useState } from 'react';
import { HAPTICS, vibrate } from '../haptics';
import { Icon } from './Icon';
import styles from './ShareButton.module.css';

interface ShareButtonProps {
  /** Main action: share (or download) the image. */
  readonly label: string;
  readonly onShareImage: () => void;
  readonly onShareText: () => void;
}

/** An icon button that shares an image, with a small menu to share the same thing as text instead. */
export function ShareButton({ label, onShareImage, onShareText }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (container.current && event.target instanceof Node && !container.current.contains(event.target))
        setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
    };
  }, [open]);

  return (
    <div ref={container} className={styles.group}>
      <button
        type="button"
        className={styles.main}
        aria-label={label}
        onClick={() => {
          vibrate(HAPTICS.press);
          onShareImage();
        }}
      >
        <Icon name="share" size={22} />
      </button>
      <button
        type="button"
        className={styles.more}
        aria-label="Mais opções de compartilhamento"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
        }}
      >
        <Icon name="down" size={18} />
      </button>
      {open && (
        <div className={styles.menu}>
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              setOpen(false);
              onShareText();
            }}
          >
            💬 Compartilhar como texto
          </button>
        </div>
      )}
    </div>
  );
}
