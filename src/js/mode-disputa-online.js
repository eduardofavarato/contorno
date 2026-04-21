let onlineRole              = null;  // 'a' or 'b'
let onlineSocket            = null;
let onlineAnswered          = false;
let onlineActivePlayer      = null;
let onlineResults           = [];
let onlineCurrentCountryId  = null;

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function startOnlineDuel() {
  onlineRole = null; onlineAnswered = false; onlineResults = [];
  document.getElementById('ol-setup').style.display = '';
  document.getElementById('ol-waiting').style.display = 'none';
  document.getElementById('ol-error').textContent = '';
  document.getElementById('ol-join-input').value = '';
  showScreen('online-lobby');
}

async function connectToRoom(roomCode, level, isCreator) {
  if (onlineSocket) { onlineSocket.close(); onlineSocket = null; }
  document.getElementById('ol-error').textContent = '';

  try {
    const { default: PartySocket } = await import('https://esm.sh/partysocket@1');
    onlineSocket = new PartySocket({ host: PARTYKIT_HOST, room: roomCode.toLowerCase() });

    onlineSocket.addEventListener('open', () => {
      if (isCreator) onlineSocket.send(JSON.stringify({ type: 'set_level', level }));
    });
    onlineSocket.addEventListener('message', e => handleOnlineMessage(JSON.parse(e.data)));
    onlineSocket.addEventListener('error', () => {
      document.getElementById('ol-error').textContent = 'Erro de conexão. Tente novamente.';
    });
  } catch (_) {
    document.getElementById('ol-error').textContent = 'Não foi possível conectar.';
  }
}

function createRoom() {
  const level = parseInt(document.querySelector('.btn-level-online.active')?.dataset.level || '1');
  const code  = generateRoomCode();
  document.getElementById('ol-room-code').textContent  = code;
  document.getElementById('ol-waiting-text').textContent = 'Aguardando adversário…';
  document.getElementById('ol-setup').style.display   = 'none';
  document.getElementById('ol-waiting').style.display = '';
  connectToRoom(code, level, true);
}

function joinRoom() {
  const code = document.getElementById('ol-join-input').value.trim().toUpperCase();
  if (!code) { document.getElementById('ol-error').textContent = 'Digite o código da sala.'; return; }
  document.getElementById('ol-error').textContent = 'Conectando…';
  connectToRoom(code, 1, false);
}

function handleOnlineMessage(msg) {
  switch (msg.type) {
    case 'assigned':
      onlineRole = msg.role;
      if (msg.role === 'b') {
        document.getElementById('ol-setup').style.display   = 'none';
        document.getElementById('ol-waiting').style.display = '';
        document.getElementById('ol-waiting-text').textContent = 'Conectado! Aguardando início…';
        document.getElementById('ol-error').textContent = '';
      }
      break;

    case 'both_connected':
      isOnlineMode = true;
      showScreen('duel');
      requestAnimationFrame(() => requestAnimationFrame(buildDuelMap));
      break;

    case 'question':      handleOnlineQuestion(msg);      break;
    case 'answer_result': handleOnlineAnswerResult(msg);  break;
    case 'tb_result':     handleOnlineTbResult(msg);      break;

    case 'tb_switch':
      paintD(msg.countryId, 'var(--gold)');
      break;

    case 'tiebreaker_start':
      setFeedback('d-feedback', '🔥 Rodada de Fogo!', 'ok');
      break;

    case 'game_over':
      handleOnlineGameOver(msg);
      break;

    case 'opponent_left':
      setFeedback('d-feedback', '⚠️ Adversário desconectou!', 'bad');
      setTimeout(disconnectOnline, 3000);
      break;

    case 'room_full':
      document.getElementById('ol-error').textContent = 'Sala cheia! Tente outro código.';
      break;
  }
}

function handleOnlineQuestion(msg) {
  const { countryId, activePlayer, gamePhase, idx, scores, inTiebreaker, qPts, subLabel } = msg;
  onlineActivePlayer     = activePlayer;
  onlineAnswered         = false;
  onlineCurrentCountryId = countryId;

  const myIdx    = onlineRole === 'a' ? 0 : 1;
  const amActive = myIdx === activePlayer;
  const pname    = ['Jogador A', 'Jogador B'][activePlayer];

  document.getElementById('d-sa').textContent = fmt(scores[0]);
  document.getElementById('d-sb').textContent = fmt(scores[1]);
  document.getElementById('d-box-a').classList.toggle('active', activePlayer === 0);
  document.getElementById('d-box-b').classList.toggle('active', activePlayer === 1);

  document.getElementById('d-active-name').textContent = (inTiebreaker || gamePhase === 'steal') ? `🔥 ${pname}` : pname;
  document.getElementById('d-turn').textContent        = subLabel;
  document.getElementById('d-pts').textContent         = fmt(inTiebreaker ? MAX_PTS : qPts);

  if (inTiebreaker) {
    document.getElementById('d-prog').style.width = '100%';
  } else if (gamePhase !== 'steal') {
    document.getElementById('d-prog').style.width = `${(idx / DUEL_Q) * 100}%`;
  }

  const banner = document.querySelector('.duel-active-banner');
  banner.classList.remove('pa', 'pb');
  banner.classList.add(activePlayer === 0 ? 'pa' : 'pb');
  const duelEl = document.getElementById('duel');
  duelEl.classList.remove('pa', 'pb');
  duelEl.classList.add(activePlayer === 0 ? 'pa' : 'pb');

  const inp = document.getElementById('d-ans');
  inp.value = ''; inp.className = 'ans-input';

  if (amActive) {
    inp.disabled = false;
    inp.placeholder = 'Digite o nome do país…';
    document.getElementById('d-submit').disabled = false;
    document.getElementById('d-giveup').disabled = gamePhase !== 'primary' || inTiebreaker;
    inp.focus();
  } else {
    inp.disabled = true;
    inp.placeholder = 'Vez do adversário…';
    document.getElementById('d-submit').disabled = true;
    document.getElementById('d-giveup').disabled = true;
  }

  setFeedback('d-feedback', '');
  paintD(countryId, 'var(--gold)');
  zoomToCountryDuel(countryId);
  const displayName = (inTiebreaker || gamePhase === 'steal') ? `🔥 ${pname}` : pname;
  showTurnToast(displayName, subLabel);
}

