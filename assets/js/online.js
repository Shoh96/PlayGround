import {
  action,
  buildQuestions,
  currentScreen,
  esc,
  icon,
  input,
  navigate,
  registerScreen,
  save,
  sfx,
  toast,
  PLAYER_COLORS
} from './core.js';
import {
  beginOnlineSession,
  finishOnlineGame,
  setOnlineBridge,
  setOnlineQuestion,
  setOnlineReveal
} from './game.js';

let online = null;
let onlineError = '';
let onlineName = save.profile.name || 'Pilgrim';
let roomInput = '';
let hostTimer = 0;
let connectTimer = 0;
let refreshTimer = 0;

setOnlineBridge({
  submitAnswer: choice => submitAnswer(choice),
  nextRound: () => hostNextRound(),
  rematch: () => startOnlineMatch(),
  leave: () => closeOnline(true)
});

function codeAlphabet() {
  return 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
}

function generateCode() {
  return Array.from({ length: 4 }, () => codeAlphabet()[Math.floor(Math.random() * codeAlphabet().length)]).join('');
}

function hostPeerId(code) {
  return `lumen-bt-2026-${code.toLowerCase()}`;
}

function safeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ').slice(0, 18);
}

function refreshOnline() {
  window.clearTimeout(refreshTimer);
  refreshTimer = window.setTimeout(() => {
    if (currentScreen() === 'online') navigate('online', { replace: true });
  }, 30);
}

function statusClass() {
  if (!online) return 'wait';
  if (online.status === 'error') return 'err';
  if (online.status === 'lobby') return 'on';
  return 'wait';
}

function connectionStatus() {
  if (!online) return '';
  if (online.status === 'error') return onlineError || 'Connection failed.';
  if (online.role === 'host') {
    if (online.status === 'connecting') return 'Opening a private room…';
    return online.players.length > 1 ? 'Room open. Players can join with the code.' : 'Waiting for the first rival to join.';
  }
  if (online.status === 'connecting') return 'Joining the room…';
  return 'Connected. Waiting for the host to begin.';
}

function gameScores() {
  return online?.game?.records || {};
}

function playersWithScores() {
  if (!online) return [];
  if (!online.game) return online.players.map((p, i) => ({ ...p, color: p.color || PLAYER_COLORS[i % PLAYER_COLORS.length], score: 0 }));
  return online.players.map((p, i) => {
    const rec = online.game.records[p.id] || {};
    return { ...p, color: p.color || PLAYER_COLORS[i % PLAYER_COLORS.length], score: rec.score || 0, correct: rec.correct || 0, answered: rec.answered || 0 };
  });
}

function broadcast(message) {
  if (!online) return;
  for (const conn of online.conns.values()) {
    if (conn?.open) {
      try { conn.send(message); } catch (error) { console.warn(error); }
    }
  }
}

function lobbyMessage() {
  return {
    type: 'lobby',
    code: online.code,
    players: playersWithScores(),
    rounds: online.rounds
  };
}

function broadcastLobby() {
  if (!online) return;
  broadcast(lobbyMessage());
  refreshOnline();
}

function createHost() {
  const name = safeName(onlineName);
  if (!name) {
    toast('Enter your name first.');
    return;
  }
  onlineError = '';
  closeOnline(true, true);
  online = {
    role: 'host',
    name,
    code: '',
    peer: null,
    conns: new Map(),
    players: [],
    rounds: 8,
    status: 'connecting',
    game: null
  };
  save.profile.name = save.profile.name || name;
  createHostPeer(0);
  rebuildOnline();
}

