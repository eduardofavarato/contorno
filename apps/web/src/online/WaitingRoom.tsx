import { useEffect, useRef, useState } from 'react';
import { HAPTICS, vibrate } from '../haptics';
import { shareText } from '../share/shareText';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { ScreenShell } from '../ui/ScreenShell';
import { CodeBoxes } from './CodeBoxes';
import { inviteMessage } from './code';
import styles from './Lobby.module.css';

const COPIED_MS = 1800;

interface WaitingRoomProps {
  readonly code: string;
  /** Whether this player created the room (and so has the code to pass on). */
  readonly host: boolean;
  /** Status line, e.g. "Aguardando adversário…". */
  readonly status: string;
  /** Whether the opponent is already there (stops the waiting pulse). */
  readonly connected: boolean;
  readonly setupName: string;
  readonly onLeave: () => void;
}

/** A created room waiting for the opponent: the code in large type, with buttons to copy and share it. */
export function WaitingRoom({ code, host, status, connected, setupName, onLeave }: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
    },
    [],
  );

  const copy = () => {
    vibrate(HAPTICS.press);
    // Clipboard access can be refused (insecure context, denied permission); then nothing is shown as copied.
    navigator.clipboard.writeText(code).then(
      () => {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          setCopied(false);
        }, COPIED_MS);
      },
      () => undefined,
    );
  };

  return (
    <ScreenShell title={host ? 'Sala criada' : 'Entrando na sala'} backLabel="Voltar" onBack={onLeave}>
      <div className={styles.room}>
        <div className={styles.codeLabel}>Código da sala</div>
        <div role="group" aria-label={`Código da sala: ${code}`}>
          <CodeBoxes value={code} large />
        </div>
        {host && (
          <div className={styles.roomActions}>
            <Button variant="secondary" size="large" onClick={copy}>
              <Icon name={copied ? 'check' : 'copy'} size={20} /> {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button
              variant="secondary"
              size="large"
              onClick={() => {
                vibrate(HAPTICS.press);
                shareText(inviteMessage(code));
              }}
            >
              <Icon name="share" size={20} /> Compartilhar
            </Button>
          </div>
        )}
        <p className={styles.status} role="status">
          <span className={connected ? styles.dot : styles.dotWaiting} aria-hidden="true" />
          {status}
        </p>
        <p className={styles.roomHint}>{setupName} · A partida começa sozinha quando o adversário entrar.</p>
      </div>
    </ScreenShell>
  );
}
