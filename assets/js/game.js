import {
  action,
  closeModal,
  categoryFor,
  levelFor,
  shuffle,
  esc,
  icon,
  toast,
  openModal,
  save,
  recordResult,
  stageFor,
  buildQuestions,
  todayQuestions,
  navigate,
  currentScreen,
  sfx,
  confetti,
  getSetting,
  registerScreen,
  PLAYER_COLORS
} from './core.js';
import { QUESTIONS } from './data.js';

let session = null;
let lastResult = null;
let ticker = 0;
let onlineBridge = null;

export function getSession() {
  return session;
}

export function setOnlineBridge(bridge) {
  onlineBridge = bridge;
}

export function clearGameSession() {
  stopTicker();
  session = null;
}

function normalizePlayers(players) {
  return (players || []).map((p, i) => ({
    id: p.id || `p${i + 1}`,
    name: p.name || `Player ${i + 1}`,
    color: p.color || PLAYER_COLORS[i % PLAYER_COLORS.length],
    score: Number(p.score) || 0,
    correct: Number(p.correct) || 0,
    answered: Number(p.answered) || 0,
    bestStreak: Number(p.bestStreak) || 0,
    streak: Number(p.streak) || 0
  }));
}

export function startSolo(config = {}) {
  const count = Number(config.count) || 10;
  let questions = [];
  if (config.mode === 'campaign') {
    const stage = stageFor(config.stage);
    const cats = stage.cats;
    const pool = QUESTIONS.filter(q => cats.includes(q.cat));
    const preferred = shuffle(pool.filter(q => q.level === stage.level));
    const rest = shuffle(pool.filter(q => q.level !== stage.level));
    questions = [...preferred, ...rest].slice(0, stage.count);
  } else if (config.mode === 'daily') {
    questions = todayQuestions(10);
  } else {
    questions = buildQuestions({
      cat: config.cat || 'all',
      levels: config.levels || [1, 2, 3, 4],
      cats: config.cats || null,
      count
    });
  }
  if (!questions.length) {
    toast('No questions match that setup. Try another combination.');
    return;
  }
  const stage = config.mode === 'campaign' ? stageFor(config.stage) : null;
  session = {
    mode: config.mode || 'quick',
    label: config.label || stage?.name || (config.mode === 'daily' ? 'Daily Challenge' : 'Quick Play'),
    config: { ...config },
    stage: stage?.id || null,
    questions,
    index: 0,
    total: questions.length,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    answers: [],
    lifelines: { fifty: 1, hint: 1, skip: 1 },
    timeLimit: 20,
    phase: 'question',
    online: false
  };
  prepareQuestion();
  navigate('quiz');
}

export function startLocalGame(setup = {}) {
  const players = normalizePlayers((setup.players || []).slice(0, 4));
  if (players.length < 2) {
    toast('Add at least two players.');
    return;
  }
  const perPlayer = Math.max(3, Number(setup.rounds) || 4);
  const count = perPlayer * players.length;
  const questions = buildQuestions({
    cat: setup.cat || 'all',
    levels: [1, 2, 3, 4],
    count
  });
  if (!questions.length) {
    toast('No questions available for that setup.');
    return;
  }
  session = {
    mode: 'local',
    label: 'Pass & Play',
    config: { ...setup },
    stage: null,
    questions,
    index: 0,
    total: questions.length,
    score: 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    answers: [],
    players,
    turn: 0,
    perPlayer,
    lifelines: { fifty: 0, hint: 0, skip: 0 },
    timeLimit: 20,
    phase: 'pass',
    online: false
  };
  navigate('quiz');
}

