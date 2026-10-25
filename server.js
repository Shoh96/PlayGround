import { createServer } from 'node:http';
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { CATEGORIES, QUESTIONS } from './public/js/data/questions.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');
const DATA_DIR = join(__dirname, 'data');
const LEADERBOARD_FILE = join(DATA_DIR, 'leaderboard.json');
const PORT = Number(process.env.PORT || 3002);
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

const CATEGORY_KEYS = new Set(CATEGORIES.map(c => c.key));
const AVATARS = new Set(['lion', 'dove', 'lamb', 'eagle', 'flame', 'star', 'harp', 'crown', 'scroll', 'fish', 'vase']);
const BOT_NAMES = ['Sparrow', 'Tirzah', 'Boaz', 'Zipporah', 'Eli', 'Huldah', 'Amos', 'Junia'];
const REACTIONS = new Set(['amen', 'fire', 'heart', 'wow', 'pray', 'hallelujah']);

// ── Leaderboard ─────────────────────────────────────────────────────────────
const seededLeaderboard = [
  { name: 'Miriam', avatar: 'harp', score: 14820, correct: 58, total: 60, category: 'all', difficulty: 3, mode: 'solo' },
  { name: 'Caleb', avatar: 'lion', score: 13640, correct: 55, total: 60, category: 'heroes', difficulty: 3, mode: 'solo' },
  { name: 'Junia', avatar: 'dove', score: 12980, correct: 54, total: 60, category: 'letters', difficulty: 3, mode: 'solo' },
  { name: 'Silas', avatar: 'flame', score: 11870, correct: 51, total: 60, category: 'acts', difficulty: 2, mode: 'solo' },
  { name: 'Priscilla', avatar: 'star', score: 11240, correct: 49, total: 60, category: 'gospels', difficulty: 2, mode: 'solo' },
  { name: 'Lydia', avatar: 'vase', score: 10510, correct: 47, total: 60, category: 'women', difficulty: 2, mode: 'solo' },
  { name: 'Amos', avatar: 'scroll', score: 9840, correct: 45, total: 60, category: 'prophets', difficulty: 2, mode: 'solo' },
  { name: 'Stephen', avatar: 'crown', score: 9260, correct: 43, total: 60, category: 'acts', difficulty: 2, mode: 'solo' }
];

let leaderboard = [];
const SAMPLE_NAMES = ['Abigail', 'Ezekiel', 'Hannah', 'Josiah', 'Naomi', 'Philip', 'Rhoda', 'Titus', 'Zacchaeus', 'Salome'];
const SAMPLE_AVATARS = ['lion', 'dove', 'lamb', 'eagle', 'flame', 'star', 'harp', 'crown', 'scroll', 'fish'];

async function loadLeaderboard() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = JSON.parse(await readFile(LEADERBOARD_FILE, 'utf8'));
    if (Array.isArray(raw)) leaderboard = raw;
  } catch {
    const now = Date.now();
    leaderboard = [
      ...seededLeaderboard.map((entry, i) => ({
        id: `seed-${i}`,
        ...entry,
        createdAt: new Date(now - (i + 1) * 1000 * 60 * 60 * 7).toISOString()
      })),
      ...Array.from({ length: 18 }, (_, i) => {
        const name = SAMPLE_NAMES[i % SAMPLE_NAMES.length];
        const score = 8850 - i * 235 + ((i * 37) % 150);
        return {
          id: `seed-b-${i}`,
          name: i < 10 ? name : `${name}${Math.floor(i / 10) + 1}`,
          avatar: SAMPLE_AVATARS[i % SAMPLE_AVATARS.length],
          score,
          correct: Math.max(18, 47 - i),
          total: 60,
          category: 'all',
          difficulty: 2 + (i % 3),
          mode: 'solo',
          createdAt: new Date(now - (i + 2) * 1000 * 60 * 90).toISOString()
        };
      })
    ];
    await saveLeaderboard();
  }
}

let saveTimer = null;
async function saveLeaderboard() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboard.slice(0, 100), null, 2));
    } catch (error) {
      console.error('Leaderboard write failed:', error.message);
    }
  }, 120);
}

