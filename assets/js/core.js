import {
  CATEGORIES,
  CATEGORY_MAP,
  LEVELS,
  LEVEL_MAP,
  CAMPAIGN,
  ACHIEVEMENTS,
  QUESTIONS,
  QUESTION_MAP,
  rankForXp,
  verseForDate,
  dailyQuestionIds
} from './data.js';

const SAVE_KEY = 'lumen.bible.trivia.v1';
const DAY = 86400000;

const ICONS = {
  spark: '<path d="M12 3v4M12 17v4M4.6 7.6l2.8 2.8M16.6 13.6l2.8 2.8M3 12h4M17 12h4M4.6 16.4l2.8-2.8M16.6 10.4l2.8-2.8"/><circle cx="12" cy="12" r="2.6"/>',
  crown: '<path d="M4 8l3.5 3L12 5l4.5 6L20 8l-1.6 10H5.6L4 8Z"/><path d="M5.6 18h12.8"/>',
  flame: '<path d="M12 2c1.7 4.2-1.9 5.6-1.9 9A2.9 2.9 0 0 0 13 13.9c1.8-.2 2.6-1.7 2.5-3.4 2 2 3.5 4.2 3.5 6.9a7 7 0 1 1-14 0c0-4.9 4.1-7.9 7-15.4Z"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4Z"/><path d="M20 4h-4a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h4Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.4 5.6L8 16l2.4-5.6L16 8Z"/>',
  path: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h3a3 3 0 0 0 3-3V8a3 3 0 0 1 3-3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  swords: '<path d="m4 4 7 7M4 4l1 4 3 1M20 4l-7 7M20 4l-1 4-3 1M7 14l-3 3 3 3 3-3M17 14l3 3-3 3-3-3"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.5M18 20a6 6 0 0 0-3-5.2"/>',
  scroll: '<path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H8a2 2 0 0 1-2-2V4Z"/><path d="M6 4a2 2 0 0 0-2 2v2h2M9 9h7M9 13h5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  play: '<path d="M8 5v14l11-7L8 5Z"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 5.5a3 3 0 0 1 0 5.5M18 20a6 6 0 0 0-3-5.2"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3Z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  star: '<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 13v5M8 21h8M9 18h6"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.6 2.6 0 1 1 3.7 2.4c-.8.4-1.2 1-1.2 1.9v.4M12 17.5h.01"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
  wifi: '<path d="M2 8.5a15.5 15.5 0 0 1 20 0M5 12a10.7 10.7 0 0 1 14 0M8.5 15.5a5.4 5.4 0 0 1 7 0M12 19h.01"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 8-8M16 4l3 3M14 6l3 3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  home: '<path d="m3 11 9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9H4Z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 9A7 7 0 0 1 18.7 7M17.9 15A7 7 0 0 1 5.3 17"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'
};

export const PLAYER_COLORS = ['#e8bf6b', '#7ea8ef', '#62c79c', '#d97fa8', '#a78bd8', '#e8794f'];

export const ROUTE_TITLES = {
  home: 'Lumen — Bible Trivia',
  quickplay: 'Quick Play — Lumen',
  categories: 'Categories — Lumen',
  campaign: 'Campaign — Lumen',
  daily: 'Daily Challenge — Lumen',
  library: 'Verse Library — Lumen',
  profile: 'Profile — Lumen',
  multiplayer: 'Multiplayer — Lumen',
  local: 'Pass & Play — Lumen',
  online: 'Online Rivals — Lumen',
  quiz: 'Quiz — Lumen',
  results: 'Results — Lumen'
};

export function icon(name, cls = '') {
  const paths = ICONS[name] || ICONS.spark;
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
}

export function esc(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || 'S').toUpperCase() + (parts[1]?.[0] || '').toUpperCase();
}

export function dateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function formatDate(date = new Date()) {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export function dayDiff(from, to) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / DAY);
}

function freshSave() {
  return {
    version: 1,
    profile: { name: 'Seeker' },
    settings: { sound: true, theme: 'night', timer: true, reduceMotion: false },
    xp: 0,
    stats: {
      played: 0,
      answered: 0,
      correct: 0,
      bestStreak: 0,
      totalScore: 0,
      categories: {},
      onlineWins: 0,
      localWins: 0
    },
    campaign: {},
    achievements: [],
    library: { read: [], opened: 0 },
    daily: { streak: 0, last: null, dates: [] },
    history: []
  };
}

