import { useState } from 'react';
import { describeSetup, markAsMe, PLAYER_NAMES, PLAYER_SHORT_NAMES } from '../copy';
import { DuelBoard } from '../game/duel/DuelBoard';
import { DuelResults } from '../game/duel/DuelResults';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import styles from './Lobby.module.css';
import { LobbyShell } from './LobbyShell';
import { INTERRUPTION_MESSAGES, REFUSAL_MESSAGES } from './messages';
import type { Intent } from './session';
import { useOnlineSession } from './useOnlineSession';

interface OnlineMatchProps {
  readonly intent: Intent;
  /** Back to the lobby, to try again. */
  readonly onLeave: () => void;
  readonly onHome: () => void;
}

/** One online duel, from connecting to the final result. */
export function OnlineMatch({ intent, onLeave, onHome }: OnlineMatchProps) {
  const { state, guess, giveUp } = useOnlineSession(intent);
  const [confirmingQuit, setConfirmingQuit] = useState(false);

  switch (state.phase) {
    case 'connecting':
      return (
        <LobbyShell backLabel="Cancelar" onBack={onLeave}>
          <p className={styles.status}>Conectando…</p>
        </LobbyShell>
      );

    case 'waiting':
      return (
        <LobbyShell backLabel="← Voltar" onBack={onLeave}>
          <div className={styles.codeLabel}>Código da sala</div>
          <div className={styles.code} aria-label={`Código da sala: ${state.code}`}>
            {state.code}
          </div>
          <p className={styles.status} role="status">
            {state.player === 0 && !state.opponentJoined ? 'Aguardando adversário…' : 'Conectado! Aguardando início…'}
          </p>
        </LobbyShell>
      );

    case 'refused':
      return (
        <LobbyShell backLabel="← Voltar" onBack={onLeave}>
          <p className={styles.error} role="alert">
            {REFUSAL_MESSAGES[state.code]}
          </p>
        </LobbyShell>
      );

    case 'interrupted':
      return (
        <LobbyShell backLabel="← Voltar" onBack={onLeave}>
          <p className={styles.error} role="alert">
            {INTERRUPTION_MESSAGES[state.reason]}
          </p>
        </LobbyShell>
      );

    case 'playing': {
      const { view, player, setup } = state;
      const names = markAsMe(PLAYER_NAMES, player);

      if (view.status === 'finished' && view.winner !== null) {
        return (
          <DuelResults names={names} scores={view.scores} winner={view.winner} onPlayAgain={onLeave} onHome={onHome} />
        );
      }
      return (
        <>
          <DuelBoard
            view={view}
            setup={setup}
            names={names}
            shortNames={markAsMe(PLAYER_SHORT_NAMES, player)}
            badge={`${describeSetup(setup)} · Online`}
            canAct={view.status === 'asking' && view.activePlayer === player}
            onGuess={guess}
            onGiveUp={giveUp}
            onQuit={() => {
              setConfirmingQuit(true);
            }}
          />
          {confirmingQuit && (
            <ConfirmDialog
              title="Sair da disputa?"
              message="A partida termina e seu adversário será avisado."
              confirmLabel="Sair"
              cancelLabel="Continuar"
              onConfirm={onHome}
              onCancel={() => {
                setConfirmingQuit(false);
              }}
            />
          )}
        </>
      );
    }
  }
}