export function beginOnlineSession(data = {}) {
  const role = data.role || 'guest';
  session = {
    mode: 'online',
    label: 'Online Rivals',
    config: {},
    stage: null,
    questions: [],
    index: Number(data.index) || 0,
    total: Number(data.total) || 8,
    question: data.question || null,
    score: Number(data.score) || 0,
    streak: 0,
    bestStreak: 0,
    correct: 0,
    answers: [],
    review: [],
    players: normalizePlayers(data.players),
    selected: null,
    revealed: false,
    correctIndex: null,
    deadline: data.deadline || null,
    phase: data.phase || 'question',
    online: true,
    code: data.code || '',
    role,
    waiting: false,
    timeLimit: Number(data.timeLimit) || 20
  };
  if (currentScreen() !== 'quiz') navigate('quiz');
  else refreshQuiz();
}

export function patchOnlineSession(patch = {}) {
  if (!session || session.mode !== 'online') return;
  Object.assign(session, patch);
  if (patch.players) session.players = normalizePlayers(patch.players);
  refreshQuiz();
}

export function updateOnlineScores(players) {
  if (!session) return;
  session.players = normalizePlayers(players);
  if (currentScreen() === 'quiz') refreshQuiz();
}

export function refreshQuiz() {
  const main = document.getElementById('main');
  if (!main) return;
  main.innerHTML = quizMarkup();
  syncTicker();
}

function prepareQuestion() {
  if (!session) return;
  const q = session.questions[session.index];
  if (!q) return;
  session.selected = null;
  session.revealed = false;
  session.locked = false;
  session.correctIndex = null;
  session.skipped = false;
  session.removed = [];
  session.hintShown = false;
  session.earned = 0;
  session.phase = 'question';
  session.deadline = getSetting('timer') ? Date.now() + session.timeLimit * 1000 : null;
}

function activeQuestion() {
  if (!session) return null;
  if (session.mode === 'online') return session.question;
  return session.questions[session.index] || null;
}

function currentPlayer() {
  return session?.players?.[session.turn] || null;
}

function quizMarkup() {
  if (!session) {
    return `<div class="screen"><div class="shell narrow center"><div class="empty-state">No game in progress. <button class="link-btn" data-nav="home">Return home</button></div></div></div>`;
  }
  if (session.mode === 'local' && session.phase === 'pass') return passMarkup();
  const q = activeQuestion();
  if (!q) {
    return `<div class="screen"><div class="quiz-shell"><div class="empty-state">Question unavailable. <button class="link-btn" data-action="quiz-exit">Leave game</button></div></div></div>`;
  }
  const cat = categoryFor(q.cat);
  const level = levelFor(q.level);
  const answered = session.revealed;
  const optionHtml = q.options.map((option, i) => {
    const letter = String.fromCharCode(65 + i);
    let cls = 'option';
    let mark = '';
    if (session.revealed) {
      if (i === session.correctIndex) {
        cls += ' correct';
        mark = icon('check');
      } else if (i === session.selected) {
        cls += ' wrong';
        mark = icon('x');
      } else {
        cls += ' dimmed';
      }
    } else if (session.selected === i) {
      cls += ' selected';
    }
    if (session.removed?.includes(i)) cls += ' dimmed';
    const disabled = session.revealed || session.locked || session.removed?.includes(i) || session.waiting;
    return `<button class="${cls}" type="button" data-action="quiz-answer" data-value="${i}" ${disabled ? 'disabled' : ''}>
      <span class="option-letter">${letter}</span>
      <span class="opt-text">${esc(option)}</span>
      <span class="opt-mark">${mark}</span>
    </button>`;
  }).join('');

  const progress = session.total ? ((session.index + (session.revealed ? 1 : 0)) / session.total) * 100 : 0;
  const timer = timerMarkup();
  const feedback = feedbackMarkup(q);
  const side = sideMarkup(cat, q);

  return `<div class="screen"><div class="quiz-shell">
    <div class="quiz-top">
      <button class="btn btn-ghost btn-sm" type="button" data-action="quiz-quit" title="Leave quiz">${icon('x')}<span class="nowrap">Quit</span></button>
      <div class="quiz-top-left">
        <div class="quiz-progress-wrap">
          <div class="quiz-progress-meta"><span>${esc(session.label)}</span><span>${session.index + 1} / ${session.total}</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${Math.min(100, progress)}%"></div></div>
        </div>
      </div>
      <div class="quiz-top-right">
        <div class="score-pill"><span class="sp-label">Score</span><span class="sp-value">${session.score}</span></div>
        ${timer}
      </div>
    </div>
    <div class="quiz-grid">
      <section class="question-card" aria-live="polite">
        <div class="q-meta">
          <div class="q-cat-art"><img src="${cat.icon}" alt="" loading="lazy"></div>
          <div>
            <div class="q-cat-name">${esc(cat.short)}</div>
            <div class="q-cat-sub">${esc(cat.testament === 'ALL' ? 'Whole Bible' : cat.testament === 'OT' ? 'Old Testament' : 'New Testament')} · ${esc(level.label)}</div>
          </div>
          <div class="q-meta-right">
            <span class="chip" style="color:${level.color};border-color:${level.color}44">${esc(level.name)}</span>
            ${session.mode === 'online' ? `<span class="chip blue">Room ${esc(session.code)}</span>` : ''}
          </div>
        </div>
        <h1 class="question-text">${esc(q.q)}</h1>
        <div class="options" id="quiz-options">${optionHtml}</div>
        ${feedback}
      </section>
      ${side}
    </div>
  </div></div>`;
}

