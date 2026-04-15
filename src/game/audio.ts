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

// Single fixed voice selection, tuned toward a flat early-80s computer read.
const PREFERRED_VOICES = [
  'Microsoft David',
  'Google UK English Male',
  'Alex',
  'Microsoft Mark',
  'Google US English',
];

const DISALLOWED_VOICE_MATCHES = [
  'Daniel',
  'Samantha',
  'Victoria',
  'Karen',
  'Moira',
  'Tessa',
];

const SYNTHETIC_VOICE_MATCHES = [
  'Microsoft',
  'Google',
  'Alex',
  'Fred',
  'Mark',
  'David',
];

const COMPUTER_VOICE_RATE = 0.98;
const COMPUTER_VOICE_PITCH = 0.06;
const COMPUTER_SPEC_RATE = 1.16;
const COMPUTER_SPEC_PITCH = 0.05;

function isDisallowedVoice(voice: SpeechSynthesisVoice): boolean {
  return DISALLOWED_VOICE_MATCHES.some(name => voice.name.includes(name));
}

function isSyntheticPreferredVoice(voice: SpeechSynthesisVoice): boolean {
  return SYNTHETIC_VOICE_MATCHES.some(name => voice.name.includes(name));
}

function normalizeSpeechLabel(speech: string): string {
  return speech
    .replace(/^number of\s+/i, '')
    .replace(/^amount of\s+/i, '')
    .replace(/^size of\s+/i, '')
    .trim();
}

function buildSpecText(spec: number, name: string, speech: string): string {
  const label = normalizeSpeechLabel(speech);
  return `${name}. ${spec.toLocaleString()} ${label}.`;
}

let operatorPoolReady = false;
let computerVoice: SpeechSynthesisVoice | null = null;
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

  const allowedVoices = voices.filter(voice => !isDisallowedVoice(voice));
  for (const name of PREFERRED_VOICES) {
    const match = allowedVoices.find(voice => voice.name.includes(name));
    if (match) {
      computerVoice = match;
      operatorPoolReady = true;
      return;
    }
  }

  const syntheticFallback = allowedVoices.find(voice =>
    voice.lang.startsWith('en') && isSyntheticPreferredVoice(voice)
  );
  if (syntheticFallback) {
    computerVoice = syntheticFallback;
    operatorPoolReady = true;
    return;
  }

  const englishFallback = allowedVoices.find(voice => voice.lang.startsWith('en'));
  if (englishFallback) {
    computerVoice = englishFallback;
    operatorPoolReady = true;
    return;
  }

  computerVoice = allowedVoices[0] ?? null;
  operatorPoolReady = true;
}

function prepareSpeechSynthesis(): SpeechSynthesis | null {
  const synth = getSpeechSynthesis();
  if (!synth) return null;
  try {
    synth.resume();
  } catch {
    /* ignore */
  }
  if (!operatorPoolReady) buildVoicePool();
  return synth;
}

function configureUtterance(utterance: SpeechSynthesisUtterance): void {
  if (computerVoice) {
    utterance.voice = computerVoice;
    utterance.lang = computerVoice.lang;
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

function getComputerVoice(): SpeechSynthesisVoice | null {
  if (!operatorPoolReady) buildVoicePool();
  return computerVoice;
}

// Prime voice cache when voices asynchronously become available (Chrome requirement)
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    operatorPoolReady = false;
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
    utterance.pitch = COMPUTER_VOICE_PITCH;
    utterance.rate = COMPUTER_VOICE_RATE;
    utterance.volume = 0.9;
    getComputerVoice();
    configureUtterance(utterance);
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
    utterance.pitch = COMPUTER_VOICE_PITCH;
    utterance.rate = COMPUTER_VOICE_RATE;
    utterance.volume = 0.9;
    getComputerVoice();
    configureUtterance(utterance);
    speakUtterance(synth, utterance, true);
  } catch {
    /* silently fail */
  }
}

/** Speak the spec in the same computer voice, but faster so it finishes during the fall. */
export function speakSpec(spec: number, name: string, speech: string) {
  try {
    const synth = prepareSpeechSynthesis();
    if (!synth) return;
    pendingSpecAnnouncement = { spec, name, speech };
    if (!operatorPoolReady && synth.getVoices().length === 0) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(buildSpecText(spec, name, speech));
    utterance.pitch = COMPUTER_SPEC_PITCH;
    utterance.rate = COMPUTER_SPEC_RATE;
    utterance.volume = 0.9;
    getComputerVoice();
    configureUtterance(utterance);
    speakUtterance(synth, utterance, true);
    pendingSpecAnnouncement = null;
  } catch {
    /* silently fail */
  }
}