function createHostPeer(attempt) {
  if (!online || online.role !== 'host') return;
  const PeerCtor = window.Peer;
  if (!PeerCtor) {
    online.status = 'error';
    onlineError = 'Online play is unavailable because the PeerJS library did not load.';
    rebuildOnline();
    return;
  }
  const code = generateCode();
  online.code = code;
  online.status = 'connecting';
  let peer;
  try {
    peer = new PeerCtor(hostPeerId(code));
  } catch (error) {
    online.status = 'error';
    onlineError = 'Could not start a room. Check your connection and try again.';
    rebuildOnline();
    return;
  }
  online.peer = peer;
  let opened = false;
  const timer = window.setTimeout(() => {
    if (!opened && online?.peer === peer) {
      online.status = 'error';
      onlineError = 'The room did not open in time. Please try again.';
      try { peer.destroy(); } catch {}
      rebuildOnline();
    }
  }, 14000);

  peer.on('open', id => {
    opened = true;
    window.clearTimeout(timer);
    if (!online || online.peer !== peer) return;
    online.status = 'lobby';
    online.players = [{ id: 'host', name: online.name, color: PLAYER_COLORS[0], score: 0, correct: 0, answered: 0 }];
    rebuildOnline();
    sfx.play('join');
  });

  peer.on('connection', conn => hostConnection(conn));

  peer.on('error', error => {
    window.clearTimeout(timer);
    if (!online || online.peer !== peer) return;
    if (error?.type === 'unavailable-id' && attempt < 3) {
      try { peer.destroy(); } catch {}
      createHostPeer(attempt + 1);
      return;
    }
    online.status = 'error';
    onlineError = error?.type === 'peer-unavailable'
      ? 'That room could not be found. Check the code and try again.'
      : 'The room connection failed. Check your internet connection and try again.';
    testConnectionError(error);
    rebuildOnline();
  });

  peer.on('disconnected', () => {
    if (!online || online.peer !== peer) return;
    onlineError = 'Connection interrupted. Attempting to reconnect…';
    refreshOnline();
    try { peer.reconnect(); } catch {}
  });
}

function testConnectionError(error) {
  if (error?.type) console.warn('Lumen online error:', error.type);
}

function hostConnection(conn) {
  if (!online || online.role !== 'host') return;
  conn.on('open', () => {
    online.conns.set(conn.peer, conn);
  });
  conn.on('data', message => {
    if (!online || !message || typeof message !== 'object') return;
    if (message.type === 'hello') {
      if (online.players.length >= 8) {
        try { conn.send({ type: 'error', message: 'This room is full.' }); } catch {}
        return;
      }
      if (online.game) {
        if (online.players.some(p => p.id === conn.peer)) {
          try { conn.send(lobbyMessage()); } catch {}
          return;
        }
        try { conn.send({ type: 'error', message: 'This round has already started.' }); } catch {}
        return;
      }
      if (!online.conns.has(conn.peer)) online.conns.set(conn.peer, conn);
      const existing = online.players.find(p => p.id === conn.peer);
      if (!existing) {
        online.players.push({
          id: conn.peer,
          name: safeName(message.name) || 'Friend',
          color: PLAYER_COLORS[online.players.length % PLAYER_COLORS.length],
          score: 0,
          correct: 0,
          answered: 0
        });
        toast(`${safeName(message.name) || 'A friend'} joined the room.`);
        sfx.play('join');
      }
      try { conn.send(lobbyMessage()); } catch {}
      broadcastLobby();
      return;
    }
    if (message.type === 'answer') {
      hostReceiveAnswer(conn.peer, Number(message.choice));
      return;
    }
    if (message.type === 'bye') {
      removeGuest(conn.peer);
    }
  });
  conn.on('close', () => {
    removeGuest(conn.peer);
  });
  conn.on('error', error => {
    console.warn('Peer connection error', error?.type || error);
  });
}

function removeGuest(id) {
  if (!online) return;
  online.conns.delete(id);
  if (!online.game) {
    const player = online.players.find(p => p.id === id);
    online.players = online.players.filter(p => p.id !== id);
    if (player) toast(`${player.name} left the room.`);
    broadcastLobby();
  } else {
    broadcastLobby();
  }
}