function timerMarkup() {
  if (session.mode === 'local' && session.phase === 'pass') return '';
  if (!session.online && !getSetting('timer')) {
    return `<div class="timer-ring" id="quiz-timer" aria-label="Timer off"><div class="timer-num">∞</div></div>`;
  }
  return `<div class="timer-ring" id="quiz-timer" aria-label="Time remaining">
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle class="timer-track" cx="32" cy="32" r="27"></circle>
      <circle class="timer-bar" id="quiz-timer-bar" cx="32" cy="32" r="27" stroke-dasharray="169.65" stroke-dashoffset="0"></circle>
    </svg>
    <div class="timer-num" id="quiz-timer-num">${session.timeLimit}</div>
  </div>`;
}

function feedbackMarkup(q) {
  if (session.mode === 'online' && session.selected !== null && !session.revealed) {
    return `<div class="feedback"><div class="feedback-head">${icon('check')}Answer locked</div><div class="feedback-note">Waiting for the other players to answer…</div></div>`;
  }
  if (!session.revealed) return '';
  const isCorrect = session.selected === q.answer;
  const skipped = session.skipped;
  const cls = skipped ? '' : isCorrect ? 'correct' : 'wrong';
  const head = skipped ? 'Question skipped' : isCorrect ? 'Correct' : 'Not quite';
  const points = session.earned ? `<span class="points-pop">+${session.earned}</span>` : '';
  const nextLabel = session.mode === 'local'
    ? (session.index + 1 >= session.total ? 'See final scores' : 'Next player')
    : session.mode === 'online'
      ? (session.index + 1 >= session.total ? 'Final results' : 'Next question')
      : (session.index + 1 >= session.total ? 'See results' : 'Next question');
  let nextButton = '';
  if (session.mode === 'online') {
    if (session.role === 'host') nextButton = `<button class="btn btn-primary btn-sm" type="button" data-action="quiz-next">Next question ${icon('arrow')}</button>`;
    else nextButton = `<span class="chip gold">Waiting for host…</span>`;
  } else {
    nextButton = `<button class="btn btn-primary btn-sm" type="button" data-action="quiz-next">${nextLabel} ${icon('arrow')}</button>`;
  }
  return `<div class="feedback ${cls}">
    <div class="feedback-head">${icon(skipped ? 'flag' : isCorrect ? 'check' : 'x')}${head}</div>
    <blockquote class="feedback-verse">“${esc(q.verse)}”</blockquote>
    <div class="feedback-ref">${esc(q.ref)} · KJV</div>
    <div class="feedback-note">${esc(q.note)}</div>
    <div class="feedback-foot">
      ${points || '<span></span>'}
      ${nextButton}
    </div>
  </div>`;
}

