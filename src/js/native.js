// Android app only (Capacitor): the system back button walks back through the app instead of closing it.
function handleBackButton() {
  const screen = document.querySelector('.screen.active')?.id;
  const inModeConfig = document.getElementById('m-step-2')?.style.display === '';

  if (screen === 'home') {
    if (inModeConfig) mobileShowStep1();
    else window.Capacitor.Plugins.App.exitApp();
  } else if (['game', 'localizar', 'duel', 'free'].includes(screen)) {
    confirmQuit();
  } else if (screen === 'online-lobby') {
    closeOnlineSocket();
    showScreen('home');
  } else if (isOnlineMode) {
    disconnectOnline();
  } else {
    showScreen('home');
  }
}

if (window.Capacitor?.isNativePlatform?.()) {
  window.Capacitor.Plugins.App.addListener('backButton', handleBackButton);
}
