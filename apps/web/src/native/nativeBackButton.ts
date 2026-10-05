import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { runBackAction } from './backStack';

/**
 * In the Android app the system back button walks back through the screens instead of closing the app;
 * on the home screen, where nothing is registered, it exits. Does nothing in a regular browser.
 */
export function initNativeBackButton(): void {
  if (!Capacitor.isNativePlatform()) return;
  void App.addListener('backButton', () => {
    if (!runBackAction()) void App.exitApp();
  });
}
