import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Crown,
  Globe2,
  KeyRound,
  Radio,
  Smartphone,
  Sparkles,
  Trophy,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react'
import { CATEGORY_MAP } from '../data/categories.js'
import { CategoryArt } from './Artwork.jsx'

export function MultiplayerHub({ online, progress, onBack, onPassPlay, onOnline }) {
  return (
    <div className="multiplayer page-enter">
      <div className="page-topbar">
        <button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Home</button>
        <div className={`connection-pill ${online ? 'is-online' : 'is-offline'}`}>
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          {online ? 'Connected' : 'Offline mode'}
        </div>
      </div>

      <div className="multiplayer__heading">
        <div className="eyebrow">Better together</div>
        <h1>Two ways to compete</h1>
        <p>Gather around one table or open a room across the world. The questions are live, the fellowship is real.</p>
      </div>

      <div className="mode-grid">
        <button className="mode-card mode-card--party" onClick={onPassPlay}>
          <div className="mode-card__art">
            <CategoryArt category={CATEGORY_MAP.heroes} />
            <div className="mode-card__art-overlay">
              <Users size={25} />
            </div>
          </div>
          <div className="mode-card__copy">
            <span className="mode-card__tag"><Smartphone size={14} /> On this device</span>
            <h2>Pass & play</h2>
            <p>Two to six friends share one screen. Take turns, keep score, and crown a champion.</p>
            <div className="mode-card__features">
              <span><Check size={13} /> No connection needed</span>
              <span><Check size={13} /> Custom player names</span>
            </div>
            <span className="mode-card__cta">Set the table <ArrowRight size={16} /></span>
          </div>
        </button>

        <button className="mode-card mode-card--online" onClick={onOnline}>
          <div className="mode-card__art mode-card__art--online">
            <CategoryArt category={CATEGORY_MAP['early-church']} />
            <div className="mode-card__art-overlay">
              <Globe2 size={25} />
            </div>
            <div className="mode-card__live"><Radio size={12} /> Live room</div>
          </div>
          <div className="mode-card__copy">
            <span className="mode-card__tag"><Wifi size={14} /> Across devices</span>
            <h2>Online room</h2>
            <p>Create a private room, share the code, and race through the same questions in real time.</p>
            <div className="mode-card__features">
              <span><Check size={13} /> Live scores</span>
              <span><Check size={13} /> Up to eight players</span>
            </div>
            <span className="mode-card__cta">Create or join <ArrowRight size={16} /></span>
          </div>
        </button>
      </div>

      {!online && (
        <div className="offline-notice">
          <WifiOff size={18} />
          <div>
            <strong>You’re offline right now.</strong>
            <p>Pass & play and solo quests are fully available. Reconnect to create or join an online room.</p>
          </div>
        </div>
      )}

      <div className="multiplayer__how">
        <div className="multiplayer__how-head">
          <div>
            <div className="eyebrow">How it works</div>
            <h2>From room code to victory</h2>
          </div>
          <div className="multiplayer__record">
            <Trophy size={16} />
            <span><strong>{progress.onlineGames + progress.partyGames}</strong> games shared</span>
          </div>
        </div>
        <div className="how-grid">
          <div className="how-step">
            <span>01</span>
            <div className="how-step__icon"><KeyRound size={20} /></div>
            <h3>Open a room</h3>
            <p>Host creates a six-character code. Friends join from their own device.</p>
          </div>
          <div className="how-step">
            <span>02</span>
            <div className="how-step__icon"><Users size={20} /></div>
            <h3>Gather players</h3>
            <p>Watch the lobby fill. The host chooses the category and challenge level.</p>
          </div>
          <div className="how-step">
            <span>03</span>
            <div className="how-step__icon"><Sparkles size={20} /></div>
            <h3>Race the clock</h3>
            <p>Everyone sees the same question. Speed and streaks earn extra points.</p>
          </div>
          <div className="how-step">
            <span>04</span>
            <div className="how-step__icon"><Crown size={20} /></div>
            <h3>Crown the winner</h3>
            <p>Live scores update each round. The highest total takes the room.</p>
          </div>
        </div>
      </div>

      <div className="multiplayer__note">
        <BookOpen size={17} />
        <p>
          Online rooms use a direct peer-to-peer connection with a public signaling service.
          No account, download, or personal detail is required.
        </p>
        <div className="multiplayer__seed">
          <Copy size={14} />
          <span>Room codes are private and temporary.</span>
        </div>
      </div>
    </div>
  )
}
