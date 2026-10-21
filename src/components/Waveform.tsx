export type WaveformProps = {
  /** Live levels 0..1, newest last. Without levels the bars form a fixed pattern from `seed`. */
  levels?: number[];
  /** Number of bars. Default 28. */
  bars?: number;
  /** Bar colour. heritage = Ah Ma, primary = you. Default heritage. */
  tone?: 'heritage' | 'primary' | 'muted';
  /** Pixel height of the tallest bar. Default 96. */
  height?: number;
  /** Changes the fixed pattern. */
  seed?: number;
  /** 0..1 progress. Bars after it fade, to show playback position. */
  progress?: number;
  className?: string;
};

function pattern(count: number, seed: number): number[] {
  const out: number[] = [];
  let x = seed * 9301 + 49297;
  for (let i = 0; i < count; i += 1) {
    x = (x * 9301 + 49297) % 233280;
    out.push(0.3 + (x / 233280) * 0.7);
  }
  return out;
}

/** Vertical bars, as in 03, 04 and 13. Decorative: aria-hidden. */
export function Waveform({ levels, bars = 28, tone = 'heritage', height = 96, seed = 1, progress, className }: WaveformProps) {
  const values = levels && levels.length > 0
    ? Array.from({ length: bars }, (_, i) => {
        const v = levels[levels.length - bars + i];
        return v === undefined ? 0.08 : Math.max(0.08, Math.min(1, v));
      })
    : pattern(bars, seed);
  const cut = progress === undefined ? bars : Math.round(progress * bars);
  return (
    <div className={['k-wave', `k-wave--${tone}`, className ?? ''].filter(Boolean).join(' ')} style={{ height }} aria-hidden="true">
      {values.map((v, i) => (
        <span key={i} className={i < cut ? 'k-wave__bar' : 'k-wave__bar k-wave__bar--after'} style={{ height: `${Math.round(v * 100)}%` }} />
      ))}
    </div>
  );
}