function handleOnlineAnswerResult(msg) {
  const { correct, countryId, pts, scorer, stolen, stealFailed, primaryFailed, gaveUp, stealer, scores } = msg;
  onlineAnswered = true;

  document.getElementById('d-sa').textContent = fmt(scores[0]);
  document.getElementById('d-sb').textContent = fmt(scores[1]);
  document.getElementById('d-ans').disabled   = true;
  document.getElementById('d-submit').disabled = true;
  document.getElementById('d-giveup').disabled = true;

  if (correct) {
    if (msg.result) onlineResults.push(msg.result);
    paintD(countryId, 'var(--green)');
    const pname = ['Jogador A', 'Jogador B'][scorer];
    setFeedback('d-feedback',
      stolen ? `✓ Roubo de ${pname}! +${fmt(pts)} pts` : `✓ Correto! +${fmt(pts)} pts`,
      'ok');
  } else if (stealFailed) {
    if (msg.result) onlineResults.push(msg.result);
    paintD(countryId, 'var(--red)');
    const countryName = msg.result?.country || DB[countryId]?.pt;
    setFeedback('d-feedback', `✗ Incorreto. Era ${countryName}. Nenhum ponto nesta pergunta.`, 'bad');
  } else if (primaryFailed) {
    paintD(countryId, 'var(--red)');
    const sname = ['Jogador A', 'Jogador B'][stealer];
    setFeedback('d-feedback',
      gaveUp ? `${sname} pode roubar por ${fmt(STEAL_PTS)} pts!`
             : `✗ Incorreto! ${sname} pode roubar por ${fmt(STEAL_PTS)} pts.`,
      'bad');
  }
}

function handleOnlineTbResult(msg) {
  const { correct, phase, countryId, bothCorrect, bothMissed, winner } = msg;
  onlineAnswered = true;
  document.getElementById('d-ans').disabled    = true;
  document.getElementById('d-submit').disabled = true;
  document.getElementById('d-giveup').disabled = true;

  if (phase === 'tb-a') {
    setFeedback('d-feedback',
      correct ? '✓ Correto! Vez do Jogador B…' : '✗ Incorreto! Vez do Jogador B…',
      correct ? 'ok' : 'bad');
  } else {
    if (bothMissed) {
      if (msg.result) onlineResults.push(msg.result);
      paintD(countryId, 'var(--red)');
      const countryName = msg.result?.country || DB[countryId]?.pt;
      setFeedback('d-feedback', `✗ Ambos erraram! Era ${countryName}. Nova Rodada de Fogo…`, 'bad');
    } else if (bothCorrect) {
      paintD(countryId, 'var(--green)');
      setFeedback('d-feedback', '✓ Ambos acertaram! Nova Rodada de Fogo…', 'ok');
    } else if (winner === 0) {
      paintD(countryId, 'var(--red)');
      setFeedback('d-feedback', '✗ Incorreto! Jogador A vence!', 'bad');
    } else {
      paintD(countryId, 'var(--green)');
      setFeedback('d-feedback', '✓ Correto! Jogador B vence!', 'ok');
    }
  }
}

function handleOnlineGameOver(msg) {
  const { winner, scores } = msg;
  showScreen('duel-results');
  document.getElementById('dr-sa').textContent = fmt(scores[0]);
  document.getElementById('dr-sb').textContent = fmt(scores[1]);
  document.getElementById('d-winner-text').textContent =
    winner === 'A' ? '🏆 Jogador A vence!'
  : winner === 'B' ? '🏆 Jogador B vence!'
  :                  '🤝 Empate!';
}

function submitOnline() {
  if (onlineAnswered) return;
  const myIdx = onlineRole === 'a' ? 0 : 1;
  if (myIdx !== onlineActivePlayer) return;
  const val = document.getElementById('d-ans').value.trim();
  if (!val) return;
  onlineAnswered = true;
  document.getElementById('d-ans').disabled    = true;
  document.getElementById('d-submit').disabled = true;
  document.getElementById('d-giveup').disabled = true;
  onlineSocket.send(JSON.stringify({ type: 'answer', value: val }));
}

function giveUpOnline() {
  if (onlineAnswered) return;
  const myIdx = onlineRole === 'a' ? 0 : 1;
  if (myIdx !== onlineActivePlayer) return;
  onlineAnswered = true;
  document.getElementById('d-giveup').disabled = true;
  onlineSocket.send(JSON.stringify({ type: 'give_up' }));
}

function disconnectOnline() {
  if (onlineSocket) { onlineSocket.close(); onlineSocket = null; }
  isOnlineMode           = false;
  onlineRole             = null;
  onlineCurrentCountryId = null;
  showScreen('home');
}
