import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';
import { useState } from 'react';
import { errorMessage } from '../api/messages';
import { useAuth } from './authContext';
import { isNativeGoogleSignIn, signInWithGoogleNative } from './googleNative';
import { Button } from '../ui/Button';
import styles from './Auth.module.css';

/** Google's widest official button. */
const GOOGLE_BUTTON_WIDTH = 320;

interface GoogleSignInProps {
  readonly clientId: string;
  readonly onSignedIn: () => void;
}

/** "Entrar com Google": the official button on the web, Android's account picker inside the app. */
export function GoogleSignIn({ clientId, onSignedIn }: GoogleSignInProps) {
  const { loginWithGoogle } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const signIn = async (idToken: string | undefined) => {
    if (!idToken) {
      setError('O Google não retornou uma credencial. Tente novamente.');
      return;
    }
    try {
      await loginWithGoogle(idToken);
      onSignedIn();
    } catch (failure) {
      setError(errorMessage(failure, 'Não foi possível entrar com o Google.'));
    }
  };

  const signInNatively = async () => {
    try {
      await signIn(await signInWithGoogleNative(clientId));
    } catch {
      setError('Não foi possível entrar com o Google.');
    }
  };

  return (
    <div className={styles.google}>
      {isNativeGoogleSignIn ? (
        <Button variant="secondary" onClick={() => void signInNatively()}>
          Entrar com Google
        </Button>
      ) : (
        <GoogleOAuthProvider clientId={clientId}>
          <GoogleLogin
            onSuccess={({ credential }) => void signIn(credential)}
            onError={() => {
              setError('Não foi possível entrar com o Google.');
            }}
            theme="filled_black"
            size="large"
            shape="rectangular"
            text="signin_with"
            width={GOOGLE_BUTTON_WIDTH}
          />
        </GoogleOAuthProvider>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
