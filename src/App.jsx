import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Download,
  Globe2,
  Home as HomeIcon,
  Settings,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Bot,
  Vibrate,
  Timer,
  Leaf,
  RotateCcw,
  X,
} from 'lucide-react'
import { Home } from './components/Home.jsx'
import { SoloSetup } from './components/SoloSetup.jsx'
import { GameScreen } from './components/GameScreen.jsx'
import { Results } from './components/Results.jsx'
import { ProgressScreen } from './components/ProgressScreen.jsx'
import { MultiplayerHub } from './components/MultiplayerHub.jsx'
import { PartyMode } from './components/PartyMode.jsx'
import { OnlineMode } from './components/OnlineMode.jsx'
import { Brand, LevelOrb, Modal } from './components/ui.jsx'
import { QUESTION_COUNT } from './data/questions.js'
import { dailySetup, levelProgress, localDateKey, pickQuestions, xpForResult } from './lib/game.js'
import { loadProgress, resetProgress, saveProgress, updateProgressAfterGame } from './lib/storage.js'
import { playSfx as playSound } from './lib/sound.js'

export default function App() {
  const [progress, setProgress] = useState(loadProgress)
  const progressRef = useRef(progress)
  const [route, setRoute] = useState({ name: 'home' })
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [installPrompt, setInstallPrompt] = useState(null)
  const [canInstall, setCanInstall] = useState(false)

  useEffect(() => {
    progressRef.current = progress
    saveProgress(progress)
  }, [progress])

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    const handlePrompt = (event) => {
      event.preventDefault()
      setInstallPrompt(event)
      setCanInstall(true)
    }
    const handleInstalled = () => {
      setCanInstall(false)
      setInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handlePrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [route.name])

  function navigate(name, data = {}) {
    setRoute({ name, ...data })
  }

  function playSfx(name) {
    if (progressRef.current.settings.sound) playSound(name, true)
  }

  function updateSettings(patch) {
    setProgress((current) => ({ ...current, settings: { ...current.settings, ...patch } }))
  }

  function recordGame(result) {
    const dateKey = result.dateKey || localDateKey()
    const xpEarned = xpForResult(result, result.mode)
    const enriched = { ...result, dateKey, xpEarned }
    const update = updateProgressAfterGame(progressRef.current, enriched)
    progressRef.current = update.progress
    setProgress(update.progress)
    return { ...enriched, ...update }
  }

  function startSolo(initialCategory = 'all') {
    navigate('setup', { initialCategory })
  }

  function beginSolo(config) {
    const questions = pickQuestions({
      category: config.category,
      challenge: config.challenge,
      format: config.format || 'all',
      count: config.count,
      seed: `${Date.now()}-${Math.random()}`,
    })
    navigate('game', { questions, config, mode: 'solo' })
  }

  function startDaily() {
    const daily = dailySetup()
    if (progressRef.current.lastDailyDate === daily.dateKey) return
    const questions = pickQuestions({
      category: daily.category,
      challenge: daily.challenge,
      count: daily.count,
      seed: daily.seed,
      daily: true,
    })
    navigate('game', {
      questions,
      config: { ...daily, timerEnabled: progressRef.current.settings.timer !== false },
      mode: 'daily',
    })
  }

  function completeSolo(result) {
    const enriched = recordGame(result)
    navigate('results', { result: enriched })
  }

  function exitGame() {
    if (route.mode === 'daily') navigate('home')
    else navigate('setup', { initialCategory: route.config?.category || 'all' })
  }

  function replayFromResults(result) {
    navigate('setup', { initialCategory: result.category || 'all' })
  }

  function handleResetProgress() {
    const fresh = resetProgress()
    progressRef.current = fresh
    setProgress(fresh)
    setSettingsOpen(false)
    navigate('home')
  }

  async function installApp() {
    if (!installPrompt) return
    installPrompt.prompt()
    try {
      await installPrompt.userChoice
    } catch {
      // The browser may dismiss the prompt without a result.
    }
    setInstallPrompt(null)
    setCanInstall(false)
  }

  function handleShare() {
    playSfx('select')
  }

  const content = (() => {
    if (route.name === 'home') {
      return (
        <Home
          progress={progress}
          online={online}
          canInstall={canInstall}
          onStartSolo={startSolo}
          onDaily={startDaily}
          onMultiplayer={() => navigate('multiplayer')}
          onCategory={startSolo}
          onProgress={() => navigate('progress')}
          onSettings={() => setSettingsOpen(true)}
          onInstall={installApp}
        />
      )
    }
    if (route.name === 'setup') {
      return (
        <SoloSetup
          initialCategory={route.initialCategory || 'all'}
          progress={progress}
          onBack={() => navigate('home')}
          onStart={beginSolo}
          playSfx={playSfx}
        />
      )
    }
    if (route.name === 'game') {
      return (
        <GameScreen
          key={`${route.mode}-${route.questions?.[0]?.id || 'game'}`}
          questions={route.questions}
          category={route.config.category}
          challenge={route.config.challenge}
          format={route.config.format || 'all'}
          timerEnabled={route.config.timerEnabled !== false}
          mode={route.mode}
          settings={progress.settings}
          onExit={exitGame}
          onComplete={completeSolo}
          playSfx={playSfx}
        />
      )
    }
    if (route.name === 'results') {
      return (
        <Results
          result={route.result}
          progress={progress}
          settings={progress.settings}
          onHome={() => navigate('home')}
          onReplay={() => replayFromResults(route.result)}
          onProgress={() => navigate('progress')}
          onShare={handleShare}
          playSfx={playSfx}
        />
      )
    }
    if (route.name === 'progress') {
      return (
        <ProgressScreen
          progress={progress}
          onBack={() => navigate('home')}
          onPlay={startSolo}
          onSettings={() => setSettingsOpen(true)}
        />
      )
    }
    if (route.name === 'multiplayer') {
      return (
        <MultiplayerHub
          online={online}
          progress={progress}
          onBack={() => navigate('home')}
          onPassPlay={() => navigate('party')}
          onOnline={() => navigate('online')}
        />
      )
    }
    if (route.name === 'party') {
      return (
        <PartyMode
          progress={progress}
          settings={progress.settings}
          onBack={() => navigate('multiplayer')}
          onHome={() => navigate('home')}
          onRecord={recordGame}
          playSfx={playSfx}
        />
      )
    }
    if (route.name === 'online') {
      return (
        <OnlineMode
          progress={progress}
          settings={progress.settings}
          online={online}
          onBack={() => navigate('multiplayer')}
          onRecord={recordGame}
          playSfx={playSfx}
        />
      )
    }
    return null
  })()

  const showChrome = ['home', 'progress', 'multiplayer'].includes(route.name)

  return (
    <div className={`app ${progress.settings.reduceMotion ? 'reduce-motion' : ''}`}>
      <div className="app__atmosphere" aria-hidden="true">
        <div className="app__glow app__glow--one" />
        <div className="app__glow app__glow--two" />
        <div className="app__stars" />
      </div>
      {showChrome && (
        <header className="site-header">
          <button className="site-header__brand" onClick={() => navigate('home')} aria-label="Scripture Quest home">
            <Brand />
          </button>
          <nav className="site-nav" aria-label="Main navigation">
            <button className={route.name === 'home' ? 'is-active' : ''} onClick={() => navigate('home')}>
              <HomeIcon size={15} /> Home
            </button>
            <button onClick={() => startSolo('all')}>
              <BookOpen size={15} /> Play
            </button>
            <button className={route.name === 'multiplayer' ? 'is-active' : ''} onClick={() => navigate('multiplayer')}>
              <Users size={15} /> Together
            </button>
            <button className={route.name === 'progress' ? 'is-active' : ''} onClick={() => navigate('progress')}>
              <Trophy size={15} /> Journey
            </button>
          </nav>
          <div className="site-header__actions">
            {!online && <span className="offline-badge"><X size={12} /> Offline</span>}
            <button className="header-level" onClick={() => navigate('progress')} aria-label="View your level and progress">
              <LevelOrb xp={progress.xp} size="sm" showTitle={false} />
              <span>
                <small>Level {levelProgress(progress.xp).level}</small>
                <strong>{levelProgress(progress.xp).title}</strong>
              </span>
            </button>
            <button className="icon-btn icon-btn--soft" onClick={() => setSettingsOpen(true)} aria-label="Open preferences">
              <Settings size={18} />
            </button>
          </div>
        </header>
      )}

      <main className="app__main">{content}</main>

      {route.name === 'home' && (
        <nav className="mobile-nav" aria-label="Mobile navigation">
          <button className="is-active" onClick={() => navigate('home')}><HomeIcon size={19} /><span>Home</span></button>
          <button onClick={() => startSolo('all')}><BookOpen size={19} /><span>Play</span></button>
          <button onClick={() => navigate('multiplayer')}><Users size={19} /><span>Together</span></button>
          <button onClick={() => navigate('progress')}><Trophy size={19} /><span>Journey</span></button>
          <button onClick={() => setSettingsOpen(true)}><Settings size={19} /><span>Settings</span></button>
        </nav>
      )}

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={progress.settings}
        onChange={updateSettings}
        onReset={handleResetProgress}
        canInstall={canInstall}
        onInstall={installApp}
        online={online}
      />
    </div>
  )
}