function joinRoom() {
  const name = safeName(onlineName);
  const code = roomInput.trim().toUpperCase();
  if (!name) {
    toast('Enter your name first.');
    return;
  }
  if (code.length !== 4) {
    toast('Enter the four-letter room code.');
    return;
  }
  onlineError = '';
  closeOnline(true, true);
  online = {
    role: 'guest',
    name,
    code,
    peer: null,
    conn: null,
    conns: new Map(),
    players: [],
    rounds: 8,
    status: 'connecting',
    game: null
  };
  const PeerCtor = window.Peer;
  if (!PeerCtor) {
    online.status = 'error';
    onlineError = 'Online play is unavailable because the PeerJS library did not load.';
    rebuildOnline();
    return;
  }
  let peer;
  try {
    peer = new PeerCtor();
  } catch {
    online.status = 'error';
    onlineError = 'Could not reach the room. Check your network and try again.';
    rebuildOnline();
    return;
  }
  online.peer = peer;
  connectTimer = window.setTimeout(() => {
    if (online?.peer === peer && online.status === 'connecting') {
      online.status = 'error';
      onlineError = 'Could not reach the room. Check the code and your connection.';
      try { peer.destroy(); } catch {}
      rebuildOnline();
    }
  }, 15000);

  peer.on('open', () => {
    const conn = peer.connect(hostPeerId(code), { reliable: true });
    online.conn = conn;
    conn.on('open', () => {
      window.clearTimeout(connectTimer);
      if (!online || online.conn !== conn) return;
      online.status = 'lobby';
      try { conn.send({ type: 'hello', name }); } catch {}
      rebuildOnline();
      sfx.play('join');
    });
    conn.on('data', message => guestMessage(message));
    conn.on('error', () => {
      if (!online) return;
      online.status = 'error';
      onlineError = 'The room connection dropped.';
      rebuildOnline();
    });
    conn.on('close', () => {
      if (!online) return;
      if (online.game && online.peer) {
        toast('The host disconnected.');
      }
      closeOnline(true, true);
      online = null;
      onlineError = 'The host closed the room.';
      rebuildOnline();
    });
  });

  peer.on('error', error => {
    window.clearTimeout(connectTimer);
    if (!online || online.peer !== peer) return;
    online.status = 'error';
    onlineError = error?.type === 'peer-unavailable'
      ? 'No room found with that code. Ask the host to check it.'
      : 'Could not connect. Check your internet connection and try again.';
    testConnectionError(error);
    rebuildOnline();
  });

  peer.on('disconnected', () => {
    if (!online || online.peer !== peer) return;
    onlineError = 'Connection interrupted. Attempting to reconnect…';
    refreshOnline();
    try { peer.reconnect(); } catch {}
  });

  rebuildOnline();
}

function guestMessage(message) {
  if (!online || !message || typeof message !== 'object') return;
  if (message.type === 'lobby') {
    online.players = Array.isArray(message.players) ? message.players : online.players;
    online.rounds = Number(message.rounds) || online.rounds;
    online.code = message.code || online.code;
    if (online.status !== 'playing') online.status = 'lobby';
    refreshOnline();
    return;
  }
  if (message.type === 'error') {
    online.status = 'error';
    onlineError = message.message || 'The host could not accept the connection.';
    rebuildOnline();
    return;
  }
  if (message.type === 'start') {
    online.status = 'playing';
    online.players = Array.isArray(message.players) ? message.players : online.players;
    return;
  }
  if (message.type === 'question') {
    online.status = 'playing';
    const players = Array.isArray(message.players) ? message.players : online.players;
    const myId = online.peer?.id;
    const me = players.find(p => p.id === myId) || {};
    const data = {
      role: 'guest',
      code: online.code,
      players,
      total: message.total,
      index: message.index,
      question: message.question,
      deadline: message.deadline,
      score: me.score || 0
    };
    const current = document.getElementById('main');
    const inQuiz = currentScreen() === 'quiz';
    if (!inQuiz || !current) beginOnlineSession(data);
    else setOnlineQuestion(data);
    return;
  }
  if (message.type === 'reveal') {
    const myId = online.peer?.id;
    const mine = message.results?.[myId] || { choice: null, correct: false, earned: 0 };
    const q = message.question || {};
    setOnlineReveal({
      answer: message.answer,
      selected: mine.choice ?? null,
      earned: mine.earned || 0,
      players: message.players || online.players,
      question: q,
      score: mine.score || 0,
      correct: mine.correctCount || 0,
      streak: mine.streak || 0,
      bestStreak: mine.bestStreak || 0,
      review: {
        qid: q.id,
        q: q.q,
        options: q.options,
        choice: mine.choice ?? null,
        answer: message.answer,
        correct: Boolean(mine.correct),
        earned: mine.earned || 0,
        ref: q.ref,
        verse: q.verse,
        note: q.note,
        cat: q.cat,
        skipped: false
      }
    });
    return;
  }
  if (message.type === 'end') {
    const players = Array.isArray(message.players) ? message.players : online.players;
    const myId = online.peer?.id;
    const me = players.find(p => p.id === myId) || {};
    const top = Math.max(...players.map(p => p.score || 0), 0);
    finishOnlineGame({
      me,
      players,
      total: message.total,
      code: online.code,
      role: 'guest',
      won: (me.score || 0) === top && top > 0,
      xp: Math.max(10, Math.round((me.score || 0) / 12)),
      categories: message.categories || []
    });
    online.status = 'lobby';
    return;
  }
  if (message.type === 'closed') {
    closeOnline(true, true);
    online = null;
    onlineError = 'The host closed the room.';
    rebuildOnline();
  }
}

