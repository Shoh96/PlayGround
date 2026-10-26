import { useEffect, useRef } from 'react'
import {
  Award,
  BookOpen,
  Compass,
  Crown,
  Flame,
  Globe2,
  Shield,
  Sparkles,
  Sun,
  Sunrise,
  Users,
  X,
} from 'lucide-react'
import { levelProgress } from '../lib/game.js'

export function LogoMark({ size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" rx="15" fill="#141b24" stroke="rgba(244,213,148,.38)" />
      <path d="M24 13v23" stroke="#e7c47e" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M11 16c4.3-2.2 8.6-2.2 13 0v18c-4.4-2.2-8.7-2.2-13 0V16Z" fill="#f5e8ca" />
      <path d="M37 16c-4.3-2.2-8.6-2.2-13 0v18c4.4-2.2 8.7-2.2 13 0V16Z" fill="#dbc18c" />
      <path d="M14.5 20c2.6-1 5.1-1 7.7 0M14.5 24c2.6-1 5.1-1 7.7 0M25.8 20c2.6-1 5.1-1 7.7 0M25.8 24c2.6-1 5.1-1 7.7 0" stroke="#947443" strokeWidth="1" strokeLinecap="round" opacity=".7" />
      <path d="M24 13l1.1 3.3L28 17.5l-2.9 1.2L24 22l-1.1-3.3L20 17.5l2.9-1.2L24 13Z" fill="#f4d38c" />
    </svg>
  )
}

export function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <LogoMark size={compact ? 36 : 44} />
      <div className="brand__text">
        <span className="brand__name">Scripture Quest</span>
        {!compact && <span className="brand__tag">Bible trivia</span>}
      </div>
    </div>
  )
}

export function LevelOrb({ xp, size = 'md', showTitle = true }) {
  const level = levelProgress(xp)
  return (
    <div className={`level-orb level-orb--${size}`} style={{ '--level-progress': `${level.percent}%` }}>
      <div className="level-orb__ring">
        <div className="level-orb__inner">
          <span className="level-orb__label">Level</span>
          <strong>{level.level}</strong>
        </div>
      </div>
      {showTitle && (
        <div className="level-orb__copy">
          <span>{level.title}</span>
          <small>{level.current} / {level.needed} XP</small>
        </div>
      )}
    </div>
  )
}

export function LevelBar({ xp }) {
  const level = levelProgress(xp)
  return (
    <div className="level-bar">
      <div className="level-bar__top">
        <span>Level {level.level} · {level.title}</span>
        <span>{level.needed - level.current} XP to next</span>
      </div>
      <div className="level-bar__track">
        <div className="level-bar__fill" style={{ width: `${level.percent}%` }} />
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, className = '' }) {
  const panelRef = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.activeElement
    panelRef.current?.focus()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`modal ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={panelRef}>
        <div className="modal__head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  )
}

export const ACHIEVEMENT_ICONS = {
  sunrise: Sunrise,
  sparkles: Sparkles,
  flame: Flame,
  book: BookOpen,
  sun: Sun,
  compass: Compass,
  crown: Crown,
  shield: Shield,
  users: Users,
  globe: Globe2,
  award: Award,
}

export function AchievementIcon({ icon, size = 22 }) {
  const Icon = ACHIEVEMENT_ICONS[icon] || Award
  return <Icon size={size} strokeWidth={1.8} />
}

export function ActivityStrip({ history }) {
  const days = []
  const now = new Date()
  const active = new Set(history.map((entry) => entry.dateKey))
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    days.push({
      key,
      label: date.toLocaleDateString(undefined, { weekday: 'narrow' }),
      active: active.has(key),
      today: offset === 0,
    })
  }
  return (
    <div className="activity-strip" aria-label="Activity over the last seven days">
      {days.map((day) => (
        <div className={`activity-day ${day.active ? 'is-active' : ''} ${day.today ? 'is-today' : ''}`} key={day.key}>
          <span>{day.label}</span>
          <i />
        </div>
      ))}
    </div>
  )
}

export function Spinner({ size = 20 }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-hidden="true" />
}