function addLeaderboardEntry(entry) {
  const clean = {
    id: randomUUID(),
    name: String(entry.name || 'Pilgrim').slice(0, 18),
    avatar: AVATARS.has(entry.avatar) ? entry.avatar : 'star',
    score: Math.max(0, Math.min(50000, Math.round(Number(entry.score) || 0))),
    correct: Math.max(0, Math.min(100, Math.round(Number(entry.correct) || 0))),
    total: Math.max(1, Math.min(100, Math.round(Number(entry.total) || 1))),
    category: CATEGORY_KEYS.has(entry.category) ? entry.category : 'all',
    difficulty: Math.max(1, Math.min(4, Math.round(Number(entry.difficulty) || 2))),
    mode: ['solo', 'daily', 'journey', 'bot', 'passplay', 'online'].includes(entry.mode) ? entry.mode : 'solo',
    createdAt: new Date().toISOString()
  };
  leaderboard.push(clean);
  leaderboard.sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt));
  leaderboard = leaderboard.slice(0, 100);
  saveLeaderboard();
  return clean;
}

function leaderboardView(scope) {
  const now = Date.now();
  const windowMs = scope === 'day' ? 86400000 : scope === 'week' ? 604800000 : Infinity;
  const rows = leaderboard
    .filter(entry => now - new Date(entry.createdAt).getTime() <= windowMs)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  return rows;
}

// ── HTTP helpers ────────────────────────────────────────────────────────────
function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req, limit = 16 * 1024) {
  return new Promise((resolvePromise, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolvePromise(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const rateBuckets = new Map();
function rateLimit(ip, max = 30, windowMs = 60000) {
  const now = Date.now();
  const bucket = rateBuckets.get(ip) || [];
  const fresh = bucket.filter(t => now - t < windowMs);
  if (fresh.length >= max) return false;
  fresh.push(now);
  rateBuckets.set(ip, fresh);
  return true;
}

function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' ws: wss:",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'"
  ].join('; '));
}

async function serveStatic(req, res, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const filePath = resolve(PUBLIC_DIR, normalize(relative));
  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    const ext = extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
      'Last-Modified': info.mtime.toUTCString()
    });
    if (req.method === 'HEAD') return res.end();
    createReadStream(filePath).pipe(res);
  } catch {
    if (relative !== 'index.html' && !extname(relative)) {
      try {
        const html = await readFile(join(PUBLIC_DIR, 'index.html'));
        res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
        return res.end(html);
      } catch {}
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }
}

// ── Online arena ────────────────────────────────────────────────────────────
const rooms = new Map();
const sockets = new Map();
let onlineHumans = 0;

const cleanName = name => String(name || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 18) || 'Pilgrim';
const cleanAvatar = avatar => (AVATARS.has(avatar) ? avatar : 'star');
const clamp = (n, min, max) => Math.max(min, Math.min(max, Math.round(Number(n) || 0)));

function sanitizeSettings(input = {}) {
  const category = input.category === 'all' || CATEGORY_KEYS.has(input.category) ? input.category : 'all';
  const difficulty = input.difficulty === 'mixed' ? 'mixed' : clamp(input.difficulty || 2, 1, 4);
  return {
    category,
    difficulty,
    count: clamp(input.count || 8, 5, 12),
    timer: clamp(input.timer || 20, 10, 45)
  };
}

function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from(randomBytes(6), byte => alphabet[byte % alphabet.length]).join('');
  } while (rooms.has(code));
  return code;
}

function playerView(player) {
  return {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    score: player.score,
    streak: player.streak,
    correct: player.correct,
    answered: player.answered,
    lastCorrect: player.lastCorrect,
    lastDelta: player.lastDelta,
    isBot: player.isBot,
    isHost: false,
    connected: player.connected
  };
}