function submitAnswer(choice) {
  if (!online || !online.game || online.game.phase !== 'question') return;
  if (online.role === 'host') {
    hostReceiveAnswer('host', choice);
    return;
  }
  try {
    online.conn?.send({ type: 'answer', choice });
  } catch {
    toast('Could not send your answer. Check the connection.');
  }
}

function hostReceiveAnswer(playerId, choice) {
  if (!online || !online.game || online.game.phase !== 'question') return;
  const game = online.game;
  if (game.answers.has(playerId)) return;
  const remaining = Math.max(0, game.deadline - Date.now());
  game.answers.set(playerId, { choice, remaining });
  const activeIds = new Set(online.players.map(p => p.id));
  const answeredActive = [...game.answers.keys()].filter(id => activeIds.has(id));
  if (answeredActive.length >= online.players.length) {
    if (game.finishTimer) window.clearTimeout(game.finishTimer);
    game.finishTimer = window.setTimeout(() => hostFinishRound(), 500);
  }
}

function startOnlineMatch() {
  if (!online || online.role !== 'host') return;
  if (!online.game) {
    if (online.players.length < 2) {
      toast('At least one friend needs to join before you begin.');
      return;
    }
  } else if (online.players.length < 2) {
    toast('At least one friend needs to join before you begin.');
    return;
  }
  const rounds = Math.max(4, Number(online.rounds) || 8);
  const questions = buildQuestions({ cat: 'all', levels: [1, 2, 3, 4], count: rounds });
  if (!questions.length) {
    toast('No questions available.');
    return;
  }
  const records = {};
  for (const player of online.players) {
    records[player.id] = { score: 0, correct: 0, answered: 0, streak: 0, bestStreak: 0 };
  }
  online.game = {
    questions,
    index: 0,
    phase: 'question',
    answers: new Map(),
    records,
    deadline: 0,
    finishTimer: 0,
    autoTimer: 0,
    categories: [...new Set(questions.map(q => q.cat))]
  };
  online.status = 'playing';
  broadcast({
    type: 'start',
    players: playersWithScores(),
    total: questions.length,
    rounds: online.rounds,
    code: online.code
  });
  beginHostRound(0);
}

function beginHostRound(index) {
  if (!online || !online.game) return;
  const game = online.game;
  const q = game.questions[index];
  if (!q) {
    hostEndGame();
    return;
  }
  game.index = index;
  game.phase = 'question';
  game.answers = new Map();
  game.finishTimer = 0;
  game.autoTimer = 0;
  game.deadline = Date.now() + 20000;
  const players = playersWithScores();
  const publicQuestion = { id: q.id, cat: q.cat, level: q.level, q: q.q, options: q.options };
  broadcast({
    type: 'question',
    index,
    total: game.questions.length,
    question: publicQuestion,
    deadline: game.deadline,
    players
  });
  beginOnlineSession({
    role: 'host',
    code: online.code,
    players,
    total: game.questions.length,
    index,
    question: publicQuestion,
    deadline: game.deadline,
    score: game.records.host?.score || 0
  });
  hostTimer = window.setTimeout(() => {
    if (online?.game?.phase === 'question' && online.game.index === index) hostFinishRound();
  }, 20200);
}

