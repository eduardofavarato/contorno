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
document.getElementById('btn-continent').addEventListener('click', startContinentMode);
document.getElementById('btn-free').addEventListener('click', startFreeMode);

// Modo Perguntas
document.getElementById('btn-submit').addEventListener('click', submitQ);
document.getElementById('btn-giveup').addEventListener('click', giveUpQ);
document.getElementById('ans').addEventListener('keydown', e => { if (e.key === 'Enter') submitQ(); });
document.getElementById('g-logo').addEventListener('click', confirmQuit);
document.getElementById('btn-quit').addEventListener('click', confirmQuit);
document.getElementById('btn-zoom-in').addEventListener('click',  () => zoomBy(gSvgSel, gZoom, 1.5));
document.getElementById('btn-zoom-out').addEventListener('click', () => zoomBy(gSvgSel, gZoom, 1 / 1.5));

// Resultados
document.getElementById('btn-again').addEventListener('click', () => { if (gs.restartFn) gs.restartFn(); });
document.getElementById('btn-home').addEventListener('click',  () => showScreen('home'));

// Modo Disputa
document.getElementById('d-submit').addEventListener('click', duelSubmit);
document.getElementById('d-giveup').addEventListener('click', duelGiveUp);
document.getElementById('d-ans').addEventListener('keydown', e => { if (e.key === 'Enter') duelSubmit(); });
document.getElementById('d-logo').addEventListener('click', confirmQuit);
document.getElementById('d-quit').addEventListener('click', confirmQuit);
document.getElementById('d-zoom-in').addEventListener('click',  () => zoomBy(dSvgSel, dZoom, 1.5));
document.getElementById('d-zoom-out').addEventListener('click', () => zoomBy(dSvgSel, dZoom, 1 / 1.5));
document.getElementById('d-btn-again').addEventListener('click', startDuel);
document.getElementById('d-btn-home').addEventListener('click', () => showScreen('home'));

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
      if (q && !gs.answered) paintQ(q.id, 'var(--gold)');
    } else if (document.getElementById('free').classList.contains('active')) {
      buildFreeMap();
    } else if (document.getElementById('duel').classList.contains('active')) {
      const q = duelCurrentQ();
      buildDuelMap();
      ds.results?.forEach(r => paintD(r.id, r.pts > 0 ? 'var(--green)' : 'var(--red)'));
      if (q && !ds.answered) paintD(q.id, 'var(--gold)');
    }
  }, 250);
});

init();
