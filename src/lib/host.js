let sequence = 0
let current = null

export const HOST_NAME = 'Scribe'

export function hostVoiceSupported() {
  return typeof window !== 'undefined'
    && 'speechSynthesis' in window
    && 'SpeechSynthesisUtterance' in window
}

function preferredVoice() {
  if (!hostVoiceSupported()) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const english = voices.filter((voice) => /^en(-|_|$)/i.test(voice.lang))
  return english.find((voice) => /natural|neural|google|samantha|daniel|serena|aria/i.test(voice.name))
    || english[0]
    || voices[0]
}

export function stopHostVoice() {
  sequence += 1
  current = null
  if (hostVoiceSupported()) window.speechSynthesis.cancel()
}

export function speakHost(text, { onStart, onEnd, rate = 0.96, pitch = 0.94 } = {}) {
  const words = String(text || '').trim()
  if (!words || !hostVoiceSupported()) {
    onEnd?.()
    return () => {}
  }

  stopHostVoice()
  const id = ++sequence
  let finished = false
  const utterance = new window.SpeechSynthesisUtterance(words.slice(0, 1600))
  const voice = preferredVoice()
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang || 'en-US'
  utterance.rate = rate
  utterance.pitch = pitch
  utterance.volume = 1

  const finish = () => {
    if (finished) return
    finished = true
    if (current?.id === id) current = null
    onEnd?.()
  }

  utterance.onstart = () => onStart?.()
  utterance.onend = finish
  utterance.onerror = (event) => {
    if (event.error === 'canceled' || event.error === 'interrupted') return
    finish()
  }

  current = { id, finish }
  window.speechSynthesis.resume()
  window.speechSynthesis.speak(utterance)

  return () => {
    if (current?.id === id) stopHostVoice()
  }
}
