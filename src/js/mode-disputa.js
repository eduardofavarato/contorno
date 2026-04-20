function paintD(id, color) { d3.select(`#d${id}`).attr('fill', color).raise(); }

function duelTooltipHandler(id, event, phase) {
  const tooltip = document.getElementById('d-tooltip');
  const r = ds.results?.find(r => r.id === id);
  if (phase === 'out' || !r) { tooltip.style.opacity = '0'; return; }
  if (phase === 'over') {
    const pname = r.player === 0 ? 'Jogador A' : r.player === 1 ? 'Jogador B' : null;
    const pcls  = r.player === 0 ? 'tt-pa' : r.player === 1 ? 'tt-pb' : 'tt-ok';
    const tag = r.stolen
      ? `<div class="${pcls}">🔥 Roubo — ${pname}</div>`
      : r.pts > 0
        ? `<div class="${pcls}">✓ ${pname}</div>`
        : `<div class="tt-bad">✗ Sem ponto</div>`;
    const pts = r.pts > 0 ? `+${fmt(r.pts)} pts` : '0 pts';
    tooltip.innerHTML = `${tag}<div class="tt-name">${r.country}</div><div class="tt-attempt">${pts}</div>`;
    tooltip.style.opacity = '1';
  }
  if (phase === 'move' || phase === 'over') {
    const rect = document.getElementById('duel-map-area').getBoundingClientRect();
    let x = event.clientX - rect.left + 14, y = event.clientY - rect.top - 14;
    const tw = tooltip.offsetWidth || 180, th = tooltip.offsetHeight || 60;
    if (x + tw > rect.width  - 8) x = event.clientX - rect.left - tw - 14;
    if (y + th > rect.height - 8) y = event.clientY - rect.top  - th - 14;
    if (y < 4) y = 4;
    tooltip.style.left = `${x}px`; tooltip.style.top = `${y}px`;
  }
}

function buildDuelMap() {
  const { zoom, svgSel } = buildMapInto('duel-svg', 'duel-map-area', {
    prefix: 'd', onCountryHover: duelTooltipHandler,
  });
  dZoom = zoom; dSvgSel = svgSel;
}

function startDuel() {
  const full = shuffle(poolForLevel(selectedDuelLevel));
  ds = {
    qs:            full.slice(0, DUEL_Q),
    tbPool:        full.slice(DUEL_Q),
    tbIdx:         0,
    idx:           0,
    scores:        [0, 0],
    phase:         'primary',
    primaryPlayer: 0,
    wrongs:        0,
    qPts:          MAX_PTS,
    answered:      false,
    inTiebreaker:  false,
    tbACorrect:    null,
    results:       [],
  };
  showScreen('duel');
  requestAnimationFrame(() => requestAnimationFrame(() => { buildDuelMap(); duelAsk(); }));
}

function duelCurrentQ() {
  return ds.inTiebreaker ? ds.tbPool[ds.tbIdx] : ds.qs[ds.idx];
}

function duelAsk() {
  const q    = duelCurrentQ();
  const pIdx = ds.inTiebreaker
    ? (ds.phase === 'tb-a' ? 0 : 1)
    : (ds.phase === 'steal' ? 1 - ds.primaryPlayer : ds.primaryPlayer);
  const pname = ['Jogador A', 'Jogador B'][pIdx];
  ds.answered = false;

  document.getElementById('d-sa').textContent = fmt(ds.scores[0]);
  document.getElementById('d-sb').textContent = fmt(ds.scores[1]);
  document.getElementById('d-box-a').classList.toggle('active', pIdx === 0);
  document.getElementById('d-box-b').classList.toggle('active', pIdx === 1);

  let activeName, subLabel, ptsLabel;
  if (ds.inTiebreaker) {
    activeName = `🔥 ${pname}`;
    subLabel   = 'Rodada de Fogo';
    ptsLabel   = fmt(MAX_PTS);
    document.getElementById('d-prog').style.width = '100%';
  } else if (ds.phase === 'steal') {
    activeName = `🔥 ${pname}`;
    subLabel   = 'Roubo!';
    ptsLabel   = fmt(STEAL_PTS);
  } else {
    activeName = pname;
    subLabel   = `Pergunta ${ds.idx + 1}/${DUEL_Q}`;
    ptsLabel   = fmt(ds.qPts);
    document.getElementById('d-prog').style.width = `${(ds.idx / DUEL_Q) * 100}%`;
  }
  document.getElementById('d-active-name').textContent = activeName;
  document.getElementById('d-turn').textContent        = subLabel;
  document.getElementById('d-pts').textContent         = ptsLabel;
  const banner = document.querySelector('.duel-active-banner');
  banner.classList.toggle('pa', pIdx === 0);
  banner.classList.toggle('pb', pIdx === 1);

  const inp = document.getElementById('d-ans');
  inp.value = ''; inp.disabled = false; inp.className = 'ans-input';
  inp.placeholder = 'Digite o nome do país…';
  document.getElementById('d-submit').disabled = false;
  document.getElementById('d-giveup').disabled = ds.phase !== 'primary' || ds.inTiebreaker;
  setFeedback('d-feedback', '');

  paintD(q.id, 'var(--gold)');
  zoomToCountryDuel(q.id);
  inp.focus();
}

