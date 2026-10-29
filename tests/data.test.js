import test from 'node:test'
import assert from 'node:assert/strict'
import { CATEGORIES, CHALLENGES } from '../src/data/categories.js'
import { CATEGORY_QUESTION_COUNTS, QUESTIONS } from '../src/data/questions.js'
import { DAILY_VERSES } from '../src/data/verses.js'
import { dailySetup, levelProgress, pickQuestions, scoreAnswer, xpForResult } from '../src/lib/game.js'
import { DEFAULT_PROGRESS, updateProgressAfterGame } from '../src/lib/storage.js'

test('the question bank contains 50,000 questions across every category', () => {
  assert.equal(CATEGORIES.length, 14)
  assert.equal(CHALLENGES.length, 4)
  assert.equal(QUESTIONS.length, 50000)
  assert.equal(new Set(QUESTIONS.map((question) => question.id)).size, QUESTIONS.length)
  for (const category of CATEGORIES) {
    assert.ok(CATEGORY_QUESTION_COUNTS[category.id] > 0, `${category.id} should have questions`)
    const pool = QUESTIONS.filter((question) => question.category === category.id)
    assert.equal(pool.length, CATEGORY_QUESTION_COUNTS[category.id])
  }
})

test('every question has four valid, distinct answers and scripture', () => {
  for (const question of QUESTIONS) {
    assert.equal(question.options.length, 4, question.id)
    assert.equal(new Set(question.options).size, 4, question.id)
    assert.ok(Number.isInteger(question.answer), question.id)
    assert.ok(question.answer >= 0 && question.answer < 4, question.id)
    assert.ok(question.reference && question.verse && question.explanation, question.id)
    assert.ok(['easy', 'medium', 'hard', 'expert'].includes(question.difficulty), question.id)
    if (question.id.startsWith('kjv-c-')) assert.ok(question.verse.includes(question.options[question.answer]), question.id)
    if (question.id.startsWith('kjv-b-')) assert.ok(question.reference.startsWith(question.options[question.answer]), question.id)
  }
})

test('daily verses are complete and daily setup is deterministic', () => {
  assert.ok(DAILY_VERSES.length >= 30)
  for (const verse of DAILY_VERSES) {
    assert.ok(verse.text && verse.reference && verse.reflection && verse.theme)
  }
  assert.deepEqual(dailySetup('2026-10-26'), dailySetup('2026-10-26'))
  assert.notEqual(dailySetup('2026-10-26').seed, dailySetup('2026-10-27').seed)
})

test('question selection respects category and count limits', () => {
  const all = pickQuestions({ count: 10, seed: 'test' })
  assert.equal(all.length, 10)
  assert.equal(new Set(all.map((question) => question.id)).size, 10)
  const category = pickQuestions({ category: 'women', count: 8, seed: 'test' })
  assert.equal(category.length, 8)
  assert.ok(category.every((question) => question.category === 'women'))
})

test('scoring, levels, XP, and history stay active', () => {
  const base = scoreAnswer({ correct: true, timeLeft: 30, timer: 30, challenge: 'disciple', streak: 0 })
  const fast = scoreAnswer({ correct: true, timeLeft: 30, timer: 30, challenge: 'expert', streak: 4 })
  assert.equal(scoreAnswer({ correct: false, timeLeft: 30, timer: 30, challenge: 'expert', streak: 4 }), 0)
  assert.ok(fast > base)
  assert.equal(levelProgress(0).level, 1)
  assert.equal(levelProgress(300).level, 2)
  assert.equal(levelProgress(300).current, 0)
  assert.ok(xpForResult({ correct: 10, total: 10, score: 1200 }, 'solo') > 0)

  const progress = {
    ...DEFAULT_PROGRESS,
    settings: { ...DEFAULT_PROGRESS.settings },
    categories: {},
    achievements: [],
    history: [],
  }
  const update = updateProgressAfterGame(progress, {
    mode: 'solo',
    category: 'jesus',
    challenge: 'scholar',
    score: 1200,
    correct: 8,
    total: 10,
    bestStreak: 5,
    xpEarned: 320,
    dateKey: '2026-10-29',
    answers: [{ questionId: 'jesus-1', category: 'jesus', correct: true }],
  })
  assert.equal(update.progress.xp, 320)
  assert.equal(update.progress.level, 2)
  assert.equal(update.leveledUp, true)
  assert.equal(update.progress.games, 1)
  assert.equal(update.progress.history.length, 1)
  assert.equal(update.progress.categories.jesus.correct, 1)
})
