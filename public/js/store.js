import {
  categoryMastery, computeAchievements, dailyKey, levelInfo, starsFor, xpForGame
} from './engine.js';

const STORAGE_KEY = 'scripture-showdown.profile.v1';

export function defaultProfile() {
  return {
    version: 1,
    name: 'Pilgrim',
    avatar: 'star',
    xp: 0,
    gamesPlayed: 0,
    questionsAnswered: 0,
    totalCorrect: 0,
    totalScore: 0,
    bestScore: 0,
    bestStreak: 0,
    onlineWins: 0,
    onlineGames: 0,
    dailyStreak: 0,
    dailyDates: [],
    lastDaily: null,
    perfectGames: 0,
    speedster: false,
    sageWins: 0,
    categoryStats: {},
    campaign: { stars: {} },
    achievements: [],
    settings: {
      sound: true,
      music: false,
      reducedMotion: false,
      theme: 'dark',
      timer: 20
    },
    seenWelcome: false,
    createdAt: new Date().toISOString()
  };
}

function mergeProfile(raw) {
  const base = defaultProfile();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings || {}) },
    campaign: { ...base.campaign, ...(raw.campaign || {}), stars: { ...(raw.campaign?.stars || {}) } },
    categoryStats: { ...(raw.categoryStats || {}) },
    dailyDates: Array.isArray(raw.dailyDates) ? raw.dailyDates.slice(-90) : [],
    achievements: Array.isArray(raw.achievements) ? raw.achievements : []
  };
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return mergeProfile(raw ? JSON.parse(raw) : null);
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage can be unavailable in private browsing; the game still works for the session.
  }
  return profile;
}

export function resetProfile() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return defaultProfile();
}

export function updateProfile(profile, patch) {
  const next = { ...profile, ...patch };
  saveProfile(next);
  return next;
}

export function setSetting(profile, key, value) {
  const settings = { ...profile.settings, [key]: value };
  const next = { ...profile, settings };
  saveProfile(next);
  return next;
}

export function recordGame(profile, result) {
  const beforeLevel = levelInfo(profile.xp).level;
  const next = {
    ...profile,
    settings: { ...profile.settings },
    categoryStats: { ...profile.categoryStats },
    campaign: { stars: { ...profile.campaign.stars } },
    dailyDates: [...(profile.dailyDates || [])],
    achievements: [...(profile.achievements || [])]
  };
  const accuracy = result.total ? result.correct / result.total : 0;
  const stars = starsFor(result.correct, result.total);

  next.gamesPlayed = (next.gamesPlayed || 0) + 1;
  next.questionsAnswered = (next.questionsAnswered || 0) + result.total;
  next.totalCorrect = (next.totalCorrect || 0) + result.correct;
  next.totalScore = (next.totalScore || 0) + result.score;
  next.bestScore = Math.max(next.bestScore || 0, result.score);
  next.bestStreak = Math.max(next.bestStreak || 0, result.bestStreak || 0);
  next.xp = (next.xp || 0) + xpForGame({
    score: result.score,
    correct: result.correct,
    total: result.total,
    difficulty: Number(result.difficulty) || 2,
    mode: result.mode
  });

  if (result.total >= 10 && result.correct === result.total) next.perfectGames = (next.perfectGames || 0) + 1;
  if (result.answerTimes?.length) {
    const average = result.answerTimes.reduce((sum, value) => sum + value, 0) / result.answerTimes.length;
    if (average <= 6000) next.speedster = true;
  }

  if (result.breakdown) {
    for (const [category, value] of Object.entries(result.breakdown)) {
      const stats = next.categoryStats[category] || { played: 0, correct: 0 };
      next.categoryStats[category] = {
        played: stats.played + (value.total || 0),
        correct: stats.correct + (value.correct || 0)
      };
    }
  } else if (result.category && result.category !== 'all') {
    const stats = next.categoryStats[result.category] || { played: 0, correct: 0 };
    next.categoryStats[result.category] = {
      played: stats.played + result.total,
      correct: stats.correct + result.correct
    };
  }

  if (result.mode === 'daily' && result.dailyKey) {
    if (!next.dailyDates.includes(result.dailyKey)) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const wasYesterday = next.lastDaily === dailyKey(yesterday);
      next.dailyStreak = wasYesterday ? (next.dailyStreak || 0) + 1 : 1;
      next.lastDaily = result.dailyKey;
      next.dailyDates.push(result.dailyKey);
      next.dailyDates = next.dailyDates.slice(-90);
    }
  }

  if (result.mode === 'journey' && result.level) {
    const previous = next.campaign.stars[result.level] || 0;
    next.campaign.stars[result.level] = Math.max(previous, stars);
  }

  if (result.mode === 'online') {
    next.onlineGames = (next.onlineGames || 0) + 1;
    if (result.won) next.onlineWins = (next.onlineWins || 0) + 1;
  }

  if (Number(result.difficulty) === 4 && stars > 0) {
    next.sageWins = (next.sageWins || 0) + 1;
  }

  next.achievements = computeAchievements(next);
  saveProfile(next);

  const afterLevel = levelInfo(next.xp).level;
  return {
    profile: next,
    stars,
    accuracy,
    xpGained: next.xp - profile.xp,
    levelUp: afterLevel > beforeLevel ? afterLevel : null,
    newAchievements: next.achievements.filter(key => !(profile.achievements || []).includes(key)),
    categoryMastery: result.category && result.category !== 'all' ? categoryMastery(next, result.category) : null
  };
}

export function exportProfile(profile) {
  return JSON.stringify(profile, null, 2);
}

export function importProfile(raw) {
  try {
    const parsed = JSON.parse(raw);
    const merged = mergeProfile(parsed);
    saveProfile(merged);
    return merged;
  } catch {
    return null;
  }
}