function hostFinishRound() {
  if (!online || !online.game || online.game.phase !== 'question') return;
  const game = online.game;
  game.phase = 'reveal';
  window.clearTimeout(hostTimer);
  if (game.finishTimer) window.clearTimeout(game.finishTimer);
  const q = game.questions[game.index];
  const results = {};
  for (const player of online.players) {
    const answer = game.answers.get(player.id) || { choice: null, remaining: 0 };
    const correct = answer.choice === q.answer;
    const record = game.records[player.id];
    const speed = correct ? Math.round(50 * (answer.remaining / 20000)) : 0;
    const streakBonus = correct ? 20 * Math.min(record.streak, 5) : 0;
    const earned = correct ? (LEVEL_POINTS[q.level] || 100) + speed + streakBonus : 0;
    record.score += earned;
    record.answered += 1;
    if (correct) {
      record.correct += 1;
      record.streak += 1;
      record.bestStreak = Math.max(record.bestStreak, record.streak);
    } else {
      record.streak = 0;
    }
    results[player.id] = {
      choice: answer.choice,
      correct,
      earned,
      score: record.score,
      correctCount: record.correct,
      answered: record.answered,
      streak: record.streak,
      bestStreak: record.bestStreak
    };
  }
  const players = playersWithScores();
  const fullQuestion = { ...q };
  broadcast({
    type: 'reveal',
    answer: q.answer,
    question: fullQuestion,
    players,
    results
  });
  const mine = results.host || { choice: null, correct: false, earned: 0, score: 0, correctCount: 0, streak: 0, bestStreak: 0 };
  setOnlineReveal({
    answer: q.answer,
    selected: mine.choice ?? null,
    earned: mine.earned,
    players,
    question: fullQuestion,
    score: mine.score,
    correct: mine.correctCount,
    streak: mine.streak,
    bestStreak: mine.bestStreak,
    review: {
      qid: q.id,
      q: q.q,
      options: q.options,
      choice: mine.choice ?? null,
      answer: q.answer,
      correct: Boolean(mine.correct),
      earned: mine.earned,
      ref: q.ref,
      verse: q.verse,
      note: q.note,
      cat: q.cat,
      skipped: false
    }
  });
  game.autoTimer = window.setTimeout(() => hostNextRound(), 4300);
}

const LEVEL_POINTS = { 1: 100, 2: 150, 3: 200, 4: 250 };

function hostNextRound() {
  if (!online?.game || online.game.phase !== 'reveal') return;
  const game = online.game;
  window.clearTimeout(game.autoTimer);
  game.autoTimer = 0;
  const next = game.index + 1;
  if (next >= game.questions.length) {
    hostEndGame();
    return;
  }
  beginHostRound(next);
}

function hostEndGame() {
  if (!online?.game) return;
  const game = online.game;
  game.phase = 'end';
  const players = playersWithScores().sort((a, b) => b.score - a.score || b.correct - a.correct);
  const top = Math.max(...players.map(p => p.score), 0);
  broadcast({
    type: 'end',
    players,
    total: game.questions.length,
    categories: game.categories,
    code: online.code
  });
  const me = players.find(p => p.id === 'host') || { score: 0, correct: 0, bestStreak: 0 };
  finishOnlineGame({
    me,
    players,
    total: game.questions.length,
    code: online.code,
    role: 'host',
    won: me.score === top && top > 0,
    xp: Math.max(10, Math.round((me.score || 0) / 12)),
    categories: game.categories
  });
  online.status = 'lobby';
}

function closeOnline(destroyPeer = true, silent = false) {
  window.clearTimeout(hostTimer);
  window.clearTimeout(connectTimer);
  window.clearTimeout(refreshTimer);
  if (online) {
    if (!silent) {
      broadcast({ type: 'closed' });
      for (const conn of online.conns.values()) {
        try { conn.close(); } catch {}
      }
    }
    if (destroyPeer && online.peer) {
      try { online.peer.destroy(); } catch {}
    }
    online = null;
  }
}