function mergeSave(raw) {
  const base = freshSave();
  if (!raw || typeof raw !== 'object') return base;
  const merged = {
    ...base,
    ...raw,
    profile: { ...base.profile, ...(raw.profile || {}) },
    settings: { ...base.settings, ...(raw.settings || {}) },
    stats: { ...base.stats, ...(raw.stats || {}), categories: { ...(raw.stats?.categories || {}) } },
    campaign: { ...(raw.campaign || {}) },
    library: { ...base.library, ...(raw.library || {}), read: Array.isArray(raw.library?.read) ? raw.library.read : [] },
    daily: { ...base.daily, ...(raw.daily || {}), dates: Array.isArray(raw.daily?.dates) ? raw.daily.dates : [] },
    achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
    history: Array.isArray(raw.history) ? raw.history : []
  };
  return merged;
}

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? mergeSave(JSON.parse(raw)) : freshSave();
  } catch {
    return freshSave();
  }
}

export let save = readSave();

export function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    return false;
  }
  return true;
}

export function resetSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    return false;
  }
  save = freshSave();
  applySettings();
  updateChrome();
  return true;
}

export function levelInfo(xp = save.xp) {
  const per = 500;
  return { level: Math.floor(xp / per) + 1, into: xp % per, need: per };
}

export function categoryFor(id) {
  return CATEGORY_MAP[id] || CATEGORIES[0];
}

export function levelFor(n) {
  return LEVEL_MAP[n] || LEVELS[0];
}

export function stageFor(id) {
  return CAMPAIGN.find(s => s.id === Number(id)) || CAMPAIGN[0];
}

export function isCampaignUnlocked(id) {
  if (Number(id) <= 1) return true;
  return Boolean(save.campaign[Number(id) - 1]?.stars);
}

export function campaignStars(stage) {
  return save.campaign[stage.id]?.stars || 0;
}

export function campaignCompleted() {
  return CAMPAIGN.every(stage => save.campaign[stage.id]?.stars > 0);
}

export function starsMarkup(n, sizeClass = '') {
  return `<span class="stars ${sizeClass}">${[1, 2, 3].map(i => icon('star', i <= n ? 'on' : '')).join('')}</span>`;
}

export function questionPool({ cat = 'all', levels = [1, 2, 3, 4], cats = null } = {}) {
  return QUESTIONS.filter(q => {
    if (cat !== 'all' && q.cat !== cat) return false;
    if (cats && !cats.includes(q.cat)) return false;
    if (levels && levels.length && !levels.includes(q.level)) return false;
    return true;
  });
}

export function buildQuestions({ cat = 'all', levels = [1, 2, 3, 4], cats = null, count = 10, ids = null } = {}) {
  if (Array.isArray(ids) && ids.length) {
    return ids.map(id => QUESTION_MAP[id]).filter(Boolean).slice(0, count);
  }
  const pool = questionPool({ cat, levels, cats });
  return shuffle(pool).slice(0, count);
}

export function dailyVerse() {
  return verseForDate(new Date());
}

export function todayQuestions(count = 10) {
  return dailyQuestionIds(new Date()).slice(0, count).map(id => QUESTION_MAP[id]).filter(Boolean);
}

export function rankInfo() {
  return rankForXp(save.xp);
}

export function achievementFor(id) {
  return ACHIEVEMENTS.find(a => a.id === id);
}

export function hasAchievement(id) {
  return save.achievements.includes(id);
}

export function unlockAchievement(id) {
  if (!id || save.achievements.includes(id)) return false;
  save.achievements.push(id);
  persist();
  const ach = achievementFor(id);
  window.setTimeout(() => {
    toast(`${icon('trophy', 'toast-icon')} Achievement unlocked — ${ach?.name || id}`, 3200);
  }, 420);
  return true;
}

export function markDailyComplete() {
  const key = dateKey();
  const daily = save.daily;
  if (daily.dates.includes(key)) return false;
  if (daily.last) {
    const diff = dayDiff(daily.last, key);
    daily.streak = diff === 1 ? daily.streak + 1 : 1;
  } else {
    daily.streak = 1;
  }
  daily.last = key;
  daily.dates = [...daily.dates, key].slice(-120);
  return true;
}

