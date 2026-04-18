function startFreeMode() {
  fs = { answered: {}, selected: null, correct: 0, total: 0 };
  showScreen('free');
  requestAnimationFrame(() => requestAnimationFrame(() => { buildFreeMap(); resetFreeInput(); }));
}

function buildFreeMap() {
  const { zoom, svgSel } = buildMapInto('free-svg', 'free-map-area', {
    prefix:   'fc',
    fillFn:   id => {
      const a = fs.answered[id];
      if (!a) return 'var(--land)';
      return a.correct ? 'var(--green)' : 'var(--red)';
    },
    onCountryClick: freeSelectCountry,
    onCountryHover: freeTooltipHandler,
  });
  fZoom = zoom; fSvgSel = svgSel;

  if (fs.selected !== null) {
    d3.select(`#fc${fs.selected}`).attr('fill', 'var(--gold)');
  }
}

function freeSelectCountry(id) {
  if (fs.answered[id]) return;
  if (!DB[id]) return;

  if (fs.selected !== null && !fs.answered[fs.selected]) {
    d3.select(`#fc${fs.selected}`).attr('fill', 'var(--land)');
  }

  fs.selected = id;
  d3.select(`#fc${id}`).attr('fill', 'var(--gold)').raise();

  const inp = document.getElementById('f-ans');
  inp.disabled    = false;
  inp.value       = '';
  inp.className   = 'ans-input';
  inp.placeholder = 'Digite o nome do país…';
  document.getElementById('f-submit').disabled = false;
  document.getElementById('f-hint').textContent = 'País selecionado — qual é o nome dele?';
  setFeedback('f-feedback', '');
  inp.focus();
}

function submitFree() {
  const id = fs.selected;
  if (id === null) return;

  const inp = document.getElementById('f-ans');
  const raw = inp.value.trim();
  const val = norm(raw);
  if (!val) return;

  const country   = DB[id];
  const isCorrect = country.a.some(a => norm(a) === val);

  fs.total++;
  fs.answered[id] = { correct: isCorrect, attempt: raw, name: country.pt };
  fs.selected     = null;

  if (isCorrect) {
    fs.correct++;
    d3.select(`#fc${id}`).attr('fill', 'var(--green)');
    inp.value = country.pt; inp.disabled = true; inp.className = 'ans-input ok';
    setFeedback('f-feedback', `✓ Correto! ${country.pt}`, 'ok');
  } else {
    d3.select(`#fc${id}`).attr('fill', 'var(--red)');
    inp.value = country.pt; inp.disabled = true; inp.className = 'ans-input bad';
    setFeedback('f-feedback', `✗ Era: ${country.pt}`, 'bad');
  }

  document.getElementById('f-submit').disabled = true;
  document.getElementById('f-hint').textContent = 'Clique em outro país para continuar';
  document.getElementById('f-correct').textContent = fs.correct;
  document.getElementById('f-total').textContent   = fs.total;
}

function freeTooltipHandler(id, event, phase) {
  const tooltip = document.getElementById('f-tooltip');
  const ans     = fs.answered[id];

  if (phase === 'out' || !ans) { tooltip.style.opacity = '0'; return; }

  if (phase === 'over') {
    if (ans.correct) {
      tooltip.innerHTML = `<div class="tt-ok">✓ Correto</div><div class="tt-name">${ans.name}</div>`;
    } else {
      tooltip.innerHTML =
        `<div class="tt-bad">✗ Incorreto</div>` +
        `<div class="tt-name">${ans.name}</div>` +
        `<div class="tt-attempt">Tentativa: "${ans.attempt}"</div>`;
    }
    tooltip.style.opacity = '1';
  }

  if (phase === 'move' || phase === 'over') {
    const rect = document.getElementById('free-map-area').getBoundingClientRect();
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

function resetFreeInput() {
  const inp = document.getElementById('f-ans');
  inp.disabled = true; inp.value = ''; inp.className = 'ans-input';
  inp.placeholder = 'Selecione um país no mapa…';
  document.getElementById('f-submit').disabled = true;
  document.getElementById('f-hint').textContent = 'Clique em um país no mapa para adivinhar';
  setFeedback('f-feedback', '');
}
