import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  Award,
  BookOpen,
  Check,
  ChevronDown,
  Crown,
  Flame,
  Home,
  RotateCcw,
  Share2,
  Sparkles,
  Star,
  Target,
  X,
  Zap,
} from 'lucide-react'
import { CATEGORY_MAP } from '../data/categories.js'
import { QUESTION_MAP } from '../data/questions.js'
import { levelProgress, resultRank } from '../lib/game.js'
import { speakHost, stopHostVoice } from '../lib/host.js'
import { ACHIEVEMENT_MAP } from '../lib/achievements.js'
import { AchievementIcon } from './ui.jsx'

export function Results({ result, progress, settings, onHome, onReplay, onProgress, onShare, playSfx }) {
  const [reviewOpen, setReviewOpen] = useState(true)
  const [shareNote, setShareNote] = useState('')
  const accuracy = result.total ? Math.round((result.correct / result.total) * 100) : 0
  const rank = resultRank(accuracy)
  const level = levelProgress(progress.xp)
  const category = CATEGORY_MAP[result.category]
  const unlocked = (result.unlocked || []).map((id) => ACHIEVEMENT_MAP[id]).filter(Boolean)
  const answers = useMemo(
    () =>
      (result.answers || []).map((answer) => ({
        ...answer,
        question: QUESTION_MAP[answer.questionId],
      })),
    [result.answers],
  )

  useEffect(() => {
    playSfx?.(accuracy >= 60 ? 'finish' : 'wrong')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (settings?.hostVoice === false) return undefined
    const finish = result.leveledUp
      ? `Level up. You are now level ${level.level}, ${level.title}.`
      : `You are level ${level.level}, ${level.title}.`
    const cancel = speakHost(
      `Quest complete. You answered ${result.correct} of ${result.total} correctly, for ${accuracy} percent accuracy and ${result.score} points. ${finish}`,
      { rate: 0.94 },
    )
    return () => {
      cancel()
      stopHostVoice()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function shareResult() {
    const text = `I scored ${result.correct}/${result.total} (${accuracy}%) in Scripture Quest — “${rank.title}”. Can you beat it?`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Scripture Quest', text, url: window.location.href })
        return
      }
      await navigator.clipboard.writeText(`${text} ${window.location.href}`)
      setShareNote('Result copied to clipboard')
      onShare?.(text)
    } catch {
      setShareNote('Sharing is unavailable right now')
    }
    window.setTimeout(() => setShareNote(''), 2500)
  }

  return (
    <div className="results page-enter">
      <div className="results__glow" aria-hidden="true" />
      <div className="results__topbar">
        <button className="back-link" onClick={onHome}><Home size={16} /> Home</button>
        <button className="btn btn--ghost btn--sm" onClick={shareResult}>
          <Share2 size={15} /> Share result
        </button>
      </div>

      <div className="results__hero">
        <div className="results__medal">
          <div className="results__halo" />
          <div className="results__score-ring" style={{ '--accuracy': `${accuracy}%` }}>
            <div>
              <span>{accuracy}%</span>
              <small>accuracy</small>
            </div>
          </div>
          <span className="results__rank-eyebrow">{result.mode === 'daily' ? 'Daily bread' : 'Quest complete'}</span>
          <h1>{rank.title}</h1>
          <p>{rank.note}</p>
          <div className="results__stars" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((star) => (
              <Star key={star} size={15} fill={accuracy >= (star + 1) * 20 ? 'currentColor' : 'none'} />
            ))}
          </div>
        </div>

        <div className="results__score-panel">
          <div className="results__score-head">
            <div>
              <span className="eyebrow">Final score</span>
              <strong>{result.score.toLocaleString()}</strong>
            </div>
            <div className="results__category">
              <span style={{ background: category?.color || '#dfbe7e' }} />
              {category?.name || 'All Scripture'}
            </div>
          </div>
          <div className="results__stats">
            <div><Check size={17} /><strong>{result.correct}</strong><span>correct</span></div>
            <div><Target size={17} /><strong>{result.total - result.correct}</strong><span>missed</span></div>
            <div><Flame size={17} /><strong>{result.bestStreak}</strong><span>best streak</span></div>
            <div><Zap size={17} /><strong>+{result.xpEarned}</strong><span>XP earned</span></div>
          </div>
          <div className="results__level">
            <div className="results__level-row">
              <span>Level {level.level} · {level.title}</span>
              <strong>{progress.xp} XP</strong>
            </div>
            <div className="level-bar__track"><i className="level-bar__fill" style={{ width: `${level.percent}%` }} /></div>
          </div>
          {result.leveledUp && (
            <div className="level-up-banner">
              <Crown size={18} />
              <div>
                <strong>New level reached</strong>
                <span>You are now a {level.title}.</span>
              </div>
            </div>
          )}
          <div className="results__actions">
            <button className="btn btn--gold btn--lg" onClick={onReplay}>
              <RotateCcw size={16} /> Play another
            </button>
            <button className="btn btn--outline btn--lg" onClick={onProgress}>
              View progress <ArrowRight size={16} />
            </button>
          </div>
          {shareNote && <div className="results__share-note">{shareNote}</div>}
        </div>
      </div>

      {unlocked.length > 0 && (
        <section className="reward-panel">
          <div className="reward-panel__head">
            <Sparkles size={18} />
            <span>New achievements unlocked</span>
          </div>
          <div className="reward-panel__grid">
            {unlocked.map((achievement) => (
              <div className="reward-item" key={achievement.id}>
                <div className={`reward-icon tier-${achievement.tier}`}><AchievementIcon icon={achievement.icon} /></div>
                <div>
                  <strong>{achievement.name}</strong>
                  <span>{achievement.description}</span>
                </div>
                <Award size={16} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="review-panel">
        <button className="review-panel__head" onClick={() => setReviewOpen((value) => !value)} aria-expanded={reviewOpen}>
          <div>
            <div className="eyebrow">Learn from every answer</div>
            <h2>Question review</h2>
          </div>
          <span className="review-panel__meta">
            {result.correct}/{result.total} correct
            <ChevronDown size={18} className={reviewOpen ? 'is-open' : ''} />
          </span>
        </button>
        {reviewOpen && (
          <div className="review-list">
            {answers.map((answer, index) => {
              const question = answer.question
              if (!question) return null
              const selectedText = answer.selected >= 0 ? question.options[answer.selected] : 'No answer'
              return (
                <div className={`review-item ${answer.correct ? 'is-correct' : 'is-wrong'}`} key={`${answer.questionId}-${index}`}>
                  <div className="review-item__status">
                    {answer.correct ? <Check size={15} /> : <X size={15} />}
                  </div>
                  <div className="review-item__body">
                    <span className="review-item__meta">{index + 1} · {CATEGORY_MAP[question.category]?.name}</span>
                    <h3>{question.prompt}</h3>
                    <div className="review-item__answers">
                      {!answer.correct && <span className="review-item__your">Your answer: {selectedText}</span>}
                      <span className="review-item__truth">Answer: {question.options[question.answer]}</span>
                    </div>
                    <p className="review-item__verse">“{question.verse}” <span>{question.reference}</span></p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="results__footer">
        <p>“Let the word of Christ dwell in you richly.” — Colossians 3:16</p>
        <div>
          <button className="text-link" onClick={onHome}><Home size={15} /> Return home</button>
          <button className="text-link" onClick={onReplay}><BookOpen size={15} /> New quest</button>
        </div>
      </div>
    </div>
  )
}