function sideMarkup(cat, q) {
  if (session.mode === 'local') {
    return `<aside class="quiz-side">
      <div class="side-card wide">
        <div class="side-card-head">${icon('users')}Scoreboard</div>
        <div class="scoreboard">${scoreboardMarkup()}</div>
      </div>
      <div class="side-card">
        <div class="turn-banner"><span class="player-dot" style="color:${currentPlayer()?.color}"></span><span>Turn: <strong>${esc(currentPlayer()?.name || '')}</strong></span></div>
        <p class="side-desc mt-2">Each player answers ${session.perPlayer} questions. Pass the device after every answer.</p>
      </div>
    </aside>`;
  }
  if (session.mode === 'online') {
    return `<aside class="quiz-side">
      <div class="side-card wide">
        <div class="side-card-head">${icon('globe')}Room ${esc(session.code)}</div>
        <div class="scoreboard">${scoreboardMarkup()}</div>
      </div>
      <div class="side-card">
        <div class="turn-banner"><span class="status-dot ${session.role === 'host' ? 'on' : 'wait'}"></span><span>${session.role === 'host' ? 'You are hosting this round.' : 'Host controls the pace.'}</span></div>
        <div class="online-note">Answers lock the moment you choose. Scores include a speed bonus for quick replies.</div>
      </div>
    </aside>`;
  }
  const fiftyUsed = !session.lifelines.fifty;
  const hintUsed = !session.lifelines.hint || session.hintShown;
  const skipUsed = !session.lifelines.skip;
  return `<aside class="quiz-side">
    <div class="side-card">
      <div class="side-art"><img src="${cat.icon}" alt="" loading="lazy"></div>
      <div class="side-title">${esc(cat.short)}</div>
      <div class="side-desc">${esc(cat.blurb)}</div>
      ${session.hintShown ? `<div class="chip gold mt-2">${icon('book')}${esc(q.ref)}</div>` : ''}
    </div>
    <div class="side-card">
      <div class="side-card-head">${icon('spark')}Lifelines</div>
      <div class="lifelines">
        <button class="lifeline ${fiftyUsed ? 'used' : ''}" type="button" data-action="quiz-fifty" ${fiftyUsed || session.revealed ? 'disabled' : ''}>
          <span class="ll-icon">${icon('target')}</span><span>Fifty-fifty</span><span class="ll-count">${session.lifelines.fifty} left</span>
        </button>
        <button class="lifeline ${hintUsed ? 'used' : ''}" type="button" data-action="quiz-hint" ${hintUsed || session.revealed ? 'disabled' : ''}>
          <span class="ll-icon">${icon('book')}</span><span>Scripture hint</span><span class="ll-count">${session.lifelines.hint} left</span>
        </button>
        <button class="lifeline ${skipUsed ? 'used' : ''}" type="button" data-action="quiz-skip" ${skipUsed || session.revealed ? 'disabled' : ''}>
          <span class="ll-icon">${icon('arrow')}</span><span>Skip question</span><span class="ll-count">${session.lifelines.skip} left</span>
        </button>
      </div>
    </div>
    <div class="side-card">
      <div class="side-card-head">${icon('flame')}Current streak</div>
      <div class="streak-card">
        <div class="streak-flame">${icon('flame')}</div>
        <div><div class="streak-val">${session.streak}</div><div class="streak-label">in a row</div></div>
        <div class="streak-mult">Best ${session.bestStreak}</div>
      </div>
    </div>
  </aside>`;
}

function scoreboardMarkup() {
  if (!session?.players) return '';
  return session.players.map(p => {
    const active = session.mode === 'local' && session.players[session.turn]?.id === p.id;
    return `<div class="player-row ${active ? 'active' : ''}">
      <span class="player-dot" style="color:${p.color}"></span>
      <span class="player-name">${esc(p.name)}</span>
      ${active ? '<span class="player-turn-tag">Turn</span>' : ''}
      ${session.mode === 'online' && p.answered ? `<span class="player-answered">${icon('check')}</span>` : ''}
      <span class="player-score">${p.score}</span>
    </div>`;
  }).join('');
}