function roomView(room) {
  return {
    code: room.code,
    state: room.state,
    hostId: room.hostId,
    isPublic: room.isPublic,
    settings: room.settings,
    players: [...room.players.values()].map(p => {
      const view = { ...playerView(p), isHost: p.id === room.hostId };
      if (room.state !== 'reveal' && room.state !== 'results') {
        view.lastCorrect = null;
        view.lastDelta = 0;
      }
      return view;
    }),
    questionIndex: room.currentIndex,
    total: room.gameQuestions.length,
    createdAt: room.createdAt
  };
}

function send(ws, message) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcastPresence() {
  for (const ws of wss.clients) send(ws, { type: 'presence', online: onlineHumans });
}

function broadcastRoom(room, type, extra = {}, includeRoom = true) {
  const message = { type, ...(includeRoom ? { room: roomView(room) } : {}), ...extra };
  for (const player of room.players.values()) {
    if (!player.isBot) send(player.ws, message);
  }
}

function sendError(player, message) {
  send(player.ws, { type: 'error', message });
}

function createRoom(ws, data) {
  const code = roomCode();
  const player = {
    id: randomUUID(),
    clientId: data.clientId,
    name: cleanName(data.name),
    avatar: cleanAvatar(data.avatar),
    score: 0,
    streak: 0,
    correct: 0,
    answered: false,
    lastCorrect: null,
    lastDelta: 0,
    isBot: false,
    connected: true,
    ws,
    answeredIndex: null,
    answerMs: null
  };
  const room = {
    code,
    hostId: player.id,
    players: new Map([[player.id, player]]),
    settings: sanitizeSettings(data.settings),
    state: 'lobby',
    isPublic: Boolean(data.isPublic),
    createdAt: Date.now(),
    gameQuestions: [],
    currentIndex: -1,
    questionEndsAt: 0,
    timer: null,
    revealTimer: null,
    botTimers: [],
    startedAt: 0,
    answersThisRound: 0
  };
  rooms.set(code, room);
  return { room, player };
}

function removeBotTimers(room) {
  for (const timer of room.botTimers) clearTimeout(timer);
  room.botTimers = [];
}

function cleanupRoom(room) {
  clearTimeout(room.timer);
  clearTimeout(room.revealTimer);
  removeBotTimers(room);
  const humans = [...room.players.values()].filter(p => !p.isBot);
  if (humans.length === 0) {
    rooms.delete(room.code);
  }
}

function leaveRoom(room, player) {
  if (!room || !room.players.has(player.id)) return;
  room.players.delete(player.id);
  const humans = [...room.players.values()].filter(p => !p.isBot);
  if (humans.length === 0) {
    cleanupRoom(room);
    return;
  }
  if (room.hostId === player.id) {
    room.hostId = humans[0].id;
  }
  if (room.state === 'lobby' || room.state === 'results') {
    broadcastRoom(room, 'room');
  } else {
    broadcastRoom(room, 'playerLeft', { playerId: player.id, name: player.name });
    maybeEndQuestion(room);
  }
}

function addBot(room) {
  const available = BOT_NAMES.filter(name => ![...room.players.values()].some(p => p.name === name));
  const name = available[Math.floor(Math.random() * available.length)] || `Pilgrim ${room.players.size + 1}`;
  const avatar = ['lion', 'dove', 'lamb', 'eagle', 'flame', 'star', 'harp', 'crown'][room.players.size % 8];
  const bot = {
    id: randomUUID(),
    clientId: `bot-${randomUUID()}`,
    name,
    avatar,
    score: 0,
    streak: 0,
    correct: 0,
    answered: false,
    lastCorrect: null,
    lastDelta: 0,
    isBot: true,
    connected: true,
    ws: null,
    answeredIndex: null,
    answerMs: null
  };
  room.players.set(bot.id, bot);
  return bot;
}

