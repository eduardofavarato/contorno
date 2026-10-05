import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';

/**
 * Google's web button refuses to run inside an Android WebView (Google policy), so the app uses Android's
 * Credential Manager. It is initialized with the same web client id, so the server verifies the ID token as usual.
 */
export const isNativeGoogleSignIn = Capacitor.isNativePlatform();

let initializedWith: string | null = null;

export async function signInWithGoogleNative(webClientId: string): Promise<string> {
  if (initializedWith !== webClientId) {
    await SocialLogin.initialize({ google: { webClientId } });
    initializedWith = webClientId;
  }
  // No scopes: the ID token already carries the e-mail and name.
  const { result } = await SocialLogin.login({ provider: 'google', options: {} });
  const idToken = 'idToken' in result ? result.idToken : null;
  if (!idToken) throw new Error('Google sign-in returned no ID token');
  return idToken;
}
