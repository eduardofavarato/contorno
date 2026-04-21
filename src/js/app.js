async function init() {
  const resp = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
  worldTopo = await resp.json();

  const inData = new Set(
    topojson.feature(worldTopo, worldTopo.objects.countries)
            .features.map(f => +f.id)
  );
  pool = Object.entries(DB)
    .filter(([id]) => inData.has(+id))
    .map(([id, d]) => ({ id: +id, pt: d.pt, a: d.a }));

  document.getElementById('loading').style.display = 'none';
  showScreen('home');
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'home') mobileShowStep1?.();
}

function confirmQuit() {
  if (confirm('Deseja sair? Seu progresso será perdido.')) {
    if (isOnlineMode) disconnectOnline();
    else showScreen('home');
  }
}