function pickQuestions(settings) {
  const pool = settings.category === 'all' ? [...QUESTIONS] : QUESTIONS.filter(q => q.cat === settings.category);
  const tier = settings.difficulty === 'mixed' ? null : settings.difficulty;
  let ranked = [];
  if (tier) {
    const distance = q => Math.abs(q.diff - tier);
    ranked = [...pool].sort((a, b) => distance(a) - distance(b) || Math.random() - 0.5);
  } else {
    ranked = [...pool].sort(() => Math.random() - 0.5);
  }
  const chosen = [];
  const usedCategories = new Set();
  const target = Math.min(settings.count, pool.length);
  if (settings.category === 'all') {
    for (const q of ranked) {
      if (chosen.length >= target) break;
      if (usedCategories.has(q.cat) && chosen.length < CATEGORIES.length) continue;
      chosen.push(q);
      usedCategories.add(q.cat);
    }
  }
  for (const q of ranked) {
    if (chosen.length >= target) break;
    if (!chosen.some(c => c.id === q.id)) chosen.push(q);
  }
  return chosen.sort(() => Math.random() - 0.5);
}

function publicQuestion(question, index, total, endsAt, timer) {
  return {
    index,
    total,
    id: question.id,
    cat: question.cat,
    diff: question.diff,
    question: question.question,
    choices: question.choices,
    endsAt,
    timer,
    serverNow: Date.now()
  };
}

function startGame(room) {
  if (room.state !== 'lobby') return;
  room.gameQuestions = pickQuestions(room.settings);
  if (room.gameQuestions.length === 0) {
    for (const p of room.players.values()) sendError(p, 'Not enough questions for that setup.');
    return;
  }
  for (const p of room.players.values()) {
    p.score = 0;
    p.streak = 0;
    p.correct = 0;
    p.answered = false;
    p.lastCorrect = null;
    p.lastDelta = 0;
  }
  room.currentIndex = -1;
  room.startedAt = Date.now();
  room.state = 'question';
  broadcastRoom(room, 'gameStarted');
  setTimeout(() => nextQuestion(room), 500);
}

function nextQuestion(room) {
  if (!rooms.has(room.code)) return;
  room.currentIndex += 1;
  if (room.currentIndex >= room.gameQuestions.length) {
    finishGame(room);
    return;
  }
  room.state = 'question';
  room.answersThisRound = 0;
  for (const p of room.players.values()) {
    p.answered = false;
    p.answeredIndex = null;
    p.answerMs = null;
  }
  const question = room.gameQuestions[room.currentIndex];
  const timerMs = room.settings.timer * 1000;
  room.questionEndsAt = Date.now() + timerMs;
  broadcastRoom(room, 'question', {
    question: publicQuestion(question, room.currentIndex, room.gameQuestions.length, room.questionEndsAt, room.settings.timer)
  });
  clearTimeout(room.timer);
  room.timer = setTimeout(() => endQuestion(room), timerMs + 80);
  scheduleBots(room, question, timerMs);
}

function scheduleBots(room, question, timerMs) {
  removeBotTimers(room);
  const difficulty = question.diff;
  for (const bot of room.players.values()) {
    if (!bot.isBot) continue;
    const accuracy = [0, 0.72, 0.62, 0.5, 0.4][difficulty] || 0.55;
    const delay = 1600 + Math.random() * Math.max(1200, timerMs - 3000);
    const timer = setTimeout(() => {
      if (room.state !== 'question') return;
      const correct = Math.random() < accuracy;
      let choice;
      if (correct) {
        choice = question.answer;
      } else {
        const wrong = [0, 1, 2, 3].filter(i => i !== question.answer);
        choice = wrong[Math.floor(Math.random() * wrong.length)];
      }
      submitAnswer(room, bot, choice, room.questionEndsAt - Date.now());
    }, delay);
    room.botTimers.push(timer);
  }
}

