import { useState } from 'react';
import { errorMessage } from '../api/messages';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import styles from './AccountBar.module.css';
import { useAuth } from './authContext';

interface AccountBarProps {
  readonly onLogin: () => void;
  readonly onOpenRanking: () => void;
}

/** Top of the home screen: ranking, and sign in or the player's account. Hidden when the server has no accounts. */
export function AccountBar({ onLogin, onOpenRanking }: AccountBarProps) {
  const { status, user, logout, deleteAccount } = useAuth();
  const [dialog, setDialog] = useState<'account' | 'delete' | null>(null);
  const [error, setError] = useState('');

  if (status !== 'anonymous' && status !== 'signedIn') return null;

  const remove = async () => {
    try {
      await deleteAccount();
      setDialog(null);
    } catch (failure) {
      setError(errorMessage(failure));
      setDialog('account');
    }
  };

  return (
    <>
      <div className={styles.bar}>
        <Button variant="secondary" onClick={onOpenRanking}>
          🏆 Ranking
        </Button>
        {status === 'signedIn' ? (
          <Button
            variant="secondary"
            onClick={() => {
              setError('');
              setDialog('account');
            }}
          >
            👤 {user?.name}
          </Button>
        ) : (
          <Button onClick={onLogin}>Entrar</Button>
        )}
      </div>

      {dialog === 'account' && (
        <AccountDialog
          name={user?.name ?? ''}
          error={error}
          onLogout={() => {
            void logout().then(() => {
              setDialog(null);
            });
          }}
          onDelete={() => {
            setDialog('delete');
          }}
          onClose={() => {
            setDialog(null);
          }}
        />
      )}
      {dialog === 'delete' && (
        <ConfirmDialog
          title="Excluir sua conta?"
          message="Sua conta e todas as suas pontuações serão apagadas para sempre."
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          onConfirm={() => void remove()}
          onCancel={() => {
            setDialog('account');
          }}
        />
      )}
    </>
  );
}

interface AccountDialogProps {
  readonly name: string;
  readonly error: string;
  readonly onLogout: () => void;
  readonly onDelete: () => void;
  readonly onClose: () => void;
}

function AccountDialog({ name, error, onLogout, onDelete, onClose }: AccountDialogProps) {
  return (
    <ConfirmDialog
      title={name}
      message={error || 'Conta Contorno'}
      confirmLabel="Sair da conta"
      cancelLabel="Fechar"
      onConfirm={onLogout}
      onCancel={onClose}
      extra={
        <Button variant="secondary" onClick={onDelete}>
          Excluir minha conta
        </Button>
      }
    />
  );
}
