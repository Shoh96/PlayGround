let ctx = null;
let enabled = true;
let musicGain = null;
let musicTimer = null;
let musicStep = 0;

function context() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function setSoundEnabled(value) {
  enabled = Boolean(value);
  if (!enabled) stopMusic();
}

export function soundEnabled() {
  return enabled;
}

function note(freq, duration = 0.2, type = 'sine', volume = 0.12, delay = 0, destination = null) {
  const audio = context();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  const start = audio.currentTime + delay;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(destination || audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

function noise(duration = 0.18, volume = 0.04) {
  const audio = context();
  if (!audio) return;
  const buffer = audio.createBuffer(1, audio.sampleRate * duration, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = audio.createBufferSource();
  const gain = audio.createGain();
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + duration);
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(audio.destination);
  source.start();
}

export function playSound(name) {
  if (!enabled) return;
  switch (name) {
    case 'click':
      note(660, 0.06, 'triangle', 0.05);
      break;
    case 'select':
      note(440, 0.09, 'triangle', 0.07);
      note(660, 0.1, 'sine', 0.05, 0.06);
      break;
    case 'tick':
      note(980, 0.05, 'sine', 0.035);
      break;
    case 'correct':
      note(523.25, 0.3, 'sine', 0.11);
      note(659.25, 0.35, 'sine', 0.1, 0.08);
      note(783.99, 0.5, 'sine', 0.1, 0.16);
      note(1046.5, 0.6, 'sine', 0.06, 0.24);
      break;
    case 'wrong':
      note(196, 0.28, 'sawtooth', 0.06);
      note(164.81, 0.36, 'sine', 0.07, 0.08);
      noise(0.15, 0.025);
      break;
    case 'reveal':
      note(587.33, 0.4, 'sine', 0.07);
      note(880, 0.5, 'sine', 0.055, 0.1);
      break;
    case 'win':
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((freq, i) => {
        note(freq, 0.7, 'triangle', 0.085, i * 0.11);
        note(freq / 2, 0.8, 'sine', 0.035, i * 0.11);
      });
      break;
    case 'lose':
      note(392, 0.4, 'sine', 0.07);
      note(329.63, 0.45, 'sine', 0.06, 0.15);
      note(261.63, 0.7, 'sine', 0.05, 0.3);
      break;
    case 'join':
      note(523.25, 0.14, 'triangle', 0.06);
      note(783.99, 0.2, 'triangle', 0.05, 0.08);
      break;
    case 'message':
      note(880, 0.1, 'sine', 0.04);
      break;
    case 'levelup':
      [392, 523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => note(freq, 0.55, 'triangle', 0.08, i * 0.09));
      break;
    default:
      break;
  }
}

export function startMusic() {
  if (!enabled || musicTimer) return;
  const audio = context();
  if (!audio) return;
  musicGain = audio.createGain();
  musicGain.gain.value = 0.03;
  musicGain.connect(audio.destination);
  const progression = [
    [220, 277.18, 329.63, 440],
    [196, 246.94, 293.66, 392],
    [174.61, 220, 261.63, 349.23],
    [196, 246.94, 329.63, 392]
  ];
  const playStep = () => {
    if (!musicGain) return;
    const chord = progression[Math.floor(musicStep / 4) % progression.length];
    const freq = chord[musicStep % chord.length];
    note(freq, 2.8, 'sine', 0.035, 0, musicGain);
    if (musicStep % 4 === 0) note(chord[0] / 2, 3.4, 'sine', 0.028, 0, musicGain);
    musicStep += 1;
  };
  playStep();
  musicTimer = setInterval(playStep, 1900);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
  if (musicGain) {
    try {
      musicGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      setTimeout(() => musicGain?.disconnect(), 800);
    } catch {}
    musicGain = null;
  }
}

export function vibrate(pattern = 12) {
  if (navigator.vibrate && enabled) navigator.vibrate(pattern);
}