function submitAnswer(room, player, choice, remainingMs) {
  if (!room || room.state !== 'question') return;
  if (player.answered) return;
  if (!Number.isInteger(choice) || choice < 0 || choice > 3) return;
  const question = room.gameQuestions[room.currentIndex];
  const correct = choice === question.answer;
  player.answered = true;
  player.answeredIndex = choice;
  player.answerMs = Math.max(0, Math.min(room.settings.timer * 1000, room.questionEndsAt - Date.now()));
  room.answersThisRound += 1;
  if (correct) {
    const remaining = Math.max(0, Math.min(room.settings.timer * 1000, remainingMs));
    const base = 600 + question.diff * 100;
    const speed = Math.round(400 * (remaining / (room.settings.timer * 1000)));
    const streakBonus = Math.min(500, player.streak * 100);
    const delta = base + speed + streakBonus;
    player.score += delta;
    player.correct += 1;
    player.streak += 1;
    player.lastCorrect = true;
    player.lastDelta = delta;
    if (!player.isBot) {
      send(player.ws, {
        type: 'answerAck',
        choice,
        answerMs: player.answerMs
      });
    }
  } else {
    player.streak = 0;
    player.lastCorrect = false;
    player.lastDelta = 0;
    if (!player.isBot) {
      send(player.ws, {
        type: 'answerAck',
        choice,
        answerMs: player.answerMs
      });
    }
  }
  broadcastRoom(room, 'answerProgress', {
    answered: room.answersThisRound,
    total: room.players.size
  }, false);
  maybeEndQuestion(room);
}

function maybeEndQuestion(room) {
  if (room.state !== 'question') return;
  const allAnswered = [...room.players.values()].every(p => p.answered);
  if (allAnswered) {
    clearTimeout(room.timer);
    setTimeout(() => endQuestion(room), 350);
  }
}

function endQuestion(room) {
  if (!rooms.has(room.code) || room.state !== 'question') return;
  room.state = 'reveal';
  clearTimeout(room.timer);
  removeBotTimers(room);
  const question = room.gameQuestions[room.currentIndex];
  const players = [...room.players.values()]
    .map(p => ({ ...playerView(p), isHost: p.id === room.hostId }))
    .sort((a, b) => b.score - a.score);
  const answerCounts = [0, 0, 0, 0];
  for (const p of room.players.values()) {
    if (p.answeredIndex !== null) answerCounts[p.answeredIndex] += 1;
  }
  broadcastRoom(room, 'reveal', {
    correctIndex: question.answer,
    ref: question.ref,
    verse: question.verse,
    why: question.why,
    questionId: question.id,
    answerCounts,
    players,
    nextIn: 8
  });
  clearTimeout(room.revealTimer);
  room.revealTimer = setTimeout(() => {
    if (room.state === 'reveal') nextQuestion(room);
  }, 8000);
}

function finishGame(room) {
  room.state = 'results';
  clearTimeout(room.timer);
  clearTimeout(room.revealTimer);
  removeBotTimers(room);
  const ranking = [...room.players.values()]
    .map(p => ({
      ...playerView(p),
      isHost: p.id === room.hostId
    }))
    .sort((a, b) => b.score - a.score);
  broadcastRoom(room, 'gameOver', { ranking });
  const winner = [...room.players.values()].sort((a, b) => b.score - a.score)[0];
  if (winner && !winner.isBot && winner.score > 0) {
    addLeaderboardEntry({
      name: winner.name,
      avatar: winner.avatar,
      score: winner.score,
      correct: winner.correct,
      total: room.gameQuestions.length,
      category: room.settings.category,
      difficulty: room.settings.difficulty === 'mixed' ? 3 : room.settings.difficulty,
      mode: 'online'
    });
  }
}