function passMarkup() {
  const player = currentPlayer();
  return `<div class="screen"><div class="quiz-shell">
    <div class="quiz-top">
      <button class="btn btn-ghost btn-sm" type="button" data-action="quiz-quit">${icon('x')}<span>Quit</span></button>
      <div class="quiz-progress-wrap"><div class="quiz-progress-meta"><span>${esc(session.label)}</span><span>${session.index + 1} / ${session.total}</span></div><div class="progress-track"><div class="progress-fill" style="width:${(session.index / session.total) * 100}%"></div></div></div>
    </div>
    <div class="pass-wrap">
      <div class="eyebrow">Pass & play</div>
      <div class="pass-orb" style="--dot:${player?.color || 'var(--gold)'}">${esc((player?.name || '?').slice(0, 2).toUpperCase())}</div>
      <h1 class="pass-name">${esc(player?.name || 'Player')}</h1>
      <p class="pass-sub">Hand the device to ${esc(player?.name || 'the next player')} for question ${session.index + 1}.</p>
      <div class="pass-score"><span class="ps-val">${player?.score || 0}</span><span class="muted">points</span></div>
      <div><button class="btn btn-primary btn-lg" type="button" data-action="quiz-pass">I'm ready ${icon('arrow')}</button></div>
      <p class="muted mt-3">Everyone gets ${session.perPlayer} questions. Keep the screen hidden until the next player is ready.</p>
    </div>
  </div></div>`;
}

function syncTicker() {
  stopTicker();
  if (!session || session.phase !== 'question' || !session.deadline) {
    updateTimerDisplay();
    return;
  }
  updateTimerDisplay();
  ticker = window.setInterval(() => {
    updateTimerDisplay();
    const remaining = session ? session.deadline - Date.now() : 0;
    if (session && session.phase === 'question' && remaining <= 0 && !session.online && !session.locked) {
      stopTicker();
      handleTimeout();
    }
  }, 200);
}

function stopTicker() {
  if (ticker) window.clearInterval(ticker);
  ticker = 0;
}

function updateTimerDisplay() {
  const ring = document.getElementById('quiz-timer');
  if (!ring || !session) return;
  const bar = document.getElementById('quiz-timer-bar');
  const num = document.getElementById('quiz-timer-num');
  if (!session.deadline) {
    ring.classList.remove('urgent');
    if (num) num.textContent = getSetting('timer') ? session.timeLimit : '∞';
    return;
  }
  const remaining = Math.max(0, session.deadline - Date.now());
  const ratio = Math.max(0, Math.min(1, remaining / (session.timeLimit * 1000)));
  if (bar) bar.style.strokeDashoffset = String(169.65 * (1 - ratio));
  if (num) num.textContent = String(Math.ceil(remaining / 1000));
  ring.classList.toggle('urgent', remaining <= 5000 && session.phase === 'question');
}

