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
  prepareSpeechSynthesis();
  flushPendingSpecAnnouncement();
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

// Pool of up to 4 diverse English voices — rotated on each speakSpec call
// so items are announced by a different "operator" every time.
const PREFERRED_VOICES = [
  'Microsoft David',         // Windows — deep male
  'Alex',                    // macOS — clear neutral male
  'Google UK English Male',  // Chrome — British male
  'Daniel',                  // macOS — British male
  'Microsoft Mark',          // Windows — male alt
  'Microsoft Zira',          // Windows — female contrast
  'Samantha',                // macOS — female contrast
  'Victoria',                // macOS — different female
  'Google US English',       // Chrome fallback
];

let voicePool: SpeechSynthesisVoice[] = [];
let voicePoolReady = false;
let voiceIndex = 0;
let pendingSpecAnnouncement: { spec: number; name: string; speech: string } | null = null;

function getSpeechSynthesis(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  return window.speechSynthesis;
}

function buildVoicePool(): void {
  const synth = getSpeechSynthesis();
  if (!synth) return;
  const voices = synth.getVoices();
  if (voices.length === 0) return;

  const found: SpeechSynthesisVoice[] = [];
  for (const name of PREFERRED_VOICES) {
    const v = voices.find(v => v.name.includes(name));
    if (v && !found.find(f => f.name === v.name)) {
      found.push(v);
      if (found.length >= 4) break;
    }
  }
  // Pad with English voices if fewer than 4 preferred voices are available
  if (found.length < 4) {
    const extras = voices.filter(v => v.lang.startsWith('en') && !found.find(f => f.name === v.name));
    found.push(...extras.slice(0, 4 - found.length));
  }
  voicePool = found;
  voicePoolReady = true;
}

function prepareSpeechSynthesis(): SpeechSynthesis | null {
  const synth = getSpeechSynthesis();
  if (!synth) return null;
  try {
    synth.resume();
  } catch {
    /* ignore */
  }
  if (!voicePoolReady) buildVoicePool();
  return synth;
}

function configureUtterance(utterance: SpeechSynthesisUtterance, voice: SpeechSynthesisVoice | null): void {
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
    return;
  }
  utterance.lang = 'en-US';
}

function speakUtterance(
  synth: SpeechSynthesis,
  utterance: SpeechSynthesisUtterance,
  interrupt = false,
): void {
  if (interrupt && (synth.speaking || synth.pending)) {
    synth.cancel();
    window.setTimeout(() => synth.speak(utterance), 0);
    return;
  }
  synth.speak(utterance);
}

function flushPendingSpecAnnouncement(): void {
  if (!pendingSpecAnnouncement) return;
  const next = pendingSpecAnnouncement;
  pendingSpecAnnouncement = null;
  speakSpec(next.spec, next.name, next.speech);
}

/** Returns the next voice in the pool (round-robin) for item announcements. */
function getNextVoice(): SpeechSynthesisVoice | null {
  if (!voicePoolReady) buildVoicePool();
  if (voicePool.length === 0) return null;
  const voice = voicePool[voiceIndex % voicePool.length];
  voiceIndex++;
  return voice;
}

/** Returns the "primary" retro voice (first in pool) for dramatic reads. */
function getPrimaryVoice(): SpeechSynthesisVoice | null {
  if (!voicePoolReady) buildVoicePool();
  return voicePool[0] ?? null;
}

// Prime pool when voices asynchronously become available (Chrome requirement)
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    voicePoolReady = false;
    buildVoicePool();
    flushPendingSpecAnnouncement();
  };
}

/** Speak arbitrary text, calling onEnd when the utterance finishes.
 *  Uses the primary voice. Falls back to calling onEnd immediately if
 *  speech synthesis is unavailable. */
export function speakText(text: string, onEnd?: () => void) {
  try {
    const synth = prepareSpeechSynthesis();
    if (!synth) {
      onEnd?.();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.1;
    utterance.rate = 0.72;
    utterance.volume = 0.9;
    const voice = getPrimaryVoice();
    configureUtterance(utterance, voice);
    if (onEnd) utterance.onend = () => onEnd();
    if (onEnd) utterance.onerror = () => onEnd();
    speakUtterance(synth, utterance);
  } catch {
    onEnd?.();
  }
}

/** Speak the final number formed by the bin counts at game over.
 *  Uses the primary (most robotic) voice for the dramatic read. */
export function speakFinalNumber(n: number) {
  try {
    const synth = prepareSpeechSynthesis();
    if (!synth) return;
    const utterance = new SpeechSynthesisUtterance(
      `Your sorting work created the number ${n.toLocaleString()}.`
    );
    utterance.pitch = 0.1;
    utterance.rate = 0.75;
    utterance.volume = 0.9;
    const voice = getPrimaryVoice();
    configureUtterance(utterance, voice);
    speakUtterance(synth, utterance, true);
  } catch {
    /* silently fail */
  }
}

/** Speak the spec in a retro-computer voice, rotating through the voice pool
 *  so each item is announced by a different "operator".
 *  Pattern: "[spec] was the [speech] in the [name]." */
export function speakSpec(spec: number, name: string, speech: string) {
  try {
    const synth = prepareSpeechSynthesis();
    if (!synth) return;
    pendingSpecAnnouncement = { spec, name, speech };
    if (!voicePoolReady && synth.getVoices().length === 0) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(
      `${spec.toLocaleString()} was the ${speech} in the ${name}.`
    );
    utterance.pitch = 0.1;
    utterance.rate = 0.75;
    utterance.volume = 0.9;
    const voice = getNextVoice();
    configureUtterance(utterance, voice);
    speakUtterance(synth, utterance, true);
    pendingSpecAnnouncement = null;
  } catch {
    /* silently fail */
  }
}