export function recordResult(result) {
  const stats = save.stats;
  const total = Math.max(0, Number(result.total) || 0);
  const correct = clamp(Number(result.correct) || 0, 0, total);
  const streak = Math.max(0, Number(result.bestStreak) || 0);
  const score = Math.max(0, Number(result.score) || 0);
  const xp = Math.max(0, Math.round(Number(result.xp) || 0));

  stats.played += 1;
  stats.answered += total;
  stats.correct += correct;
  stats.bestStreak = Math.max(stats.bestStreak, streak);
  stats.totalScore += score;
  save.xp += xp;

  const cats = new Set(result.categories || []);
  for (const id of cats) {
    stats.categories[id] = (stats.categories[id] || 0) + 1;
  }

  if (result.mode === 'campaign' && result.stage) {
    const stageId = Number(result.stage);
    const stars = total ? (correct / total >= 0.9 ? 3 : correct / total >= 0.7 ? 2 : 1) : 0;
    const prev = save.campaign[stageId] || { stars: 0, best: 0 };
    save.campaign[stageId] = { stars: Math.max(prev.stars || 0, stars), best: Math.max(prev.best || 0, score) };
  }

  if (result.mode === 'daily') markDailyComplete();
  if (result.mode === 'local' && result.won) {
    stats.localWins += 1;
    unlockAchievement('duelist');
  }
  if (result.mode === 'online') {
    unlockAchievement('online');
    if (result.won) {
      stats.onlineWins += 1;
      unlockAchievement('duelist');
    }
  }

  unlockAchievement('first_steps');
  if (total > 0 && correct === total) unlockAchievement('flawless');
  if (streak >= 10) unlockAchievement('streak10');
  if (stats.correct >= 100) unlockAchievement('scholar');
  if (CATEGORIES.every(c => (stats.categories[c.id] || 0) > 0)) unlockAchievement('explorer');
  if (campaignCompleted()) unlockAchievement('campaign');
  if (save.daily.streak >= 7) unlockAchievement('daily7');
  if (save.library.read.length >= 25) unlockAchievement('library');

  save.history.unshift({
    at: Date.now(),
    mode: result.mode || 'quick',
    score,
    correct,
    total,
    xp,
    label: result.label || 'Quiz'
  });
  save.history = save.history.slice(0, 30);

  persist();
  updateChrome();
  return { xp, stars: result.mode === 'campaign' && result.stage ? save.campaign[Number(result.stage)]?.stars || 0 : 0 };
}

export function addLibraryOpen(ref) {
  if (ref && !save.library.read.includes(ref)) save.library.read.push(ref);
  save.library.opened += 1;
  persist();
  if (save.library.read.length >= 25) unlockAchievement('library');
  updateChrome();
}

const screens = new Map();
const actions = new Map();
const inputHandlers = new Map();
const changeHandlers = new Map();
let currentDef = null;
let currentRoute = 'home';

export function registerScreen(name, def) {
  screens.set(name, typeof def === 'function' ? { render: def } : def);
}

export function action(name, handler) {
  actions.set(name, handler);
}

export function input(name, handler) {
  inputHandlers.set(name, handler);
}

export function change(name, handler) {
  changeHandlers.set(name, handler);
}

export function runAction(name, dataset = {}, el = null) {
  const handler = actions.get(name);
  if (!handler) return;
  try {
    const out = handler(dataset, el);
    if (out && typeof out.catch === 'function') out.catch(error => {
      console.error(error);
      toast('Something went wrong. Please try again.');
    });
  } catch (error) {
    console.error(error);
    toast('Something went wrong. Please try again.');
  }
}

export function currentScreen() {
  return currentRoute;
}

export function navigate(name, { replace = false } = {}) {
  const hash = `#/${name}`;
  if (location.hash === hash) {
    renderRoute();
    return;
  }
  if (replace) history.replaceState(null, '', hash);
  else location.hash = hash;
  if (replace) renderRoute();
}