function answerQuestion(choice) {
  if (!session || session.revealed || session.locked) return;
  const q = activeQuestion();
  if (!q) return;
  if (choice !== -1 && session.removed?.includes(choice)) return;
  session.locked = true;
  session.selected = choice === -1 ? null : choice;
  if (session.mode === 'online') {
    session.waiting = true;
    refreshQuiz();
    onlineBridge?.submitAnswer?.(choice);
    return;
  }
  const correct = choice === q.answer;
  const remaining = session.deadline ? Math.max(0, session.deadline - Date.now()) : 0;
  const speedBonus = correct ? Math.round(50 * (remaining / (session.timeLimit * 1000))) : 0;
  const streakBonus = correct ? 20 * Math.min(session.streak, 5) : 0;
  const base = levelFor(q.level).points;
  const earned = correct ? base + speedBonus + streakBonus : 0;
  session.revealed = true;
  session.correctIndex = q.answer;
  session.earned = earned;
  session.score += earned;
  if (correct) {
    session.correct += 1;
    session.streak += 1;
    session.bestStreak = Math.max(session.bestStreak, session.streak);
  } else {
    session.streak = 0;
  }
  session.answers.push({
    qid: q.id,
    q: q.q,
    options: q.options,
    choice,
    answer: q.answer,
    correct,
    earned,
    ref: q.ref,
    verse: q.verse,
    note: q.note,
    cat: q.cat,
    skipped: false
  });
  if (session.mode === 'local') {
    const player = currentPlayer();
    if (player) {
      player.score += earned;
      player.answered += 1;
      player.correct += correct ? 1 : 0;
      player.streak = correct ? (player.streak || 0) + 1 : 0;
      player.bestStreak = Math.max(player.bestStreak || 0, player.streak);
    }
  }
  sfx.play(correct ? 'correct' : 'wrong');
  stopTicker();
  refreshQuiz();
}

function handleTimeout() {
  if (!session || session.revealed) return;
  answerQuestion(-1);
}

function nextQuestion() {
  if (!session) return;
  if (session.mode === 'online') {
    if (session.role === 'host') onlineBridge?.nextRound?.();
    return;
  }
  if (session.mode === 'local') {
    session.index += 1;
    session.turn = (session.turn + 1) % session.players.length;
    if (session.index >= session.total) {
      finishLocal();
      return;
    }
    session.phase = 'pass';
    session.revealed = false;
    session.selected = null;
    stopTicker();
    refreshQuiz();
    return;
  }
  session.index += 1;
  if (session.index >= session.total) {
    finishSolo();
    return;
  }
  prepareQuestion();
  refreshQuiz();
}

function useFifty() {
  if (!session || !['quick', 'campaign', 'daily'].includes(session.mode)) return;
  if (!session.lifelines.fifty || session.revealed) return;
  const q = activeQuestion();
  const wrong = q.options.map((_, i) => i).filter(i => i !== q.answer);
  session.removed = shuffle(wrong).slice(0, 2);
  session.lifelines.fifty = 0;
  sfx.play('click');
  refreshQuiz();
  toast('Two wrong answers removed.');
}

function useHint() {
  if (!session || session.revealed || session.hintShown) return;
  if (!['quick', 'campaign', 'daily'].includes(session.mode)) return;
  if (!session.lifelines.hint) return;
  session.hintShown = true;
  session.lifelines.hint = 0;
  sfx.play('click');
  refreshQuiz();
  toast('Scripture hint revealed in the side panel.');
}

function skipQuestion() {
  if (!session || session.revealed || session.mode === 'online') return;
  const q = activeQuestion();
  if (!q) return;
  if (!session.lifelines.skip) return;
  session.lifelines.skip = 0;
  session.locked = true;
  session.revealed = true;
  session.skipped = true;
  session.correctIndex = q.answer;
  session.selected = null;
  session.streak = 0;
  session.answers.push({
    qid: q.id,
    q: q.q,
    options: q.options,
    choice: null,
    answer: q.answer,
    correct: false,
    earned: 0,
    ref: q.ref,
    verse: q.verse,
    note: q.note,
    cat: q.cat,
    skipped: true
  });
  if (session.mode === 'local') {
    const player = currentPlayer();
    if (player) player.answered += 1;
  }
  stopTicker();
  refreshQuiz();
}

function quitQuiz() {
  if (!session) {
    navigate('home');
    return;
  }
  openModal({
    title: 'Leave this round?',
    sub: 'Your progress in this quiz will not be saved.',
    body: `<p class="lede">You can return to the home screen and start again whenever you are ready.</p>`,
    actions: `<button class="btn btn-soft btn-sm" type="button" data-modal-close>Keep playing</button><button class="btn btn-gold btn-sm" type="button" data-action="quiz-exit">Leave round</button>`
  });
}