function rebuildOnline() {
  if (currentScreen() === 'online') navigate('online', { replace: true });
}

function playerRows(players) {
  return players.map((p, i) => `<div class="lobby-player">
    <span class="player-dot" style="color:${p.color || PLAYER_COLORS[i % PLAYER_COLORS.length]}"></span>
    <span>${esc(p.name)}</span>
    ${p.id === 'host' ? '<span class="host-tag">Host</span>' : `<span class="host-tag" style="color:var(--faint)">Ready</span>`}
  </div>`).join('');
}

function onlineSetupMarkup() {
  return `<div class="online-grid">
    <div class="online-card">
      <div class="online-icon">${icon('wifi')}</div>
      <div class="online-title">Create a room</div>
      <div class="online-desc">Open a private room and share the four-letter code with your friends.</div>
      <label class="field-label">Your name</label>
      <input class="input" id="online-name" type="text" maxlength="18" value="${esc(onlineName)}" data-input="online-name" autocomplete="nickname">
      <button class="btn btn-primary btn-block mt-2" type="button" data-action="online-create">${icon('globe')}Create room</button>
      ${online?.role === 'host' && online.status === 'connecting' ? `<div class="status-line"><span class="status-dot wait"></span>${esc(connectionStatus())}</div>` : ''}
    </div>
    <div class="online-card">
      <div class="online-icon">${icon('key')}</div>
      <div class="online-title">Join a room</div>
      <div class="online-desc">Enter the code from your host. You will appear in their lobby instantly.</div>
      <label class="field-label">Room code</label>
      <input class="input" id="room-code" type="text" maxlength="4" value="${esc(roomInput)}" placeholder="ABCD" data-input="room-code" autocapitalize="characters" autocomplete="off" style="letter-spacing:.2em;text-transform:uppercase">
      <button class="btn btn-gold btn-block mt-2" type="button" data-action="online-join">${icon('arrow')}Join room</button>
      ${online?.role === 'guest' && online.status === 'connecting' ? `<div class="status-line"><span class="status-dot wait"></span>${esc(connectionStatus())}</div>` : ''}
    </div>
  </div>
  ${online?.status === 'error' ? `<div class="status-line"><span class="status-dot err"></span>${esc(onlineError)}</div>` : ''}
  <div class="online-note mt-3">Online rooms use secure peer-to-peer WebRTC through the PeerJS cloud broker. The host keeps the scores and sends each question live. If your network blocks WebRTC, use Pass & Play instead.</div>`;
}

