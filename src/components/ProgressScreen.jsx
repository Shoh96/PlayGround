import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Crown,
  Flame,
  Lock,
  Settings,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import { CATEGORIES } from '../data/categories.js'
import { ACHIEVEMENTS } from '../lib/achievements.js'
import { categoryName, challengeLabel, levelProgress, prettyDate, relativeTime } from '../lib/game.js'
import { AchievementIcon, ActivityStrip, LevelBar } from './ui.jsx'

export function ProgressScreen({ progress, onBack, onPlay, onSettings }) {
  const level = levelProgress(progress.xp)
  const accuracy = progress.totalAnswered ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100) : 0
  const unlocked = new Set(progress.achievements)
  const playedCategories = Object.keys(progress.categories).length
  const nextAchievement = ACHIEVEMENTS.find((achievement) => !unlocked.has(achievement.id))

  return (
    <div className="progress-page page-enter">
      <div className="page-topbar">
        <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Home</button>
        <button className="btn btn--ghost btn--sm" onClick={onSettings}><Settings size={15} /> Preferences</button>
      </div>

      <div className="progress-hero">
        <div className="progress-hero__level">
          <div className="big-level-orb" style={{ '--level-progress': `${level.percent}%` }}>
            <div className="big-level-orb__inner">
              <Crown size={22} />
              <strong>{level.level}</strong>
              <span>Level</span>
            </div>
          </div>
          <div className="progress-hero__title">
            <span className="eyebrow">Your journey so far</span>
            <h1>{level.title}</h1>
            <p>
              {progress.games
                ? `${progress.games} quest${progress.games === 1 ? '' : 's'} completed · ${progress.totalCorrect} answers remembered.`
                : 'The road begins with a single question.'}
            </p>
            <LevelBar xp={progress.xp} />
          </div>
        </div>
        <div className="progress-hero__activity">
          <div className="progress-hero__activity-head">
            <span><CalendarDays size={15} /> Last seven days</span>
            <strong>{progress.dailyStreak} day streak</strong>
          </div>
          <ActivityStrip history={progress.history} />
          <div className="progress-hero__activity-foot">
            <Flame size={14} />
            <span>{progress.dailyStreak ? 'Keep the flame burning.' : 'Play today to begin a streak.'}</span>
          </div>
        </div>
      </div>

      <div className="progress-stats">
        <Metric icon={<Trophy />} value={progress.bestScore.toLocaleString()} label="Best score" note="All-time high" />
        <Metric icon={<Target />} value={`${accuracy}%`} label="Accuracy" note={`${progress.totalCorrect} of ${progress.totalAnswered}`} />
        <Metric icon={<Flame />} value={progress.bestStreak} label="Longest streak" note="Correct in a row" />
        <Metric icon={<Zap />} value={progress.xp.toLocaleString()} label="Total XP" note={`Level ${level.level}`} />
        <Metric icon={<BookOpen />} value={playedCategories} label="Categories" note={`of ${CATEGORIES.length} explored`} />
        <Metric icon={<Users />} value={progress.partyGames + progress.onlineGames} label="Together" note="Multiplayer games" />
      </div>

      <div className="progress-layout">
        <section className="mastery-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Knowledge map</div>
              <h2>Category mastery</h2>
            </div>
            <button className="text-link" onClick={() => onPlay('all')}>Train more <ArrowRight size={15} /></button>
          </div>
          <div className="mastery-list">
            {CATEGORIES.map((category) => {
              const entry = progress.categories[category.id]
              const percent = entry?.played ? Math.round((entry.correct / entry.played) * 100) : 0
              return (
                <button className="mastery-row" key={category.id} onClick={() => onPlay(category.id)}>
                  <span className="mastery-row__dot" style={{ background: category.color }} />
                  <div className="mastery-row__name">
                    <strong>{category.name}</strong>
                    <span>{entry?.played ? `${entry.correct} correct of ${entry.played}` : 'Not yet explored'}</span>
                  </div>
                  <div className="mastery-row__bar">
                    <i style={{ width: `${percent}%`, background: category.color }} />
                  </div>
                  <span className="mastery-row__pct">{entry?.played ? `${percent}%` : '—'}</span>
                  <ChevronRight size={15} />
                </button>
              )
            })}
          </div>
        </section>

        <section className="achievements-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">Marks of the journey</div>
              <h2>Achievements</h2>
            </div>
            <span className="panel-count">{unlocked.size}/{ACHIEVEMENTS.length}</span>
          </div>
          {nextAchievement && (
            <div className="next-achievement">
              <div className={`achievement-icon tier-${nextAchievement.tier}`}><AchievementIcon icon={nextAchievement.icon} /></div>
              <div>
                <span>Next up</span>
                <strong>{nextAchievement.name}</strong>
                <p>{nextAchievement.description}</p>
              </div>
            </div>
          )}
          <div className="achievement-grid">
            {ACHIEVEMENTS.map((achievement) => {
              const isUnlocked = unlocked.has(achievement.id)
              return (
                <div className={`achievement-card ${isUnlocked ? 'is-unlocked' : 'is-locked'}`} key={achievement.id} title={achievement.description}>
                  <div className={`achievement-icon tier-${achievement.tier}`}>
                    {isUnlocked ? <AchievementIcon icon={achievement.icon} /> : <Lock size={17} />}
                  </div>
                  <div>
                    <strong>{achievement.name}</strong>
                    <span>{isUnlocked ? 'Unlocked' : achievement.description}</span>
                  </div>
                  {isUnlocked && <Check size={14} className="achievement-card__check" />}
                </div>
              )
            })}
          </div>
        </section>
      </div>

      <section className="history-panel">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">The record</div>
            <h2>Recent quests</h2>
          </div>
          <button className="btn btn--gold btn--sm" onClick={() => onPlay('all')}>
            <Sparkles size={15} /> New quest
          </button>
        </div>
        {progress.history.length ? (
          <div className="history-list">
            {progress.history.slice(0, 8).map((entry) => (
              <div className="history-row" key={entry.id}>
                <div className={`history-row__mode mode-${entry.mode}`}>
                  {entry.mode === 'daily' && <CalendarDays size={16} />}
                  {entry.mode === 'solo' && <BookOpen size={16} />}
                  {entry.mode === 'party' && <Users size={16} />}
                  {entry.mode === 'online' && <Sparkles size={16} />}
                </div>
                <div className="history-row__main">
                  <strong>{categoryName(entry.category)}</strong>
                  <span>{challengeLabel(entry.challenge)} · {entry.correct}/{entry.total} correct · {relativeTime(entry.at)}</span>
                </div>
                <div className="history-row__score">
                  <strong>{entry.score.toLocaleString()}</strong>
                  <span>points</span>
                </div>
                <span className={`history-row__badge ${entry.correct === entry.total ? 'is-perfect' : ''}`}>
                  {entry.correct === entry.total ? <><Award size={13} /> Perfect</> : `${Math.round((entry.correct / entry.total) * 100)}%`}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state__icon"><BookOpen size={24} /></div>
            <h3>No quests yet</h3>
            <p>Your story is still on the first page. Begin a quest and it will appear here.</p>
            <button className="btn btn--gold" onClick={() => onPlay('all')}>Begin your first quest</button>
          </div>
        )}
      </section>

      <div className="progress-page__footer">
        <span><CalendarDays size={14} /> Journey began {progress.history.length ? prettyDate(progress.history[progress.history.length - 1].dateKey) : 'today'}</span>
        <button className="text-link" onClick={onSettings}><Settings size={14} /> Preferences</button>
      </div>
    </div>
  )
}

function Metric({ icon, value, label, note }) {
  return (
    <div className="metric">
      <div className="metric__icon">{icon}</div>
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{note}</small>
    </div>
  )
}
