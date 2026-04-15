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

// ────────────────────── Text-to-speech ──────────────────────

let voiceCacheReady = false;
let cachedVoice: SpeechSynthesisVoice | null = null;

function getRetroVoice(): SpeechSynthesisVoice | null {
  if (voiceCacheReady) return cachedVoice;
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  // Prefer voices that sound robotic/masculine — closest to War Games
  const preferred = ['Microsoft David', 'Alex', 'Fred', 'Google UK English Male', 'Daniel'];
  cachedVoice = preferred.reduce<SpeechSynthesisVoice | null>((found, name) => {
    if (found) return found;
    return voices.find(v => v.name.includes(name)) ?? null;
  }, null) ?? voices[0] ?? null;
  voiceCacheReady = true;
  return cachedVoice;
}

// Prime voice cache when voices asynchronously become available (Chrome requirement)
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    voiceCacheReady = false;
    getRetroVoice();
  };
}

/** Speak the lucky number formed by the player's bin counts at end-of-game. */
export function speakLuckyNumber(n: number) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `Your good luck sorting created the number ${n.toLocaleString()}.`
    );
    utterance.pitch = 0.1;
    utterance.rate = 0.7;
    utterance.volume = 0.9;
    const voice = getRetroVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* silently fail */
  }
}

/** Speak the spec in a low, slow retro-computer voice.
 *  Pattern: "[spec] was the [speech] in the [name]."
 *  e.g. "2,300 was the number of transistors in the Intel 4004 CPU." */
export function speakSpec(spec: number, name: string, speech: string) {
  try {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${spec.toLocaleString()} was the ${speech} in the ${name}.`
    );
    utterance.pitch = 0.1;
    utterance.rate = 0.75;
    utterance.volume = 0.9;
    const voice = getRetroVoice();
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch {
    /* silently fail */
  }
}
