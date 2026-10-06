import type { GameSetup } from '@contorno/core';
import { useState, type SubmitEvent } from 'react';
import { describeSetup } from '../copy';
import { HAPTICS, vibrate } from '../haptics';
import { Button } from '../ui/Button';
import { OptionPicker } from '../ui/OptionPicker';
import { ScreenShell } from '../ui/ScreenShell';
import { CodeBoxes } from './CodeBoxes';
import { CODE_LENGTH } from './code';
import styles from './Lobby.module.css';

type Tab = 'create' | 'join';
const TAB_OPTIONS = [
  { value: 'create', label: 'Criar sala' },
  { value: 'join', label: 'Entrar com código' },
] as const;

interface OnlineLobbyProps {
  /** What the player picked in the mode's setup; used when creating a room. */
  readonly setup: GameSetup;
  readonly onCreate: () => void;
  readonly onJoin: (code: string) => void;
  readonly onBack: () => void;
}

export function OnlineLobby({ setup, onCreate, onJoin, onBack }: OnlineLobbyProps) {
  const [tab, setTab] = useState<Tab>('create');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const join = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (code.length < CODE_LENGTH) {
      vibrate(HAPTICS.wrong);
      setError(code === '' ? 'Digite o código da sala.' : `Digite os ${String(CODE_LENGTH)} caracteres do código.`);
      return;
    }
    vibrate(HAPTICS.press);
    onJoin(code);
  };

  return (
    <ScreenShell title="Disputa online" backLabel="Voltar" onBack={onBack}>
      <div className={styles.panel}>
        <span className={styles.setup}>{describeSetup(setup)}</span>

        <OptionPicker
          label="Sala"
          options={TAB_OPTIONS}
          value={tab}
          onChange={(next) => {
            setTab(next);
            setError('');
          }}
          segmented
        />

        {tab === 'create' ? (
          <section className={styles.card} aria-label="Nova sala">
            <h2>Nova sala</h2>
            <p className={styles.hint}>Crie a sala e envie o código de 4 caracteres para o seu adversário.</p>
            <Button
              size="large"
              onClick={() => {
                vibrate(HAPTICS.press);
                onCreate();
              }}
            >
              Criar Sala
            </Button>
          </section>
        ) : (
          <form className={styles.joinForm} aria-label="Entrar em sala" onSubmit={join}>
            <p className={styles.hint}>Digite o código enviado por quem criou a sala.</p>
            <div className={styles.codeField}>
              <CodeBoxes value={code} focused />
              <input
                className={styles.codeInput}
                type="text"
                aria-label="Código da sala"
                maxLength={CODE_LENGTH}
                value={code}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                onChange={(event) => {
                  setCode(
                    event.target.value
                      .replace(/[^a-zA-Z0-9]/g, '')
                      .toUpperCase()
                      .slice(0, CODE_LENGTH),
                  );
                  setError('');
                }}
              />
            </div>
            <div className={styles.error} role="alert">
              {error}
            </div>
            <Button type="submit" size="large">
              Entrar na sala
            </Button>
          </form>
        )}
      </div>
    </ScreenShell>
  );
}
