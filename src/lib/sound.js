let audioContext

function getContext() {
  if (typeof window === 'undefined') return null
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return null
  if (!audioContext) audioContext = new AudioContext()
  if (audioContext.state === 'suspended') audioContext.resume().catch(() => {})
  return audioContext
}

function tone(context, frequency, start, duration, gainValue = 0.045, type = 'sine') {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.03)
}

export function playSfx(name, enabled = true) {
  if (!enabled) return
  const context = getContext()
  if (!context) return
  const now = context.currentTime
  if (name === 'select') {
    tone(context, 420, now, 0.07, 0.025, 'triangle')
  } else if (name === 'correct') {
    tone(context, 523.25, now, 0.16, 0.045, 'sine')
    tone(context, 659.25, now + 0.09, 0.18, 0.04, 'sine')
    tone(context, 783.99, now + 0.18, 0.25, 0.035, 'sine')
  } else if (name === 'wrong') {
    tone(context, 196, now, 0.18, 0.04, 'triangle')
    tone(context, 155.56, now + 0.1, 0.24, 0.03, 'triangle')
  } else if (name === 'finish') {
    ;[523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
      tone(context, frequency, now + index * 0.12, 0.32, 0.035, 'sine')
    })
  } else if (name === 'tick') {
    tone(context, 880, now, 0.035, 0.012, 'square')
  } else {
    tone(context, 330, now, 0.06, 0.02, 'triangle')
  }
}

export function haptic(pattern = 12, enabled = true) {
  if (!enabled || typeof navigator === 'undefined' || !navigator.vibrate) return
  navigator.vibrate(pattern)
}
