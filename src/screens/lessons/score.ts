// Practise score. There is no speech recognition in this prototype.
// The score is an estimate from two facts: how long the attempt is compared with Ah Ma's clip,
// and how much of the attempt has a voice in it. The same input always gives the same score.

export const MIN_SCORE = 40;
export const MAX_SCORE = 95;
/** A frame counts as voice when its level is above this. Same scale as useRecorder levels. */
export const VOICE_LEVEL = 0.15;
/** Frame length in seconds. */
const FRAME_SEC = 0.1;
/** Used when Ah Ma's clip length is not known yet. */
const FALLBACK_REFERENCE_SEC = 3;

export type Tip = 'short' | 'long' | 'quiet' | 'default';

export const TIP_TEXT: Record<Tip, string> = {
  short: 'Slow down a little.',
  long: 'Try it a bit faster.',
  quiet: 'Speak a little louder.',
  default: 'Stress more on the last phrase.',
};

export type AttemptMeasure = {
  durationSec: number;
  /** Frame levels 0..1, about 10 per second. */
  levels: number[];
};

export type AttemptResult = { score: number; tip: Tip };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function scoreAttempt(measure: AttemptMeasure, referenceSec: number): AttemptResult {
  const reference = referenceSec > 0 ? referenceSec : FALLBACK_REFERENCE_SEC;
  const ratio = measure.durationSec / reference;
  const voiced = measure.levels.filter((l) => l > VOICE_LEVEL).length;
  const share = measure.levels.length > 0 ? voiced / measure.levels.length : 0;

  const timing = 1 - Math.min(1, Math.abs(measure.durationSec - reference) / reference);
  const loudness = clamp(share / 0.6, 0, 1);
  const score = Math.round(MIN_SCORE + (MAX_SCORE - MIN_SCORE) * (0.6 * timing + 0.4 * loudness));

  let tip: Tip = 'default';
  if (ratio < 0.7) tip = 'short';
  else if (ratio > 1.4) tip = 'long';
  else if (share < 0.3) tip = 'quiet';
  return { score: clamp(score, MIN_SCORE, MAX_SCORE), tip };
}

/** Reads the recording and measures it. Falls back to the live numbers when the browser cannot decode it. */
export async function measureBlob(blob: Blob, fallback: AttemptMeasure): Promise<AttemptMeasure> {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return fallback;
    const ctx = new AudioCtx();
    try {
      const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
      const data = buffer.getChannelData(0);
      const size = Math.max(1, Math.round(buffer.sampleRate * FRAME_SEC));
      const levels: number[] = [];
      for (let start = 0; start < data.length; start += size) {
        const end = Math.min(data.length, start + size);
        let sum = 0;
        for (let i = start; i < end; i += 1) sum += (data[i] ?? 0) ** 2;
        levels.push(Math.min(1, Math.sqrt(sum / (end - start)) * 4));
      }
      return { durationSec: buffer.duration, levels };
    } finally {
      void ctx.close().catch(() => undefined);
    }
  } catch {
    return fallback;
  }
}
