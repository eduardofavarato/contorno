function paintQ(id, color) { d3.select(`#c${id}`).attr('fill', color).raise(); }

function qTooltipHandler(id, event, phase) {
  const tooltip = document.getElementById('g-tooltip');
  const r = gs.results?.find(r => r.id === id);

  if (phase === 'out' || !r) { tooltip.style.opacity = '0'; return; }

  if (phase === 'over') {
    if (r.pts > 0) {
      const attempt = r.wrongs === 0 ? 'De primeira!' : `${r.wrongs} erro${r.wrongs > 1 ? 's' : ''}`;
      tooltip.innerHTML =
        `<div class="tt-ok">✓ Correto</div>` +
        `<div class="tt-name">${r.country}</div>` +
        `<div class="tt-attempt">${attempt} · +${fmt(r.pts)} pts</div>`;
    } else if (r.gaveUp) {
      tooltip.innerHTML =
        `<div class="tt-bad">✗ Desistiu</div>` +
        `<div class="tt-name">${r.country}</div>`;
    } else {
      tooltip.innerHTML =
        `<div class="tt-bad">✗ Incorreto</div>` +
        `<div class="tt-name">${r.country}</div>` +
        `<div class="tt-attempt">Tentativas esgotadas</div>`;
    }
    tooltip.style.opacity = '1';
  }

  if (phase === 'move' || phase === 'over') {
    const rect = document.getElementById('map-area').getBoundingClientRect();
    let x = event.clientX - rect.left + 14;
    let y = event.clientY - rect.top  - 14;
    const tw = tooltip.offsetWidth  || 180;
    const th = tooltip.offsetHeight || 60;
    if (x + tw > rect.width  - 8) x = event.clientX - rect.left - tw - 14;
    if (y + th > rect.height - 8) y = event.clientY - rect.top  - th - 14;
    if (y < 4) y = 4;
    tooltip.style.left = `${x}px`;
    tooltip.style.top  = `${y}px`;
  }
}

function buildQMap() {
  const { zoom, svgSel } = buildMapInto('world-svg', 'map-area', {
    prefix: 'c',
    onCountryHover: qTooltipHandler,
  });
  gZoom = zoom; gSvgSel = svgSel;
}

function startGame() {
  const levelNames = ['', 'Fácil', 'Médio', 'Difícil'];
  const modeName = `Modo Perguntas · ${levelNames[selectedLevel]}`;
  gs = {
    qs: shuffle(poolForLevel(selectedLevel)).slice(0, TOTAL_Q),
    idx: 0, score: 0, results: [],
    wrongs: 0, qPts: MAX_PTS, answered: false,
    total: TOTAL_Q, modeName, restartFn: startGame, perQuestionZoom: true,
  };
  document.querySelector('#game .mode-badge').textContent = modeName;
  showScreen('game');
  requestAnimationFrame(() => requestAnimationFrame(() => { buildQMap(); askQuestion(); }));
}

function startContinentMode() {
  const cont = CONTINENT_POOLS[selectedContinent];
  const contPool = pool.filter(c => cont.ids.has(c.id));
  const modeName = cont.name;
  gs = {
    qs: shuffle(contPool),
    idx: 0, score: 0, results: [],
    wrongs: 0, qPts: MAX_PTS, answered: false,
    total: contPool.length, modeName, restartFn: startContinentMode,
  };
  document.querySelector('#game .mode-badge').textContent = modeName;
  showScreen('game');
  requestAnimationFrame(() => requestAnimationFrame(() => { buildQMap(); askQuestion(); zoomToContinent(); }));
}

function askQuestion() {
  const q = gs.qs[gs.idx];
  gs.wrongs = 0; gs.qPts = MAX_PTS; gs.answered = false;

  document.getElementById('q-num').textContent    = `${gs.idx + 1}/${gs.total}`;
  document.getElementById('g-score').textContent  = fmt(gs.score);
  document.getElementById('q-pts').textContent    = fmt(gs.qPts);
  document.getElementById('g-wrongs').textContent = '';
  setFeedback('feedback', '');

  const inp = document.getElementById('ans');
  inp.value = ''; inp.disabled = false; inp.className = 'ans-input';
  inp.placeholder = 'Digite o nome do país…';
  document.getElementById('btn-submit').disabled = false;
  document.getElementById('btn-giveup').disabled = false;
  document.getElementById('prog').style.width = `${(gs.idx / gs.total) * 100}%`;

  paintQ(q.id, 'var(--gold)');
  if (gs.perQuestionZoom) zoomToCountry(q.id);
  inp.focus();
}

function submitQ() {
  if (gs.answered) return;
  const inp = document.getElementById('ans');
  const val = norm(inp.value.trim());
  if (!val) return;

  const q = gs.qs[gs.idx];
  if (q.a.some(a => norm(a) === val)) correctQ(q);
  else wrongQ(q);
}

