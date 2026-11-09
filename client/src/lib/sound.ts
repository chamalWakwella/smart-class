let audio: AudioContext | null = null;

export function primeAudio(): void {
  const Context = window.AudioContext;
  if (!audio) audio = new Context();
  if (audio.state === 'suspended') void audio.resume();
}

function tone(
  ctx: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  gain: number,
): void {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, now + start);
  amp.gain.setValueAtTime(0.0001, now + start);
  amp.gain.exponentialRampToValueAtTime(gain, now + start + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(now + start);
  osc.stop(now + start + duration + 0.02);
}

export function playAlert(kind: 'success' | 'warning' | 'notice' | 'error'): void {
  primeAudio();
  if (!audio) return;
  if (kind === 'success') {
    tone(audio, 523.25, 0, 0.16, 'sine', 0.07);
    tone(audio, 659.25, 0.12, 0.16, 'sine', 0.07);
    tone(audio, 783.99, 0.24, 0.24, 'sine', 0.08);
    return;
  }
  if (kind === 'warning') {
    tone(audio, 196, 0, 0.22, 'square', 0.035);
    tone(audio, 164.81, 0.2, 0.28, 'square', 0.035);
    return;
  }
  if (kind === 'error') {
    tone(audio, 140, 0, 0.28, 'sawtooth', 0.03);
    return;
  }
  tone(audio, 660, 0, 0.12, 'sine', 0.05);
}
