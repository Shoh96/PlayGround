import { CHALLENGES, CHALLENGE_MAP, CATEGORY_MAP } from '../data/categories.js'
import { questionMatchesFormat } from '../data/formats.js'
import { QUESTIONS, questionInCategory } from '../data/questions.js'
import { DAILY_VERSES } from '../data/verses.js'

export const XP_PER_LEVEL = 300
export const LEVEL_TITLES = [
  { min: 1, title: 'Seeker' },
  { min: 3, title: 'Scribe' },
  { min: 5, title: 'Disciple' },
  { min: 8, title: 'Teacher' },
  { min: 12, title: 'Sage' },
  { min: 17, title: 'Prophet' },
  { min: 25, title: 'Torchbearer' },
]

export function levelFromXp(xp = 0) {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1)
}

export function levelTitle(level) {
  return [...LEVEL_TITLES].reverse().find((entry) => level >= entry.min)?.title || 'Seeker'
}

export function levelProgress(xp = 0) {
  const level = levelFromXp(xp)
  const floor = (level - 1) * XP_PER_LEVEL
  const next = level * XP_PER_LEVEL
  return {
    level,
    title: levelTitle(level),
    current: xp - floor,
    needed: XP_PER_LEVEL,
    next,
    percent: Math.min(100, Math.round(((xp - floor) / XP_PER_LEVEL) * 100)),
  }
}

export function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function mulberry32(seed) {
  let state = seed >>> 0
  return function random() {
    state += 0x6d2b79f5
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle(items, rng = Math.random) {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(rng() * (index + 1))
    ;[next[index], next[target]] = [next[target], next[index]]
  }
  return next
}

function mixedFormatPlan(count) {
  const opening = ['trivia', 'wordplay', 'image', 'riddle']
  const tail = ['recall', 'wordplay', 'recall', 'riddle', 'recall', 'image']
  return Array.from({ length: count }, (_, index) => {
    if (index < opening.length) return opening[index]
    return tail[(index - opening.length) % tail.length]
  })
}

function difficultyPlan(count, config) {
  const levels = ['easy', 'medium', 'hard', 'expert'].filter((level) => (config.weights[level] || 0) > 0)
  if (!levels.length) return Array.from({ length: count }, () => 'medium')
  const total = levels.reduce((sum, level) => sum + config.weights[level], 0)
  return Array.from({ length: count }, (_, index) => {
    const progress = count <= 1 ? 0.5 : (index + 0.5) / count
    let roll = progress * total
    for (const level of levels) {
      roll -= config.weights[level]
      if (roll <= 0) return level
    }
    return levels[levels.length - 1]
  })
}

function takeWeighted(items, config, rng) {
  if (!items.length) return null
  const weights = items.map((question) => Math.max(0.05, config.weights[question.difficulty] ?? 1))
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let roll = rng() * total
  let chosen = items.length - 1
  for (let index = 0; index < items.length; index += 1) {
    roll -= weights[index]
    if (roll <= 0) {
      chosen = index
      break
    }
  }
  return items.splice(chosen, 1)[0]
}

export function pickQuestions({
  category = 'all',
  challenge = 'disciple',
  format = 'all',
  count = 8,
  seed = Date.now(),
  daily = false,
} = {}) {
  const challengeConfig = CHALLENGE_MAP[challenge] || CHALLENGE_MAP.disciple
  const pool = QUESTIONS.filter(
    (question) => questionInCategory(question, category) && questionMatchesFormat(question, format),
  )
  const rng = mulberry32(hashString(String(seed)))
  const selected = []
  const selectedIds = new Set()
  const target = Math.min(count, pool.length)

  function pullFrom(candidates, difficulty) {
    const available = candidates.filter((question) => !selectedIds.has(question.id))
    if (!available.length) return false
    const preferred = difficulty ? available.filter((question) => question.difficulty === difficulty) : []
    const picked = takeWeighted(preferred.length ? preferred : available, challengeConfig, rng)
    if (!picked) return false
    selected.push(picked)
    selectedIds.add(picked.id)
    return true
  }

  const groups = new Map()
  for (const question of pool) {
    const group = groups.get(question.format) || []
    group.push(question)
    groups.set(question.format, group)
  }
  const plannedFormats = mixedFormatPlan(target)
  const plannedDifficulties = difficultyPlan(target, challengeConfig)

  for (let slot = 0; slot < target; slot += 1) {
    if (format === 'all') {
      const planned = plannedFormats[slot]
      const candidates = planned === 'recall'
        ? [...(groups.get('verse') || []), ...(groups.get('book') || [])]
        : groups.get(planned) || []
      pullFrom(candidates, plannedDifficulties[slot])
    } else {
      pullFrom(pool, plannedDifficulties[slot])
    }
  }

  while (selected.length < target) {
    if (!pullFrom(pool)) break
  }

  return selected.map((question) => {
    const options = shuffle(question.options, mulberry32(hashString(`${seed}-${question.id}-options`)))
    return {
      ...question,
      options,
      answer: options.indexOf(question.options[question.answer]),
    }
  })
}

export function challengeConfig(challenge) {
  return CHALLENGE_MAP[challenge] || CHALLENGE_MAP.disciple
}

export function scoreAnswer({ correct, timeLeft, timer, challenge, streak }) {
  if (!correct) return 0
  const config = challengeConfig(challenge)
  const base = 100
  const timeBonus = Math.max(0, Math.round((timeLeft / Math.max(1, timer)) * 80))
  const streakBonus = Math.min(60, Math.max(0, streak) * 12)
  return Math.round((base + timeBonus + streakBonus) * config.multiplier)
}

export function resultRank(accuracy) {
  if (accuracy === 100) return { title: 'Flawless', note: 'Every answer held true.' }
  if (accuracy >= 90) return { title: 'Illuminated', note: 'A brilliant display of recall.' }
  if (accuracy >= 75) return { title: 'Faithful', note: 'A strong and steady quest.' }
  if (accuracy >= 60) return { title: 'Growing', note: 'The story is taking root.' }
  if (accuracy >= 40) return { title: 'Seeking', note: 'Keep opening the Book.' }
  return { title: 'Begin Again', note: 'Every scholar starts somewhere.' }
}

export function xpForResult(result, mode = 'solo') {
  const base = result.correct * 12 + Math.round(result.score / 45)
  const perfect = result.correct === result.total && result.total > 0 ? 30 : 0
  const dailyBonus = mode === 'daily' ? Math.round((base + perfect) * 0.5) : 0
  const onlineBonus = mode === 'online' ? 15 : 0
  return Math.max(5, base + perfect + dailyBonus + onlineBonus)
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDaysToKey(dateKey, amount) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(date.getDate() + amount)
  return localDateKey(date)
}

export function prettyDate(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function dailySetup(dateKey = localDateKey()) {
  const seed = `scripture-quest-daily-${dateKey}`
  const hash = hashString(seed)
  return {
    dateKey,
    category: 'all',
    challenge: 'disciple',
    count: 10,
    seed,
    verseIndex: hash % DAILY_VERSES.length,
    label: 'Daily Bread',
  }
}

export function dailyVerse(dateKey = localDateKey()) {
  const setup = dailySetup(dateKey)
  return DAILY_VERSES[setup.verseIndex]
}

export function categoryName(id) {
  return CATEGORY_MAP[id]?.name || 'All Scripture'
}

export function challengeLabel(id) {
  return CHALLENGE_MAP[id]?.name || CHALLENGES[1].name
}

export function relativeTime(iso) {
  const date = new Date(iso)
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
