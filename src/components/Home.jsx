import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Crown,
  Download,
  Flame,
  Gamepad2,
  Globe2,
  Play,
  Sparkles,
  Trophy,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react'
import { CATEGORIES, CHALLENGES } from '../data/categories.js'
import { QUESTION_COUNT } from '../data/questions.js'
import { VERSE_TRANSLATION } from '../data/verses.js'
import { dailySetup, dailyVerse, levelProgress, localDateKey, relativeTime } from '../lib/game.js'
import { HeroArt } from './Artwork.jsx'
import { ActivityStrip, LevelBar } from './ui.jsx'

export function Home({
  progress,
  online,
  canInstall,
  onStartSolo,
  onDaily,
  onMultiplayer,
  onCategory,
  onProgress,
  onSettings,
  onInstall,
}) {
  const level = levelProgress(progress.xp)
  const verse = dailyVerse()
  const daily = dailySetup()
  const dailyDone = progress.lastDailyDate === daily.dateKey
  const recent = progress.history[0]

  return (
    <div className="home page-enter">
      <section className="hero">
        <div className="hero__copy">
          <div className="eyebrow">
            <span className="eyebrow__dot" />
            An illuminated Bible trivia experience
          </div>
          <h1>
            Ancient wisdom.
            <span>A modern challenge.</span>
          </h1>
          <p className="hero__lead">
            Journey through {CATEGORIES.length} worlds of Scripture. Answer well, build your streak,
            and discover the stories that still speak.
          </p>
          <div className="hero__actions">
            <button className="btn btn--gold btn--lg" onClick={() => onStartSolo('all')}>
              <Play size={17} fill="currentColor" />
              Begin a quest
              <ArrowRight size={17} />
            </button>
            <button className="btn btn--ghost btn--lg" onClick={onMultiplayer}>
              <Users size={17} />
              Play with friends
            </button>
          </div>
          <div className="hero__meta">
            <div>
              <strong>{QUESTION_COUNT.toLocaleString()}</strong>
              <span>questions</span>
            </div>
            <div>
              <strong>{CATEGORIES.length}</strong>
              <span>categories</span>
            </div>
            <div>
              <strong>{level.level}</strong>
              <span>your level</span>
            </div>
            <div className={`hero__signal ${online ? 'is-online' : 'is-offline'}`}>
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}
              {online ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
        <div className="hero__visual">
          <HeroArt />
          <div className="float-card float-card--level">
            <div className="float-card__icon">
              <Crown size={18} />
            </div>
            <div>
              <small>Your calling</small>
              <strong>{level.title}</strong>
              <div className="mini-track">
                <i style={{ width: `${level.percent}%` }} />
              </div>
            </div>
          </div>
          <div className="float-card float-card--streak">
            <Flame size={18} />
            <div>
              <strong>{progress.dailyStreak || 0}</strong>
              <small>day streak</small>
            </div>
          </div>
          <div className="float-verse">
            <Sparkles size={15} />
            <p>“Thy word is a lamp unto my feet.”</p>
            <span>Psalm 119:105</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">Choose your path</div>
            <h2>Four ways to enter the story</h2>
          </div>
          <button className="text-link" onClick={() => onProgress()}>
            View your journey <ChevronRight size={16} />
          </button>
        </div>
        <div className="path-grid">
          <button className="path-card path-card--solo" onClick={() => onStartSolo('all')}>
            <div className="path-card__icon"><BookOpen size={21} /></div>
            <span className="path-card__kicker">Solo quest</span>
            <h3>Follow the narrative</h3>
            <p>Pick a category and challenge level, then draw from a {QUESTION_COUNT.toLocaleString()}-question bank.</p>
            <span className="path-card__cta">
              Start exploring <ArrowRight size={15} />
            </span>
            <div className="path-card__orb" />
          </button>
          <button className={`path-card path-card--daily ${dailyDone ? 'is-done' : ''}`} onClick={() => onDaily()}>
            <div className="path-card__icon">
              {dailyDone ? <Check size={21} /> : <CalendarDays size={21} />}
            </div>
            <span className="path-card__kicker">Daily bread</span>
            <h3>{dailyDone ? 'Today’s portion is complete' : 'Ten questions, once a day'}</h3>
            <p>{dailyDone ? 'Return tomorrow for a fresh set and a new verse.' : 'The same challenge for everyone. A little extra grace for the faithful.'}</p>
            <span className="path-card__cta">
              {dailyDone ? 'Completed today' : 'Take today’s challenge'} <ArrowRight size={15} />
            </span>
            <div className="path-card__orb" />
          </button>
          <button className="path-card path-card--party" onClick={onMultiplayer}>
            <div className="path-card__icon"><Gamepad2 size={21} /></div>
            <span className="path-card__kicker">Pass & play</span>
            <h3>Gather around one screen</h3>
            <p>Two to six players, one device, and a friendly contest of recall.</p>
            <span className="path-card__cta">
              Set the table <ArrowRight size={15} />
            </span>
            <div className="path-card__orb" />
          </button>
          <button className="path-card path-card--online" onClick={onMultiplayer}>
            <div className="path-card__icon"><Globe2 size={21} /></div>
            <span className="path-card__kicker">Online room</span>
            <h3>Compete across devices</h3>
            <p>Share a room code and race friends through the same live questions.</p>
            <span className="path-card__cta">
              Create or join <ArrowRight size={15} />
            </span>
            <div className="path-card__orb" />
          </button>
        </div>
      </section>

      <section className="journey-banner">
        <div className="journey-banner__left">
          <div className="gold-medallion">
            <Crown size={25} />
          </div>
          <div>
            <span className="eyebrow">Your journey</span>
            <h2>Level {level.level} · {level.title}</h2>
            <p>
              {recent
                ? `Last quest: ${recent.correct}/${recent.total} correct · ${relativeTime(recent.at)}`
                : 'Your first quest is waiting. Every answer adds a little light.'}
            </p>
          </div>
        </div>
        <div className="journey-banner__right">
          <LevelBar xp={progress.xp} />
          <div className="journey-banner__stats">
            <Stat icon={<Zap size={15} />} value={progress.xp} label="XP" />
            <Stat icon={<Trophy size={15} />} value={progress.bestScore} label="Best score" />
            <Stat icon={<Flame size={15} />} value={progress.bestStreak} label="Best streak" />
          </div>
          <button className="btn btn--outline btn--sm" onClick={onProgress}>
            Full progress <ArrowRight size={15} />
          </button>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">The library</div>
            <h2>Every corner of Scripture</h2>
          </div>
          <span className="section-head__note">Tap a world to begin there</span>
        </div>
        <div className="category-grid">
          {CATEGORIES.map((category, index) => {
            const mastery = progress.categories[category.id]
            const percent = mastery?.played ? Math.round((mastery.correct / mastery.played) * 100) : 0
            return (
              <button
                key={category.id}
                className="category-card"
                onClick={() => onCategory(category.id)}
                style={{ '--delay': `${index * 25}ms`, '--category-color': category.color }}
              >
                <CategoryPreview category={category} index={index} />
                <div className="category-card__copy">
                  <span>{category.testament} · {category.eyebrow}</span>
                  <h3>{category.name}</h3>
                  <p>{category.blurb}</p>
                  <div className="category-card__mastery">
                    <div><i style={{ width: `${percent}%` }} /></div>
                    <span>{mastery?.played ? `${percent}% mastery` : 'New'}</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section className="daily-panel">
        <div className="daily-panel__ornament" aria-hidden="true">
          <svg viewBox="0 0 280 280">
            <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(228,195,128,.22)" />
            <circle cx="140" cy="140" r="93" fill="none" stroke="rgba(228,195,128,.14)" strokeDasharray="2 8" />
            <path d="M140 42l8 39 31 17-31 17-8 41-8-41-31-17 31-17 8-39Z" fill="rgba(232,199,128,.13)" />
            <circle cx="140" cy="140" r="5" fill="#e5c680" />
          </svg>
        </div>
        <div className="daily-panel__verse">
          <span className="eyebrow">Verse of the day · {verse.theme}</span>
          <blockquote>“{verse.text}”</blockquote>
          <div className="daily-panel__ref">
            <strong>{verse.reference}</strong>
            <span>{VERSE_TRANSLATION}</span>
          </div>
          <p className="daily-panel__reflection">{verse.reflection}</p>
        </div>
        <div className="daily-panel__side">
          <div className="daily-panel__challenge">
            <div>
              <span>Daily challenge</span>
              <strong>{dailyDone ? 'Complete' : `10 questions · ${CHALLENGES[1].name}`}</strong>
            </div>
            <button className="btn btn--gold btn--sm" onClick={onDaily} disabled={dailyDone}>
              {dailyDone ? <Check size={15} /> : <Sparkles size={15} />}
              {dailyDone ? 'Come back tomorrow' : 'Begin'}
            </button>
          </div>
          <ActivityStrip history={progress.history} />
          <div className="daily-panel__streak">
            <Flame size={18} />
            <span><strong>{progress.dailyStreak}</strong> day reading streak</span>
          </div>
        </div>
      </section>

      <section className="install-strip">
        <div className="install-strip__icon"><Download size={20} /></div>
        <div>
          <h3>Keep the Word close</h3>
          <p>Install Scripture Quest for instant access — solo play and pass-and-play work fully offline.</p>
        </div>
        <div className="install-strip__actions">
          {canInstall ? (
            <button className="btn btn--gold btn--sm" onClick={onInstall}>
              <Download size={15} /> Install app
            </button>
          ) : (
            <span className="offline-pill"><WifiOff size={14} /> Offline ready after first visit</span>
          )}
          <button className="btn btn--ghost btn--sm" onClick={onSettings}>Preferences</button>
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-footer__brand">
          <Crown size={16} />
          Scripture Quest
        </div>
        <p>Scripture quotations are from the King James Version, public domain.</p>
        <p>Made for study, fellowship, and joyful remembering.</p>
      </footer>
    </div>
  )
}

function Stat({ icon, value, label }) {
  return (
    <div className="stat">
      {icon}
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function CategoryPreview({ category, index }) {
  return (
    <div className={`category-card__preview preview-${category.art}`} style={{ '--tint': category.tint, '--accent': category.color }}>
      <div className="preview__arch" />
      <div className="preview__symbol" aria-hidden="true">{['✦', '✧', '☩', '✶', '◈', '♛', '✶', '❧', '≈', '♪', '✧', '✦', '❖', '⌖'][index]}</div>
      <div className="preview__lines" />
      <span className="preview__number">{String(index + 1).padStart(2, '0')}</span>
    </div>
  )
}
