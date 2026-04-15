import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockUtterance = {
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  pitch: number;
  rate: number;
  text: string;
  voice: SpeechSynthesisVoice | null;
  volume: number;
};

class MockSpeechSynthesisUtterance implements MockUtterance {
  lang = '';
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  pitch = 1;
  rate = 1;
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  volume = 1;

  constructor(text: string) {
    this.text = text;
  }
}

function loadAudioModule() {
  return import('../../game/audio');
}

describe('audio speech synthesis', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();

    const voices = [
      { name: 'Daniel', lang: 'en-GB' } as SpeechSynthesisVoice,
      { name: 'Alex', lang: 'en-US' } as SpeechSynthesisVoice,
      { name: 'Google UK English Male', lang: 'en-GB' } as SpeechSynthesisVoice,
      { name: 'Microsoft David', lang: 'en-US' } as SpeechSynthesisVoice,
      { name: 'Victoria', lang: 'en-US' } as SpeechSynthesisVoice,
    ];
    const speechSynthesis = {
      cancel: vi.fn(),
      getVoices: vi.fn(() => voices),
      onvoiceschanged: null as (() => void) | null,
      pending: false,
      resume: vi.fn(),
      speak: vi.fn(),
      speaking: false,
    };

    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: speechSynthesis,
    });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });
    Object.defineProperty(globalThis, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    });
  });

  it('does not cancel idle speech before speaking text', async () => {
    const { speakText } = await loadAudioModule();
    const synth = window.speechSynthesis;

    speakText('forty-two');

    expect(synth.cancel).not.toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const utterance = vi.mocked(synth.speak).mock.calls[0][0] as MockUtterance;
    expect(utterance.text).toBe('forty-two');
    expect(utterance.lang).toBe('en-US');
    expect(utterance.rate).toBe(0.98);
    expect(utterance.pitch).toBe(0.06);
    expect(utterance.voice?.name).toBe('Microsoft David');
  });

  it('cancels and retries on the next tick when replacing active speech', async () => {
    const { speakSpec } = await loadAudioModule();
    const synth = window.speechSynthesis as typeof window.speechSynthesis & { speaking: boolean };
    synth.speaking = true;

    speakSpec(4096, 'Apple II', 'number of bytes of RAM');

    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(synth.speak).toHaveBeenCalledTimes(1);
    const utterance = vi.mocked(synth.speak).mock.calls[0][0] as MockUtterance;
    expect(utterance.text).toBe('Apple II. 4,096 bytes of RAM.');
    expect(utterance.lang).toBeTruthy();
    expect(utterance.rate).toBe(1.16);
    expect(utterance.pitch).toBe(0.05);
    expect(utterance.voice?.name).toBe('Microsoft David');
  });
});
