import { Button } from '../ui/Button';
import styles from './ResultsScreen.module.css';

/** What happened to a finished game with respect to the ranking. */
export type RankingOutcome =
  | { readonly kind: 'none' }
  /** Signed out, but the server has accounts: invite the player to sign in next time. */
  | { readonly kind: 'invite'; readonly onLogin: () => void }
  /** Signed in, yet the game could not be registered (e.g. no connection when it started). */
  | { readonly kind: 'unranked'; readonly reason: string }
  | { readonly kind: 'sending' }
  | { readonly kind: 'ranked'; readonly rank: number; readonly onOpenRanking: () => void }
  | { readonly kind: 'failed'; readonly message: string; readonly onRetry: (() => void) | null };

/** The ranking box on the results screen. */
export function RankingNotice({ outcome }: { readonly outcome: RankingOutcome }) {
  switch (outcome.kind) {
    case 'none':
      return null;
    case 'invite':
      return (
        <section className={styles.notice} aria-label="Ranking">
          <p>Entre na sua conta para salvar partidas no ranking.</p>
          <Button variant="secondary" onClick={outcome.onLogin}>
            Entrar
          </Button>
        </section>
      );
    case 'unranked':
      return (
        <section className={styles.notice} aria-label="Ranking">
          <p>Esta partida não entrou no ranking. {outcome.reason}</p>
        </section>
      );
    case 'sending':
      return (
        <section className={styles.notice} aria-label="Ranking">
          <p role="status">Enviando para o ranking…</p>
        </section>
      );
    case 'ranked':
      return (
        <section className={styles.notice} aria-label="Ranking">
          <p role="status">
            🏆 Você ficou em <strong>#{outcome.rank}</strong> no ranking!
          </p>
          <Button variant="secondary" onClick={outcome.onOpenRanking}>
            Ver ranking
          </Button>
        </section>
      );
    case 'failed':
      return (
        <section className={styles.notice} aria-label="Ranking">
          <p role="alert">{outcome.message}</p>
          {outcome.onRetry && (
            <Button variant="secondary" onClick={outcome.onRetry}>
              Tentar de novo
            </Button>
          )}
        </section>
      );
  }
}
