// Procedural Web Audio API sound effects and Haptics
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playCardSound(volume = 80) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const gain = ctx.createGain();
  gain.gain.value = (volume / 100) * 0.25;
  gain.connect(ctx.destination);

  const bufferSize = Math.floor(ctx.sampleRate * 0.05);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(1400, ctx.currentTime);
  filter.Q.setValueAtTime(3, ctx.currentTime);

  noise.connect(filter);
  filter.connect(gain);
  noise.start();
}

export function playChipSound(volume = 80) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const gain = ctx.createGain();
  gain.gain.value = (volume / 100) * 0.3;
  gain.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(2200, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.05);

  gain.gain.setValueAtTime((volume / 100) * 0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

  osc.connect(gain);
  osc.start();
  osc.stop(ctx.currentTime + 0.06);
}

export function playSuccessSound(volume = 80) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + idx * 0.07;
    const duration = 0.22;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime((volume / 100) * 0.25, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

export function playErrorSound(volume = 80) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const startTime = ctx.currentTime;
  const duration = 0.25;

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(140, startTime);
  osc.frequency.linearRampToValueAtTime(90, startTime + duration);

  gain.gain.setValueAtTime((volume / 100) * 0.25, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

export function playLevelUpSound(volume = 80) {
  if (volume <= 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.51];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const startTime = ctx.currentTime + idx * 0.09;
    const duration = 0.35;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime((volume / 100) * 0.3, startTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  });
}

// Mobile Haptics
export function triggerHaptic(type: 'tap' | 'optimal' | 'error', enabled = true) {
  if (!enabled || typeof window === 'undefined' || !('vibrate' in navigator)) return;
  try {
    if (type === 'tap') {
      navigator.vibrate(15);
    } else if (type === 'optimal') {
      navigator.vibrate([30, 50, 30]);
    } else if (type === 'error') {
      navigator.vibrate(120);
    }
  } catch {
    // Ignore unsupported device errors
  }
}