function handleMessage(ws, raw) {
  let data;
  try {
    data = JSON.parse(String(raw));
  } catch {
    return send(ws, { type: 'error', message: 'Invalid message.' });
  }
  if (!data || typeof data.type !== 'string') return;
  const socketState = sockets.get(ws);
  if (!socketState) return;
  const { room, player } = socketState;
  switch (data.type) {
    case 'create': {
      if (room) return;
      const created = createRoom(ws, data);
      sockets.set(ws, { room: created.room, player: created.player });
      send(ws, { type: 'joined', playerId: created.player.id, code: created.room.code, room: roomView(created.room) });
      broadcastRoom(created.room, 'room');
      break;
    }
    case 'quick': {
      if (room) return;
      const openRoom = [...rooms.values()].find(r => r.isPublic && r.state === 'lobby' && r.players.size < 8);
      if (openRoom) {
        const joined = joinRoom(openRoom, ws, data);
        if (joined) send(ws, { type: 'joined', playerId: joined.id, code: openRoom.code, room: roomView(openRoom) });
        broadcastRoom(openRoom, 'room');
      } else {
        const created = createRoom(ws, { ...data, isPublic: true });
        sockets.set(ws, { room: created.room, player: created.player });
        send(ws, { type: 'joined', playerId: created.player.id, code: created.room.code, room: roomView(created.room) });
        broadcastRoom(created.room, 'room');
      }
      break;
    }
    case 'join': {
      if (room) return;
      const code = String(data.code || '').toUpperCase().trim();
      const target = rooms.get(code);
      if (!target) return send(ws, { type: 'joinError', message: 'That room code was not found.' });
      if (target.state !== 'lobby') return send(ws, { type: 'joinError', message: 'That game has already started.' });
      if (target.players.size >= 8) return send(ws, { type: 'joinError', message: 'That room is full.' });
      const joined = joinRoom(target, ws, data);
      if (joined) {
        send(ws, { type: 'joined', playerId: joined.id, code: target.code, room: roomView(target) });
        broadcastRoom(target, 'room');
      }
      break;
    }
    case 'settings': {
      if (!room || !player || room.hostId !== player.id || room.state !== 'lobby') return;
      room.settings = sanitizeSettings({ ...room.settings, ...data.settings });
      broadcastRoom(room, 'room');
      break;
    }
    case 'addBot': {
      if (!room || !player || room.hostId !== player.id || room.state !== 'lobby') return;
      if (room.players.size >= 8) return sendError(player, 'The room is full.');
      addBot(room);
      broadcastRoom(room, 'room');
      break;
    }
    case 'removeBot': {
      if (!room || !player || room.hostId !== player.id || room.state !== 'lobby') return;
      const bot = [...room.players.values()].find(p => p.isBot && p.id === data.botId);
      if (bot) room.players.delete(bot.id);
      broadcastRoom(room, 'room');
      break;
    }
    case 'start': {
      if (!room || !player || room.hostId !== player.id || room.state !== 'lobby') return;
      startGame(room);
      break;
    }
    case 'answer': {
      if (!room || !player) return;
      submitAnswer(room, player, Number(data.choice), Number(data.remainingMs) || 0);
      break;
    }
    case 'react': {
      if (!room || !player) return;
      const emoji = String(data.emoji || '');
      if (!REACTIONS.has(emoji)) return;
      broadcastRoom(room, 'reaction', { emoji, playerId: player.id, name: player.name });
      break;
    }
    case 'rematch': {
      if (!room || !player || room.hostId !== player.id || room.state !== 'results') return;
      room.state = 'lobby';
      room.currentIndex = -1;
      room.gameQuestions = [];
      for (const p of room.players.values()) {
        p.score = 0;
        p.streak = 0;
        p.correct = 0;
        p.answered = false;
        p.lastCorrect = null;
        p.lastDelta = 0;
      }
      broadcastRoom(room, 'room');
      break;
    }
    case 'leave': {
      if (room && player) leaveRoom(room, player);
      sockets.set(ws, { room: null, player: null });
      send(ws, { type: 'left' });
      break;
    }
    case 'ping': {
      send(ws, { type: 'pong', serverNow: Date.now() });
      break;
    }
    default:
      break;
  }
}

function joinRoom(room, ws, data) {
  const player = {
    id: randomUUID(),
    clientId: data.clientId,
    name: cleanName(data.name),
    avatar: cleanAvatar(data.avatar),
    score: 0,
    streak: 0,
    correct: 0,
    answered: false,
    lastCorrect: null,
    lastDelta: 0,
    isBot: false,
    connected: true,
    ws,
    answeredIndex: null,
    answerMs: null
  };
  room.players.set(player.id, player);
  sockets.set(ws, { room, player });
  return player;
}

