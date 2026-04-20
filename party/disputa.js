// ── Helpers ──────────────────────────────────────────────────
function norm(s) {
  return s.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Country data ──────────────────────────────────────────────
const DB = {
  4:{pt:"Afeganistão",a:["afeganistao","afghanistan"]},8:{pt:"Albânia",a:["albania"]},12:{pt:"Argélia",a:["argelia","algeria"]},
  24:{pt:"Angola",a:["angola"]},31:{pt:"Azerbaijão",a:["azerbaijao","azerbaijan"]},32:{pt:"Argentina",a:["argentina"]},
  36:{pt:"Austrália",a:["australia"]},40:{pt:"Áustria",a:["austria"]},50:{pt:"Bangladesh",a:["bangladesh"]},
  51:{pt:"Armênia",a:["armenia"]},56:{pt:"Bélgica",a:["belgica","belgium","belgique"]},64:{pt:"Butão",a:["butao","bhutan"]},
  68:{pt:"Bolívia",a:["bolivia"]},70:{pt:"Bósnia e Herzegovina",a:["bosnia e herzegovina","bosnia and herzegovina","bosnia","bih"]},
  72:{pt:"Botsuana",a:["botsuana","botswana"]},76:{pt:"Brasil",a:["brasil","brazil"]},
  84:{pt:"Belize",a:["belize"]},100:{pt:"Bulgária",a:["bulgaria"]},104:{pt:"Mianmar",a:["mianmar","myanmar","birmania","burma"]},
  108:{pt:"Burundi",a:["burundi"]},112:{pt:"Bielorrússia",a:["bielorrussia","belarus"]},
  116:{pt:"Camboja",a:["camboja","cambodia"]},120:{pt:"Camarões",a:["camaroes","cameroon","cameroun"]},
  124:{pt:"Canadá",a:["canada"]},140:{pt:"Rep. Centro-Africana",a:["republica centro-africana","republica centroafricana","central african republic","car","rca"]},
  144:{pt:"Sri Lanka",a:["sri lanka","srilanka","ceilao"]},148:{pt:"Chade",a:["chade","chad"]},
  152:{pt:"Chile",a:["chile"]},156:{pt:"China",a:["china","republica popular da china","república popular da china"]},
  158:{pt:"Taiwan",a:["taiwan"]},170:{pt:"Colômbia",a:["colombia"]},
  178:{pt:"Congo",a:["congo","republica do congo","congo brazzaville"]},
  180:{pt:"Rep. Dem. do Congo",a:["republica democratica do congo","rep dem do congo","rdc","congo democratico","drc","zaire","congo dem"]},
  188:{pt:"Costa Rica",a:["costa rica","costarica"]},191:{pt:"Croácia",a:["croacia","croatia"]},
  192:{pt:"Cuba",a:["cuba"]},196:{pt:"Chipre",a:["chipre","cyprus"]},
  203:{pt:"República Tcheca",a:["republica tcheca","tcheca","czech republic","czechia","czech"]},
  204:{pt:"Benin",a:["benin"]},208:{pt:"Dinamarca",a:["dinamarca","denmark"]},
  214:{pt:"República Dominicana",a:["republica dominicana","dominicana","dominican republic"]},
  218:{pt:"Equador",a:["equador","ecuador"]},222:{pt:"El Salvador",a:["el salvador","salvador"]},
  226:{pt:"Guiné Equatorial",a:["guine equatorial","equatorial guinea"]},
  231:{pt:"Etiópia",a:["etiopia","ethiopia"]},232:{pt:"Eritreia",a:["eritreia","eritrea"]},
  233:{pt:"Estônia",a:["estonia"]},242:{pt:"Fiji",a:["fiji"]},
  246:{pt:"Finlândia",a:["finlandia","finland","suomi"]},250:{pt:"França",a:["franca","france"]},
  254:{pt:"Guiana Francesa",a:["guiana francesa","french guiana","guyana francesa"]},
  262:{pt:"Djibuti",a:["djibuti","djibouti"]},266:{pt:"Gabão",a:["gabao","gabon"]},
  268:{pt:"Geórgia",a:["georgia"]},276:{pt:"Alemanha",a:["alemanha","germany","deutschland"]},
  288:{pt:"Gana",a:["gana","ghana"]},300:{pt:"Grécia",a:["grecia","greece"]},
  304:{pt:"Groenlândia",a:["groenlandia","greenland"]},320:{pt:"Guatemala",a:["guatemala"]},
  324:{pt:"Guiné",a:["guine","guinea","guine conacri","guine-conacri"]},
  328:{pt:"Guiana",a:["guiana","guyana","guiana inglesa"]},332:{pt:"Haiti",a:["haiti"]},
  340:{pt:"Honduras",a:["honduras"]},348:{pt:"Hungria",a:["hungria","hungary"]},
  352:{pt:"Islândia",a:["islandia","iceland"]},356:{pt:"Índia",a:["india"]},
  360:{pt:"Indonésia",a:["indonesia"]},364:{pt:"Irã",a:["ira","iran"]},
  368:{pt:"Iraque",a:["iraque","iraq"]},372:{pt:"Irlanda",a:["irlanda","ireland","eire"]},
  376:{pt:"Israel",a:["israel"]},380:{pt:"Itália",a:["italia","italy"]},
  383:{pt:"Kosovo",a:["kosovo"]},384:{pt:"Costa do Marfim",a:["costa do marfim","cote d ivoire","ivory coast"]},
  388:{pt:"Jamaica",a:["jamaica"]},392:{pt:"Japão",a:["japao","japan"]},
  398:{pt:"Cazaquistão",a:["cazaquistao","kazakhstan"]},400:{pt:"Jordânia",a:["jordania","jordan"]},
  404:{pt:"Quênia",a:["quenia","kenya"]},408:{pt:"Coreia do Norte",a:["coreia do norte","north korea","dprk"]},
  410:{pt:"Coreia do Sul",a:["coreia do sul","south korea","coreia"]},414:{pt:"Kuwait",a:["kuwait"]},
  417:{pt:"Quirguistão",a:["quirguistao","kyrgyzstan"]},418:{pt:"Laos",a:["laos"]},
  422:{pt:"Líbano",a:["libano","lebanon"]},426:{pt:"Lesoto",a:["lesoto","lesotho"]},
  428:{pt:"Letônia",a:["letonia","latvia"]},430:{pt:"Libéria",a:["liberia"]},
  434:{pt:"Líbia",a:["libia","libya"]},440:{pt:"Lituânia",a:["lituania","lithuania"]},
  442:{pt:"Luxemburgo",a:["luxemburgo","luxembourg"]},450:{pt:"Madagáscar",a:["madagascar","madagasca"]},
  454:{pt:"Malaui",a:["malaui","malawi"]},458:{pt:"Malásia",a:["malasia","malaysia"]},
  466:{pt:"Mali",a:["mali"]},478:{pt:"Mauritânia",a:["mauritania"]},
  484:{pt:"México",a:["mexico"]},496:{pt:"Mongólia",a:["mongolia"]},
  498:{pt:"Moldávia",a:["moldavia","moldova"]},499:{pt:"Montenegro",a:["montenegro"]},
  504:{pt:"Marrocos",a:["marrocos","morocco"]},508:{pt:"Moçambique",a:["mocambique","mozambique"]},
  512:{pt:"Omã",a:["oma","oman"]},516:{pt:"Namíbia",a:["namibia"]},
  524:{pt:"Nepal",a:["nepal"]},528:{pt:"Países Baixos",a:["paises baixos","holanda","netherlands","holland"]},
  554:{pt:"Nova Zelândia",a:["nova zelandia","new zealand"]},558:{pt:"Nicarágua",a:["nicaragua"]},
  562:{pt:"Níger",a:["niger"]},566:{pt:"Nigéria",a:["nigeria"]},
  578:{pt:"Noruega",a:["noruega","norway","norge"]},586:{pt:"Paquistão",a:["paquistao","pakistan"]},
  591:{pt:"Panamá",a:["panama"]},598:{pt:"Papua Nova Guiné",a:["papua nova guine","papua new guinea","png"]},
  600:{pt:"Paraguai",a:["paraguai","paraguay"]},604:{pt:"Peru",a:["peru"]},
  608:{pt:"Filipinas",a:["filipinas","philippines"]},616:{pt:"Polônia",a:["polonia","poland","polska"]},
  620:{pt:"Portugal",a:["portugal"]},624:{pt:"Guiné-Bissau",a:["guine-bissau","guine bissau","guinea-bissau"]},
  626:{pt:"Timor-Leste",a:["timor-leste","timor leste","timor","east timor"]},
  634:{pt:"Catar",a:["catar","qatar"]},642:{pt:"Romênia",a:["romenia","romania"]},
  643:{pt:"Rússia",a:["russia"]},646:{pt:"Ruanda",a:["ruanda","rwanda"]},
  682:{pt:"Arábia Saudita",a:["arabia saudita","saudi arabia","arabia"]},
  686:{pt:"Senegal",a:["senegal"]},688:{pt:"Sérvia",a:["servia","serbia"]},
  694:{pt:"Serra Leoa",a:["serra leoa","sierra leone"]},703:{pt:"Eslováquia",a:["eslovaquia","slovakia"]},
  704:{pt:"Vietnã",a:["vietna","vietnam","viet nam"]},705:{pt:"Eslovênia",a:["eslovenia","slovenia"]},
  706:{pt:"Somália",a:["somalia"]},710:{pt:"África do Sul",a:["africa do sul","south africa"]},
  716:{pt:"Zimbábue",a:["zimbabue","zimbabwe"]},724:{pt:"Espanha",a:["espanha","spain"]},
  728:{pt:"Sudão do Sul",a:["sudao do sul","south sudan"]},729:{pt:"Sudão",a:["sudao","sudan"]},
  740:{pt:"Suriname",a:["suriname","surinam"]},748:{pt:"Eswatini",a:["eswatini","suazilandia","swaziland"]},
  752:{pt:"Suécia",a:["suecia","sweden","sverige"]},756:{pt:"Suíça",a:["suica","switzerland","suisse"]},
  760:{pt:"Síria",a:["siria","syria"]},762:{pt:"Tajiquistão",a:["tajiquistao","tajikistan"]},
  764:{pt:"Tailândia",a:["tailandia","thailand"]},768:{pt:"Togo",a:["togo"]},
  780:{pt:"Trinidad e Tobago",a:["trinidad e tobago","trinidad and tobago","trinidad"]},
  784:{pt:"Emirados Árabes Unidos",a:["emirados arabes unidos","uae","emirates","eau"]},
  788:{pt:"Tunísia",a:["tunisia"]},792:{pt:"Turquia",a:["turquia","turkey","turkiye"]},
  795:{pt:"Turcomenistão",a:["turcomenistao","turkmenistan"]},800:{pt:"Uganda",a:["uganda"]},
  804:{pt:"Ucrânia",a:["ucrania","ukraine"]},807:{pt:"Macedônia do Norte",a:["macedonia do norte","north macedonia","macedonia"]},
  818:{pt:"Egito",a:["egito","egypt"]},826:{pt:"Reino Unido",a:["reino unido","united kingdom","uk","great britain","inglaterra"]},
  834:{pt:"Tanzânia",a:["tanzania"]},840:{pt:"Estados Unidos",a:["estados unidos","usa","eua","united states","america"]},
  854:{pt:"Burkina Faso",a:["burkina faso","burkina"]},858:{pt:"Uruguai",a:["uruguai","uruguay"]},
  860:{pt:"Uzbequistão",a:["uzbequistao","uzbekistan"]},862:{pt:"Venezuela",a:["venezuela"]},
  887:{pt:"Iêmen",a:["iemen","yemen"]},894:{pt:"Zâmbia",a:["zambia"]},
};

// ── Tiers / pools ─────────────────────────────────────────────
const TIER1 = new Set([76,840,124,484,32,170,152,604,192,858,68,862,276,250,826,380,724,643,528,620,752,756,300,40,56,616,208,818,566,710,404,504,231,800,682,784,376,364,368,792,156,356,392,410,586,360,764,458,36,348]);
const TIER2 = new Set([84,188,214,218,222,320,332,340,558,591,600,740,31,51,70,100,112,191,203,233,246,268,352,372,383,428,440,498,499,578,642,688,703,705,807,12,24,72,120,140,148,180,204,226,232,266,288,324,384,430,434,450,454,466,478,508,516,562,646,686,694,706,716,728,729,768,788,834,854,894,4,400,414,422,634,760,887,50,64,104,116,144,158,262,304,328,398,408,417,418,496,512,524,554,608,626,704,762,795,860]);

const ALL_IDS = Object.keys(DB).map(Number);

function poolForLevel(level) {
  if (level === 1) return ALL_IDS.filter(id => TIER1.has(id)).map(id => ({ id, ...DB[id] }));
  if (level === 2) return ALL_IDS.filter(id => TIER1.has(id) || TIER2.has(id)).map(id => ({ id, ...DB[id] }));
  return ALL_IDS.map(id => ({ id, ...DB[id] }));
}

// ── Constants ─────────────────────────────────────────────────
const MAX_PTS   = 2000;
const STEAL_PTS = 1000;
const DUEL_Q    = 10;

// ── Party server ──────────────────────────────────────────────
export default class DisputaParty {
  constructor(room) {
    this.room = room;
    this.state = {
      phase:         'waiting',
      connections:   {},
      level:         1,
      qs:            [],
      tbPool:        [],
      tbIdx:         0,
      idx:           0,
      scores:        [0, 0],
      gamePhase:     'primary',
      primaryPlayer: 0,
      answered:      false,
      inTiebreaker:  false,
      tbACorrect:    null,
      results:       [],
      qPts:          MAX_PTS,
    };
  }

  broadcast(msg) { this.room.broadcast(JSON.stringify(msg)); }
  send(conn, msg) { conn.send(JSON.stringify(msg)); }

  onConnect(conn) {
    const st = this.state;
    const count = Object.keys(st.connections).length;
    if (count >= 2) { this.send(conn, { type: 'room_full' }); conn.close(); return; }

    const role = count === 0 ? 'a' : 'b';
    st.connections[conn.id] = role;
    this.send(conn, { type: 'assigned', role });

    if (role === 'b') {
      this.broadcast({ type: 'both_connected' });
      setTimeout(() => this.startGame(), 1000);
    }
  }

  onMessage(message, sender) {
    const msg = JSON.parse(message);
    const st  = this.state;

    if (msg.type === 'set_level') {
      if (st.connections[sender.id] === 'a' && st.phase === 'waiting') st.level = msg.level;
      return;
    }

    if (st.phase !== 'in_game' || st.answered) return;

    const senderRole   = st.connections[sender.id];
    const senderIdx    = senderRole === 'a' ? 0 : 1;
    const activePlayer = this.getActivePlayer();
    if (senderIdx !== activePlayer) return;

    if (msg.type === 'answer')   this.handleAnswer(msg.value);
    if (msg.type === 'give_up')  this.handleGiveUp();
  }

  onClose(conn) {
    delete this.state.connections[conn.id];
    if (this.state.phase === 'in_game') {
      this.broadcast({ type: 'opponent_left' });
      this.state.phase = 'abandoned';
    }
  }

  getActivePlayer() {
    const st = this.state;
    if (st.inTiebreaker) return st.gamePhase === 'tb-a' ? 0 : 1;
    if (st.gamePhase === 'steal') return 1 - st.primaryPlayer;
    return st.primaryPlayer;
  }

  currentQ() {
    const st = this.state;
    return st.inTiebreaker ? st.tbPool[st.tbIdx] : st.qs[st.idx];
  }

  startGame() {
    const st = this.state;
    st.phase = 'in_game';
    const full = shuffle(poolForLevel(st.level));
    st.qs    = full.slice(0, DUEL_Q);
    st.tbPool = full.slice(DUEL_Q);
    st.tbIdx  = 0; st.idx = 0;
    st.scores = [0, 0]; st.gamePhase = 'primary'; st.primaryPlayer = 0;
    st.inTiebreaker = false; st.results = [];
    this.sendQuestion();
  }

  sendQuestion() {
    const st = this.state;
    st.answered = false; st.qPts = MAX_PTS;
    const q = this.currentQ();
    const activePlayer = this.getActivePlayer();

    let subLabel;
    if (st.inTiebreaker)         subLabel = 'Rodada de Fogo';
    else if (st.gamePhase === 'steal') subLabel = 'Roubo!';
    else                         subLabel = `Pergunta ${st.idx + 1}/${DUEL_Q}`;

    this.broadcast({
      type: 'question',
      countryId: q.id,
      activePlayer,
      gamePhase: st.gamePhase,
      idx: st.idx,
      scores: [...st.scores],
      inTiebreaker: st.inTiebreaker,
      qPts: st.qPts,
      subLabel,
      results: st.results,
    });
  }

  handleAnswer(value) {
    const q       = this.currentQ();
    const correct = (DB[q.id]?.a || []).some(a => norm(a) === norm(value));
    if (correct) this.onCorrect(q);
    else         this.onWrong(q);
  }

  handleGiveUp() {
    const st = this.state;
    if (st.gamePhase !== 'primary' || st.inTiebreaker) return;
    st.answered = true;
    const q = this.currentQ();
    this.broadcast({
      type: 'answer_result', correct: false,
      countryId: q.id, primaryFailed: true, gaveUp: true,
      stealer: 1 - st.primaryPlayer, scores: [...st.scores],
    });
    setTimeout(() => this.enterSteal(), 2000);
  }

  onCorrect(q) {
    const st = this.state;
    st.answered = true;

    if (st.inTiebreaker) {
      if (st.gamePhase === 'tb-a') {
        st.tbACorrect = true;
        this.broadcast({ type: 'tb_result', correct: true, phase: 'tb-a', countryId: q.id });
        setTimeout(() => this.tbSwitchToB(q), 1500);
      } else {
        if (st.tbACorrect) {
          this.broadcast({ type: 'tb_result', correct: true, phase: 'tb-b', bothCorrect: true, countryId: q.id });
          setTimeout(() => this.tbNext(q, false), 2000);
        } else {
          this.broadcast({ type: 'tb_result', correct: true, phase: 'tb-b', winner: 1, countryId: q.id });
          setTimeout(() => this.endGame(), 2000);
        }
      }
      return;
    }

    const pts    = st.gamePhase === 'steal' ? STEAL_PTS : Math.max(0, st.qPts);
    const scorer = st.gamePhase === 'steal' ? 1 - st.primaryPlayer : st.primaryPlayer;
    st.scores[scorer] += pts;
    const result = { id: q.id, country: DB[q.id]?.pt, pts, player: scorer, stolen: st.gamePhase === 'steal' };
    st.results.push(result);
    this.broadcast({
      type: 'answer_result', correct: true,
      countryId: q.id, pts, scorer, stolen: st.gamePhase === 'steal',
      scores: [...st.scores], result,
    });
    setTimeout(() => this.advance(), 1600);
  }

  onWrong(q) {
    const st = this.state;
    st.answered = true;

    if (st.inTiebreaker) {
      if (st.gamePhase === 'tb-a') {
        st.tbACorrect = false;
        this.broadcast({ type: 'tb_result', correct: false, phase: 'tb-a', countryId: q.id });
        setTimeout(() => this.tbSwitchToB(q), 1500);
      } else {
        if (!st.tbACorrect) {
          const result = { id: q.id, country: DB[q.id]?.pt, pts: 0, player: -1, stolen: false };
          st.results.push(result);
          this.broadcast({ type: 'tb_result', correct: false, phase: 'tb-b', bothMissed: true, countryId: q.id, result });
          setTimeout(() => this.tbNext(q, true), 2000);
        } else {
          this.broadcast({ type: 'tb_result', correct: false, phase: 'tb-b', winner: 0, countryId: q.id });
          setTimeout(() => this.endGame(), 2000);
        }
      }
      return;
    }

    if (st.gamePhase === 'steal') {
      const result = { id: q.id, country: DB[q.id]?.pt, pts: 0, player: -1, stolen: false };
      st.results.push(result);
      this.broadcast({
        type: 'answer_result', correct: false,
        countryId: q.id, stealFailed: true, scores: [...st.scores], result,
      });
      setTimeout(() => this.advance(), 2000);
      return;
    }

    this.broadcast({
      type: 'answer_result', correct: false,
      countryId: q.id, primaryFailed: true,
      stealer: 1 - st.primaryPlayer, scores: [...st.scores],
    });
    setTimeout(() => this.enterSteal(), 2000);
  }

  enterSteal() { this.state.gamePhase = 'steal'; this.sendQuestion(); }

  advance() {
    const st = this.state;
    st.idx++; st.gamePhase = 'primary';
    st.primaryPlayer = st.idx % 2; st.qPts = MAX_PTS;
    if (st.idx >= DUEL_Q) {
      if (st.scores[0] === st.scores[1]) this.startTb();
      else this.endGame();
      return;
    }
    this.sendQuestion();
  }

  startTb() {
    const st = this.state;
    st.inTiebreaker = true; st.gamePhase = 'tb-a'; st.tbACorrect = null;
    if (st.tbPool.length === 0) {
      const used = new Set(st.qs.map(q => q.id));
      st.tbPool = shuffle(poolForLevel(st.level).filter(c => !used.has(c.id)));
    }
    st.tbIdx = 0;
    this.broadcast({ type: 'tiebreaker_start' });
    setTimeout(() => this.sendQuestion(), 800);
  }

  tbSwitchToB(q) {
    const st = this.state;
    st.gamePhase = 'tb-b'; st.answered = false;
    this.broadcast({ type: 'tb_switch', countryId: q.id });
    this.sendQuestion();
  }

  tbNext(q, bothMissed) {
    const st = this.state;
    st.tbIdx++;
    if (st.tbIdx >= st.tbPool.length) {
      const used = new Set(st.qs.map(q => q.id));
      st.tbPool = shuffle(poolForLevel(st.level).filter(c => !used.has(c.id)));
      st.tbIdx = 0;
    }
    st.gamePhase = 'tb-a'; st.tbACorrect = null;
    this.sendQuestion();
  }

  endGame() {
    const st = this.state;
    st.phase = 'finished';
    const winner = st.scores[0] > st.scores[1] ? 'A' : st.scores[1] > st.scores[0] ? 'B' : 'tie';
    this.broadcast({ type: 'game_over', winner, scores: [...st.scores] });
  }
}
