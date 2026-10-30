import { useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  Flame,
  Gauge,
  HelpCircle,
  Image,
  Layers3,
  Shuffle,
  Sparkles,
  Timer,
  Trophy,
} from 'lucide-react'
import { CATEGORIES, CHALLENGES, CATEGORY_MAP, CHALLENGE_MAP } from '../data/categories.js'
import { FORMATS, FORMAT_MAP } from '../data/formats.js'
import {
  CATEGORY_FORMAT_QUESTION_COUNTS,
  CATEGORY_QUESTION_COUNTS,
  FORMAT_QUESTION_COUNTS,
  QUESTION_COUNT,
} from '../data/questions.js'
import { CategoryArt } from './Artwork.jsx'

const ALL_CATEGORY = {
  id: 'all',
  name: 'All Scripture',
  eyebrow: 'Every story',
  testament: 'Both',
  blurb: 'A sweeping tour from Genesis to Revelation, with questions drawn from every corner of the library.',
  color: '#e2bf7c',
  tint: '#33261a',
  art: 'scrolls',
}

const COUNTS = [5, 8, 10]

export function SoloSetup({ initialCategory = 'all', progress, onBack, onStart, playSfx }) {
  const [categoryId, setCategoryId] = useState(CATEGORY_MAP[initialCategory] ? initialCategory : 'all')
  const [challenge, setChallenge] = useState('disciple')
  const [format, setFormat] = useState('all')
  const [count, setCount] = useState(8)
  const [timerEnabled, setTimerEnabled] = useState(progress.settings.timer !== false)
  const category = categoryId === 'all' ? ALL_CATEGORY : CATEGORY_MAP[categoryId]
  const challengeInfo = CHALLENGE_MAP[challenge]
  const formatInfo = FORMAT_MAP[format] || FORMAT_MAP.all

  const formatCounts = categoryId === 'all' ? FORMAT_QUESTION_COUNTS : CATEGORY_FORMAT_QUESTION_COUNTS[categoryId] || {}

  function countForFormat(formatId) {
    if (formatId === 'all') {
      return categoryId === 'all' ? QUESTION_COUNT : CATEGORY_QUESTION_COUNTS[categoryId] || 0
    }
    if (formatId === 'recall') return (formatCounts.verse || 0) + (formatCounts.book || 0)
    return formatCounts[formatId] || 0
  }

  const poolSize = useMemo(() => countForFormat(format), [format, categoryId])

  function chooseCategory(id) {
    playSfx?.('select')
    setCategoryId(id)
    const nextCounts = id === 'all' ? FORMAT_QUESTION_COUNTS : CATEGORY_FORMAT_QUESTION_COUNTS[id] || {}
    const nextCount = format === 'all'
      ? (id === 'all' ? QUESTION_COUNT : CATEGORY_QUESTION_COUNTS[id] || 0)
      : format === 'recall'
        ? (nextCounts.verse || 0) + (nextCounts.book || 0)
        : nextCounts[format] || 0
    if (nextCount === 0) setFormat('all')
  }

  function chooseFormat(id) {
    playSfx?.('select')
    setFormat(id)
  }

  function chooseChallenge(id) {
    playSfx?.('select')
    setChallenge(id)
  }

  return (
    <div className="setup page-enter">
      <div className="page-topbar">
        <button className="back-link" onClick={onBack}>
          <ArrowLeft size={17} /> Home
        </button>
        <div className="page-topbar__crumb">
          <BookOpen size={15} />
          Solo quest
        </div>
      </div>

      <div className="setup__heading">
        <div>
          <div className="eyebrow">Prepare your heart and mind</div>
          <h1>Choose your battleground</h1>
          <p>Select a corner of Scripture and the depth of your challenge. Every round is drawn fresh from {QUESTION_COUNT.toLocaleString()} questions.</p>
        </div>
        <div className="setup__head-stat">
          <span>Question pool</span>
          <strong>{poolSize.toLocaleString()}</strong>
          <small>{formatInfo.name.toLowerCase()} · {categoryId === 'all' ? `${CATEGORIES.length} categories` : category.name}</small>
        </div>
      </div>

      <div className="setup__layout">
        <div className="setup__main">
          <section className="setup-section">
            <div className="setup-section__head">
              <span className="step-number">01</span>
              <div>
                <h2>Pick a category</h2>
                <p>One world, or the whole Bible.</p>
              </div>
            </div>
            <div className="category-picker">
              <button
                className={`category-option category-option--all ${categoryId === 'all' ? 'is-selected' : ''}`}
                onClick={() => chooseCategory('all')}
              >
                <div className="category-option__badge"><Sparkles size={19} /></div>
                <div>
                  <strong>All Scripture</strong>
                  <span>Every category · {QUESTION_COUNT.toLocaleString()}</span>
                </div>
                {categoryId === 'all' && <span className="category-option__check"><Check size={14} /></span>}
              </button>
              {CATEGORIES.map((entry) => (
                <button
                  key={entry.id}
                  className={`category-option ${categoryId === entry.id ? 'is-selected' : ''}`}
                  onClick={() => chooseCategory(entry.id)}
                  style={{ '--category-color': entry.color }}
                >
                  <span className="category-option__dot" />
                  <div>
                    <strong>{entry.name}</strong>
                    <span>{entry.testament} · {(CATEGORY_QUESTION_COUNTS[entry.id] || 0).toLocaleString()}</span>
                  </div>
                  {categoryId === entry.id && <span className="category-option__check"><Check size={14} /></span>}
                </button>
              ))}
            </div>
          </section>

          <section className="setup-section">
            <div className="setup-section__head">
              <span className="step-number">02</span>
              <div>
                <h2>Choose a game style</h2>
                <p>Mix every format, or focus on the kind of play you enjoy.</p>
              </div>
            </div>
            <div className="format-picker">
              {FORMATS.map((entry) => {
                const availableCount = countForFormat(entry.id)
                const selected = entry.id === format
                return (
                  <button
                    key={entry.id}
                    className={`format-option ${selected ? 'is-selected' : ''}`}
                    onClick={() => chooseFormat(entry.id)}
                    disabled={availableCount === 0}
                    aria-pressed={selected}
                  >
                    <span className="format-option__icon">
                      {entry.id === 'all' && <Layers3 size={18} />}
                      {entry.id === 'trivia' && <HelpCircle size={18} />}
                      {entry.id === 'recall' && <BookOpen size={18} />}
                      {entry.id === 'wordplay' && <Shuffle size={18} />}
                      {entry.id === 'image' && <Image size={18} />}
                      {entry.id === 'riddle' && <Sparkles size={18} />}
                    </span>
                    <span className="format-option__copy">
                      <strong>{entry.name}</strong>
                      <small>{entry.description}</small>
                    </span>
                    <span className="format-option__meta">
                      {availableCount.toLocaleString()}
                      {selected && <Check size={13} />}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="setup-section">
            <div className="setup-section__head">
              <span className="step-number">03</span>
              <div>
                <h2>Set the depth</h2>
                <p>Difficulty changes the question mix, clock, and points.</p>
              </div>
            </div>
            <div className="challenge-picker">
              {CHALLENGES.map((entry) => {
                const selected = entry.id === challenge
                return (
                  <button
                    key={entry.id}
                    className={`challenge-option ${selected ? 'is-selected' : ''}`}
                    onClick={() => chooseChallenge(entry.id)}
                  >
                    <div className="challenge-option__top">
                      <span className="challenge-option__icon">
                        {entry.id === 'explorer' && <Sparkles size={17} />}
                        {entry.id === 'disciple' && <BookOpen size={17} />}
                        {entry.id === 'scholar' && <Gauge size={17} />}
                        {entry.id === 'expert' && <Flame size={17} />}
                      </span>
                      <span className="challenge-option__clock"><Clock3 size={13} /> {entry.timer}s</span>
                    </div>
                    <strong>{entry.name}</strong>
                    <span>{entry.description}</span>
                    <div className="challenge-option__meta">
                      <span>{entry.multiplier}× points</span>
                      {selected && <i><Check size={12} /></i>}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="setup-section">
            <div className="setup-section__head">
              <span className="step-number">04</span>
              <div>
                <h2>Length & pace</h2>
                <p>Short enough for a coffee break, long enough to learn.</p>
              </div>
            </div>
            <div className="setup-row">
              <div className="segmented-block">
                <span className="field-label"><Layers3 size={14} /> Questions</span>
                <div className="segmented">
                  {COUNTS.map((value) => (
                    <button
                      key={value}
                      className={count === value ? 'is-selected' : ''}
                      onClick={() => { playSfx?.('select'); setCount(value) }}
                      disabled={value > poolSize}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className={`toggle-row ${timerEnabled ? 'is-on' : ''}`}
                onClick={() => setTimerEnabled((value) => !value)}
                aria-pressed={timerEnabled}
              >
                <span className="toggle-row__icon"><Timer size={18} /></span>
                <span>
                  <strong>Countdown timer</strong>
                  <small>{timerEnabled ? `${challengeInfo.timer} seconds per question` : 'No clock. Take your time.'}</small>
                </span>
                <span className="switch"><i /></span>
              </button>
            </div>
          </section>
        </div>

        <aside className="setup__summary">
          <div className="summary-art">
            <CategoryArt category={category} />
            <div className="summary-art__label">
              <span>{category.testament}</span>
              <strong>{category.name}</strong>
            </div>
          </div>
          <div className="summary-card">
            <span className="eyebrow">Your quest</span>
            <h3>{categoryId === 'all' ? 'A journey through the whole story' : category.name}</h3>
            <p>{category.blurb}</p>
            <div className="summary-list">
              <div><Clock3 size={15} /><span>Pace</span><strong>{challengeInfo.name}</strong></div>
              <div><Layers3 size={15} /><span>Questions</span><strong>{count}</strong></div>
              <div><Sparkles size={15} /><span>Style</span><strong>{formatInfo.short}</strong></div>
              <div><Trophy size={15} /><span>Points</span><strong>{challengeInfo.multiplier}×</strong></div>
              <div><Timer size={15} /><span>Timer</span><strong>{timerEnabled ? `${challengeInfo.timer}s` : 'Off'}</strong></div>
            </div>
            <div className="summary-tip">
              <Flame size={16} />
              <p>Answer quickly and chain correct answers to multiply your score.</p>
            </div>
            <button
              className="btn btn--gold btn--block btn--lg"
              onClick={() => onStart({ category: categoryId, challenge, format, count, timerEnabled })}
              disabled={poolSize === 0}
            >
              Begin quest <ArrowRight size={17} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