async function handleRequest(req, res) {
  securityHeaders(res);
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const ip = req.socket.remoteAddress || 'unknown';

  if (url.pathname === '/api/health') {
    return json(res, 200, {
      ok: true,
      questions: QUESTIONS.length,
      categories: CATEGORIES.length,
      rooms: rooms.size,
      online: onlineHumans,
      uptime: Math.round(process.uptime())
    });
  }

  if (url.pathname === '/api/bank') {
    return json(res, 200, {
      categories: CATEGORIES.map(c => ({ key: c.key, name: c.name, count: c.count, color: c.color })),
      questions: QUESTIONS.length
    });
  }

  if (url.pathname === '/api/leaderboard' && req.method === 'GET') {
    const scope = ['day', 'week', 'all'].includes(url.searchParams.get('scope')) ? url.searchParams.get('scope') : 'all';
    return json(res, 200, { scope, entries: leaderboardView(scope), total: leaderboard.length });
  }

  if (url.pathname === '/api/leaderboard' && req.method === 'POST') {
    if (!rateLimit(ip, 20, 60000)) return json(res, 429, { error: 'Too many scores. Take a breath.' });
    try {
      const body = await readBody(req);
      if (!body || typeof body !== 'object') return json(res, 400, { error: 'Invalid score.' });
      if (!body.name || String(body.name).trim().length < 2) return json(res, 400, { error: 'Name is required.' });
      if (!Number.isFinite(Number(body.score)) || Number(body.score) <= 0) return json(res, 400, { error: 'Score is required.' });
      const entry = addLeaderboardEntry(body);
      return json(res, 201, { entry, entries: leaderboardView('all') });
    } catch (error) {
      return json(res, 400, { error: error.message });
    }
  }

  if (url.pathname === '/api/rooms') {
    const list = [...rooms.values()]
      .filter(r => r.isPublic && r.state === 'lobby')
      .map(r => ({ code: r.code, players: r.players.size, settings: r.settings }));
    return json(res, 200, { rooms: list, online: onlineHumans });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return json(res, 405, { error: 'Method not allowed' });
  }

  return serveStatic(req, res, url.pathname);
}

const server = createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    console.error('Request error:', error);
    if (!res.headersSent) json(res, 500, { error: 'Server error' });
    else res.end();
  });
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname !== '/ws') {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, ws => {
    wss.emit('connection', ws, req);
  });
});

wss.on('connection', ws => {
  onlineHumans += 1;
  sockets.set(ws, { room: null, player: null });
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  send(ws, { type: 'hello', online: onlineHumans, serverNow: Date.now() });
  broadcastPresence();

  ws.on('message', raw => {
    try {
      handleMessage(ws, raw);
    } catch (error) {
      console.error('Socket message error:', error);
      send(ws, { type: 'error', message: 'Something went wrong in the arena.' });
    }
  });

  ws.on('close', () => {
    onlineHumans = Math.max(0, onlineHumans - 1);
    broadcastPresence();
    const state = sockets.get(ws);
    if (state?.room && state?.player) {
      leaveRoom(state.room, state.player);
    }
    sockets.delete(ws);
  });

  ws.on('error', () => {});
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch {}
  }
  const now = Date.now();
  for (const room of rooms.values()) {
    if (now - room.createdAt > 1000 * 60 * 60 * 3) {
      for (const player of room.players.values()) {
        if (!player.isBot) send(player.ws, { type: 'error', message: 'This room expired after three hours.' });
      }
      rooms.delete(room.code);
      cleanupRoom(room);
    }
  }
  for (const [ip, bucket] of rateBuckets) {
    const fresh = bucket.filter(t => Date.now() - t < 60000);
    if (fresh.length) rateBuckets.set(ip, fresh);
    else rateBuckets.delete(ip);
  }
}, 30000);
heartbeat.unref();

await loadLeaderboard();

server.listen(PORT, HOST, () => {
  console.log(`Scripture Showdown listening on http://${HOST}:${PORT}`);
  console.log(`Question bank: ${QUESTIONS.length} questions / ${CATEGORIES.length} categories`);
});

const shutdown = () => {
  clearInterval(heartbeat);
  for (const room of rooms.values()) cleanupRoom(room);
  wss.close();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