function duelSubmit() {
  if (ds.answered) return;
  const inp = document.getElementById('d-ans');
  const val = norm(inp.value.trim());
  if (!val) return;
  const q = duelCurrentQ();
  if (q.a.some(a => norm(a) === val)) duelCorrect(q);
  else duelWrong(q);
}

function duelCorrect(q) {
  ds.answered = true;
  const inp = document.getElementById('d-ans');
  inp.disabled = true; inp.className = 'ans-input ok'; inp.value = q.pt;
  document.getElementById('d-submit').disabled = true;
  document.getElementById('d-giveup').disabled = true;

  if (ds.inTiebreaker) {
    if (ds.phase === 'tb-a') {
      ds.tbACorrect = true;
      setFeedback('d-feedback', '✓ Correto! Vez do Jogador B…', 'ok');
      setTimeout(() => duelTbSwitchToB(q), 1500);
    } else {
      paintD(q.id, 'var(--green)');
      if (ds.tbACorrect) {
        setFeedback('d-feedback', '✓ Ambos acertaram! Nova Rodada de Fogo…', 'ok');
        setTimeout(() => duelTbNext(q), 2000);
      } else {
        setFeedback('d-feedback', '✓ Correto! Jogador B vence!', 'ok');
        setTimeout(() => duelEndGame('B'), 2000);
      }
    }
    return;
  }

  const pts  = ds.phase === 'steal' ? STEAL_PTS : Math.max(0, ds.qPts);
  const plyr = ds.phase === 'steal' ? 1 - ds.primaryPlayer : ds.primaryPlayer;
  ds.scores[plyr] += pts;
  document.getElementById(plyr === 0 ? 'd-sa' : 'd-sb').textContent = fmt(ds.scores[plyr]);
  paintD(q.id, 'var(--green)');
  const pname = ['Jogador A', 'Jogador B'][plyr];
  setFeedback('d-feedback',
    ds.phase === 'steal' ? `✓ Roubo de ${pname}! +${fmt(pts)} pts` : `✓ Correto! +${fmt(pts)} pts`,
    'ok');
  ds.results.push({ id: q.id, country: q.pt, pts, player: plyr, stolen: ds.phase === 'steal' });
  setTimeout(duelAdvance, 1600);
}

