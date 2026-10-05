import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from '@contorno/core';
import { useId, useState, type SubmitEvent } from 'react';
import { errorMessage } from '../api/messages';
import { Button } from '../ui/Button';
import { ScreenShell } from '../ui/ScreenShell';
import styles from './Auth.module.css';
import { useAuth } from './authContext';
import { GoogleSignIn } from './GoogleSignIn';

interface LoginScreenProps {
  /** Called once the player is signed in. */
  readonly onDone: () => void;
  readonly onBack: () => void;
}

export function LoginScreen({ onDone, onBack }: LoginScreenProps) {
  const { login, signup, googleClientId } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ids = { name: useId(), email: useId(), password: useId() };
  const signingUp = mode === 'signup';

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await (signingUp ? signup(name, email, password) : login(email, password));
      onDone();
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = () => {
    setMode(signingUp ? 'login' : 'signup');
    setError('');
  };

  return (
    <ScreenShell title={signingUp ? 'Criar conta' : 'Entrar'} backLabel="← Voltar" onBack={onBack}>
      <form className={styles.card} onSubmit={(event) => void submit(event)}>
        {signingUp && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor={ids.name}>
              Nome no ranking
            </label>
            <input
              id={ids.name}
              className={styles.input}
              value={name}
              required
              minLength={2}
              maxLength={40}
              autoComplete="nickname"
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </div>
        )}
        <div className={styles.field}>
          <label className={styles.label} htmlFor={ids.email}>
            E-mail
          </label>
          <input
            id={ids.email}
            className={styles.input}
            type="email"
            value={email}
            required
            autoComplete="email"
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={ids.password}>
            Senha
          </label>
          <input
            id={ids.password}
            className={styles.input}
            type="password"
            value={password}
            required
            minLength={signingUp ? PASSWORD_MIN_LENGTH : 1}
            maxLength={PASSWORD_MAX_BYTES}
            autoComplete={signingUp ? 'new-password' : 'current-password'}
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
        </div>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          {signingUp ? 'Criar conta' : 'Entrar'}
        </Button>
        {signingUp && (
          <p className={styles.hint}>
            Mínimo de {PASSWORD_MIN_LENGTH} caracteres. Não há recuperação de senha, então anote a sua.
          </p>
        )}
        <p className={styles.switch}>
          {signingUp ? 'Já tem conta? ' : 'Ainda não tem conta? '}
          <button type="button" onClick={switchMode}>
            {signingUp ? 'Entrar' : 'Criar conta'}
          </button>
        </p>
        {googleClientId && (
          <>
            <div className={styles.divider}>ou</div>
            <GoogleSignIn clientId={googleClientId} onSignedIn={onDone} />
          </>
        )}
      </form>
    </ScreenShell>
  );
}