function exitQuiz() {
  closeModal();
  stopTicker();
  if (session?.mode === 'online') onlineBridge?.leave?.();
  session = null;
  navigate('home');
}

export function addOnlineReview(entry) {
  if (!session || session.mode !== 'online') return;
  session.review.push(entry);
  session.answers.push(entry);
}

export function setOnlineQuestion(data = {}) {
  if (!session || session.mode !== 'online') return;
  session.index = Number(data.index) || 0;
  session.total = Number(data.total) || session.total;
  session.question = data.question || null;
  session.players = normalizePlayers(data.players || session.players);
  session.selected = null;
  session.revealed = false;
  session.correctIndex = null;
  session.waiting = false;
  session.locked = false;
  session.phase = 'question';
  session.deadline = data.deadline || Date.now() + session.timeLimit * 1000;
  session.earned = 0;
  session.skipped = false;
  session.removed = [];
  session.review = session.review || [];
  refreshQuiz();
}

export function setOnlineReveal(data = {}) {
  if (!session || session.mode !== 'online') return;
  session.revealed = true;
  session.waiting = false;
  session.phase = 'reveal';
  session.deadline = null;
  session.correctIndex = Number(data.answer);
  session.selected = data.selected ?? session.selected;
  session.earned = Number(data.earned) || 0;
  session.players = normalizePlayers(data.players || session.players);
  session.question = { ...(session.question || {}), ...(data.question || {}), answer: Number(data.answer) };
  session.skipped = false;
  if (data.review) {
    session.review = [...(session.review || []), data.review];
    session.answers.push(data.review);
  }
  session.score = Number(data.score) || session.score;
  session.correct = Number(data.correct) || session.correct;
  session.streak = Number(data.streak) || 0;
  session.bestStreak = Math.max(session.bestStreak || 0, Number(data.bestStreak) || 0);
  sfx.play(data.selected === null || data.selected === undefined ? 'wrong' : data.selected === session.correctIndex ? 'correct' : 'wrong');
  refreshQuiz();
}

export function finishOnlineGame(result = {}) {
  const me = result.me || {};
  const total = Number(result.total) || 0;
  const correct = Number(me.correct) || 0;
  const score = Number(me.score) || 0;
  const bestStreak = Number(me.bestStreak) || 0;
  const xp = Number(result.xp) || Math.round(score / 12);
  const recorded = recordResult({
    mode: 'online',
    label: 'Online Rivals',
    total,
    correct,
    score,
    bestStreak,
    xp,
    categories: result.categories || [],
    won: Boolean(result.won)
  });
  lastResult = {
    mode: 'online',
    label: 'Online Rivals',
    total,
    correct,
    score,
    bestStreak,
    xp: recorded.xp,
    accuracy: total ? Math.round((correct / total) * 100) : 0,
    players: normalizePlayers(result.players),
    role: result.role || 'guest',
    code: result.code || '',
    won: Boolean(result.won),
    categories: result.categories || [],
    review: []
  };
  session = null;
  stopTicker();
  navigate('results');
  if (lastResult.won) {
    sfx.play('win');
    confetti(90);
  }
}

function finishSolo() {
  const total = session.total;
  const correct = session.correct;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const xp = Math.max(10, Math.round(session.score / 10));
  const categories = [...new Set(session.questions.map(q => q.cat))];
  const recorded = recordResult({
    mode: session.mode,
    label: session.label,
    total,
    correct,
    score: session.score,
    bestStreak: session.bestStreak,
    xp,
    categories,
    stage: session.stage,
    won: accuracy >= 60
  });
  lastResult = {
    mode: session.mode,
    label: session.label,
    total,
    correct,
    score: session.score,
    bestStreak: session.bestStreak,
    xp: recorded.xp,
    accuracy,
    stars: recorded.stars,
    categories,
    stage: session.stage,
    config: session.config,
    answers: session.answers,
    review: session.answers,
    daily: session.mode === 'daily'
  };
  session = null;
  stopTicker();
  navigate('results');
  if (accuracy >= 70) {
    sfx.play('win');
    confetti(accuracy >= 90 ? 100 : 55);
  }
}

