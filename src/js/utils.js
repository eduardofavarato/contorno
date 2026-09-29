function fmt(n) { return n.toLocaleString('pt-BR'); }

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function setFeedback(elId, msg, cls) {
  const el = document.getElementById(elId);
  el.textContent = msg;
  el.className   = 'feedback' + (cls ? ` ${cls}` : '');
}
