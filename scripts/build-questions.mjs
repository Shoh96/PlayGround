import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIES, DIFFICULTIES, JOURNAL, DAILY_VERSES, ACHIEVEMENTS } from '../content/categories.mjs';
import { QUESTIONS } from '../content/questions.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = process.env.KJV_CACHE || '/tmp/kjv';

const BOOK_FILES = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
  '1Samuel', '2Samuel', '1Kings', '2Kings', '1Chronicles', '2Chronicles', 'Ezra', 'Nehemiah',
  'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'SongofSolomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah',
  'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark', 'Luke',
  'John', 'Acts', 'Romans', '1Corinthians', '2Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1Thessalonians', '2Thessalonians', '1Timothy', '2Timothy',
  'Titus', 'Philemon', 'Hebrews', 'James', '1Peter', '2Peter', '1John', '2John', '3John', 'Jude',
  'Revelation'
];

const bookAliases = new Map([
  ['Psalm', 'Psalms'],
  ['Song of Solomon', 'SongofSolomon'],
  ['Canticles', 'SongofSolomon']
]);

function normalizeBook(name) {
  const trimmed = name.trim().replace(/\s+/g, ' ');
  if (bookAliases.has(trimmed)) return bookAliases.get(trimmed);
  return trimmed.replace(/\s+/g, '');
}

async function ensureCache() {
  await mkdir(cacheDir, { recursive: true });
  let missing = 0;
  for (const book of BOOK_FILES) {
    const file = join(cacheDir, `${book}.json`);
    try {
      const info = await stat(file);
      if (info.size > 100) continue;
    } catch {}
    missing += 1;
    const url = `https://raw.githubusercontent.com/aruljohn/Bible-kjv/master/${book}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not download ${book}: ${res.status}`);
    await writeFile(file, await res.text());
  }
  if (missing) console.log(`Downloaded ${missing} KJV book files into ${cacheDir}`);
}

const bible = new Map();
async function loadBible() {
  for (const book of BOOK_FILES) {
    const raw = JSON.parse(await readFile(join(cacheDir, `${book}.json`), 'utf8'));
    const chapters = new Map();
    for (const chapter of raw.chapters) {
      chapters.set(Number(chapter.chapter), new Map(chapter.verses.map(v => [Number(v.verse), v.text])));
    }
    bible.set(book, { name: raw.book, chapters });
  }
}

const clean = text => text.replace(/\s+/g, ' ').trim();
const refPattern = /^(.+?)\s+(\d+):(\d+)(?:\s*-\s*(\d+))?$/;

function verseFor(ref) {
  const match = String(ref).trim().match(refPattern);
  if (!match) throw new Error(`Unparseable reference: ${ref}`);
  const [, bookName, chapterRaw, verseRaw, endRaw] = match;
  const book = normalizeBook(bookName);
  const data = bible.get(book);
  if (!data) throw new Error(`Unknown book "${bookName}" (normalized ${book}) for ${ref}`);
  const chapter = data.chapters.get(Number(chapterRaw));
  if (!chapter) throw new Error(`Missing chapter in ${ref}`);
  const start = Number(verseRaw);
  const end = endRaw ? Number(endRaw) : start;
  if (end < start || end - start > 8) throw new Error(`Unreasonable range in ${ref}`);
  const parts = [];
  for (let v = start; v <= end; v += 1) {
    const text = chapter.get(v);
    if (!text) throw new Error(`Missing verse ${v} in ${ref}`);
    parts.push(clean(text));
  }
  return { ref: clean(String(ref)), text: parts.join(' ') };
}

function validateChoices(item) {
  if (!Array.isArray(item.choices) || item.choices.length !== 4) throw new Error(`Question ${item.id} must have four choices`);
  if (new Set(item.choices).size !== 4) throw new Error(`Question ${item.id} has duplicate choices`);
  if (!item.choices.includes(item.answer)) throw new Error(`Question ${item.id} answer "${item.answer}" is not among its choices`);
  if (![1, 2, 3, 4].includes(item.diff)) throw new Error(`Question ${item.id} has invalid difficulty`);
}

await ensureCache();
await loadBible();

const ids = new Set();
const enriched = QUESTIONS.map(item => {
  if (ids.has(item.id)) throw new Error(`Duplicate question id: ${item.id}`);
  ids.add(item.id);
  validateChoices(item);
  if (!CATEGORIES.some(c => c.key === item.cat)) throw new Error(`Unknown category ${item.cat} on ${item.id}`);
  const verse = verseFor(item.ref);
  const answer = item.choices.indexOf(item.answer);
  return {
    id: item.id,
    cat: item.cat,
    diff: item.diff,
    question: item.question,
    choices: item.choices,
    answer,
    ref: verse.ref,
    verse: verse.text,
    why: item.why
  };
});

const counts = new Map(CATEGORIES.map(c => [c.key, 0]));
const byDifficulty = new Map();
for (const item of enriched) {
  counts.set(item.cat, counts.get(item.cat) + 1);
  const key = `${item.cat}:${item.diff}`;
  byDifficulty.set(key, (byDifficulty.get(key) || 0) + 1);
}

const categories = CATEGORIES.map(category => ({
  ...category,
  verse: verseFor(category.verse),
  count: counts.get(category.key)
}));

for (const category of categories) {
  const spread = [1, 2, 3, 4].map(d => byDifficulty.get(`${category.key}:${d}`) || 0);
  if (spread.some(n => n < 2)) {
    console.warn(`Warning: ${category.key} has a thin difficulty spread: ${spread.join('/')}`);
  }
}

const output = `// Generated by scripts/build-questions.mjs — KJV text is public domain.\n` +
  `export const CATEGORIES = ${JSON.stringify(categories, null, 2)};\n\n` +
  `export const DIFFICULTIES = ${JSON.stringify(DIFFICULTIES, null, 2)};\n\n` +
  `export const JOURNAL = ${JSON.stringify(JOURNAL, null, 2)};\n\n` +
  `export const DAILY_VERSES = ${JSON.stringify(DAILY_VERSES, null, 2)};\n\n` +
  `export const ACHIEVEMENTS = ${JSON.stringify(ACHIEVEMENTS, null, 2)};\n\n` +
  `export const QUESTIONS = ${JSON.stringify(enriched, null, 2)};\n`;

await writeFile(join(root, 'public/js/data/questions.js'), output);

const summary = {};
for (const category of categories) {
  summary[category.key] = [1, 2, 3, 4].map(d => byDifficulty.get(`${category.key}:${d}`) || 0);
}
console.log(`Built ${enriched.length} questions across ${categories.length} categories.`);
console.log(JSON.stringify(summary));
