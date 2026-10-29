import { CATEGORIES } from './categories.js'
import { CURATED_QUESTIONS } from './curated-questions.js'
import { KJV_BOOKS, KJV_RECORDS, KJV_SOURCE } from './kjv.js'

const STOP_WORDS = new Set(`a an the and or but if then than that this these those of to in on at by for from with into unto upon out up down over under through between among against after before as so not no nor yet also even just only very may might can could would should shall will do did done does been being is are was were be have hath has had thee thou thy thine ye you your he she it they them their his her him we us our i my me mine who whom whose which what when where why how there here all any every each both few more most much many some such own same other another said saith saying spake speak speaketh went came come cometh go goeth make maketh made take taketh took give giveth gave know knoweth knew see seeth saw look behold wherefore therefore thereof therein thereby whereby wherein whereof whosoever whatsoever shouldest wouldest couldest mayest canst didst dost hast hadst shalt wilt art doth doeth goeth cometh giveth maketh taketh knoweth seeth again ever never yes nor still well even now also thus then thither hither whither hence whence peradventure notwithstanding nevertheless moreover furthermore howbeit albeit although though while whilst until till since because unless whether either neither both each every all any some none one two three four five six seven eight nine ten first second third fourth fifth sixth seventh eighth ninth tenth eleven twelve twenty thirty forty fifty hundred thousand`.split(/\s+/))

const FEMALE_PATTERN = /\b(eve|sarah|sarai|hagar|rebekah|rachel|leah|bilhah|zilpah|dinah|tamar|jochebed|miriam|zipporah|rahab|deborah|jael|delilah|naomi|orpah|ruth|hannah|abigail|bathsheba|michal|jezebel|athaliah|esther|vashti|elizabeth|mary|martha|anna|salome|dorcas|tabitha|lydia|priscilla|phoebe|euodia|syntyche|damaris|bernice|drusilla|herodias|joanna|susanna|woman|women|wife|mother|daughter|sister|queen|handmaid|maiden|widow|bride|prophetess)\b/i
const MIRACLE_PATTERN = /\b(parable|parables|miracle|miracles|healed|healeth|heal|healing|sick|sickness|infirmity|infirmities|disease|blind|deaf|dumb|lame|leper|lepers|fever|palsy|devil|demons?|unclean spirit|possessed|cure|loaves|fishes|wine|storm|calm|multitude|raised|dead|kingdom|sheep|vineyard|sower|harvest|talents|lost)\b/i
const GEOGRAPHY_PATTERN = /\b(mount|mountain|mountains|river|rivers|sea|seas|wilderness|desert|city|cities|valley|hill|island|coast|border|egypt|canaan|jerusalem|bethlehem|nazareth|galilee|jordan|jericho|samaria|babylon|damascus|antioch|ephesus|rome|corinth|philippi|thessalonica|athens|crete|malta|cyprus|patmos|sinai|horeb|carmel|zion|edom|moab|ammon|philistia|syria|assyria|persia)\b/i
const NUMBER_PATTERN = /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|twelfth|fortieth|fiftieth)\b/i