function duelWrong(q) {
  const inp = document.getElementById('d-ans');
  inp.className = 'ans-input bad'; inp.value = '';

  if (ds.inTiebreaker) {
    ds.answered = true;
    inp.disabled = true;
    document.getElementById('d-submit').disabled = true;
    document.getElementById('d-giveup').disabled = true;
    if (ds.phase === 'tb-a') {
      ds.tbACorrect = false;
      setFeedback('d-feedback', '✗ Incorreto! Vez do Jogador B…', 'bad');
      setTimeout(() => duelTbSwitchToB(q), 1500);
    } else {
      if (!ds.tbACorrect) {
        paintD(q.id, 'var(--red)');
        inp.value = q.pt;
        ds.results.push({ id: q.id, country: q.pt, pts: 0, player: -1, stolen: false });
        setFeedback('d-feedback', `✗ Ambos erraram! Era ${q.pt}. Nova Rodada de Fogo…`, 'bad');
        setTimeout(() => duelTbNext(q, true), 2000);
      } else {
        paintD(q.id, 'var(--red)');
        setFeedback('d-feedback', '✗ Incorreto! Jogador A vence!', 'bad');
        setTimeout(() => duelEndGame('A'), 2000);
      }
    }
    return;
  }

  if (ds.phase === 'steal') {
    ds.answered = true;
    inp.disabled = true;
    document.getElementById('d-submit').disabled = true;
    document.getElementById('d-giveup').disabled = true;
    paintD(q.id, 'var(--red)');
    inp.value = q.pt;
    setFeedback('d-feedback', `✗ Incorreto. Era ${q.pt}. Nenhum ponto nesta pergunta.`, 'bad');
    ds.results.push({ id: q.id, country: q.pt, pts: 0, player: -1, stolen: false });
    setTimeout(duelAdvance, 2000);
    return;
  }

  ds.answered = true;
  inp.disabled = true;
  document.getElementById('d-submit').disabled = true;
  document.getElementById('d-giveup').disabled = true;
  paintD(q.id, 'var(--red)');
  const sname = ['Jogador A', 'Jogador B'][1 - ds.primaryPlayer];
  setFeedback('d-feedback', `✗ Incorreto! ${sname} pode roubar por ${fmt(STEAL_PTS)} pts.`, 'bad');
  setTimeout(duelEnterSteal, 2000);
}

function duelGiveUp() {
  if (ds.answered || ds.phase !== 'primary' || ds.inTiebreaker) return;
  const q = duelCurrentQ();
  ds.answered = true;
  const inp = document.getElementById('d-ans');
  inp.disabled = true;
  document.getElementById('d-submit').disabled = true;
  document.getElementById('d-giveup').disabled = true;
  paintD(q.id, 'var(--red)');
  const sname = ['Jogador A', 'Jogador B'][1 - ds.primaryPlayer];
  setFeedback('d-feedback', `${sname} pode roubar por ${fmt(STEAL_PTS)} pts!`, 'bad');
  setTimeout(duelEnterSteal, 2000);
}

function duelEnterSteal() {
  ds.phase = 'steal'; ds.answered = false;
  duelAsk();
}

function duelAdvance() {
  ds.idx++;
  ds.phase = 'primary';
  ds.primaryPlayer = ds.idx % 2;
  ds.wrongs = 0; ds.qPts = MAX_PTS;
  if (ds.idx >= DUEL_Q) {
    if (ds.scores[0] === ds.scores[1]) duelStartTb();
    else duelEndGame(ds.scores[0] > ds.scores[1] ? 'A' : 'B');
    return;
  }
  duelAsk();
}

function duelStartTb() {
  ds.inTiebreaker = true;
  ds.phase = 'tb-a'; ds.tbACorrect = null;
  if (ds.tbPool.length === 0)
    ds.tbPool = shuffle(pool.filter(c => !ds.qs.some(q => q.id === c.id)));
  ds.tbIdx = 0;
  duelAsk();
}

function duelTbSwitchToB(q) {
  ds.phase = 'tb-b'; ds.answered = false;
  paintD(q.id, 'var(--gold)');
  duelAsk();
}

function duelTbNext(q, bothMissed = false) {
  if (!bothMissed) paintD(q.id, 'var(--land)');
  ds.tbIdx++;
  if (ds.tbIdx >= ds.tbPool.length) {
    ds.tbPool = shuffle(pool.filter(c => !ds.qs.some(qq => qq.id === c.id)));
    ds.tbIdx = 0;
  }
  ds.phase = 'tb-a'; ds.tbACorrect = null;
  duelAsk();
}

function duelEndGame(winner) {
  showScreen('duel-results');
  document.getElementById('dr-sa').textContent = fmt(ds.scores[0]);
  document.getElementById('dr-sb').textContent = fmt(ds.scores[1]);
  const winEl = document.getElementById('d-winner-text');
  winEl.textContent = winner === 'A' ? '🏆 Jogador A vence!' : '🏆 Jogador B vence!';
}
