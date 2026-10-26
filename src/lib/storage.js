import { levelFromXp } from './game.js'
import { ACHIEVEMENTS } from './achievements.js'

export const STORAGE_KEY = 'scripture-quest-progress-v1'

export const DEFAULT_PROGRESS = {
  xp: 0,
  level: 1,
  games: 0,
  totalCorrect: 0,
  totalAnswered: 0,
  bestScore: 0,
  bestStreak: 0,
  perfectGames: 0,
  perfectHard: 0,
  dailyCompletions: 0,
  lastDailyDate: null,
  dailyStreak: 0,
  lastPlayedDate: null,
  categories: {},
  achievements: [],
  history: [],
  partyGames: 0,
  onlineGames: 0,
  soloGames: 0,
  dailyGames: 0,
  settings: {
    sound: true,
    haptics: true,
    timer: true,
    reduceMotion: false,
    playerName: 'Pilgrim',
  },
}

function cloneDefaults() {
  return JSON.parse(JSON.stringify(DEFAULT_PROGRESS))
}

export function loadProgress() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return cloneDefaults()
    const parsed = JSON.parse(raw)
    return {
      ...cloneDefaults(),
      ...parsed,
      categories: { ...(parsed.categories || {}) },
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      history: Array.isArray(parsed.history) ? parsed.history : [],
      settings: { ...DEFAULT_PROGRESS.settings, ...(parsed.settings || {}) },
      level: levelFromXp(parsed.xp || 0),
    }
  } catch {
    return cloneDefaults()
  }
}

export function saveProgress(progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage can be unavailable in private browsing. The game still works in memory.
  }
}

export function resetProgress() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Ignore storage failures.
  }
  return cloneDefaults()
}

export function updateProgressAfterGame(progress, result) {
  const next = {
    ...progress,
    categories: { ...progress.categories },
    achievements: [...progress.achievements],
    history: [...progress.history],
    settings: { ...progress.settings },
  }
  const isDaily = result.mode === 'daily'
  const xpEarned = result.xpEarned || 0
  const oldLevel = levelFromXp(next.xp)

  next.xp += xpEarned
  next.level = levelFromXp(next.xp)
  next.games += 1
  next.totalCorrect += result.correct
  next.totalAnswered += result.total
  next.bestScore = Math.max(next.bestScore, result.score)
  next.bestStreak = Math.max(next.bestStreak, result.bestStreak || 0)
  next.soloGames += result.mode === 'solo' ? 1 : 0
  next.dailyGames += result.mode === 'daily' ? 1 : 0
  next.partyGames += result.mode === 'party' ? 1 : 0
  next.onlineGames += result.mode === 'online' ? 1 : 0
  if (result.correct === result.total && result.total > 0) next.perfectGames += 1
  if (result.correct === result.total && ['scholar', 'expert'].includes(result.challenge)) next.perfectHard += 1

  for (const answer of result.answers || []) {
    const categoryId = answer.category || result.category
    if (!categoryId || categoryId === 'all') continue
    const entry = next.categories[categoryId] || { played: 0, correct: 0 }
    next.categories[categoryId] = {
      played: entry.played + 1,
      correct: entry.correct + (answer.correct ? 1 : 0),
    }
  }

  if (isDaily && next.lastDailyDate !== result.dateKey) {
    next.dailyCompletions += 1
    next.lastDailyDate = result.dateKey
  }

  const today = result.dateKey
  if (next.lastPlayedDate !== today) {
    next.dailyStreak = next.lastPlayedDate && next.lastPlayedDate === previousDateKey(today) ? next.dailyStreak + 1 : 1
    next.lastPlayedDate = today
  }

  const historyEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    mode: result.mode,
    category: result.category,
    challenge: result.challenge,
    score: result.score,
    correct: result.correct,
    total: result.total,
    dateKey: result.dateKey,
    at: new Date().toISOString(),
  }
  next.history = [historyEntry, ...next.history].slice(0, 24)

  const unlocked = []
  for (const achievement of ACHIEVEMENTS) {
    if (!next.achievements.includes(achievement.id) && achievement.check(next)) {
      next.achievements.push(achievement.id)
      unlocked.push(achievement.id)
    }
  }

  return {
    progress: next,
    unlocked,
    xpEarned,
    leveledUp: next.level > oldLevel,
    oldLevel,
  }
}

function previousDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() - 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
