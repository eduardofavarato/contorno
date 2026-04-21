function mobileShowStep1() {
  const s1 = document.getElementById('m-step-1');
  const s2 = document.getElementById('m-step-2');
  if (!s1 || !s2) return;
  s1.style.display = '';
  s2.style.display = 'none';
}

function mobileShowStep2(mode) {
  document.getElementById('m-step-1').style.display = 'none';
  document.getElementById('m-step-2').style.display = '';
  document.querySelectorAll('.m-config').forEach(el => { el.style.display = 'none'; });
  document.getElementById('mc-' + mode).style.display = '';
}

document.querySelectorAll('.m-mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.mode;
    if (mode === 'livre') { startFreeMode(); return; }
    mobileShowStep2(mode);
  });
});

document.getElementById('m-btn-back').addEventListener('click', mobileShowStep1);
document.getElementById('m-btn-play').addEventListener('click', startGame);
document.getElementById('m-btn-continent').addEventListener('click', startContinentMode);
document.getElementById('m-btn-localizar').addEventListener('click', startLocalizarMode);
document.getElementById('m-btn-duel').addEventListener('click', startDuel);
document.getElementById('m-btn-duel-online').addEventListener('click', startOnlineDuel);