export function routeFromHash() {
  const raw = location.hash.replace(/^#\/?/, '').split('?')[0].trim();
  return raw || 'home';
}

export function renderRoute() {
  const route = routeFromHash();
  const def = screens.get(route) || screens.get('home');
  const main = document.getElementById('main');
  if (!main || !def) return;
  if (currentDef?.leave) {
    try { currentDef.leave(route); } catch (error) { console.error(error); }
  }
  currentDef = def;
  currentRoute = route;
  const result = def.render() || '';
  main.innerHTML = typeof result === 'string' ? result : result.html || '';
  if (typeof result !== 'string' && typeof result.mount === 'function') result.mount();
  document.title = ROUTE_TITLES[route] || 'Lumen — Bible Trivia';
  updateChrome(route);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  if (location.hash && !location.hash.startsWith('#/')) {
    const target = document.querySelector(location.hash);
    if (target) window.requestAnimationFrame(() => target.scrollIntoView());
  }
}

export function startRouter() {
  if (!location.hash) history.replaceState(null, '', '#/home');
  window.addEventListener('hashchange', renderRoute);
  document.addEventListener('click', event => {
    const nav = event.target.closest('[data-nav]');
    if (nav) {
      event.preventDefault();
      navigate(nav.dataset.nav);
      return;
    }
    const target = event.target.closest('[data-action]');
    if (target) {
      event.preventDefault();
      runAction(target.dataset.action, target.dataset, target);
    }
  });
  document.addEventListener('input', event => {
    const target = event.target.closest('[data-input]');
    if (!target) return;
    const handler = inputHandlers.get(target.dataset.input);
    if (handler) handler(target.value, event, target);
  });
  document.addEventListener('change', event => {
    const target = event.target.closest('[data-change]');
    if (!target) return;
    const handler = changeHandlers.get(target.dataset.change);
    if (handler) handler(target.value, event, target);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeModal();
  });
  document.getElementById('sound-toggle')?.addEventListener('click', () => {
    save.settings.sound = !save.settings.sound;
    persist();
    applySettings();
    updateChrome();
    if (save.settings.sound) sfx.play('click');
    toast(save.settings.sound ? 'Sound on' : 'Sound off');
  });
  document.getElementById('settings-btn')?.addEventListener('click', openSettings);
  applySettings();
  updateChrome();
  renderRoute();
}

export function updateChrome(route = currentRoute) {
  const navRoute = route === 'quickplay' || route === 'categories' || route === 'daily' ? 'home' : route;
  document.querySelectorAll('[data-nav]').forEach(el => {
    const target = el.dataset.nav;
    const isActive = target === navRoute;
    el.classList.toggle('active', isActive);
  });
  const streak = document.getElementById('header-streak-count');
  if (streak) streak.textContent = save.daily.streak;
  const initial = document.getElementById('avatar-initial');
  if (initial) initial.textContent = initials(save.profile.name);
  const level = document.getElementById('avatar-level');
  if (level) level.textContent = levelInfo().level;
  const soundBtn = document.getElementById('sound-toggle');
  if (soundBtn) {
    soundBtn.setAttribute('aria-pressed', String(save.settings.sound));
    soundBtn.title = save.settings.sound ? 'Sound on' : 'Sound off';
  }
}

export function applySettings() {
  document.documentElement.dataset.theme = save.settings.theme === 'day' ? 'day' : 'night';
  document.body.classList.toggle('muted', !save.settings.sound);
  document.body.classList.toggle('reduce-motion', Boolean(save.settings.reduceMotion));
  sfx.muted = !save.settings.sound;
}

let toastTimer = 0;
export function toast(message, ms = 2400) {
  const node = document.getElementById('toast');
  if (!node) return;
  node.innerHTML = message;
  node.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => node.classList.remove('show'), ms);
}

let activeModal = null;

function closeModal() {
  const root = document.getElementById('modal-root');
  if (!root) return;
  root.innerHTML = '';
  document.body.classList.remove('modal-open');
  activeModal = null;
}

export { closeModal };

export function openModal({ title = '', sub = '', body = '', actions: modalActions = '', onMount = null }) {
  closeModal();
  const root = document.getElementById('modal-root');
  if (!root) return null;
  root.innerHTML = `
    <div class="modal-backdrop" data-modal-backdrop>
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-head">
          <div>
            <h2 class="modal-title" id="modal-title">${esc(title)}</h2>
            ${sub ? `<p class="modal-sub">${esc(sub)}</p>` : ''}
          </div>
          <button class="modal-close" type="button" data-modal-close aria-label="Close">${icon('x')}</button>
        </div>
        ${body}
        ${modalActions ? `<div class="modal-actions">${modalActions}</div>` : ''}
      </div>
    </div>`;
  document.body.classList.add('modal-open');
  activeModal = root.firstElementChild;
  const close = () => closeModal();
  root.querySelectorAll('[data-modal-close]').forEach(btn => btn.addEventListener('click', close));
  activeModal.addEventListener('click', event => {
    if (event.target === activeModal) close();
  });
  if (onMount) onMount(activeModal);
  window.setTimeout(() => {
    const focus = activeModal?.querySelector('button, input, select, a');
    focus?.focus();
  }, 60);
  return { close, el: activeModal };
}

