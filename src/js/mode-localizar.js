function paintL(id, color) { d3.select(`#l${id}`).attr('fill', color).raise(); }

function lTooltipHandler(id, event, phase) {
  const tooltip = document.getElementById('l-tooltip');
  const r = ls.results?.find(r => r.id === id);

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
    const rect = document.getElementById('localizar-map-area').getBoundingClientRect();
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

function buildLocalizarMap() {
  const { zoom, svgSel } = buildMapInto('localizar-svg', 'localizar-map-area', {
    prefix: 'l',
    onCountryClick: localizarClickCountry,
    onCountryHover: lTooltipHandler,
  });
  lZoom = zoom; lSvgSel = svgSel;
}

function startLocalizarMode() {
  const levelNames = ['', 'Fácil', 'Médio', 'Difícil'];
  const modeName = `Modo Localizar · ${levelNames[selectedLocalizarLevel]}`;
  ls = {
    qs: shuffle(poolForLevel(selectedLocalizarLevel)).slice(0, TOTAL_Q),
    idx: 0, score: 0, results: [],
    wrongs: 0, qPts: MAX_PTS, answered: false,
    total: TOTAL_Q, modeName,
  };
  document.querySelector('#localizar .mode-badge').textContent = modeName;
  showScreen('localizar');
  requestAnimationFrame(() => requestAnimationFrame(() => { buildLocalizarMap(); localizarAsk(); }));
}

function localizarAsk() {
  const q = ls.qs[ls.idx];
  ls.wrongs = 0; ls.qPts = MAX_PTS; ls.answered = false;

  document.getElementById('l-country-name').textContent = q.pt;
  document.getElementById('l-q-num').textContent  = `${ls.idx + 1}/${ls.total}`;
  document.getElementById('l-score').textContent  = fmt(ls.score);
  document.getElementById('l-pts').textContent    = fmt(ls.qPts);
  document.getElementById('l-wrongs').textContent = '';
  setFeedback('l-feedback', '');
  document.getElementById('l-giveup').disabled = false;
  document.getElementById('l-prog').style.width = `${(ls.idx / ls.total) * 100}%`;

  ls.results.forEach(r => paintL(r.id, r.pts > 0 ? 'var(--green)' : 'var(--red)'));

  if (lSvgSel && lZoom)
    lSvgSel.transition().duration(600).call(lZoom.transform, d3.zoomIdentity);
}

function localizarClickCountry(id) {
  if (ls.answered) return;
  if (ls.results.some(r => r.id === id)) return;

  const q = ls.qs[ls.idx];
  if (id === q.id) localizarCorrect(q);
  else localizarWrong(q, id);
}

function localizarCorrect(q) {
  const pts = Math.max(0, ls.qPts);
  ls.score += pts; ls.answered = true;
  ls.results.push({ id: q.id, country: q.pt, wrongs: ls.wrongs, pts, gaveUp: false });

  paintL(q.id, 'var(--green)');
  zoomToCountryLocalizar(q.id);
  document.getElementById('l-giveup').disabled = true;
  document.getElementById('l-score').textContent = fmt(ls.score);

  const msg = ls.wrongs === 0
    ? `✓ Correto! +${fmt(pts)} pontos`
    : `✓ Correto! +${fmt(pts)} pontos (${ls.wrongs} erro${ls.wrongs > 1 ? 's' : ''})`;
  setFeedback('l-feedback', msg, 'ok');
  setTimeout(localizarAdvance, 1600);
}

function localizarWrong(q, clickedId) {
  ls.wrongs++;
  ls.qPts = Math.max(0, MAX_PTS - ls.wrongs * PENALTY);

  paintL(clickedId, 'var(--red)');

  if (ls.wrongs >= MAX_TRIES) {
    ls.answered = true;
    ls.results.push({ id: q.id, country: q.pt, wrongs: ls.wrongs, pts: 0, gaveUp: false, failed: true });
    document.getElementById('l-giveup').disabled = true;
    setFeedback('l-feedback', `✗ Era: ${q.pt}. Tentativas esgotadas.`, 'bad');
    setTimeout(() => {
      paintL(clickedId, 'var(--land)');
      paintL(q.id, 'var(--red)');
      zoomToCountryLocalizar(q.id);
    }, 650);
    setTimeout(localizarAdvance, 2500);
    return;
  }

  const snap = ls;
  setTimeout(() => {
    if (ls === snap && !snap.answered) paintL(clickedId, 'var(--land)');
  }, 600);

  document.getElementById('l-pts').textContent = fmt(ls.qPts);
  const restantes = MAX_TRIES - ls.wrongs;
  document.getElementById('l-wrongs').textContent =
    `${ls.wrongs} erro${ls.wrongs > 1 ? 's' : ''} · ${restantes} restante${restantes > 1 ? 's' : ''}`;
  setFeedback('l-feedback',
    `✗ Não é esse! ${restantes} tentativa${restantes > 1 ? 's' : ''} restante${restantes > 1 ? 's' : ''}.`, 'bad');
}

function localizarGiveUp() {
  if (ls.answered) return;
  const q = ls.qs[ls.idx];
  ls.answered = true;
  ls.results.push({ id: q.id, country: q.pt, wrongs: ls.wrongs, pts: 0, gaveUp: true });

  paintL(q.id, 'var(--gold)');
  zoomToCountryLocalizar(q.id);
  document.getElementById('l-giveup').disabled = true;
  setFeedback('l-feedback', `Revelado: ${q.pt}. +0 pontos`, 'bad');
  setTimeout(localizarAdvance, 2500);
}

function localizarAdvance() {
  ls.idx++;
  if (ls.idx >= ls.total) localizarEndGame();
  else localizarAsk();
}

function localizarEndGame() {
  showScreen('results');
  document.getElementById('l-prog').style.width = '100%';
  const total = ls.score;
  const pct   = total / (ls.total * MAX_PTS);
  document.getElementById('r-score').textContent    = fmt(total);
  document.getElementById('r-score-of').textContent = `de ${fmt(ls.total * MAX_PTS)} pontos possíveis`;
  document.getElementById('r-mode-lbl').textContent = `Pontuação Final — ${ls.modeName}`;

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
  ls.results.forEach((r, i) => {
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

  gs = { restartFn: startLocalizarMode };
}
