import { useEffect, useMemo, useRef, useState } from 'react'
import Peer from 'peerjs'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Crown,
  Flame,
  Globe2,
  KeyRound,
  Loader2,
  LogOut,
  Medal,
  Radio,
  RotateCcw,
  Share2,
  Sparkles,
  Trophy,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react'
import { CATEGORIES, CATEGORY_MAP, CHALLENGES, CHALLENGE_MAP } from '../data/categories.js'
import { challengeConfig, pickQuestions, scoreAnswer } from '../lib/game.js'
import { CategoryArt } from './Artwork.jsx'
import { Modal, Spinner } from './ui.jsx'

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const PLAYER_COLORS = ['#e3bd79', '#8fc5b7', '#d99786', '#aebce8', '#d4a8dc', '#a9c98a', '#e7a76c', '#82c6d8']
const MAX_PLAYERS = 8
const REVEAL_MS = 6200

function makeCode() {
  const values = new Uint8Array(6)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(values)
  else for (let index = 0; index < values.length; index += 1) values[index] = Math.floor(Math.random() * 256)
  return Array.from(values, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('')
}

function makeId() {
  return `guest-${Math.random().toString(36).slice(2, 9)}`
}

function publicPlayers(players) {
  return players.map(({ id, name, color, score, correct, total, connected, isHost }) => ({
    id,
    name,
    color,
    score: score || 0,
    correct: correct || 0,
    total: total || 0,
    connected: connected !== false,
    isHost: Boolean(isHost),
  }))
}

function safeQuestion(question) {
  return {
    id: question.id,
    category: question.category,
    difficulty: question.difficulty,
    prompt: question.prompt,
    options: question.options,
    reference: question.reference,
  }
}

function initialStats() {
  return { correct: 0, total: 0, bestStreak: 0, streak: 0, answers: [] }
}

export function OnlineMode({ progress, settings, online, onBack, onRecord, playSfx }) {
  const [view, setView] = useState('entry')
  const [role, setRole] = useState(null)
  const [name, setName] = useState(settings.playerName || 'Pilgrim')
  const [codeInput, setCodeInput] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [players, setPlayers] = useState([])
  const [config, setConfig] = useState({ category: 'all', challenge: 'disciple', count: 8 })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [netGame, setNetGame] = useState(null)
  const [answer, setAnswer] = useState(null)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [localStats, setLocalStats] = useState(initialStats)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [copyNote, setCopyNote] = useState('')
  const [leaveOpen, setLeaveOpen] = useState(false)

  const peerRef = useRef(null)
  const connRef = useRef(null)
  const connsRef = useRef(new Map())
  const localIdRef = useRef(null)
  const answerMetaRef = useRef(null)
  const questionRef = useRef(null)
  const localStatsRef = useRef(initialStats())
  const recordedRef = useRef(false)
  const joinTimeoutRef = useRef(null)
  const attemptsRef = useRef(0)
  const hostRef = useRef({
    questions: [],
    index: -1,
    question: null,
    phase: 'lobby',
    responses: new Map(),
    players: [],
    config: { category: 'all', challenge: 'disciple', count: 8 },
    deadline: 0,
    questionTimer: null,
    revealTimer: null,
    nextTimer: null,
  })

  const currentPlayerId = localIdRef.current || (role === 'host' ? 'host' : null)
  const me = players.find((player) => player.id === currentPlayerId)
  const currentQuestion = netGame?.question
  const sortedPlayers = useMemo(() => [...players].sort((a, b) => (b.score || 0) - (a.score || 0)), [players])
  const timerMax = challengeConfig(config.challenge).timer
  const timerPercent = netGame?.phase === 'question' ? Math.max(0, Math.min(100, (secondsLeft / timerMax) * 100)) : 0

  useEffect(() => {
    return () => {
      clearHostTimers()
      clearTimeout(joinTimeoutRef.current)
      peerRef.current?.destroy()
      connsRef.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (view !== 'finished' || recordedRef.current) return
    if (!netGame || netGame.phase !== 'finished') return
    recordedRef.current = true
    const scores = netGame.players || players
    const mine = scores.find((player) => player.id === currentPlayerId)
    onRecord?.({
      mode: 'online',
      category: config.category,
      challenge: config.challenge,
      score: mine?.score || 0,
      correct: localStatsRef.current.correct,
      total: localStatsRef.current.total,
      bestStreak: localStatsRef.current.bestStreak,
      answers: localStatsRef.current.answers,
    })
    playSfx?.('finish')
  }, [view, netGame, players, currentPlayerId, config, onRecord, playSfx])

  useEffect(() => {
    if (netGame?.phase !== 'question' || !netGame.deadline) return undefined
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((netGame.deadline - Date.now()) / 1000)))
    tick()
    const timer = window.setInterval(tick, 200)
    return () => window.clearInterval(timer)
  }, [netGame])

  function clearHostTimers() {
    const host = hostRef.current
    clearTimeout(host.questionTimer)
    clearTimeout(host.revealTimer)
    clearTimeout(host.nextTimer)
    host.questionTimer = null
    host.revealTimer = null
    host.nextTimer = null
  }

  function cleanupConnection() {
    clearHostTimers()
    clearTimeout(joinTimeoutRef.current)
    connsRef.current.forEach((conn) => {
      try { conn.close() } catch { /* ignore */ }
    })
    connsRef.current.clear()
    connRef.current = null
    peerRef.current?.destroy()
    peerRef.current = null
  }

  function resetRoomState() {
    setView('entry')
    setRole(null)
    setPlayers([])
    setRoomCode('')
    setNetGame(null)
    setAnswer(null)
    setAnsweredCount(0)
    setStatus('idle')
    setError('')
    setCopyNote('')
    setLeaveOpen(false)
    localIdRef.current = null
    answerMetaRef.current = null
    questionRef.current = null
    localStatsRef.current = initialStats()
    setLocalStats(initialStats())
    recordedRef.current = false
    hostRef.current = {
      questions: [],
      index: -1,
      question: null,
      phase: 'lobby',
      responses: new Map(),
      players: [],
      config,
      deadline: 0,
      questionTimer: null,
      revealTimer: null,
      nextTimer: null,
    }
  }

  function syncPlayers(nextPlayers) {
    hostRef.current.players = nextPlayers
    setPlayers(nextPlayers.map((player) => ({ ...player })))
  }

  function broadcast(message, exceptId) {
    connsRef.current.forEach((conn, id) => {
      if (id !== exceptId && conn.open) {
        try { conn.send(message) } catch { /* ignore a broken peer */ }
      }
    })
  }

  function lobbyMessage(extra = {}) {
    return {
      type: 'lobby',
      roomCode: hostRef.current.roomCode || roomCode,
      players: publicPlayers(hostRef.current.players),
      config: hostRef.current.config,
      ...extra,
    }
  }

  function createRoom(attempt = 0) {
    if (!online) {
      setError('You appear to be offline. Reconnect to host an online room.')
      return
    }
    cleanupConnection()
    setError('')
    setStatus('creating')
    setRole('host')
    const code = makeCode()
    const peerId = `bq-${code.toLowerCase()}`
    const peer = new Peer(peerId, { debug: 0 })
    peerRef.current = peer
    localIdRef.current = 'host'
    const hostPlayer = {
      id: 'host',
      name: name.trim().slice(0, 18) || 'Host',
      color: PLAYER_COLORS[0],
      score: 0,
      correct: 0,
      total: 0,
      streak: 0,
      connected: true,
      isHost: true,
    }

    peer.on('open', () => {
      if (peerRef.current !== peer) return
      attemptsRef.current = 0
      const nextPlayers = [hostPlayer, ...hostRef.current.players.filter((player) => player.id !== 'host')]
      hostRef.current.players = nextPlayers
      hostRef.current.roomCode = code
      hostRef.current.config = config
      setPlayers(nextPlayers)
      setRoomCode(code)
      setView('lobby')
      setStatus('ready')
      setRole('host')
    })

    peer.on('connection', (conn) => {
      if (peerRef.current !== peer) return
      attachHostConnection(conn)
    })

    peer.on('error', (peerError) => {
      if (peerRef.current !== peer) return
      if (peerError.type === 'unavailable-id' && attempt < 2) {
        attemptsRef.current = attempt + 1
        peer.destroy()
        createRoom(attempt + 1)
        return
      }
      setStatus('error')
      setError(peerErrorMessage(peerError, 'host'))
    })
  }

  function attachHostConnection(conn) {
    conn.on('data', (message) => handleHostMessage(conn, message))
    conn.on('close', () => handleHostDisconnect(conn))
    conn.on('error', () => handleHostDisconnect(conn))
  }

  function handleHostMessage(conn, message) {
    if (!message || typeof message !== 'object') return
    if (message.type === 'join') {
      if (conn.__playerId) return
      if (hostRef.current.players.length >= MAX_PLAYERS) {
        conn.send({ type: 'roomFull' })
        window.setTimeout(() => conn.close(), 300)
        return
      }
      const id = `guest-${Math.random().toString(36).slice(2, 9)}`
      conn.__playerId = id
      connsRef.current.set(id, conn)
      const nextPlayer = {
        id,
        name: String(message.name || 'Guest').trim().slice(0, 18) || 'Guest',
        color: PLAYER_COLORS[hostRef.current.players.length % PLAYER_COLORS.length],
        score: 0,
        correct: 0,
        total: 0,
        streak: 0,
        connected: true,
        isHost: false,
      }
      syncPlayers([...hostRef.current.players, nextPlayer])
      const lobby = lobbyMessage({ you: id })
      if (conn.open) conn.send(lobby)
      broadcast(lobby, id)
      playSfx?.('select')
      return
    }

    const playerId = conn.__playerId
    if (!playerId) return
    if (message.type === 'answer') {
      handleIncomingAnswer(playerId, message.choice)
    } else if (message.type === 'leave') {
      handleHostDisconnect(conn)
    }
  }

  function handleHostDisconnect(conn) {
    const playerId = conn.__playerId
    if (!playerId) return
    connsRef.current.delete(playerId)
    const host = hostRef.current
    if (host.phase === 'lobby' || host.phase === 'finished') {
      syncPlayers(host.players.filter((player) => player.id !== playerId))
      const lobby = lobbyMessage()
      broadcast(lobby)
    } else {
      syncPlayers(host.players.map((player) => (player.id === playerId ? { ...player, connected: false } : player)))
      const payload = {
        type: 'syncPlayers',
        players: publicPlayers(host.players),
        answeredCount: host.responses.size,
      }
      broadcast(payload)
      maybeReveal()
    }
  }

  function joinRoom() {
    if (!online) {
      setError('You appear to be offline. Reconnect to join an online room.')
      return
    }
    const code = codeInput.trim().toUpperCase()
    if (code.length !== 6) {
      setError('Enter the full six-character room code.')
      return
    }
    cleanupConnection()
    setError('')
    setRole('guest')
    setStatus('joining')
    const guestId = makeId()
    localIdRef.current = guestId
    const peer = new Peer({ debug: 0 })
    peerRef.current = peer
    let opened = false

    peer.on('open', () => {
      if (peerRef.current !== peer) return
      const conn = peer.connect(`bq-${code.toLowerCase()}`, { reliable: true })
      connRef.current = conn
      conn.on('open', () => {
        if (peerRef.current !== peer) return
        opened = true
        conn.send({ type: 'join', name: name.trim().slice(0, 18) || 'Guest', id: guestId })
        setStatus('waiting')
      })
      conn.on('data', (message) => handleGuestMessage(message))
      conn.on('close', () => {
        if (peerRef.current !== peer) return
        cleanupConnection()
        setStatus('error')
        setError('The room closed. The host may have left or the connection dropped.')
        setView('entry')
      })
      conn.on('error', () => {
        if (peerRef.current !== peer) return
        setStatus('error')
        setError('Could not reach that room. Check the code and try again.')
      })
    })

    peer.on('error', (peerError) => {
      if (peerRef.current !== peer) return
      cleanupConnection()
      setStatus('error')
      setError(peerErrorMessage(peerError, 'join'))
      setView('entry')
    })

    joinTimeoutRef.current = window.setTimeout(() => {
      if (!opened && peerRef.current === peer) {
        cleanupConnection()
        setStatus('error')
        setError('No answer from that room. Confirm the code and that the host is still online.')
      }
    }, 14000)
  }

  function handleGuestMessage(message) {
    if (!message || typeof message !== 'object') return
    if (message.type === 'welcome' || message.type === 'lobby') {
      clearTimeout(joinTimeoutRef.current)
      if (message.you) localIdRef.current = message.you
      if (message.roomCode) setRoomCode(message.roomCode)
      if (message.config) setConfig(message.config)
      if (message.players) setPlayers(message.players)
      setStatus('ready')
      setRole('guest')
      setView('lobby')
      return
    }
    if (message.type === 'roomFull') {
      cleanupConnection()
      setStatus('error')
      setError('That room is already full.')
      setView('entry')
      return
    }
    if (message.type === 'start') {
      recordedRef.current = false
      localStatsRef.current = initialStats()
      setLocalStats(initialStats())
      setConfig(message.config)
      setPlayers(message.players)
      setNetGame(null)
      setAnswer(null)
      setAnsweredCount(0)
      answerMetaRef.current = null
      setView('playing')
      return
    }
    if (message.type === 'question') {
      const question = message.question
      questionRef.current = question
      answerMetaRef.current = null
      setAnswer(null)
      setAnsweredCount(0)
      setSecondsLeft(Math.max(0, Math.ceil((message.deadline - Date.now()) / 1000)))
      setPlayers(message.players)
      setNetGame({
        phase: 'question',
        question,
        index: message.index,
        total: message.total,
        deadline: message.deadline,
        players: message.players,
      })
      setView('playing')
      playSfx?.('select')
      return
    }
    if (message.type === 'answeredCount') {
      setAnsweredCount(message.count)
      return
    }
    if (message.type === 'syncPlayers') {
      setPlayers(message.players)
      setAnsweredCount(message.answeredCount || 0)
      return
    }
    if (message.type === 'reveal') {
      setPlayers(message.players)
      setNetGame({
        phase: 'reveal',
        question: questionRef.current,
        index: message.index,
        total: message.total,
        correctIndex: message.correctIndex,
        explanation: message.explanation,
        reference: message.reference,
        verse: message.verse,
        responses: message.responses,
        players: message.players,
        final: message.final,
      })
      applyLocalResult(questionRef.current, answerMetaRef.current)
      playSfx?.(answerMetaRef.current?.choice === message.correctIndex ? 'correct' : 'wrong')
      return
    }
    if (message.type === 'finished') {
      setPlayers(message.players)
      setNetGame({ phase: 'finished', players: message.players })
      setView('finished')
      return
    }
    if (message.type === 'hostLeft') {
      cleanupConnection()
      setStatus('error')
      setError('The host closed the room.')
      setView('entry')
    }
  }

  function updateHostConfig(patch) {
    if (role !== 'host') return
    const next = { ...hostRef.current.config, ...patch }
    hostRef.current.config = next
    setConfig(next)
    const lobby = lobbyMessage()
    broadcast(lobby)
    playSfx?.('select')
  }

  function startOnlineGame() {
    if (role !== 'host') return
    const host = hostRef.current
    const active = host.players.filter((player) => player.connected !== false)
    if (active.length < 2) {
      setError('At least two players are needed to begin.')
      return
    }
    clearHostTimers()
    setError('')
    const questions = pickQuestions({
      category: host.config.category,
      challenge: host.config.challenge,
      count: host.config.count,
      seed: Date.now(),
    })
    const freshPlayers = host.players.map((player) => ({
      ...player,
      score: 0,
      correct: 0,
      total: 0,
      streak: 0,
      connected: player.connected !== false,
    }))
    host.questions = questions
    host.index = -1
    host.responses = new Map()
    host.phase = 'lobby'
    host.deadline = 0
    syncPlayers(freshPlayers)
    localStatsRef.current = initialStats()
    setLocalStats(initialStats())
    recordedRef.current = false
    setNetGame(null)
    setAnswer(null)
    setAnsweredCount(0)
    answerMetaRef.current = null
    setView('playing')
    broadcast({
      type: 'start',
      config: host.config,
      players: publicPlayers(freshPlayers),
      total: questions.length,
    })
    hostNextQuestion()
  }

  function hostNextQuestion() {
    const host = hostRef.current
    clearHostTimers()
    host.index += 1
    if (host.index >= host.questions.length) {
      finishHostGame()
      return
    }
    const question = host.questions[host.index]
    const timer = challengeConfig(host.config.challenge).timer
    host.phase = 'question'
    host.question = question
    host.responses = new Map()
    host.deadline = Date.now() + timer * 1000
    answerMetaRef.current = null
    questionRef.current = question
    setAnswer(null)
    setAnsweredCount(0)
    setSecondsLeft(timer)
    const message = {
      type: 'question',
      question: safeQuestion(question),
      index: host.index,
      total: host.questions.length,
      deadline: host.deadline,
      players: publicPlayers(host.players),
    }
    setNetGame({
      phase: 'question',
      question: safeQuestion(question),
      index: host.index,
      total: host.questions.length,
      deadline: host.deadline,
      players: publicPlayers(host.players),
    })
    broadcast(message)
    host.questionTimer = window.setTimeout(() => {
      if (host.phase === 'question') hostRevealAnswer()
    }, timer * 1000 + 250)
  }

  function handleIncomingAnswer(playerId, choice) {
    const host = hostRef.current
    if (host.phase !== 'question' || !host.question) return
    if (host.responses.has(playerId)) return
    if (Date.now() > host.deadline + 1500) return
    const selected = Number(choice)
    if (!Number.isInteger(selected) || selected < 0 || selected > 3) return
    host.responses.set(playerId, {
      choice: selected,
      timeLeft: Math.max(0, (host.deadline - Date.now()) / 1000),
    })
    setAnsweredCount(host.responses.size)
    broadcast({ type: 'answeredCount', count: host.responses.size })
    maybeReveal()
  }

  function submitAnswer(choice) {
    if (netGame?.phase !== 'question' || answerMetaRef.current) return
    const timer = challengeConfig(config.challenge).timer
    const timeLeft = Math.max(0, Math.min(timer, (netGame.deadline - Date.now()) / 1000))
    answerMetaRef.current = { choice, timeLeft }
    setAnswer(choice)
    playSfx?.('select')
    if (role === 'host') {
      handleIncomingAnswer('host', choice)
    } else if (connRef.current?.open) {
      connRef.current.send({ type: 'answer', choice })
    }
  }

  function maybeReveal() {
    const host = hostRef.current
    if (host.phase !== 'question') return
    const active = host.players.filter((player) => player.connected !== false)
    if (host.responses.size >= active.length) {
      clearTimeout(host.questionTimer)
      host.questionTimer = window.setTimeout(() => {
        if (host.phase === 'question') hostRevealAnswer()
      }, 500)
    }
  }

  function hostRevealAnswer() {
    const host = hostRef.current
    if (host.phase !== 'question' || !host.question) return
    clearTimeout(host.questionTimer)
    host.phase = 'reveal'
    const question = host.question
    const timer = challengeConfig(host.config.challenge).timer
    const nextPlayers = host.players.map((player) => {
      const response = host.responses.get(player.id)
      const correct = Boolean(response && response.choice === question.answer)
      const points = correct
        ? scoreAnswer({
            correct: true,
            timeLeft: response.timeLeft,
            timer,
            challenge: host.config.challenge,
            streak: player.streak || 0,
          })
        : 0
      return {
        ...player,
        score: (player.score || 0) + points,
        correct: (player.correct || 0) + (correct ? 1 : 0),
        total: (player.total || 0) + 1,
        streak: correct ? (player.streak || 0) + 1 : 0,
      }
    })
    syncPlayers(nextPlayers)
    applyLocalResult(question, answerMetaRef.current)
    const final = host.index >= host.questions.length - 1
    const responses = Object.fromEntries(Array.from(host.responses.entries()).map(([id, response]) => [id, response.choice]))
    const message = {
      type: 'reveal',
      index: host.index,
      total: host.questions.length,
      correctIndex: question.answer,
      explanation: question.explanation,
      reference: question.reference,
      verse: question.verse,
      responses,
      players: publicPlayers(nextPlayers),
      final,
    }
    setNetGame({
      phase: 'reveal',
      question: safeQuestion(question),
      index: host.index,
      total: host.questions.length,
      correctIndex: question.answer,
      explanation: question.explanation,
      reference: question.reference,
      verse: question.verse,
      responses,
      players: publicPlayers(nextPlayers),
      final,
    })
    setPlayers(publicPlayers(nextPlayers))
    setNetGame((current) => current)
    broadcast(message)
    playSfx?.(answerMetaRef.current?.choice === question.answer ? 'correct' : 'wrong')
    host.nextTimer = window.setTimeout(() => {
      if (final) finishHostGame()
      else hostNextQuestion()
    }, REVEAL_MS)
  }

  function finishHostGame() {
    const host = hostRef.current
    clearHostTimers()
    host.phase = 'finished'
    const resultPlayers = publicPlayers(host.players)
    broadcast({ type: 'finished', players: resultPlayers })
    setPlayers(resultPlayers)
    setNetGame({ phase: 'finished', players: resultPlayers })
    setView('finished')
  }

  function applyLocalResult(question, meta) {
    if (!question) return
    const previous = localStatsRef.current
    if (previous.answers.some((entry) => entry.questionId === question.id)) return
    const choice = meta?.choice ?? -1
    const correct = choice === question.answer
    const streak = correct ? previous.streak + 1 : 0
    const next = {
      correct: previous.correct + (correct ? 1 : 0),
      total: previous.total + 1,
      bestStreak: Math.max(previous.bestStreak, streak),
      streak,
      answers: [
        ...previous.answers,
        {
          questionId: question.id,
          selected: choice,
          correct,
          category: question.category,
          difficulty: question.difficulty,
          timeLeft: meta?.timeLeft || 0,
        },
      ],
    }
    localStatsRef.current = next
    setLocalStats(next)
  }

  function returnToLobby() {
    if (role !== 'host') return
    const host = hostRef.current
    clearHostTimers()
    host.phase = 'lobby'
    host.index = -1
    const reset = host.players.map((player) => ({
      ...player,
      score: 0,
      correct: 0,
      total: 0,
      streak: 0,
    }))
    syncPlayers(reset)
    broadcast({ type: 'lobby', players: publicPlayers(reset), config: host.config, roomCode: host.roomCode })
    setView('lobby')
    setNetGame(null)
    setAnswer(null)
    recordedRef.current = false
  }

  function leaveRoom() {
    if (role === 'host') {
      broadcast({ type: 'hostLeft' })
    } else if (connRef.current?.open) {
      try { connRef.current.send({ type: 'leave' }) } catch { /* ignore */ }
    }
    cleanupConnection()
    resetRoomState()
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(roomCode)
      setCopyNote('Room code copied')
    } catch {
      setCopyNote('Select and copy the code above')
    }
    window.setTimeout(() => setCopyNote(''), 2200)
  }

  async function shareRoom() {
    const text = `Join my Scripture Quest room. Code: ${roomCode}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Scripture Quest room', text })
      } else {
        await navigator.clipboard.writeText(text)
        setCopyNote('Invitation copied')
      }
    } catch {
      setCopyNote('Sharing is unavailable')
    }
    window.setTimeout(() => setCopyNote(''), 2200)
  }

  function backToEntry() {
    if (view === 'entry') {
      onBack()
      return
    }
    setLeaveOpen(true)
  }

  if (view === 'entry') {
    return (
      <div className="online page-enter">
        <div className="page-topbar">
          <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Multiplayer</button>
          <div className={`connection-pill ${online ? 'is-online' : 'is-offline'}`}>
            {online ? <Wifi size={14} /> : <WifiOff size={14} />}
            {online ? 'Ready to connect' : 'Offline'}
          </div>
        </div>

        <div className="online-heading">
          <div className="eyebrow">Across the distance</div>
          <h1>Open a room</h1>
          <p>Compete in real time with friends anywhere. No account, no lobby fees — just a code and a shared love of the Word.</p>
        </div>

        <div className="online-name">
          <label htmlFor="online-name">Your display name</label>
          <input
            id="online-name"
            value={name}
            maxLength={18}
            onChange={(event) => setName(event.target.value)}
            placeholder="Pilgrim"
          />
          <span>{name.length}/18</span>
        </div>

        <div className="online-entry">
          <section className="online-card online-card--host">
            <div className="online-card__icon"><Globe2 size={24} /></div>
            <span className="online-card__kicker">I’m hosting</span>
            <h2>Create a private room</h2>
            <p>You choose the category, the challenge, and when the contest begins.</p>
            <div className="online-card__features">
              <span><Check size={13} /> Up to eight players</span>
              <span><Check size={13} /> Live scoreboard</span>
              <span><Check size={13} /> Private six-character code</span>
            </div>
            <button className="btn btn--gold btn--block" onClick={() => createRoom(0)} disabled={status === 'creating'}>
              {status === 'creating' ? <><Spinner size={16} /> Opening room…</> : <><Radio size={16} /> Create room</>}
            </button>
          </section>

          <div className="online-or"><span>or</span></div>

          <section className="online-card online-card--join">
            <div className="online-card__icon"><KeyRound size={24} /></div>
            <span className="online-card__kicker">I’m joining</span>
            <h2>Enter a room code</h2>
            <p>Ask the host for the six-character code shown in their room.</p>
            <div className="code-input-wrap">
              <input
                className="code-input"
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder="ABC123"
                maxLength={6}
                inputMode="text"
                autoCapitalize="characters"
                aria-label="Room code"
              />
              <span>{codeInput.length}/6</span>
            </div>
            <button
              className="btn btn--outline btn--block"
              onClick={joinRoom}
              disabled={status === 'joining' || codeInput.length !== 6}
            >
              {status === 'joining' ? <><Spinner size={16} /> Finding room…</> : <><ArrowRight size={16} /> Join room</>}
            </button>
          </section>
        </div>

        {error && (
          <div className="online-error" role="alert">
            <WifiOff size={18} />
            <div><strong>Connection note</strong><p>{error}</p></div>
          </div>
        )}
        {!online && (
          <div className="offline-notice">
            <WifiOff size={18} />
            <div><strong>Online rooms need a connection.</strong><p>Pass & play is still available and works completely offline.</p></div>
          </div>
        )}

        <div className="online-trust">
          <div><ShieldIcon /><span>Private peer-to-peer room</span></div>
          <div><Users size={17} /><span>2–8 players</span></div>
          <div><BookOpen size={17} /><span>140 questions</span></div>
        </div>
      </div>
    )
  }

  if (view === 'lobby') {
    const isHost = role === 'host'
    const activePlayers = players.filter((player) => player.connected !== false)
    return (
      <div className="online-lobby page-enter">
        <div className="page-topbar">
          <button className="back-link" onClick={() => setLeaveOpen(true)}><ArrowLeft size={17} /> Leave room</button>
          <div className={`connection-pill ${online ? 'is-online' : 'is-offline'}`}>
            <span className="live-dot" /> Live lobby
          </div>
        </div>

        <div className="lobby-heading">
          <div>
            <div className="eyebrow">The room is open</div>
            <h1>{isHost ? 'Gather your players' : 'Waiting for the host'}</h1>
            <p>{isHost ? 'Share the code below. Begin when everyone has arrived.' : 'The host will begin the challenge. Say hello to the room.'}</p>
          </div>
          <div className="room-code-panel">
            <span>Room code</span>
            <strong>{roomCode}</strong>
            <div>
              <button onClick={copyCode}><Copy size={14} /> Copy</button>
              <button onClick={shareRoom}><Share2 size={14} /> Share</button>
            </div>
            {copyNote && <small>{copyNote}</small>}
          </div>
        </div>

        <div className="lobby-grid">
          <section className="panel lobby-players">
            <div className="panel-heading">
              <div><div className="eyebrow">Who’s here</div><h2>Players <span>{players.length}/{MAX_PLAYERS}</span></h2></div>
              <span className="lobby-live"><Radio size={13} /> {activePlayers.length} connected</span>
            </div>
            <div className="lobby-player-list">
              {players.map((player, index) => (
                <div className={`lobby-player ${player.connected === false ? 'is-offline' : ''}`} key={player.id}>
                  <div className="lobby-player__avatar" style={{ background: player.color }}>
                    {player.isHost ? <Crown size={17} /> : player.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="lobby-player__name">
                    <strong>{player.name}{player.id === currentPlayerId ? ' (you)' : ''}</strong>
                    <span>{player.isHost ? 'Host' : index === players.length - 1 ? 'Just arrived' : 'Ready to play'}</span>
                  </div>
                  <span className={`lobby-player__status ${player.connected === false ? 'is-offline' : ''}`}>
                    <i /> {player.connected === false ? 'Left' : 'Here'}
                  </span>
                </div>
              ))}
              {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, index) => (
                <div className="lobby-player lobby-player--empty" key={`empty-${index}`}>
                  <div className="lobby-player__avatar"><Users size={16} /></div>
                  <div className="lobby-player__name"><strong>Waiting for a friend</strong><span>Share the room code</span></div>
                </div>
              ))}
            </div>
            <div className="lobby-invite">
              <KeyRound size={16} />
              <p>{isHost ? 'Friends can join with the code at the top of this page.' : 'Waiting for more players? Send them the code.'}</p>
            </div>
          </section>

          <aside className="panel lobby-settings">
            <div className="panel-heading">
              <div><div className="eyebrow">{isHost ? 'Set the challenge' : 'Room settings'}</div><h2>{isHost ? 'Host controls' : 'Chosen by host'}</h2></div>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="online-category"><BookOpen size={14} /> Category</label>
              <select
                id="online-category"
                value={config.category}
                onChange={(event) => updateHostConfig({ category: event.target.value })}
                disabled={!isHost}
              >
                <option value="all">All Scripture</option>
                {CATEGORIES.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
              </select>
            </div>
            <div className="field">
              <span className="field-label"><Flame size={14} /> Challenge</span>
              <div className="challenge-compact challenge-compact--online">
                {CHALLENGES.map((entry) => (
                  <button
                    key={entry.id}
                    className={config.challenge === entry.id ? 'is-selected' : ''}
                    onClick={() => updateHostConfig({ challenge: entry.id })}
                    disabled={!isHost}
                  >
                    <strong>{entry.name}</strong>
                    <span>{entry.timer}s · {entry.multiplier}×</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="field-label"><Clock3 size={14} /> Questions</span>
              <div className="segmented">
                {[5, 8, 10].map((value) => (
                  <button
                    key={value}
                    className={config.count === value ? 'is-selected' : ''}
                    onClick={() => updateHostConfig({ count: value })}
                    disabled={!isHost}
                  >{value}</button>
                ))}
              </div>
            </div>
            <div className="lobby-summary">
              <div><span>Players</span><strong>{players.length}</strong></div>
              <div><span>Questions</span><strong>{config.count}</strong></div>
              <div><span>Timer</span><strong>{challengeConfig(config.challenge).timer}s</strong></div>
            </div>
            {isHost ? (
              <button className="btn btn--gold btn--block btn--lg" onClick={startOnlineGame} disabled={activePlayers.length < 2}>
                <Sparkles size={17} /> Begin challenge
              </button>
            ) : (
              <div className="waiting-box">
                <Spinner size={18} />
                <div><strong>Waiting for the host</strong><span>The game will begin shortly.</span></div>
              </div>
            )}
            {isHost && activePlayers.length < 2 && (
              <p className="lobby-hint">At least one friend must join before you can begin.</p>
            )}
          </aside>
        </div>

        <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Leave the room?" className="modal--small">
          <p className="modal-lead">Your seat will be released and the room will continue without you.</p>
          <div className="modal-actions">
            <button className="btn btn--ghost" onClick={() => setLeaveOpen(false)}>Stay</button>
            <button className="btn btn--danger" onClick={leaveRoom}>Leave room</button>
          </div>
        </Modal>
      </div>
    )
  }

  if (view === 'playing') {
    const question = netGame?.question || currentQuestion
    const categoryInfo = CATEGORY_MAP[question?.category] || { name: 'All Scripture', art: 'scrolls', color: '#e2bf7c', tint: '#33261a', blurb: '' }
    const isReveal = netGame?.phase === 'reveal'
    const correctIndex = isReveal ? netGame.correctIndex : null
    const myResponse = isReveal && netGame.responses ? netGame.responses[currentPlayerId] : answer
    const isCorrect = isReveal && myResponse === correctIndex
    const didAnswer = myResponse !== null && myResponse !== undefined
    const displayPlayers = isReveal ? netGame.players : players
    return (
      <div className="online-game page-enter">
        <div className="online-game__topbar">
          <button className="icon-btn icon-btn--soft" onClick={() => setLeaveOpen(true)} aria-label="Leave room"><ArrowLeft size={19} /></button>
          <div className="online-room-pill"><span className="live-dot" /> {roomCode}</div>
          <div className="online-scorestrip">
            {sortedPlayers.map((player) => (
              <div className={`score-chip ${player.id === currentPlayerId ? 'is-current' : ''}`} key={player.id}>
                <span style={{ background: player.color }} />
                <strong>{player.name}</strong>
                <b>{player.score || 0}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="battle-layout">
          <main className="battle-main">
            <div className="battle-meta">
              <span className={`difficulty-pill difficulty-${question?.difficulty}`}>{question?.difficulty}</span>
              <span>{categoryInfo.name}</span>
              <span className="battle-meta__count">Question {(netGame?.index ?? 0) + 1} of {netGame?.total || config.count}</span>
              <div className={`question-timer ${secondsLeft <= 5 && !isReveal ? 'is-urgent' : ''}`}>
                <Clock3 size={15} /> {isReveal ? 'Reveal' : `${secondsLeft}s`}
              </div>
            </div>
            <div className="question-progress"><i style={{ width: `${(((netGame?.index ?? 0) + (isReveal ? 1 : 0)) / (netGame?.total || config.count)) * 100}%` }} /></div>
            <div className="battle-question">
              <span className="question-card__index">
                {isReveal ? 'The answer' : didAnswer ? 'Answer locked · waiting for the room' : 'Choose your answer'}
              </span>
              <h1>{question?.prompt}</h1>
              <div className="answers">
                {(question?.options || []).map((option, index) => {
                  const showCorrect = isReveal && index === correctIndex
                  const showWrong = isReveal && index === myResponse && myResponse !== correctIndex
                  const dim = isReveal && !showCorrect && !showWrong
                  return (
                    <button
                      key={option}
                      className={`answer ${showCorrect ? 'is-correct' : ''} ${showWrong ? 'is-wrong' : ''} ${dim ? 'is-dimmed' : ''} ${!isReveal && myResponse === index ? 'is-selected' : ''}`}
                      onClick={() => submitAnswer(index)}
                      disabled={isReveal || didAnswer || secondsLeft <= 0}
                    >
                      <span className="answer__letter">{String.fromCharCode(65 + index)}</span>
                      <span className="answer__text">{option}</span>
                      <span className="answer__state">
                        {showCorrect && <Check size={18} />}
                        {showWrong && <X size={18} />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {!isReveal && (
              <div className="battle-waiting">
                {didAnswer ? (
                  <><Check size={15} /> Answer locked. <strong>{answeredCount || 1}</strong> of {players.length} answered.</>
                ) : (
                  <><Zap size={15} /> Speed and streak add points. <strong>{answeredCount}</strong> of {players.length} answered.</>
                )}
              </div>
            )}

            {isReveal && (
              <div className={`feedback feedback--compact ${isCorrect ? 'is-correct' : 'is-wrong'}`}>
                <div className="feedback__top">
                  <div className="feedback__verdict">
                    <span className="feedback__icon">{isCorrect ? <Check size={18} /> : <X size={18} />}</span>
                    <div>
                      <strong>{isCorrect ? 'Correct' : myResponse === null ? 'No answer submitted' : `The answer is ${question?.options[correctIndex]}`}</strong>
                      <span>{isCorrect ? 'Points added to your total' : 'The room moves on'}</span>
                    </div>
                  </div>
                  <div className="next-question-note"><Spinner size={13} /> Next question shortly</div>
                </div>
                <p className="feedback__explanation">{netGame.explanation}</p>
                <div className="scripture-card">
                  <div className="scripture-card__mark">“</div>
                  <div>
                    <p>{netGame.verse}</p>
                    <span>{netGame.reference} · KJV</span>
                  </div>
                </div>
              </div>
            )}
          </main>

          <aside className="battle-aside">
            <CategoryArt category={categoryInfo} />
            <div className="battle-aside__title">
              <span className="eyebrow">{categoryInfo.eyebrow}</span>
              <h2>{categoryInfo.name}</h2>
            </div>
            <div className="battle-scoreboard">
              <div className="battle-scoreboard__head"><Trophy size={15} /> Live standings</div>
              {displayPlayers.map((player, index) => (
                <div className={`battle-score-row ${player.id === currentPlayerId ? 'is-me' : ''}`} key={player.id}>
                  <span className="battle-score-row__place">{index + 1}</span>
                  <span className="battle-score-row__dot" style={{ background: player.color }} />
                  <strong>{player.name}{player.id === currentPlayerId ? ' (you)' : ''}</strong>
                  <b>{player.score || 0}</b>
                </div>
              ))}
            </div>
            <div className="battle-aside__room">
              <span>Room</span>
              <strong>{roomCode}</strong>
              <button className="icon-btn icon-btn--tiny" onClick={copyCode} aria-label="Copy room code"><Copy size={14} /></button>
            </div>
          </aside>
        </div>

        <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Leave the room?" className="modal--small">
          <p className="modal-lead">The match will continue without you. Your progress in this room will be lost.</p>
          <div className="modal-actions">
            <button className="btn btn--ghost" onClick={() => setLeaveOpen(false)}>Keep playing</button>
            <button className="btn btn--danger" onClick={leaveRoom}>Leave room</button>
          </div>
        </Modal>
      </div>
    )
  }

  const finalPlayers = netGame?.players || sortedPlayers
  const ranked = [...finalPlayers].sort((a, b) => (b.score || 0) - (a.score || 0))
  const myPlace = ranked.findIndex((player) => player.id === currentPlayerId) + 1
  const winner = ranked[0]
  return (
    <div className="online-results page-enter">
      <div className="page-topbar">
        <button className="back-link" onClick={() => setLeaveOpen(true)}><LogOut size={16} /> Leave room</button>
        <div className="online-room-pill"><span className="live-dot" /> Room {roomCode}</div>
      </div>
      <div className="online-results__heading">
        <div className="eyebrow">The room has spoken</div>
        <h1>{winner?.id === currentPlayerId ? 'Victory is yours' : `${winner?.name || 'The winner'} takes the crown`}</h1>
        <p>{myPlace ? `You finished ${ordinal(myPlace)} of ${ranked.length}.` : 'The challenge is complete.'}</p>
      </div>
      <div className="online-podium">
        {[ranked[1], ranked[0], ranked[2]].filter(Boolean).map((player) => {
          const place = ranked.indexOf(player) + 1
          return (
            <div className={`online-podium__place online-podium__place--${place}`} key={player.id}>
              {place === 1 && <Crown size={22} />}
              <div className="online-podium__avatar" style={{ background: player.color }}>
                {place === 1 ? <Trophy size={22} /> : <Medal size={19} />}
              </div>
              <strong>{player.name}</strong>
              <span>{(player.score || 0).toLocaleString()} pts</span>
              <small>{player.correct || 0}/{player.total || 0} correct</small>
              <div className="online-podium__block">{place}</div>
            </div>
          )
        })}
      </div>
      <div className="online-results__table">
        {ranked.map((player, index) => (
          <div className="online-result-row" key={player.id}>
            <span>{index + 1}</span>
            <i style={{ background: player.color }} />
            <strong>{player.name}{player.id === currentPlayerId ? ' (you)' : ''}</strong>
            <small>{player.total ? Math.round(((player.correct || 0) / player.total) * 100) : 0}% accuracy</small>
            <b>{(player.score || 0).toLocaleString()}</b>
          </div>
        ))}
      </div>
      <div className="online-results__local">
        <div className="online-results__local-icon"><Sparkles size={18} /></div>
        <div>
          <strong>Your answers: {localStats.correct}/{localStats.total} correct</strong>
          <span>Best streak {localStats.bestStreak} · Progress added to your journey</span>
        </div>
        <Crown size={18} />
      </div>
      <div className="online-results__actions">
        {role === 'host' ? (
          <button className="btn btn--gold btn--lg" onClick={returnToLobby}><RotateCcw size={16} /> Return to lobby</button>
        ) : (
          <div className="waiting-box waiting-box--result"><Spinner size={17} /><div><strong>Waiting for the host</strong><span>They can start another round.</span></div></div>
        )}
        <button className="btn btn--outline btn--lg" onClick={leaveRoom}><LogOut size={16} /> Leave room</button>
      </div>
      <Modal open={leaveOpen} onClose={() => setLeaveOpen(false)} title="Leave the room?" className="modal--small">
        <p className="modal-lead">Close your seat in this room. Your recorded progress will remain.</p>
        <div className="modal-actions">
          <button className="btn btn--ghost" onClick={() => setLeaveOpen(false)}>Stay</button>
          <button className="btn btn--danger" onClick={leaveRoom}>Leave room</button>
        </div>
      </Modal>
    </div>
  )
}

function peerErrorMessage(error, action) {
  if (error?.type === 'peer-unavailable') return 'That room was not found. Confirm the code and ask the host to keep the room open.'
  if (error?.type === 'unavailable-id') return 'A room code collided. Please create the room again.'
  if (error?.type === 'network' || error?.type === 'server-error' || error?.type === 'socket-error') {
    return 'The room service could not be reached. Check your connection, then try again.'
  }
  if (error?.type === 'browser-incompatible') return 'This browser does not support the WebRTC connection needed for online rooms.'
  return action === 'host'
    ? 'The room could not be opened. Check your connection and try again.'
    : 'The room could not be joined. Check the code and try again.'
}

function ordinal(value) {
  const remainder = value % 100
  if (remainder >= 11 && remainder <= 13) return `${value}th`
  if (value % 10 === 1) return `${value}st`
  if (value % 10 === 2) return `${value}nd`
  if (value % 10 === 3) return `${value}rd`
  return `${value}th`
}

function ShieldIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
