import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Flame,
  HelpCircle,
  Sparkles,
  TimerOff,
  X,
  Zap,
} from 'lucide-react'
import { CATEGORY_MAP, CHALLENGE_MAP } from '../data/categories.js'
import { FORMAT_MAP } from '../data/formats.js'
import { challengeConfig, scoreAnswer } from '../lib/game.js'
import { hostVoiceSupported, speakHost, stopHostVoice } from '../lib/host.js'
import { haptic } from '../lib/sound.js'
import { CategoryArt } from './Artwork.jsx'
import { HostBot } from './HostBot.jsx'
import { PictureClue } from './PictureClue.jsx'
import { Modal } from './ui.jsx'

const LETTERS = ['A', 'B', 'C', 'D']

export function GameScreen({
  questions,
  category = 'all',
  challenge = 'disciple',
  format = 'all',
  timerEnabled = true,
  mode = 'solo',
  settings,
  onExit,
  onComplete,
  playSfx,
}) {
  const config = challengeConfig(challenge)
  const formatInfo = FORMAT_MAP[format] || FORMAT_MAP.all
  const categoryInfo = CATEGORY_MAP[category] || {
    id: 'all',
    name: 'All Scripture',
    eyebrow: 'The whole story',
    testament: 'Both',
    color: '#e2bf7c',
    tint: '#33261a',
    art: 'scrolls',
  }
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState('question')
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(config.timer)
  const [hostReady, setHostReady] = useState(false)
  const [hostStatus, setHostStatus] = useState('listening')
  const [exitOpen, setExitOpen] = useState(false)
  const questionRef = useRef(null)
  const hostFallbackRef = useRef(null)
  const question = questions[index]
  const isLast = index === questions.length - 1
  const answeredCorrectly = phase === 'answered' && selected === question.answer
  const currentAnswer = answers[index]
  const correctCount = answers.filter((entry) => entry.correct).length
  const hostVoiceEnabled = settings?.hostVoice !== false && hostVoiceSupported()

  useEffect(() => {
    questionRef.current?.focus()
  }, [index])

  useEffect(() => {
    if (!hostVoiceEnabled) {
      setHostReady(true)
      setHostStatus(settings?.hostVoice === false ? 'muted' : 'listening')
      return undefined
    }
    const optionText = question.options.map((option, optionIndex) => `${LETTERS[optionIndex]}. ${option}`).join('. ')
    const text = `Question ${index + 1}. ${question.prompt} ${optionText}.`
    setHostReady(false)
    setHostStatus('asking')
    hostFallbackRef.current = window.setTimeout(() => {
      setHostReady(true)
      setHostStatus('listening')
    }, Math.min(26000, Math.max(4500, text.length * 52)))
    const cancel = speakHost(text, {
      onEnd: () => {
        window.clearTimeout(hostFallbackRef.current)
        setHostReady(true)
        setHostStatus('listening')
      },
    })
    return () => {
      window.clearTimeout(hostFallbackRef.current)
      cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, hostVoiceEnabled])

  useEffect(() => () => {
    window.clearTimeout(hostFallbackRef.current)
    stopHostVoice()
  }, [])

  useEffect(() => {
    if (phase !== 'question' || !timerEnabled || !hostReady) return undefined
    if (timeLeft <= 0) {
      answerQuestion(-1)
      return undefined
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft, timerEnabled, index, hostReady])

  useEffect(() => {
    if (phase !== 'question') return undefined
    const onKey = (event) => {
      if (exitOpen) return
      const number = Number(event.key)
      if (number >= 1 && number <= 4) answerQuestion(number - 1)
      const letterIndex = ['a', 'b', 'c', 'd'].indexOf(event.key.toLowerCase())
      if (letterIndex >= 0) answerQuestion(letterIndex)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, exitOpen, index])

  useEffect(() => {
    if (phase !== 'answered') return undefined
    const onKey = (event) => {
      if (exitOpen) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        nextQuestion()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index, exitOpen])

  function answerQuestion(choice) {
    if (phase !== 'question') return
    const correct = choice === question.answer
    const earned = scoreAnswer({
      correct,
      timeLeft: timerEnabled ? timeLeft : config.timer,
      timer: config.timer,
      challenge,
      streak,
    })
    const newStreak = correct ? streak + 1 : 0
    const answer = {
      questionId: question.id,
      selected: choice,
      correct,
      timeLeft: timerEnabled ? timeLeft : config.timer,
      category: question.category,
      difficulty: question.difficulty,
      points: earned,
    }
    setSelected(choice)
    setAnswers((previous) => [...previous, answer])
    setScore((value) => value + earned)
    setStreak(newStreak)
    setBestStreak((value) => Math.max(value, newStreak))
    setPhase('answered')
    playSfx?.(correct ? 'correct' : 'wrong')
    if (correct && settings?.haptics) {
      haptic(18)
    }
    window.clearTimeout(hostFallbackRef.current)
    if (hostVoiceEnabled) {
      const verdict = correct
        ? 'Correct.'
        : choice === -1
          ? 'Time is up.'
          : `Not quite. The answer is ${question.options[question.answer]}.`
      setHostStatus('feedback')
      speakHost(
        `${verdict} ${question.explanation} ${question.reference} says: ${question.verse}`,
        { rate: 0.94, onEnd: () => setHostStatus('review') },
      )
    }
  }

  function nextQuestion() {
    window.clearTimeout(hostFallbackRef.current)
    stopHostVoice()
    if (isLast) {
      const finalAnswers = [...answers]
      if (!currentAnswer) return
      const finalCorrect = finalAnswers.filter((entry) => entry.correct).length
      onComplete({
        mode,
        category,
        challenge,
        score,
        correct: finalCorrect,
        total: questions.length,
        bestStreak,
        answers: finalAnswers,
        timerEnabled,
      })
      return
    }
    setIndex((value) => value + 1)
    setSelected(null)
    setPhase('question')
    setTimeLeft(config.timer)
  }

  const timerPercent = timerEnabled ? Math.max(0, Math.min(100, (timeLeft / config.timer) * 100)) : 100
  const progressSegments = questions.map((entry, entryIndex) => {
    const answer = answers[entryIndex]
    return (
      <span
        key={entry.id}
        className={`progress-segment ${entryIndex === index ? 'is-current' : ''} ${answer ? (answer.correct ? 'is-correct' : 'is-wrong') : ''}`}
      />
    )
  })

  return (
    <div className="game page-enter">
      <div className="game__topbar">
        <button className="icon-btn icon-btn--soft" onClick={() => setExitOpen(true)} aria-label="Exit quest">
          <ArrowLeft size={19} />
        </button>
        <div className="game__crumb">
          <span className="game__crumb-dot" style={{ background: categoryInfo.color }} />
          <div>
            <span>{mode === 'daily' ? 'Daily bread' : 'Solo quest'}</span>
            <strong>{categoryInfo.name}</strong>
          </div>
        </div>
        <div className="game__progress">{progressSegments}</div>
        <div className="game__hud">
          <div className="hud-stat hud-stat--score">
            <Zap size={15} />
            <span><small>Score</small><strong>{score.toLocaleString()}</strong></span>
          </div>
          <div className={`hud-stat hud-stat--streak ${streak >= 3 ? 'is-hot' : ''}`}>
            <Flame size={15} />
            <span><small>Streak</small><strong>{streak}</strong></span>
          </div>
        </div>
      </div>

      <div className="game__layout">
        <aside className="game__aside">
          <CategoryArt category={categoryInfo} className="game__art" />
          <div className="game__aside-card">
            <span className="eyebrow">{categoryInfo.eyebrow}</span>
            <h2>{categoryInfo.name}</h2>
            <p>{categoryInfo.blurb}</p>
            <div className="game__aside-meta">
              <div>
                <span>Challenge</span>
                <strong>{CHALLENGE_MAP[challenge]?.name || 'Disciple'}</strong>
              </div>
              <div>
                <span>Question</span>
                <strong>{index + 1} / {questions.length}</strong>
              </div>
              <div>
                <span>Style</span>
                <strong>{formatInfo.short}</strong>
              </div>
            </div>
          </div>
          <div className="game__aside-tip">
            <HelpCircle size={16} />
            <p>Use keys <kbd>1</kbd>–<kbd>4</kbd> or <kbd>A</kbd>–<kbd>D</kbd> to answer faster.</p>
          </div>
        </aside>

        <main className="game__main">
          <div className="question-meta">
            <span className={`difficulty-pill difficulty-${question.difficulty}`}>{question.difficulty}</span>
            <span className="question-meta__category">{categoryInfo.name}</span>
            <span className={`question-format-pill question-format-pill--${question.format}`}>{FORMAT_MAP[question.format === 'verse' || question.format === 'book' ? 'recall' : question.format]?.short || 'Question'}</span>
            <div className={`question-timer ${timerEnabled && timeLeft <= 5 && phase === 'question' ? 'is-urgent' : ''}`}>
              {timerEnabled ? <Clock3 size={15} /> : <TimerOff size={15} />}
              <span>{timerEnabled ? `${timeLeft}s` : 'Untimed'}</span>
            </div>
          </div>

          <div className="question-timer-bar" aria-hidden="true">
            <i style={{ width: `${timerPercent}%` }} className={timeLeft <= 5 ? 'is-urgent' : ''} />
          </div>

          <HostBot
            status={hostStatus}
            enabled={hostVoiceEnabled}
            onReplay={hostVoiceEnabled ? () => {
              const optionText = question.options.map((option, optionIndex) => `${LETTERS[optionIndex]}. ${option}`).join('. ')
              setHostStatus('asking')
              speakHost(`Question ${index + 1}. ${question.prompt} ${optionText}.`, {
                onEnd: () => setHostStatus('listening'),
              })
            } : null}
          />

          <div className={`question-card question-card--${question.format}`} ref={questionRef} tabIndex={-1}>
            <span className="question-card__index">Question {index + 1}</span>
            {question.symbols?.length > 0 && <PictureClue symbols={question.symbols} category={question.category} />}
            <h1>{question.prompt}</h1>
            <div className="answers" role="group" aria-label="Answer choices">
              {question.options.map((option, optionIndex) => {
                const isCorrectOption = phase === 'answered' && optionIndex === question.answer
                const isWrongChoice = phase === 'answered' && optionIndex === selected && selected !== question.answer
                const isDimmed = phase === 'answered' && !isCorrectOption && !isWrongChoice
                return (
                  <button
                    key={option}
                    className={`answer ${isCorrectOption ? 'is-correct' : ''} ${isWrongChoice ? 'is-wrong' : ''} ${isDimmed ? 'is-dimmed' : ''}`}
                    onClick={() => answerQuestion(optionIndex)}
                    disabled={phase !== 'question'}
                  >
                    <span className="answer__letter">{LETTERS[optionIndex]}</span>
                    <span className="answer__text">{option}</span>
                    <span className="answer__state">
                      {isCorrectOption && <Check size={18} />}
                      {isWrongChoice && <X size={18} />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {phase === 'answered' && (
            <div className={`feedback ${answeredCorrectly ? 'is-correct' : 'is-wrong'}`} role="status" aria-live="polite">
              <div className="feedback__top">
                <div className="feedback__verdict">
                  <span className="feedback__icon">
                    {answeredCorrectly ? <Check size={18} /> : <X size={18} />}
                  </span>
                  <div>
                    <strong>{answeredCorrectly ? (streak >= 3 ? 'Streak alive. Well remembered.' : 'Correct. Nicely done.') : selected === -1 ? 'Time’s up.' : 'Not quite.'}</strong>
                    <span>
                      {answeredCorrectly
                        ? `+${currentAnswer?.points || 0} points`
                        : `The answer is ${question.options[question.answer]}.`}
                    </span>
                  </div>
                </div>
                {answeredCorrectly && streak >= 2 && (
                  <div className="feedback__streak"><Flame size={14} /> {streak} in a row</div>
                )}
              </div>
              <p className="feedback__explanation">{question.explanation}</p>
              <div className="scripture-card">
                <div className="scripture-card__mark">“</div>
                <div>
                  <p>{question.verse}</p>
                  <span>{question.reference} · KJV</span>
                </div>
              </div>
              <div className="feedback__footer">
                <span className="feedback__source"><BookOpen size={14} /> Scripture unlocked</span>
                <button className="btn btn--gold" onClick={nextQuestion}>
                  {isLast ? 'See results' : 'Next question'} <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {phase === 'question' && (
            <div className="question-footnote">
              <Sparkles size={14} />
              <span>{timerEnabled ? 'Choose an answer before the light runs out.' : 'No clock. Reflect, then answer.'}</span>
              <span className="question-footnote__count">{correctCount} correct so far</span>
            </div>
          )}
        </main>
      </div>

      <Modal open={exitOpen} onClose={() => setExitOpen(false)} title="Leave this quest?" className="modal--small">
        <p className="modal-lead">Your progress in this round will not be saved. You can begin a fresh quest any time.</p>
        <div className="modal-actions">
          <button className="btn btn--ghost" onClick={() => setExitOpen(false)}>Keep playing</button>
          <button className="btn btn--danger" onClick={onExit}>Leave quest</button>
        </div>
      </Modal>
    </div>
  )
}