function finishLocal() {
  const ranked = [...session.players].sort((a, b) => b.score - a.score || b.correct - a.correct);
  const topScore = ranked[0]?.score || 0;
  const winners = ranked.filter(p => p.score === topScore);
  const me = session.players.find(p => p.name.toLowerCase() === save.profile.name.toLowerCase()) || session.players[0];
  const total = session.total;
  const xp = Math.max(10, Math.round((me?.score || 0) / 15));
  const categories = [...new Set(session.questions.map(q => q.cat))];
  const recorded = recordResult({
    mode: 'local',
    label: 'Pass & Play',
    total: me?.answered || 0,
    correct: me?.correct || 0,
    score: me?.score || 0,
    bestStreak: me?.bestStreak || 0,
    xp,
    categories,
    won: Boolean(me && winners.some(w => w.id === me.id))
  });
  lastResult = {
    mode: 'local',
    label: 'Pass & Play',
    total,
    correct: me?.correct || 0,
    score: me?.score || 0,
    bestStreak: me?.bestStreak || 0,
    xp: recorded.xp,
    accuracy: me?.answered ? Math.round((me.correct / me.answered) * 100) : 0,
    players: ranked,
    winners: winners.map(w => w.name),
    won: Boolean(me && winners.some(w => w.id === me.id)),
    categories,
    config: session.config,
    review: []
  };
  session = null;
  stopTicker();
  navigate('results');
  sfx.play('win');
  confetti(85);
}

action('quiz-answer', ({ value }) => {
  answerQuestion(Number(value));
});

action('quiz-next', () => {
  nextQuestion();
});

action('quiz-fifty', () => {
  useFifty();
});

action('quiz-hint', () => {
  useHint();
});

action('quiz-skip', () => {
  skipQuestion();
});

action('quiz-pass', () => {
  if (!session || session.mode !== 'local' || session.phase !== 'pass') return;
  prepareQuestion();
  refreshQuiz();
});

action('quiz-quit', () => {
  quitQuiz();
});

action('quiz-exit', () => {
  exitQuiz();
});

document.addEventListener('keydown', event => {
  if (currentScreen() !== 'quiz' || !session) return;
  if (document.body.classList.contains('modal-open')) return;
  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (session.mode === 'local' && session.phase === 'pass') {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      prepareQuestion();
      refreshQuiz();
    }
    return;
  }
  if (!session.revealed) {
    const map = { a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3 };
    const key = event.key.toLowerCase();
    if (key in map) {
      event.preventDefault();
      answerQuestion(map[key]);
      return;
    }
    if (key === 'f') {
      event.preventDefault();
      useFifty();
      return;
    }
    if (key === 'h') {
      event.preventDefault();
      useHint();
      return;
    }
    if (key === 's') {
      event.preventDefault();
      skipQuestion();
    }
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    nextQuestion();
  }
});

import { renderResultsScreen, attachResultActions } from './results.js';

registerScreen('quiz', {
  render: () => ({ html: quizMarkup(), mount: syncTicker }),
  leave: to => {
    stopTicker();
    if (session?.mode === 'online' && !['results', 'online'].includes(to)) {
      onlineBridge?.leave?.();
      session = null;
    }
    if (to === 'results') stopTicker();
  }
});

registerScreen('results', {
  render: () => renderResultsScreen(lastResult),
  leave: to => {
    if (lastResult?.mode === 'online' && !['online', 'results'].includes(to)) {
      onlineBridge?.leave?.();
    }
  }
});

export function getLastResult() {
  return lastResult;
}

export function setLastResult(result) {
  lastResult = result;
}

attachResultActions({
  getResult: () => lastResult,
  setResult: value => { lastResult = value; },
  startSolo,
  startLocal: startLocalGame,
  onlineBridge: () => onlineBridge
});
