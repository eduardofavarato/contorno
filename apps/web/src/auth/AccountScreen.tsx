import { useState } from 'react';
import { errorMessage } from '../api/messages';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import styles from './Account.module.css';
import { useAuth } from './authContext';

interface AccountScreenProps {
  readonly onLogin: () => void;
  /** "Continuar sem conta": back to the game list. */
  readonly onContinue: () => void;
}

/** The Conta tab: sign in (or carry on without an account), or the signed-in player's account. */
export function AccountScreen({ onLogin, onContinue }: AccountScreenProps) {
  const { status, user, logout, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    try {
      await deleteAccount();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className={styles.screen}>
      <h1 className={styles.heading}>Conta</h1>

      {status === 'signedIn' ? (
        <section className={styles.card} aria-label="Sua conta">
          <div className={styles.name}>{user?.name}</div>
          <p className={styles.text}>
            Suas partidas individuais entram no ranking de cada modo. O ranking mostra só o seu nome, nunca o e-mail.
          </p>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <Button
            variant="secondary"
            size="large"
            onClick={() => {
              setError('');
              void logout();
            }}
          >
            Sair da conta
          </Button>
          <Button
            variant="secondary"
            className={styles.danger}
            onClick={() => {
              setError('');
              setDeleting(true);
            }}
          >
            Excluir minha conta
          </Button>
        </section>
      ) : (
        <section className={styles.card} aria-label="Entrar">
          <div className={styles.name}>Jogue valendo no ranking</div>
          <p className={styles.text}>
            Entre com e-mail ou Google. Suas partidas individuais entram no ranking do modo; a conta guarda só o nome,
            nunca o e-mail.
          </p>
          <Button size="large" onClick={onLogin}>
            Entrar
          </Button>
          <Button variant="secondary" onClick={onContinue}>
            Continuar sem conta
          </Button>
        </section>
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir sua conta?"
          message="Sua conta e todas as suas pontuações serão apagadas para sempre."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          onConfirm={() => void remove()}
          onCancel={() => {
            setDeleting(false);
          }}
        />
      )}
    </main>
  );
}
