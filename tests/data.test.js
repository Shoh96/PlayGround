import test from 'node:test'
import assert from 'node:assert/strict'
import { CATEGORIES, CHALLENGES } from '../src/data/categories.js'
import { CATEGORY_FORMAT_QUESTION_COUNTS, CATEGORY_QUESTION_COUNTS, FORMAT_QUESTION_COUNTS, QUESTIONS, questionInCategory } from '../src/data/questions.js'
import { DAILY_VERSES } from '../src/data/verses.js'
import { dailySetup, levelProgress, pickQuestions, scoreAnswer, xpForResult } from '../src/lib/game.js'
import { hostVoiceSupported, speakHost } from '../src/lib/host.js'
import { FORMATS, questionMatchesFormat } from '../src/data/formats.js'
import { DEFAULT_PROGRESS, updateProgressAfterGame } from '../src/lib/storage.js'

test('the question bank contains 50,000 questions across every category', () => {
  assert.equal(CATEGORIES.length, 14)
  assert.equal(CHALLENGES.length, 4)
  assert.equal(QUESTIONS.length, 50000)
  assert.equal(new Set(QUESTIONS.map((question) => question.id)).size, QUESTIONS.length)
  for (const category of CATEGORIES) {
    assert.ok(CATEGORY_QUESTION_COUNTS[category.id] > 0, `${category.id} should have questions`)
    const pool = QUESTIONS.filter((question) => questionInCategory(question, category.id))
    assert.equal(pool.length, CATEGORY_QUESTION_COUNTS[category.id])
  }
})

test('every question has four valid, distinct answers and scripture', () => {
  for (const question of QUESTIONS) {
    assert.equal(question.options.length, 4, question.id)
    assert.equal(new Set(question.options).size, 4, question.id)
    assert.ok(Number.isInteger(question.answer), question.id)
    assert.ok(question.answer >= 0 && question.answer < 4, question.id)
    assert.ok(question.reference && typeof question.verse === 'string' && question.verse.length > 8 && question.explanation, question.id)
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

test('every game format is populated and selectable', () => {
  const formatIds = FORMATS.map((format) => format.id)
  assert.deepEqual(formatIds, ['all', 'trivia', 'recall', 'wordplay', 'image', 'riddle'])
  for (const format of ['trivia', 'verse', 'book', 'wordplay', 'image', 'riddle']) {
    assert.ok(FORMAT_QUESTION_COUNTS[format] > 0, `${format} should have questions`)
  }
  assert.ok(QUESTIONS.every((question) => ['trivia', 'verse', 'book', 'wordplay', 'image', 'riddle'].includes(question.format)))
  assert.ok(QUESTIONS.filter((question) => question.format === 'image').every((question) => question.symbols?.length === 3))
  assert.ok(QUESTIONS.filter((question) => question.format === 'riddle').every((question) => question.prompt.includes('am I?')))
  assert.ok(QUESTIONS.filter((question) => question.format === 'wordplay').every((question) => question.prompt.startsWith('Unscramble')))

  const mixed = pickQuestions({ count: 10, seed: 'mixed-formats' })
  const formats = new Set(mixed.map((question) => question.format))
  assert.ok(formats.size >= 4, [...formats].join(', '))
  assert.ok(mixed.every((question) => questionMatchesFormat(question, 'all')))

  const wordplay = pickQuestions({ format: 'wordplay', count: 8, seed: 'wordplay' })
  assert.equal(wordplay.length, 8)
  assert.ok(wordplay.every((question) => question.format === 'wordplay'))

  const recall = pickQuestions({ format: 'recall', count: 8, seed: 'recall' })
  assert.ok(recall.every((question) => ['verse', 'book'].includes(question.format)))

  const images = pickQuestions({ format: 'image', count: 6, seed: 'images' })
  assert.equal(images.length, 6)
  assert.ok(images.every((question) => question.format === 'image' && question.symbols?.length === 3))

  for (const category of CATEGORIES) {
    for (const format of ['trivia', 'riddle', 'wordplay', 'image']) {
      assert.ok((CATEGORY_FORMAT_QUESTION_COUNTS[category.id][format] || 0) >= 10, `${category.id} needs more ${format}`)
    }
  }

  const oldTestament = pickQuestions({ category: 'old-testament', count: 8, seed: 'ot' })
  assert.ok(oldTestament.every((question) => questionInCategory(question, 'old-testament')))
})

test('voice host falls back safely when speech is unavailable', () => {
  assert.equal(hostVoiceSupported(), false)
  let ended = false
  const cancel = speakHost('Test question', { onEnd: () => { ended = true } })
  assert.equal(ended, true)
  assert.equal(typeof cancel, 'function')
})

test('mixed rounds alternate formats and ramp difficulty', () => {
  const round = pickQuestions({ count: 12, challenge: 'disciple', seed: 'ramp' })
  const ranks = { easy: 0, medium: 1, hard: 2, expert: 3 }
  const formats = round.map((question) => question.format)
  assert.ok(new Set(formats).size >= 4)
  assert.ok(ranks[round[0].difficulty] < ranks[round[round.length - 1].difficulty])
})