function correctQ(q) {
  const pts = Math.max(0, gs.qPts);
  gs.score += pts; gs.answered = true;
  gs.results.push({ id: q.id, country: q.pt, wrongs: gs.wrongs, pts, gaveUp: false });

  paintQ(q.id, 'var(--green)');
  const inp = document.getElementById('ans');
  inp.value = q.pt; inp.disabled = true; inp.className = 'ans-input ok';
  document.getElementById('btn-submit').disabled = true;
  document.getElementById('btn-giveup').disabled = true;
  document.getElementById('g-score').textContent = fmt(gs.score);

  const msg = gs.wrongs === 0
    ? `✓ Correto! +${fmt(pts)} pontos`
    : `✓ Correto! +${fmt(pts)} pontos (${gs.wrongs} erro${gs.wrongs > 1 ? 's' : ''})`;
  setFeedback('feedback', msg, 'ok');
  setTimeout(advanceQ, 1600);
}

function wrongQ(q) {
  gs.wrongs++;
  gs.qPts = Math.max(0, MAX_PTS - gs.wrongs * PENALTY);

  const inp = document.getElementById('ans');
  inp.className = 'ans-input bad';
  inp.value = '';

  paintQ(q.id, 'var(--red)');

  if (gs.wrongs >= MAX_TRIES) {
    gs.answered = true;
    gs.results.push({ id: q.id, country: q.pt, wrongs: gs.wrongs, pts: 0, gaveUp: false, failed: true });
    inp.value    = q.pt;
    inp.disabled = true;
    inp.className = 'ans-input bad';
    document.getElementById('btn-submit').disabled = true;
    document.getElementById('btn-giveup').disabled = true;
    setFeedback('feedback', `✗ Era: ${q.pt}. Tentativas esgotadas.`, 'bad');
    setTimeout(advanceQ, 2000);
    return;
  }

  const snap = gs;
  setTimeout(() => {
    if (gs === snap && !snap.answered) { inp.className = 'ans-input'; inp.focus(); paintQ(q.id, 'var(--gold)'); }
  }, 380);

  const restantes = MAX_TRIES - gs.wrongs;
  document.getElementById('q-pts').textContent    = fmt(gs.qPts);
  document.getElementById('g-wrongs').textContent =
    `${gs.wrongs} erro${gs.wrongs > 1 ? 's' : ''} · ${restantes} restante${restantes > 1 ? 's' : ''}`;
  setFeedback('feedback', `✗ Incorreto. ${restantes} tentativa${restantes > 1 ? 's' : ''} restante${restantes > 1 ? 's' : ''}.`, 'bad');
}

function giveUpQ() {
  if (gs.answered) return;
  const q = gs.qs[gs.idx];
  gs.answered = true;
  gs.results.push({ id: q.id, country: q.pt, wrongs: gs.wrongs, pts: 0, gaveUp: true });

  paintQ(q.id, 'var(--red)');
  const inp = document.getElementById('ans');
  inp.value = q.pt; inp.disabled = true; inp.className = 'ans-input bad';
  document.getElementById('btn-submit').disabled = true;
  document.getElementById('btn-giveup').disabled = true;
  setFeedback('feedback', `Era: ${q.pt}. +0 pontos`, 'bad');
  setTimeout(advanceQ, 2000);
}

function advanceQ() {
  gs.idx++;
  if (gs.idx >= gs.total) endGame();
  else askQuestion();
}

function endGame() {
  showScreen('results');
  document.getElementById('prog').style.width = '100%';
  const total = gs.score;
  const pct   = total / (gs.total * MAX_PTS);
  document.getElementById('r-score').textContent    = fmt(total);
  document.getElementById('r-score-of').textContent = `de ${fmt(gs.total * MAX_PTS)} pontos possíveis`;
  document.getElementById('r-mode-lbl').textContent = `Pontuação Final — ${gs.modeName}`;

  let rating, stars;
  if      (pct >= 1.00) { rating = 'Perfeito! Gênio Geográfico'; stars = '⭐⭐⭐⭐⭐'; }
  else if (pct >= 0.90) { rating = 'Excelente!';                 stars = '⭐⭐⭐⭐⭐'; }
  else if (pct >= 0.75) { rating = 'Muito Bom';                  stars = '⭐⭐⭐⭐';  }
  else if (pct >= 0.50) { rating = 'Bom';                        stars = '⭐⭐⭐';   }
  else if (pct >= 0.25) { rating = 'Em Desenvolvimento';         stars = '⭐⭐';    }
  else                  { rating = 'Iniciante';                  stars = '⭐';     }
  document.getElementById('r-rating').textContent = rating;
  document.getElementById('r-stars').textContent  = stars;

  const container = document.getElementById('r-items');
  container.innerHTML = '';
  gs.results.forEach((r, i) => {
    const cls     = r.pts === MAX_PTS ? 'pmax' : r.pts >= 1500 ? 'pgood' : r.pts > 0 ? 'plow' : 'pzero';
    const attempt = r.gaveUp ? 'Desistiu' : r.failed ? 'Tentativas esgotadas' : r.wrongs === 0 ? 'Acertou de primeira!' : `${r.wrongs} erro${r.wrongs > 1 ? 's' : ''}`;
    const div = document.createElement('div');
    div.className = 'r-item';
    div.innerHTML = `
      <div class="r-num">${i + 1}</div>
      <div class="r-info">
        <div class="r-country">${r.country}</div>
        <div class="r-attempt">${attempt}</div>
      </div>
      <div class="r-pts ${cls}">${fmt(r.pts)}</div>`;
    container.appendChild(div);
  });
}