const COMPLETION_PROMPTS = [
  'Which word fills the blank?',
  'Complete the verse.',
  'Fill in the missing word.',
  'Recover the missing word.',
]
const BOOK_PROMPTS = [
  'Which book contains this passage?',
  'In which book is this verse found?',
  'This passage comes from which book?',
  'Which book of the Bible records this verse?',
]
const SENTENCE_START = /[.!?;:"'“”‘’]\s*$/

function hashString(value) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function makeRandom(seed) {
  let state = seed >>> 0
  return function random() {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(items, random) {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[next[index], next[target]] = [next[target], next[index]]
  }
  return next
}

function candidatesFor(text) {
  const tokens = [...text.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)].map((match) => match[0])
  const counts = new Map()
  for (const token of tokens) {
    const lower = token.toLowerCase()
    counts.set(lower, (counts.get(lower) || 0) + 1)
  }
  const candidates = []
  const seen = new Set()
  for (const token of tokens) {
    const lower = token.toLowerCase()
    const minimum = token[0] === token[0].toUpperCase() ? 4 : 5
    if (token.length < minimum || STOP_WORDS.has(lower) || seen.has(lower) || counts.get(lower) !== 1) continue
    seen.add(lower)
    candidates.push(token)
  }
  return candidates
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildWordIndex() {
  const frequency = new Map()
  const lowerByLength = new Map()
  const properByLength = new Map()
  const lowerSeen = new Set()
  const properSeen = new Set()

  function addToBucket(buckets, seen, word) {
    if (seen.has(word)) return
    seen.add(word)
    const bucket = buckets.get(word.length) || []
    bucket.push(word)
    buckets.set(word.length, bucket)
  }

  for (const [, , , text] of KJV_RECORDS) {
    let previousEnd = 0
    for (const match of text.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)) {
      const word = match[0]
      const lower = word.toLowerCase()
      if (word.length < 4 || STOP_WORDS.has(lower)) {
        previousEnd = match.index + word.length
        continue
      }
      frequency.set(lower, (frequency.get(lower) || 0) + 1)
      if (word === lower) addToBucket(lowerByLength, lowerSeen, lower)
      const before = text.slice(previousEnd, match.index)
      const startsSentence = match.index === 0 || SENTENCE_START.test(before.trimEnd())
      if (word[0] === word[0].toUpperCase() && !startsSentence) {
        addToBucket(properByLength, properSeen, word)
      }
      previousEnd = match.index + word.length
    }
  }

  for (const buckets of [lowerByLength, properByLength]) {
    for (const [length, bucket] of buckets) {
      bucket.sort((a, b) => (frequency.get(b.toLowerCase()) || 0) - (frequency.get(a.toLowerCase()) || 0))
      buckets.set(length, bucket.slice(0, 500))
    }
  }
  return { frequency, lowerByLength, properByLength }
}

const WORD_INDEX = buildWordIndex()

function pickDistractors(word, verseWords, random) {
  const proper = word[0] === word[0].toUpperCase()
  const buckets = proper ? WORD_INDEX.properByLength : WORD_INDEX.lowerByLength
  const lengths = [word.length, word.length - 1, word.length + 1, word.length - 2, word.length + 2]
  const sources = lengths.map((length) => buckets.get(length)).filter((bucket) => bucket?.length)
  const fallback = [...buckets.values()]
  const chosen = []
  const seen = new Set([word.toLowerCase()])
  let attempts = 0

  while (chosen.length < 3 && attempts < 160) {
    const source = sources.length ? sources[Math.floor(random() * sources.length)] : fallback[Math.floor(random() * fallback.length)]
    const candidate = source?.[Math.floor(random() * source.length)]
    attempts += 1
    if (!candidate) continue
    const lower = candidate.toLowerCase()
    if (seen.has(lower) || verseWords.has(lower)) continue
    seen.add(lower)
    chosen.push(candidate)
  }

  if (chosen.length < 3) {
    for (const bucket of fallback) {
      for (const candidate of bucket) {
        const lower = candidate.toLowerCase()
        if (seen.has(lower) || verseWords.has(lower)) continue
        seen.add(lower)
        chosen.push(candidate)
        if (chosen.length >= 3) break
      }
      if (chosen.length >= 3) break
    }
  }
  return chosen
}

function makeOptions(word, verseWords, random) {
  const options = [word, ...pickDistractors(word, verseWords, random)]
  const shuffled = shuffle(options, random)
  return { options: shuffled, answer: shuffled.indexOf(word) }
}

function completionCategory(book, text, index) {
  if (index > 0) return book.testament === 'OT' ? 'old-testament' : 'new-testament'
  if (FEMALE_PATTERN.test(text)) return 'women'
  if (['jesus', 'early-church'].includes(book.theme) && MIRACLE_PATTERN.test(text)) return 'miracles-parables'
  if (NUMBER_PATTERN.test(text) || GEOGRAPHY_PATTERN.test(text)) return 'numbers-geography'
  return book.theme
}

function completionDifficulty(word) {
  const frequency = WORD_INDEX.frequency.get(word.toLowerCase()) || 0
  if (frequency >= 1200) return 'easy'
  if (frequency >= 450) return 'medium'
  if (frequency >= 120) return 'hard'
  return 'expert'
}

function bookDifficulty(book) {
  if ([0, 1, 2, 3, 4, 18, 19, 39, 40, 41, 42, 43].includes(book.id)) return 'easy'
  if (book.id < 23 || (book.id >= 44 && book.id <= 57)) return 'medium'
  if (book.id < 65) return 'hard'
  return 'expert'
}

function buildGeneratedQuestions() {
  const generated = []
  for (const [bookIndex, chapter, verse, text] of KJV_RECORDS) {
    const book = KJV_BOOKS[bookIndex]
    const candidates = candidatesFor(text)
    if (candidates.length < 2) continue
    const recordSeed = hashString(`${bookIndex}-${chapter}-${verse}`)
    const selectedWords = shuffle(candidates, makeRandom(recordSeed)).slice(0, 2)
    const verseWords = new Set((text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || []))
    const reference = `${book.name} ${chapter}:${verse}`

    selectedWords.forEach((word, index) => {
      const random = makeRandom(hashString(`${recordSeed}-${index}-options`))
      const { options, answer } = makeOptions(word, verseWords, random)
      const promptIndex = hashString(`${recordSeed}-${index}-prompt`) % COMPLETION_PROMPTS.length
      const prompt = text.replace(new RegExp(`\\b${escapeRegExp(word)}\\b`), '_____')
      generated.push({
        id: `kjv-c-${bookIndex}-${chapter}-${verse}-${index + 1}`,
        category: completionCategory(book, text, index),
        difficulty: completionDifficulty(word),
        prompt: `${COMPLETION_PROMPTS[promptIndex]} “${prompt}”`,
        options,
        answer,
        reference,
        verse: text,
        explanation: `The missing word is “${word}.” This verse is recorded in ${reference}.`,
      })
    })

    const bookRandom = makeRandom(hashString(`${recordSeed}-book`))
    const sameTestament = KJV_BOOKS.filter((entry) => entry.testament === book.testament && entry.id !== book.id)
    const distractors = shuffle(sameTestament, bookRandom).slice(0, 3).map((entry) => entry.name)
    const bookOptions = shuffle([book.name, ...distractors], bookRandom)
    generated.push({
      id: `kjv-b-${bookIndex}-${chapter}-${verse}`,
      category: 'books',
      difficulty: bookDifficulty(book),
      prompt: `${BOOK_PROMPTS[hashString(`${recordSeed}-book-prompt`) % BOOK_PROMPTS.length]} “${text}”`,
      options: bookOptions,
      answer: bookOptions.indexOf(book.name),
      reference,
      verse: text,
      explanation: `This passage is found in ${reference}.`,
    })
  }
  return generated
}

const GENERATED_QUESTIONS = buildGeneratedQuestions()

export const QUESTIONS = [...CURATED_QUESTIONS, ...GENERATED_QUESTIONS]
export const QUESTION_COUNT = QUESTIONS.length
export const QUESTION_MAP = Object.fromEntries(QUESTIONS.map((question) => [question.id, question]))
export const QUESTION_SOURCE = KJV_SOURCE

export const CATEGORY_QUESTION_COUNTS = Object.fromEntries(CATEGORIES.map((category) => [category.id, 0]))
for (const question of QUESTIONS) {
  CATEGORY_QUESTION_COUNTS[question.category] = (CATEGORY_QUESTION_COUNTS[question.category] || 0) + 1
}
