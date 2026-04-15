let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    const Ctx = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    audioCtx = new Ctx();
  }
  return audioCtx;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'square', volume = 0.15) {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {
    /* silently fail if audio not available */
  }
}

/** Call this on first user interaction to unlock audio on iOS/Safari */
export function unlockAudio() {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    /* ignore */
  }
}

/** Ascending 3-note chime — correct drop */
export function playCorrect() {
  playTone(523, 0.12, 'square');
  setTimeout(() => playTone(659, 0.12, 'square'), 100);
  setTimeout(() => playTone(784, 0.2, 'square'), 200);
}

/** High combo fanfare */
export function playCombo(combo: number) {
  const notes = [523, 659, 784, 1047];
  const n = notes[Math.min(combo - 2, notes.length - 1)];
  playTone(n, 0.3, 'square', 0.2);
  setTimeout(() => playTone(n * 1.5, 0.2, 'square', 0.15), 150);
}

/** Descending "wah wah" — wrong drop */
export function playWrong() {
  playTone(220, 0.15, 'sawtooth', 0.2);
  setTimeout(() => playTone(180, 0.15, 'sawtooth', 0.2), 130);
  setTimeout(() => playTone(140, 0.25, 'sawtooth', 0.15), 260);
}

/** Level up jingle */
export function playLevelUp() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.15, 'square', 0.18), i * 80);
  });
}

/** Game over */
export function playGameOver() {
  [440, 349, 294, 220].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.3, 'sawtooth', 0.2), i * 180);
  });
}

/** Unlock new bin */
export function playUnlock() {
  [784, 988, 1175, 1568].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.12, 'triangle', 0.18), i * 70);
  });
}