function onlineLobbyMarkup() {
  const isHost = online.role === 'host';
  const players = playersWithScores();
  return `<div class="mp-grid">
    <div>
      <div class="panel">
        <div class="panel-title">${isHost ? 'Your room is open' : 'You joined the room'}</div>
        <div class="panel-sub">${isHost ? 'Share this code. The room holds up to eight players.' : 'The host will begin when everyone is ready.'}</div>
        <div class="room-code-box">
          <span class="room-code">${esc(online.code)}</span>
          <button class="btn btn-soft btn-sm" type="button" data-action="online-copy">${icon('copy')}Copy</button>
        </div>
        <div class="status-line"><span class="status-dot ${statusClass()}"></span>${esc(connectionStatus())}</div>
        <div class="lobby-players mt-2">
          ${players.length ? playerRows(players) : `<div class="lobby-empty">No players yet.</div>`}
        </div>
        <div class="avatars mt-2">${players.map((p, i) => `<span class="mini-avatar" style="background:${p.color || PLAYER_COLORS[i % PLAYER_COLORS.length]}">${esc((p.name || '?').slice(0, 1).toUpperCase())}</span>`).join('')}</div>
        <div class="lobby-actions">
          ${isHost ? `<button class="btn btn-primary" type="button" data-action="online-start" ${players.length < 2 ? 'disabled' : ''}>${icon('play')}Start match</button>` : `<button class="btn btn-soft" type="button" disabled>${icon('timer')}Waiting for host</button>`}
          <button class="btn btn-ghost" type="button" data-action="online-close">${icon('x')}Close room</button>
        </div>
      </div>
      <div class="panel">
        <div class="panel-title">How this room works</div>
        <div class="summary-line"><span>Questions</span><strong>${online.rounds} shared questions</strong></div>
        <div class="summary-line"><span>Round timer</span><strong>20 seconds</strong></div>
        <div class="summary-line"><span>Scoring</span><strong>Correct + speed bonus + streak</strong></div>
        <div class="summary-line"><span>Connection</span><strong>Peer-to-peer WebRTC</strong></div>
        <div class="online-note">Scores are kept by the host. Keep this tab open while the round is live.</div>
      </div>
    </div>
    <aside class="panel summary-card">
      <div class="panel-title">${isHost ? 'Round settings' : 'Room details'}</div>
      <div class="panel-sub">${isHost ? 'Set the length before the first question.' : 'Everything is controlled by the host.'}</div>
      <div class="summary-line"><span>Players</span><strong>${players.length} / 8</strong></div>
      <div class="summary-line"><span>Host</span><strong>${esc(online.players.find(p => p.id === 'host')?.name || 'Host')}</strong></div>
      <span class="field-label mt-3" style="display:block">Questions</span>
      ${isHost ? `<div class="segmented">${[6, 8, 12].map(n => `<button class="${online.rounds === n ? 'active' : ''}" type="button" data-action="online-rounds" data-value="${n}">${n}</button>`).join('')}</div>` : `<div class="chip gold">${online.rounds} questions</div>`}
      <div class="online-note mt-3">${isHost ? 'Invite at least one friend, then start the match. Everyone receives the same question at the same moment.' : 'You will be taken to the quiz automatically when the host starts.'}</div>
      <div class="status-line"><span class="status-dot ${statusClass()}"></span>${isHost ? 'Host connection active' : 'Guest connection active'}</div>
    </aside>
  </div>`;
}

function renderOnline() {
  return `<div class="screen"><div class="shell mid">
    <div class="page-top">
      <div class="page-head"><div class="eyebrow">Online rivals</div><h1 class="page-title">A room of <em>friends</em></h1><p class="page-sub">Create a private room or enter a code. The host sends every question live and keeps the scores in sync.</p></div>
      <button class="btn btn-ghost btn-sm" type="button" data-nav="multiplayer">${icon('arrow')}Back</button>
    </div>
    ${online?.status === 'lobby' ? onlineLobbyMarkup() : onlineSetupMarkup()}
  </div></div>`;
}

action('online-create', () => {
  const field = document.getElementById('online-name');
  if (field) onlineName = field.value;
  createHost();
});

action('online-join', () => {
  const nameField = document.getElementById('online-name');
  const codeField = document.getElementById('room-code');
  if (nameField) onlineName = nameField.value;
  if (codeField) roomInput = codeField.value;
  joinRoom();
});

input('online-name', value => {
  onlineName = value;
});

input('room-code', value => {
  roomInput = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const field = document.getElementById('room-code');
  if (field && field.value !== roomInput) field.value = roomInput;
});

action('online-copy', async () => {
  if (!online) return;
  try {
    await navigator.clipboard.writeText(online.code);
    toast('Room code copied.');
    sfx.play('click');
  } catch {
    toast(`Room code: ${online.code}`);
  }
});

action('online-rounds', ({ value }) => {
  if (!online || online.role !== 'host') return;
  online.rounds = Number(value);
  broadcastLobby();
});

action('online-start', () => {
  startOnlineMatch();
});

action('online-close', () => {
  closeOnline(true);
  onlineError = '';
  navigate('online', { replace: true });
});

action('online-cancel', () => {
  closeOnline(true);
  online = null;
  navigate('multiplayer');
});

registerScreen('online', {
  render: renderOnline,
  leave: to => {
    if (online && !['quiz', 'results', 'online'].includes(to)) {
      closeOnline(true);
    }
  }
});

window.addEventListener('beforeunload', () => {
  if (online) {
    broadcast({ type: 'closed' });
    try { online.peer?.destroy(); } catch {}
  }
});
