import type { GameSetup } from '@contorno/core';
import { useState, type SubmitEvent } from 'react';
import { describeSetup } from '../copy';
import { Button } from '../ui/Button';
import { LobbyShell } from './LobbyShell';
import styles from './Lobby.module.css';

interface OnlineLobbyProps {
  /** What the player picked on the mode card; used when creating a room. */
  readonly setup: GameSetup;
  readonly onCreate: () => void;
  readonly onJoin: (code: string) => void;
  readonly onBack: () => void;
}

export function OnlineLobby({ setup, onCreate, onJoin, onBack }: OnlineLobbyProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const join = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (trimmed === '') {
      setError('Digite o código da sala.');
      return;
    }
    onJoin(trimmed);
  };

  return (
    <LobbyShell backLabel="← Voltar" onBack={onBack}>
      <div className={styles.cards}>
        <section className={styles.card} aria-label="Nova sala">
          <h2>Nova Sala</h2>
          <p className={styles.hint}>Crie a sala e compartilhe o código com seu adversário.</p>
          <p className={styles.setup}>{describeSetup(setup)}</p>
          <Button onClick={onCreate}>Criar Sala</Button>
        </section>

        <form className={styles.card} aria-label="Entrar em sala" onSubmit={join}>
          <h2>Entrar em Sala</h2>
          <p className={styles.hint}>Digite o código de 4 caracteres enviado pelo criador da sala.</p>
          <input
            className={styles.input}
            type="text"
            aria-label="Código da sala"
            placeholder="XXXX"
            maxLength={4}
            value={code}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(event) => {
              setCode(event.target.value);
              setError('');
            }}
          />
          <Button type="submit">Entrar</Button>
        </form>
      </div>
      <div className={styles.error} role="alert">
        {error}
      </div>
    </LobbyShell>
  );
}
