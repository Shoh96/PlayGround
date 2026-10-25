import {
  CATEGORIES, DIFFICULTIES, QUESTIONS, JOURNAL, DAILY_VERSES, ACHIEVEMENTS
} from './data/questions.js';

export { CATEGORIES, DIFFICULTIES, QUESTIONS, JOURNAL, DAILY_VERSES, ACHIEVEMENTS };

export const CATEGORY_MAP = new Map(CATEGORIES.map(c => [c.key, c]));
export const QUESTION_MAP = new Map(QUESTIONS.map(q => [q.id, q]));
export const DIFFICULTY_MAP = new Map(DIFFICULTIES.map(d => [d.level, d]));
export const ACHIEVEMENT_MAP = new Map(ACHIEVEMENTS.map(a => [a.key, a]));

export const getCategory = key => CATEGORY_MAP.get(key) || CATEGORIES[0];
export const getDifficulty = level => DIFFICULTY_MAP.get(Number(level)) || DIFFICULTIES[0];

export function shuffle(array, rng = Math.random) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function dailyKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function dailySeed(date = new Date()) {
  return hashString(`showdown-${dailyKey(date)}`);
}

export function prepareQuestion(question, rng = Math.random) {
  const indexed = question.choices.map((text, index) => ({ text, index }));
  const mixed = shuffle(indexed, rng);
  return {
    ...question,
    choices: mixed.map(item => item.text),
    answer: mixed.findIndex(item => item.index === question.answer)
  };
}

function poolFor(category, difficulty) {
  let pool = category === 'all' ? QUESTIONS : QUESTIONS.filter(q => q.cat === category);
  if (difficulty !== 'mixed') {
    const tier = Number(difficulty);
    const exact = pool.filter(q => q.diff === tier);
    const near = pool.filter(q => Math.abs(q.diff - tier) === 1);
    const far = pool.filter(q => Math.abs(q.diff - tier) > 1);
    pool = [...exact, ...near, ...far];
  }
  return pool;
}

export function pickQuestions({ category = 'all', difficulty = 'mixed', count = 10, rng = Math.random, exclude = [] } = {}) {
  const excluded = new Set(exclude);
  const pool = poolFor(category, difficulty).filter(q => !excluded.has(q.id));
  const target = Math.min(Number(count) || 10, pool.length);
  const chosen = [];
  const usedCategories = new Set();

  if (category === 'all') {
    const buckets = new Map();
    for (const q of pool) {
      if (!buckets.has(q.cat)) buckets.set(q.cat, []);
      buckets.get(q.cat).push(q);
    }
    const keys = shuffle([...buckets.keys()], rng);
    for (const key of keys) {
      if (chosen.length >= target) break;
      chosen.push(pool.find(q => q.cat === key));
      usedCategories.add(key);
    }
    const remaining = shuffle(pool.filter(q => !chosen.some(c => c.id === q.id)), rng);
    for (const q of remaining) {
      if (chosen.length >= target) break;
      if (usedCategories.has(q.cat) && chosen.length < Math.min(target, 8)) continue;
      chosen.push(q);
    }
    for (const q of remaining) {
      if (chosen.length >= target) break;
      if (!chosen.some(c => c.id === q.id)) chosen.push(q);
    }
  } else {
    const ordered = difficulty === 'mixed' ? shuffle(pool, rng) : pool;
    for (const q of ordered) {
      if (chosen.length >= target) break;
      chosen.push(q);
    }
  }

  return shuffle(chosen.slice(0, target), rng).map(q => prepareQuestion(q, rng));
}

export function dailyChallenge(date = new Date()) {
  const seed = dailySeed(date);
  const rng = mulberry32(seed);
  return pickQuestions({ category: 'all', difficulty: 'mixed', count: 10, rng }).map(q => {
    if (q.diff === 1 && rng() > 0.5) return q;
    return q;
  });
}

export function dailyVerse(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  const day = Math.floor((date - start) / 86400000);
  return DAILY_VERSES[day % DAILY_VERSES.length];
}

export function scoreAnswer({ difficulty = 2, remainingMs = 0, timerMs = 20000, streak = 0 } = {}) {
  const base = 600 + Number(difficulty) * 100;
  const speed = Math.round(400 * Math.max(0, Math.min(1, remainingMs / timerMs)));
  const streakBonus = Math.min(500, Math.max(0, streak) * 100);
  return { base, speed, streakBonus, total: base + speed + streakBonus };
}

