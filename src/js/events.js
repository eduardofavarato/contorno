// Level picker — Modo Perguntas
document.querySelectorAll('.btn-level').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-level').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedLevel = +btn.dataset.level;
  });
});

// Level picker — Modo Disputa
document.querySelectorAll('.btn-level-duel').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-level-duel').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDuelLevel = +btn.dataset.level;
  });
});

// Level picker — Modo Localizar
document.querySelectorAll('.btn-level-localizar').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-level-localizar').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedLocalizarLevel = +btn.dataset.level;
  });
});

// Continent picker
document.querySelectorAll('.btn-continent').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-continent').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedContinent = btn.dataset.continent;
  });
});

// Home
document.getElementById('btn-play').addEventListener('click', startGame);
document.getElementById('btn-duel').addEventListener('click', startDuel);
document.getElementById('btn-duel-online').addEventListener('click', startOnlineDuel);
document.getElementById('btn-continent').addEventListener('click', startContinentMode);
document.getElementById('btn-free').addEventListener('click', startFreeMode);
document.getElementById('btn-localizar').addEventListener('click', startLocalizarMode);

// Modo Perguntas
document.getElementById('btn-submit').addEventListener('click', submitQ);
document.getElementById('btn-giveup').addEventListener('click', giveUpQ);
document.getElementById('ans').addEventListener('keydown', e => { if (e.key === 'Enter') submitQ(); });
document.getElementById('g-logo').addEventListener('click', confirmQuit);
document.getElementById('btn-quit').addEventListener('click', confirmQuit);
document.getElementById('btn-zoom-in').addEventListener('click',  () => zoomBy(gSvgSel, gZoom, 1.5));
document.getElementById('btn-zoom-out').addEventListener('click', () => zoomBy(gSvgSel, gZoom, 1 / 1.5));
document.getElementById('btn-locate').addEventListener('click', () => {
  const q = gs.qs?.[gs.idx];
  if (!q) return;
  if (!gs.answered) paintQ(q.id, 'var(--gold)');
  zoomToCountry(q.id);
});

// Resultados
document.getElementById('btn-again').addEventListener('click', () => { if (gs.restartFn) gs.restartFn(); });
document.getElementById('btn-home').addEventListener('click',  () => showScreen('home'));

// Modo Disputa
document.getElementById('d-submit').addEventListener('click', () => isOnlineMode ? submitOnline() : duelSubmit());
document.getElementById('d-giveup').addEventListener('click', () => isOnlineMode ? giveUpOnline() : duelGiveUp());
document.getElementById('d-ans').addEventListener('keydown', e => { if (e.key === 'Enter') isOnlineMode ? submitOnline() : duelSubmit(); });
document.getElementById('d-logo').addEventListener('click', confirmQuit);
document.getElementById('d-quit').addEventListener('click', confirmQuit);
document.getElementById('d-zoom-in').addEventListener('click',  () => zoomBy(dSvgSel, dZoom, 1.5));
document.getElementById('d-zoom-out').addEventListener('click', () => zoomBy(dSvgSel, dZoom, 1 / 1.5));
document.getElementById('d-btn-locate').addEventListener('click', () => {
  if (isOnlineMode) {
    if (!onlineCurrentCountryId) return;
    if (!onlineAnswered) paintD(onlineCurrentCountryId, 'var(--gold)');
    zoomToCountryDuel(onlineCurrentCountryId);
  } else {
    const q = duelCurrentQ();
    if (!q) return;
    if (!ds.answered) paintD(q.id, 'var(--gold)');
    zoomToCountryDuel(q.id);
  }
});
document.getElementById('d-btn-again').addEventListener('click', () => isOnlineMode ? disconnectOnline() : startDuel());
document.getElementById('d-btn-home').addEventListener('click', () => isOnlineMode ? disconnectOnline() : showScreen('home'));

// Lobby Online
document.getElementById('ol-btn-create').addEventListener('click', createRoom);
document.getElementById('ol-btn-join').addEventListener('click', joinRoom);
document.getElementById('ol-btn-back').addEventListener('click', () => { if (onlineSocket) { onlineSocket.close(); onlineSocket = null; } showScreen('home'); });
document.getElementById('ol-join-input').addEventListener('keydown', e => { if (e.key === 'Enter') joinRoom(); });
document.querySelectorAll('.btn-level-online').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-level-online').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  });
});

// Modo Localizar
document.getElementById('l-logo').addEventListener('click', confirmQuit);
document.getElementById('l-quit').addEventListener('click', confirmQuit);
document.getElementById('l-giveup').addEventListener('click', localizarGiveUp);
document.getElementById('l-zoom-in').addEventListener('click',  () => zoomBy(lSvgSel, lZoom, 1.5));
document.getElementById('l-zoom-out').addEventListener('click', () => zoomBy(lSvgSel, lZoom, 1 / 1.5));

// Modo Livre
document.getElementById('f-submit').addEventListener('click', submitFree);
document.getElementById('f-ans').addEventListener('keydown', e => { if (e.key === 'Enter') submitFree(); });
document.getElementById('f-logo').addEventListener('click', confirmQuit);
document.getElementById('f-quit').addEventListener('click', confirmQuit);
document.getElementById('f-zoom-in').addEventListener('click',  () => zoomBy(fSvgSel, fZoom, 1.5));
document.getElementById('f-zoom-out').addEventListener('click', () => zoomBy(fSvgSel, fZoom, 1 / 1.5));

// Resize
let resizeTO;
let lastResizeW = 0;
window.addEventListener('resize', () => {
  clearTimeout(resizeTO);
  resizeTO = setTimeout(() => {
    const currentW = window.innerWidth;
    if (currentW === lastResizeW) return;
    lastResizeW = currentW;

    if (document.getElementById('game').classList.contains('active')) {
      const q = gs.qs?.[gs.idx];
      buildQMap();
      gs.results?.forEach(r => paintQ(r.id, r.pts > 0 ? 'var(--green)' : 'var(--red)'));
      if (q && !gs.answered) {
        paintQ(q.id, 'var(--gold)');
        if (gs.perQuestionZoom) zoomToCountry(q.id);
        else zoomToContinent();
      }
    } else if (document.getElementById('localizar').classList.contains('active')) {
      buildLocalizarMap();
      ls.results?.forEach(r => paintL(r.id, r.pts > 0 ? 'var(--green)' : 'var(--red)'));
    } else if (document.getElementById('free').classList.contains('active')) {
      buildFreeMap();
    } else if (document.getElementById('duel').classList.contains('active')) {
      if (isOnlineMode) {
        buildDuelMap();
        onlineResults?.forEach(r => paintD(r.id, r.pts > 0 ? 'var(--green)' : 'var(--red)'));
        if (onlineCurrentCountryId) { paintD(onlineCurrentCountryId, 'var(--gold)'); zoomToCountryDuel(onlineCurrentCountryId); }
      } else {
        const q = duelCurrentQ();
        buildDuelMap();
        ds.results?.forEach(r => paintD(r.id, r.pts > 0 ? 'var(--green)' : 'var(--red)'));
        if (q && !ds.answered) { paintD(q.id, 'var(--gold)'); zoomToCountryDuel(q.id); }
      }
    }
  }, 250);
});

init();
