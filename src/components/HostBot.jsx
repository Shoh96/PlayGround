import { Bot, RotateCcw, Sparkles, Volume2 } from 'lucide-react'
import { HOST_NAME } from '../lib/host.js'

const STATUS = {
  asking: 'Reading the question aloud…',
  listening: 'Your turn. Choose an answer.',
  feedback: 'Here is the scripture behind the answer.',
  review: 'Review the scripture, then continue.',
  muted: 'Voice host is muted in preferences.',
}

export function HostBot({ status = 'listening', enabled = true, onReplay }) {
  const speaking = status === 'asking' || status === 'feedback'
  return (
    <div className={`host-bot ${speaking ? 'is-speaking' : ''}`} aria-live="polite">
      <div className="host-bot__avatar">
        <Bot size={22} />
        {speaking && <span className="host-bot__pulse" aria-hidden="true" />}
      </div>
      <div className="host-bot__copy">
        <span className="host-bot__eyebrow"><Sparkles size={12} /> Voice host</span>
        <strong>{HOST_NAME}</strong>
        <p>{enabled ? STATUS[status] : STATUS.muted}</p>
      </div>
      {enabled && onReplay && (
        <button className="host-bot__replay" onClick={onReplay} aria-label="Read the question again">
          <RotateCcw size={15} />
          <Volume2 size={15} />
        </button>
      )}
    </div>
  )
}