export function starsFor(correct, total) {
  if (!total) return 0;
  const ratio = correct / total;
  if (ratio >= 0.9) return 3;
  if (ratio >= 0.7) return 2;
  if (ratio >= 0.5) return 1;
  return 0;
}

export function xpForGame({ score = 0, correct = 0, total = 0, difficulty = 2, mode = 'solo' }) {
  const completion = total > 0 ? 40 : 0;
  const accuracy = total ? correct / total : 0;
  const modeBonus = mode === 'online' ? 1.25 : mode === 'daily' ? 1.15 : mode === 'journey' ? 1.1 : 1;
  return Math.round((Math.round(score / 20) + correct * 10 + completion + Math.round(accuracy * 60)) * modeBonus);
}

export function levelInfo(xp = 0) {
  const level = Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
  const currentFloor = (level - 1) ** 2 * 100;
  const nextFloor = level ** 2 * 100;
  const progress = Math.max(0, Math.min(1, (xp - currentFloor) / Math.max(1, nextFloor - currentFloor)));
  return { level, currentFloor, nextFloor, progress, xp };
}

export const LEVEL_TITLES = [
  'Seeker', 'Reader', 'Pilgrim', 'Disciple', 'Scribe', 'Teacher', 'Watchman', 'Elder', 'Prophet', 'Theologian', 'Saint'
];

export function titleForLevel(level = 1) {
  return LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.max(0, Math.floor((level - 1) / 2)))];
}

export function categoryMastery(profile, categoryKey) {
  const stat = profile.categoryStats?.[categoryKey] || { correct: 0, played: 0 };
  if (!stat.played) return 0;
  return Math.min(1, stat.correct / stat.played);
}

export function nextJourneyLevel(profile) {
  const stars = profile.campaign?.stars || {};
  for (const level of JOURNAL) {
    if (!stars[level.level]) return level;
  }
  return JOURNAL[JOURNAL.length - 1];
}

export function journeyUnlocked(profile, level) {
  if (level <= 1) return true;
  return Boolean(profile.campaign?.stars?.[level - 1]);
}

export function achievementProgress(profile) {
  const played = profile.gamesPlayed || 0;
  const correct = profile.totalCorrect || 0;
  const categoryCount = Object.keys(profile.categoryStats || {}).length;
  const unlocked = new Set(profile.achievements || []);
  return ACHIEVEMENTS.map(a => {
    let progress = 0;
    switch (a.key) {
      case 'first-game': progress = Math.min(1, played); break;
      case 'perfect': progress = profile.perfectGames ? 1 : 0; break;
      case 'streak-10': progress = Math.min(1, (profile.bestStreak || 0) / 10); break;
      case 'speedster': progress = profile.speedster ? 1 : 0; break;
      case 'explorer': progress = categoryCount / CATEGORIES.length; break;
      case 'century': progress = Math.min(1, correct / 100); break;
      case 'online-win': progress = profile.onlineWins ? 1 : 0; break;
      case 'daily-7': progress = Math.min(1, (profile.dailyStreak || 0) / 7); break;
      case 'journey-12': progress = Math.min(1, Object.keys(profile.campaign?.stars || {}).length / 12); break;
      case 'sage': progress = profile.sageWins ? 1 : 0; break;
      default: progress = 0;
    }
    return { ...a, unlocked: unlocked.has(a.key), progress: Math.max(0, Math.min(1, progress)) };
  });
}

export function computeAchievements(profile) {
  const unlocked = new Set(profile.achievements || []);
  const add = key => unlocked.add(key);
  if ((profile.gamesPlayed || 0) >= 1) add('first-game');
  if (profile.perfectGames) add('perfect');
  if ((profile.bestStreak || 0) >= 10) add('streak-10');
  if (profile.speedster) add('speedster');
  if (Object.keys(profile.categoryStats || {}).length >= CATEGORIES.length) add('explorer');
  if ((profile.totalCorrect || 0) >= 100) add('century');
  if (profile.onlineWins) add('online-win');
  if ((profile.dailyStreak || 0) >= 7) add('daily-7');
  if (Object.keys(profile.campaign?.stars || {}).length >= 12) add('journey-12');
  return [...unlocked];
}

export function dateLabel(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
}

export function shortDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

export function timeAgo(iso) {
  const then = new Date(iso).getTime();
  const seconds = Math.max(1, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function todayKey(date = new Date()) {
  return dailyKey(date);
}

export function streakDays(profile) {
  const dates = new Set(profile.dailyDates || []);
  const days = [];
  const now = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({ key: dailyKey(d), label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()], done: dates.has(dailyKey(d)) });
  }
  return days;
}