export function openSettings() {
  const modal = openModal({
    title: 'Settings',
    sub: 'Shape the experience to your pace.',
    body: `
      <div class="setting-row">
        <div><div class="setting-name">Appearance</div><div class="setting-desc">Night is the signature Lumen look.</div></div>
        <div class="setting-controls"><div class="segmented" data-seg="theme">
          <button type="button" data-action="setting-theme" data-value="night" class="${save.settings.theme !== 'day' ? 'active' : ''}">Night</button>
          <button type="button" data-action="setting-theme" data-value="day" class="${save.settings.theme === 'day' ? 'active' : ''}">Day</button>
        </div></div>
      </div>
      <div class="setting-row">
        <div><div class="setting-name">Sound</div><div class="setting-desc">Soft tones for answers and wins.</div></div>
        <label class="switch"><input type="checkbox" data-change="setting-sound" ${save.settings.sound ? 'checked' : ''}><span class="switch-track"></span></label>
      </div>
      <div class="setting-row">
        <div><div class="setting-name">Question timer</div><div class="setting-desc">Turn off for unhurried study.</div></div>
        <label class="switch"><input type="checkbox" data-change="setting-timer" ${save.settings.timer ? 'checked' : ''}><span class="switch-track"></span></label>
      </div>
      <div class="setting-row">
        <div><div class="setting-name">Reduce motion</div><div class="setting-desc">Limit drifting and entrance animations.</div></div>
        <label class="switch"><input type="checkbox" data-change="setting-motion" ${save.settings.reduceMotion ? 'checked' : ''}><span class="switch-track"></span></label>
      </div>
      <div class="modal-actions" style="justify-content:space-between">
        <button class="btn btn-ghost btn-sm" type="button" data-action="reset-progress">Reset progress</button>
        <button class="btn btn-soft btn-sm" type="button" data-modal-close>Done</button>
      </div>`
  });
  return modal;
}

export function openHelp() {
  openModal({
    title: 'How to play',
    sub: 'Every question carries its Scripture reference.',
    body: `
      <ol class="help-list">
        <li><span class="help-num">1</span><span><b>Choose a mode.</b> Play a quick round, follow the 12-stage campaign, or challenge friends.</span></li>
        <li><span class="help-num">2</span><span><b>Answer four ways.</b> Tap an option or press A, B, C, D / 1, 2, 3, 4.</span></li>
        <li><span class="help-num">3</span><span><b>Use your lifelines.</b> Fifty-fifty removes two wrong answers; Hint reveals the Scripture reference; Skip moves on without penalty.</span></li>
        <li><span class="help-num">4</span><span><b>Learn as you go.</b> Every answer reveals the verse and a short note for context.</span></li>
        <li><span class="help-num">5</span><span><b>Grow.</b> Earn XP, unlock ranks and achievements, and keep a daily streak alive.</span></li>
      </ol>`,
    actions: `<button class="btn btn-primary btn-sm" type="button" data-modal-close>Let's play</button>`
  });
}

export const CONFETTI_COLORS = ['#f7dda2', '#e8bf6b', '#c4943d', '#7ea8ef', '#62c79c', '#d97fa8'];

export function confetti(count = 70) {
  const root = document.getElementById('confetti');
  if (!root) return;
  root.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i += 1) {
    const piece = document.createElement('i');
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.setProperty('--dx', `${(Math.random() - 0.5) * 240}px`);
    piece.style.animationDuration = `${2.4 + Math.random() * 2.6}s`;
    piece.style.animationDelay = `${Math.random() * 0.8}s`;
    piece.style.transform = `rotate(${Math.random() * 180}deg)`;
    piece.style.width = `${4 + Math.random() * 6}px`;
    piece.style.height = `${8 + Math.random() * 8}px`;
    frag.appendChild(piece);
  }
  root.appendChild(frag);
  window.setTimeout(() => { root.innerHTML = ''; }, 5600);
}

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  ensure() {
    if (this.muted) return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  tone(freq, duration = 0.12, type = 'sine', volume = 0.04, delay = 0) {
    const ctx = this.ensure();
    if (!ctx) return;
    const start = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  play(name) {
    if (this.muted) return;
    if (name === 'click') this.tone(620, 0.05, 'sine', 0.018);
    if (name === 'correct') {
      this.tone(523.25, 0.16, 'sine', 0.04);
      this.tone(659.25, 0.18, 'sine', 0.04, 0.08);
      this.tone(783.99, 0.24, 'sine', 0.038, 0.16);
    }
    if (name === 'wrong') {
      this.tone(196, 0.2, 'triangle', 0.04);
      this.tone(155.56, 0.28, 'triangle', 0.035, 0.1);
    }
    if (name === 'tick') this.tone(760, 0.035, 'sine', 0.012);
    if (name === 'win') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.32, 'sine', 0.045, i * 0.12));
    }
    if (name === 'join') {
      this.tone(440, 0.1, 'sine', 0.03);
      this.tone(660, 0.16, 'sine', 0.03, 0.09);
    }
  }
}

export const sfx = new SoundEngine();

export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try { document.execCommand('copy'); } finally { area.remove(); }
  return Promise.resolve();
}

export function getSetting(key) {
  return save.settings[key];
}

export function setSetting(key, value) {
  save.settings[key] = value;
  persist();
  applySettings();
  updateChrome();
}
