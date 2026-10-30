export const FORMATS = [
  {
    id: 'all',
    name: 'Mixed quest',
    short: 'Mixed',
    description: 'A rotating blend of trivia, picture clues, word play, and verse recall.',
  },
  {
    id: 'trivia',
    name: 'Bible trivia',
    short: 'Trivia',
    description: 'Direct questions with four possible answers.',
  },
  {
    id: 'recall',
    name: 'Verse recall',
    short: 'Recall',
    description: 'Complete missing words and identify the book behind a passage.',
  },
  {
    id: 'wordplay',
    name: 'Word play',
    short: 'Word play',
    description: 'Unscramble Bible names, places, and books.',
  },
  {
    id: 'image',
    name: 'Picture clue',
    short: 'Pictures',
    description: 'Guess the Bible story from an illustrated symbol clue.',
  },
  {
    id: 'riddle',
    name: 'Who am I?',
    short: 'Riddles',
    description: 'Identity riddles from the lives of Bible people.',
  },
]

export const FORMAT_MAP = Object.fromEntries(FORMATS.map((format) => [format.id, format]))

export const QUESTION_TYPES = ['trivia', 'verse', 'book', 'wordplay', 'image', 'riddle']

export function questionMatchesFormat(question, format = 'all') {
  if (format === 'all') return true
  if (format === 'recall') return question.format === 'verse' || question.format === 'book'
  return question.format === format
}
