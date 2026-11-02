// Practise score. There is no speech recognition in this prototype.
// The score is an estimate from two facts: how long the attempt is compared with Ah Ma's clip,
// and how much of the attempt has a voice in it. The same input always gives the same score.

export const MIN_SCORE = 40;
export const MAX_SCORE = 95;
/** A frame counts as voice when its level is above this. Same scale as useRecorder levels. */
export const VOICE_LEVEL = 0.15;
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
