import { useCallback, useEffect, useState } from 'react';
import './intro.css';

// Timings in ms. The CSS delays and durations in intro.css match these.
const HOLD_MS = 2100;
const FADE_MS = 400;
const REDUCED_HOLD_MS = 1200;
const REDUCED_FADE_MS = 200;

// Position and size of each logo part inside the 616 x 219 logo box, in px.
const BOX = { w: 616, h: 219 } as const;
const PIECES = [
  { name: 'k', x: 0, y: 6, w: 135, h: 163 },
  { name: 'i', x: 142, y: 24, w: 46, h: 142 },
  { name: 'bubble', x: 196, y: 42, w: 114, h: 130 },
  { name: 'v', x: 308, y: 20, w: 135, h: 148 },
  { name: 'rays', x: 418, y: 0, w: 198, h: 167 },
  { name: 'face', x: 427, y: 11, w: 172, h: 154 },
  { name: 'tagline', x: 30, y: 188, w: 540, h: 31 },
] as const;

// Set once the intro has been shown in this page load, so moving between screens never replays it.
// A refresh starts a new page load, so the intro plays again.
let shownThisLoad = false;

function shouldShow(): boolean {
  return !shownThisLoad;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

type Phase = 'in' | 'out' | 'done';

/** Logo intro. Covers the phone frame on every page load, including a refresh. */
export function Intro() {
  const [phase, setPhase] = useState<Phase>(() => (shouldShow() ? 'in' : 'done'));
  const [reduced] = useState(prefersReducedMotion);

  const skip = useCallback(() => setPhase((p) => (p === 'in' ? 'out' : p)), []);

  useEffect(() => {
    if (phase !== 'done') shownThisLoad = true;
  }, [phase]);

  useEffect(() => {
    if (phase === 'in') {
      const id = window.setTimeout(skip, reduced ? REDUCED_HOLD_MS : HOLD_MS);
      return () => window.clearTimeout(id);
    }
    if (phase === 'out') {
      const id = window.setTimeout(() => setPhase('done'), reduced ? REDUCED_FADE_MS : FADE_MS);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [phase, reduced, skip]);

  useEffect(() => {
    if (phase !== 'in') return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, skip]);

  if (phase === 'done') return null;

  const classes = ['k-intro', phase === 'out' && 'k-intro--out', reduced && 'k-intro--reduced'];
  return (
    <div className={classes.filter(Boolean).join(' ')} onClick={skip}>
      <div className="k-intro__logo">
        {reduced ? (
          <img className="k-intro__full" src="/brand/kinvo-logo.png" alt="Kinvo" />
        ) : (
          <div className="k-intro__stage" role="img" aria-label="Kinvo">
            {PIECES.map((p) => (
              <img
                key={p.name}
                className={`k-intro__piece k-intro__piece--${p.name}`}
                src={`/brand/kinvo-logo-${p.name}.png`}
                alt=""
                draggable={false}
                style={{
                  left: `${(p.x / BOX.w) * 100}%`,
                  top: `${(p.y / BOX.h) * 100}%`,
                  width: `${(p.w / BOX.w) * 100}%`,
                  height: `${(p.h / BOX.h) * 100}%`,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
