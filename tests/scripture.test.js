import test from 'node:test'
import assert from 'node:assert/strict'
import { EVENTS, NUMBER_FACTS, PEOPLE, PLACES } from '../src/data/activities.js'
import { CURATED_QUESTIONS } from '../src/data/curated-questions.js'
import { QUESTIONS } from '../src/data/questions.js'

const REFERENCE_PATTERN = /^(?:[1-3] )?[A-Za-z]+(?: [A-Za-z]+)* \d+:\d+(?:-\d+)?(?:; (?:[1-3] )?[A-Za-z]+(?: [A-Za-z]+)* \d+:\d+(?:-\d+)?)*$/

// The KJV uses older spellings for some names and places. These are the same
// answers, not different people or places.
const NAME_ALIASES = {
  'caesarea maritima': ['caesarea'],
  elizabeth: ['elisabeth'],
  malta: ['melita'],
  pergamum: ['pergamos'],
  susa: ['shushan'],
  'zechariah the priest': ['zacharias'],
}

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]/g, '')
}

function namesFor(name) {
  const aliases = NAME_ALIASES[name.toLowerCase()] || []
  const fullNames = [name, ...aliases].map(normalize)
  const tokens = [name, ...aliases]
    .flatMap((value) => value.split(/\s+/))
    .map(normalize)
    .filter((value) => value.length > 2)
  return [...new Set([...fullNames, ...tokens])]
}

test('activity references use valid Scripture notation and include a real verse', () => {
  for (const [group, facts] of Object.entries({ PEOPLE, PLACES, EVENTS, NUMBER_FACTS })) {
    for (const fact of facts) {
      assert.match(fact.reference, REFERENCE_PATTERN, `${group}: ${fact.name}`)
      assert.ok(fact.verse && fact.verse.trim().length > 10, `${group}: ${fact.name} needs verse text`)
    }
  }
})

test('people and place verses name the answer they are describing', () => {
  for (const [group, facts] of Object.entries({ PEOPLE, PLACES })) {
    for (const fact of facts) {
      const verse = normalize(fact.verse)
      assert.ok(
        namesFor(fact.name).some((name) => verse.includes(name)),
        `${group}: ${fact.name} is not named in ${fact.reference}`,
      )
    }
  }
})

test('Bethlehem is tied to Ruth and Boaz, not the nativity story', () => {
  const bethlehemQuestions = QUESTIONS.filter(
    (question) => question.id.startsWith('place-') && question.options[question.answer] === 'Bethlehem',
  )
  assert.equal(bethlehemQuestions.length, 4)
  for (const question of bethlehemQuestions) {
    assert.equal(question.reference, 'Ruth 2:3-4', question.id)
    assert.match(question.verse, /Beth-lehem/, question.id)
    assert.doesNotMatch(question.verse, /Jesus|Herod|Mary|Joseph/, question.id)
  }
  for (const question of bethlehemQuestions.filter((item) => ['trivia', 'riddle'].includes(item.format))) {
    assert.match(question.prompt, /Ruth|Boaz/i, question.id)
  }
})

test('the Ruth and Boaz event shows the field and the marriage', () => {
  const questions = QUESTIONS.filter(
    (question) => question.id.startsWith('event-') && question.options[question.answer] === 'Ruth and Boaz',
  )
  assert.equal(questions.length, 4)
  for (const question of questions) {
    assert.match(question.reference, /Ruth 2:3-4/, question.id)
    assert.match(question.reference, /Ruth 4:13/, question.id)
    assert.match(question.verse, /Boaz/, question.id)
    assert.match(question.verse, /wife/, question.id)
  }
})

test('the old "ten plagues" number question has an explicit proof text', () => {
  const ten = NUMBER_FACTS.find((fact) => fact.id === 'number-4')
  assert.equal(ten.reference, 'Genesis 42:3')
  assert.match(ten.verse, /ten brethren/)
})

test('curated questions that teach a person or relationship use a supporting verse', () => {
  const byId = Object.fromEntries(CURATED_QUESTIONS.map((question) => [question.id, question]))

  assert.equal(byId['women-4'].reference, 'Ruth 1:8')
  assert.match(byId['women-4'].verse, /Naomi/)

  assert.equal(byId['revelation-1'].reference, 'Revelation 1:9')
  assert.match(byId['revelation-1'].verse, /I John/)

  assert.match(byId['books-4'].prompt, /Theophilus/)
  assert.match(byId['books-4'].reference, /Luke 1:3/)
  assert.match(byId['books-4'].reference, /Acts 1:1/)

  assert.match(byId['heroes-10'].reference, /Judges 13:5/)
  assert.match(byId['heroes-10'].verse, /Samson/)
})

test('canon questions use verses that directly support the answer', () => {
  const byId = Object.fromEntries(CURATED_QUESTIONS.map((question) => [question.id, question]))

  assert.equal(byId['books-1'].reference, '2 Timothy 3:16')
  assert.match(byId['books-1'].verse, /inspiration of God/)
  assert.doesNotMatch(byId['books-1'].prompt, /How many books/i)

  assert.equal(byId['books-2'].reference, 'Psalm 119:105')
  assert.match(byId['books-2'].verse, /lamp unto my feet/)

  assert.equal(byId['books-10'].reference, '2 Peter 3:16')
  assert.match(byId['books-10'].verse, /wrest/)

  assert.equal(byId['numbers-5'].reference, 'Luke 24:44')
  assert.match(byId['numbers-5'].verse, /law of Moses/)
  assert.match(byId['numbers-5'].verse, /prophets/)
  assert.match(byId['numbers-5'].verse, /psalms/)

  assert.equal(byId['nt-2'].reference, '2 Peter 3:15-16')
  assert.match(byId['nt-2'].verse, /all his epistles/)
})

test('curated questions have unique ids and well-formed Scripture references', () => {
  assert.equal(new Set(CURATED_QUESTIONS.map((question) => question.id)).size, CURATED_QUESTIONS.length)
  for (const question of CURATED_QUESTIONS) {
    assert.match(question.reference, REFERENCE_PATTERN, question.id)
    assert.ok(question.verse && question.verse.trim().length > 10, question.id)
  }
})