function SettingsModal({ open, onClose, settings, onChange, onReset, canInstall, onInstall, online }) {
  const [confirmReset, setConfirmReset] = useState(false)

  useEffect(() => {
    if (!open) setConfirmReset(false)
  }, [open])

  return (
    <Modal open={open} onClose={onClose} title="Preferences">
      <div className="settings">
        <div className="settings-section">
          <label className="settings-label" htmlFor="player-name">Display name</label>
          <input
            id="player-name"
            className="settings-input"
            maxLength={18}
            value={settings.playerName}
            onChange={(event) => onChange({ playerName: event.target.value })}
            placeholder="Pilgrim"
          />
          <p className="settings-hint">Used when you create or join an online room.</p>
        </div>

        <div className="settings-section">
          <span className="settings-label">Experience</span>
          <SettingToggle
            icon={settings.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            title="Sound effects"
            description="Gentle tones for answers and celebrations."
            active={settings.sound}
            onClick={() => onChange({ sound: !settings.sound })}
          />
          <SettingToggle
            icon={<Vibrate size={18} />}
            title="Haptics"
            description="A light pulse on supported devices."
            active={settings.haptics}
            onClick={() => onChange({ haptics: !settings.haptics })}
          />
          <SettingToggle
            icon={<Timer size={18} />}
            title="Countdown by default"
            description="New solo quests begin with the timer on."
            active={settings.timer}
            onClick={() => onChange({ timer: !settings.timer })}
          />
          <SettingToggle
            icon={<Bot size={18} />}
            title="Scribe voice host"
            description="Reads questions, feedback, and scripture aloud when supported."
            active={settings.hostVoice !== false}
            onClick={() => onChange({ hostVoice: settings.hostVoice === false })}
          />
          <SettingToggle
            icon={<Leaf size={18} />}
            title="Reduce motion"
            description="Soften transitions and decorative movement."
            active={settings.reduceMotion}
            onClick={() => onChange({ reduceMotion: !settings.reduceMotion })}
          />
        </div>

        <div className="settings-section settings-section--install">
          <div className="settings-install">
            <div className="settings-install__icon"><Download size={18} /></div>
            <div>
              <strong>Scripture Quest as an app</strong>
              <p>{online ? 'Works offline after the first visit. Solo and pass & play need no connection.' : 'You are offline — the installed app would still be fully playable.'}</p>
            </div>
            {canInstall ? (
              <button className="btn btn--gold btn--sm" onClick={onInstall}>Install</button>
            ) : (
              <span className="settings-install__status">PWA ready</span>
            )}
          </div>
        </div>

        <div className="settings-section settings-about">
          <div><Sparkles size={15} /><span>{QUESTION_COUNT.toLocaleString()} questions · 14 categories · 4 challenge levels</span></div>
          <div><Globe2 size={15} /><span>Online rooms connect peer-to-peer through PeerJS.</span></div>
          <div><BookOpen size={15} /><span>Scripture quotations from the King James Version, public domain.</span></div>
          <div><CalendarDays size={15} /><span>Original illustrations and art. No third-party tracking.</span></div>
        </div>

        <div className="settings-section settings-danger">
          <div>
            <strong>Reset journey</strong>
            <p>Clear levels, achievements, history, and preferences from this device.</p>
          </div>
          {confirmReset ? (
            <div className="settings-danger__confirm">
              <button className="btn btn--ghost btn--sm" onClick={() => setConfirmReset(false)}>Cancel</button>
              <button className="btn btn--danger btn--sm" onClick={onReset}><RotateCcw size={14} /> Erase everything</button>
            </div>
          ) : (
            <button className="btn btn--danger-ghost btn--sm" onClick={() => setConfirmReset(true)}>Reset</button>
          )}
        </div>
      </div>
    </Modal>
  )
}

function SettingToggle({ icon, title, description, active, onClick }) {
  return (
    <button className={`setting-toggle ${active ? 'is-on' : ''}`} onClick={onClick} aria-pressed={active}>
      <span className="setting-toggle__icon">{icon}</span>
      <span className="setting-toggle__copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <span className="switch"><i /></span>
    </button>
  )
}
