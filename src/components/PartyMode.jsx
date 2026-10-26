import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Crown,
  Flame,
  Medal,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { CATEGORIES, CHALLENGES, CHALLENGE_MAP } from '../data/categories.js'
import { pickQuestions, scoreAnswer } from '../lib/game.js'
import { CategoryArt } from './Artwork.jsx'

const PLAYER_COLORS = ['#e3bd79', '#8fc5b7', '#d99786', '#aebce8', '#d4a8dc', '#a9c98a']
const DEFAULT_NAMES = ['Pilgrim', 'Fellow Traveler', 'Friend', 'Companion', 'Guest', 'Beloved']

export function PartyMode({ progress, settings, onBack, onHome, onRecord, playSfx }) {
  const [stage, setStage] = useState('setup')
  const [players, setPlayers] = useState([
    { id: 'p1', name: 'Pilgrim', color: PLAYER_COLORS[0] },
    { id: 'p2', name: 'Fellow Traveler', color: PLAYER_COLORS[1] },
  ])
  const [challenge, setChallenge] = useState('disciple')
  const [rounds, setRounds] = useState(3)
  const [questions, setQuestions] = useState([])
  const [turn, setTurn] = useState(0)
  const [phase, setPhase] = useState('ready')
  const [selected, setSelected] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [stats, setStats] = useState({})
  const recordedRef = useRef(false)
  const config = CHALLENGE_MAP[challenge]
  const currentPlayer = players[turn % players.length]
  const question = questions[turn]
  const totalTurns = questions.length
  const rotation = Math.floor(turn / players.length) + 1

  useEffect(() => {
    if (stage !== 'play' || phase !== 'answer') return undefined
    if (timeLeft <= 0) {
      answerQuestion(-1)
      return undefined
    }
    const timer = window.setTimeout(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, phase, timeLeft])

  const ranking = useMemo(() => {
    return [...players]
      .map((player) => ({ ...player, ...(stats[player.id] || { score: 0, correct: 0, answered: 0, bestStreak: 0 }) }))
      .sort((a, b) => b.score - a.score || b.correct - a.correct)
  }, [players, stats])

  useEffect(() => {
    if (stage !== 'results' || recordedRef.current) return
    recordedRef.current = true
    const champion = ranking[0]
    if (!champion) return
    const championAnswers = (stats[champion.id]?.answers || []).map((entry) => ({
      ...entry,
      category: questions[entry.turn]?.category,
    }))
    onRecord?.({
      mode: 'party',
      category: 'all',
      challenge,
      score: champion.score || 0,
      correct: champion.correct || 0,
      total: champion.answered || 0,
      bestStreak: champion.bestStreak || 0,
      answers: championAnswers,
    })
    playSfx?.('finish')
  }, [stage]) // eslint-disable-line react-hooks/exhaustive-deps

  function addPlayer() {
    if (players.length >= 6) return
    const color = PLAYER_COLORS[players.length]
    setPlayers((current) => [
      ...current,
      { id: `p${Date.now()}`, name: DEFAULT_NAMES[players.length] || 'Friend', color },
    ])
  }

  function removePlayer(id) {
    if (players.length <= 2) return
    setPlayers((current) => current.filter((player) => player.id !== id))
  }

  function updateName(id, name) {
    setPlayers((current) => current.map((player) => (player.id === id ? { ...player, name } : player)))
  }

  function startGame() {
    const cleanPlayers = players.map((player, index) => ({
      ...player,
      name: player.name.trim() || `Player ${index + 1}`,
    }))
    setPlayers(cleanPlayers)
    const questionCount = cleanPlayers.length * rounds
    const picked = pickQuestions({ category: 'all', challenge, count: questionCount, seed: Date.now() })
    const initialStats = Object.fromEntries(
      cleanPlayers.map((player) => [
        player.id,
        { score: 0, correct: 0, answered: 0, bestStreak: 0, streak: 0, answers: [] },
      ]),
    )
    setQuestions(picked)
    setStats(initialStats)
    setTurn(0)
    setSelected(null)
    setPhase('ready')
    setTimeLeft(config.timer)
    setStage('play')
    playSfx?.('select')
  }

  function beginTurn() {
    setTimeLeft(config.timer)
    setSelected(null)
    setPhase('answer')
    playSfx?.('select')
  }

  function answerQuestion(choice) {
    if (phase !== 'answer' || !question) return
    const correct = choice === question.answer
    const playerStats = stats[currentPlayer.id] || { score: 0, correct: 0, answered: 0, bestStreak: 0, streak: 0, answers: [] }
    const earned = scoreAnswer({
      correct,
      timeLeft,
      timer: config.timer,
      challenge,
      streak: playerStats.streak || 0,
    })
    const newStreak = correct ? (playerStats.streak || 0) + 1 : 0
    const answerEntry = {
      questionId: question.id,
      selected: choice,
      correct,
      timeLeft,
      category: question.category,
      difficulty: question.difficulty,
      points: earned,
      turn,
    }
    setStats((current) => ({
      ...current,
      [currentPlayer.id]: {
        score: (playerStats.score || 0) + earned,
        correct: (playerStats.correct || 0) + (correct ? 1 : 0),
        answered: (playerStats.answered || 0) + 1,
        bestStreak: Math.max(playerStats.bestStreak || 0, newStreak),
        streak: newStreak,
        answers: [...(playerStats.answers || []), answerEntry],
      },
    }))
    setSelected(choice)
    setPhase('revealed')
    playSfx?.(correct ? 'correct' : 'wrong')
  }

  function nextTurn() {
    if (turn + 1 >= questions.length) {
      setStage('results')
      return
    }
    setTurn((value) => value + 1)
    setSelected(null)
    setTimeLeft(config.timer)
    setPhase('ready')
  }

  function restart() {
    recordedRef.current = false
    setStage('setup')
    setQuestions([])
    setStats({})
    setTurn(0)
    setPhase('ready')
    setSelected(null)
  }

  if (stage === 'results') {
    return (
      <PartyResults
        ranking={ranking}
        players={players}
        onBack={onHome}
        onRestart={restart}
        rounds={rounds}
      />
    )
  }

  if (stage === 'setup') {
    return (
      <div className="party-setup page-enter">
        <div className="page-topbar">
          <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Multiplayer</button>
          <div className="page-topbar__crumb"><Users size={15} /> Pass & play</div>
        </div>
        <div className="party-setup__heading">
          <div>
            <div className="eyebrow">One device · many minds</div>
            <h1>Set the table</h1>
            <p>Gather two to six players. Each person takes a turn in the spotlight while the others watch and wait.</p>
          </div>
          <div className="party-setup__guest">
            <CategoryArt category={CATEGORIES[3]} />
            <div>
              <Crown size={17} />
              <span>Winner takes the crown</span>
            </div>
          </div>
        </div>
        <div className="party-setup__grid">
          <section className="panel party-players">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">The gathering</div>
                <h2>Players</h2>
              </div>
              <span className="panel-count">{players.length}/6</span>
            </div>
            <div className="player-list">
              {players.map((player, index) => (
                <div className="player-row" key={player.id}>
                  <div className="player-token" style={{ background: player.color }}>
                    {index + 1}
                  </div>
                  <input
                    value={player.name}
                    onChange={(event) => updateName(player.id, event.target.value)}
                    maxLength={18}
                    aria-label={`Player ${index + 1} name`}
                  />
                  <button
                    className="icon-btn icon-btn--tiny"
                    onClick={() => removePlayer(player.id)}
                    disabled={players.length <= 2}
                    aria-label={`Remove ${player.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button className="add-player" onClick={addPlayer} disabled={players.length >= 6}>
              <Plus size={16} /> Add another player
            </button>
            <div className="party-note">
              <Sparkles size={16} />
              <p>Mixed categories. Every turn brings a different corner of Scripture.</p>
            </div>
          </section>

          <section className="panel party-settings">
            <div className="panel-heading">
              <div>
                <div className="eyebrow">Rules of the table</div>
                <h2>Round settings</h2>
              </div>
            </div>
            <div className="field">
              <span className="field-label"><Flame size={14} /> Challenge level</span>
              <div className="challenge-compact">
                {CHALLENGES.map((entry) => (
                  <button
                    key={entry.id}
                    className={challenge === entry.id ? 'is-selected' : ''}
                    onClick={() => setChallenge(entry.id)}
                  >
                    <strong>{entry.name}</strong>
                    <span>{entry.timer}s · {entry.multiplier}×</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="field-label"><RotateCcw size={14} /> Turns per player</span>
              <div className="segmented">
                {[2, 3, 5].map((value) => (
                  <button key={value} className={rounds === value ? 'is-selected' : ''} onClick={() => setRounds(value)}>
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div className="party-summary">
              <div><span>Players</span><strong>{players.length}</strong></div>
              <div><span>Turns each</span><strong>{rounds}</strong></div>
              <div><span>Total questions</span><strong>{players.length * rounds}</strong></div>
              <div><span>Timer</span><strong>{config.timer}s</strong></div>
            </div>
            <button className="btn btn--gold btn--block btn--lg" onClick={startGame}>
              Begin the contest <ArrowRight size={17} />
            </button>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="party-game page-enter">
      <div className="game__topbar">
        <button className="icon-btn icon-btn--soft" onClick={onBack} aria-label="Leave party game"><ArrowLeft size={19} /></button>
        <div className="game__crumb">
          <span className="game__crumb-dot" style={{ background: currentPlayer.color }} />
          <div>
            <span>Pass & play · {CHALLENGE_MAP[challenge].name}</span>
            <strong>{currentPlayer.name}’s turn</strong>
          </div>
        </div>
        <div className="party-scorestrip">
          {ranking.map((player) => (
            <div className={`score-chip ${player.id === currentPlayer.id ? 'is-current' : ''}`} key={player.id}>
              <span style={{ background: player.color }} />
              <strong>{player.name}</strong>
              <b>{player.score || 0}</b>
            </div>
          ))}
        </div>
      </div>

      {phase === 'ready' && (
        <div className="pass-screen">
          <div className="pass-screen__rings" aria-hidden="true" />
          <div className="pass-screen__token" style={{ background: currentPlayer.color }}>
            <Crown size={28} />
          </div>
          <span className="eyebrow">Turn {turn + 1} of {totalTurns} · Round {rotation}</span>
          <h1>Pass the device to<br /><em>{currentPlayer.name}</em></h1>
          <p>Keep the screen to yourself for a moment. The others must look away.</p>
          <button className="btn btn--gold btn--lg" onClick={beginTurn}>
            I’m ready <ArrowRight size={17} />
          </button>
          <div className="pass-screen__hint">
            <Clock3 size={14} /> {config.timer} seconds once you begin
          </div>
        </div>
      )}

      {phase !== 'ready' && question && (
        <div className="party-question">
          <div className="party-question__meta">
            <span className={`difficulty-pill difficulty-${question.difficulty}`}>{question.difficulty}</span>
            <span>{CATEGORIES.find((entry) => entry.id === question.category)?.name}</span>
            <div className={`question-timer ${timeLeft <= 5 ? 'is-urgent' : ''}`}><Clock3 size={15} /> {timeLeft}s</div>
          </div>
          <div className="question-progress"><i style={{ width: `${((turn + 1) / totalTurns) * 100}%` }} /></div>
          <div className="party-question__card">
            <span className="question-card__index">{currentPlayer.name}, question {Math.floor(turn / players.length) + 1} of {rounds}</span>
            <h1>{question.prompt}</h1>
            <div className="answers">
              {question.options.map((option, optionIndex) => {
                const isCorrect = phase === 'revealed' && optionIndex === question.answer
                const isWrong = phase === 'revealed' && optionIndex === selected && selected !== question.answer
                const dim = phase === 'revealed' && !isCorrect && !isWrong
                return (
                  <button
                    key={option}
                    className={`answer ${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''} ${dim ? 'is-dimmed' : ''}`}
                    onClick={() => answerQuestion(optionIndex)}
                    disabled={phase !== 'answer'}
                  >
                    <span className="answer__letter">{String.fromCharCode(65 + optionIndex)}</span>
                    <span className="answer__text">{option}</span>
                    <span className="answer__state">
                      {isCorrect && <Check size={18} />}
                      {isWrong && <X size={18} />}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          {phase === 'revealed' && (
            <div className={`feedback feedback--compact ${selected === question.answer ? 'is-correct' : 'is-wrong'}`}>
              <div className="feedback__top">
                <div className="feedback__verdict">
                  <span className="feedback__icon">{selected === question.answer ? <Check size={18} /> : <X size={18} />}</span>
                  <div>
                    <strong>{selected === question.answer ? 'Correct' : selected === -1 ? 'Time’s up' : `The answer is ${question.options[question.answer]}`}</strong>
                    <span>{selected === question.answer ? `+${stats[currentPlayer.id]?.answers?.at(-1)?.points || 0} points for ${currentPlayer.name}` : 'No points this turn'}</span>
                  </div>
                </div>
                <button className="btn btn--gold" onClick={nextTurn}>
                  {turn + 1 >= totalTurns ? 'Final scores' : 'Pass device'} <ChevronRight size={16} />
                </button>
              </div>
              <div className="scripture-card">
                <div className="scripture-card__mark">“</div>
                <div>
                  <p>{question.verse}</p>
                  <span>{question.reference} · KJV</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="party-game__footer">
        {ranking.map((player) => {
          const playerStats = stats[player.id] || {}
          return (
            <div className="party-mini-stat" key={player.id}>
              <span style={{ background: player.color }} />
              <strong>{player.name}</strong>
              <small>{playerStats.correct || 0}/{playerStats.answered || 0} correct</small>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PartyResults({ ranking, onBack, onRestart, rounds }) {
  const podium = [ranking[1], ranking[0], ranking[2]].filter(Boolean)
  return (
    <div className="party-results page-enter">
      <div className="page-topbar">
        <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Home</button>
      </div>
      <div className="party-results__heading">
        <div className="eyebrow">The contest is complete</div>
        <h1>{ranking[0]?.name} takes the crown</h1>
        <p>{rounds} turn{rounds === 1 ? '' : 's'} each · {ranking.reduce((sum, player) => sum + (player.correct || 0), 0)} correct answers shared</p>
      </div>
      <div className="podium">
        {podium.map((player) => {
          const place = ranking.indexOf(player) + 1
          return (
            <div className={`podium__place podium__place--${place}`} key={player.id}>
              {place === 1 && <Crown size={23} />}
              <div className="podium__avatar" style={{ background: player.color }}>
                {place === 1 ? <Trophy size={22} /> : <Medal size={20} />}
              </div>
              <strong>{player.name}</strong>
              <span>{player.score.toLocaleString()} pts</span>
              <small>{player.correct} correct · {player.bestStreak} streak</small>
              <div className="podium__block">{place}</div>
            </div>
          )
        })}
      </div>
      <div className="party-results__table">
        {ranking.map((player, index) => (
          <div className="party-result-row" key={player.id}>
            <span className="party-result-row__place">{index + 1}</span>
            <span className="party-result-row__dot" style={{ background: player.color }} />
            <strong>{player.name}</strong>
            <span>{player.answered ? Math.round((player.correct / player.answered) * 100) : 0}% accuracy</span>
            <b>{player.score.toLocaleString()}</b>
          </div>
        ))}
      </div>
      <div className="party-results__actions">
        <button className="btn btn--gold btn--lg" onClick={onRestart}><RotateCcw size={16} /> Play again</button>
        <button className="btn btn--outline btn--lg" onClick={onBack}><BookOpen size={16} /> Back home</button>
      </div>
    </div>
  )
}
