import { useCallback, useEffect, useState } from 'react';
import { Button, NavBar, Screen } from '../components/index.ts';

/**
 * Iter2.05 A/B: how many visitors /go has sent to each Maze study. Behind the login gate.
 * These are assignments (link opens), not completed responses. Maze shows completions.
 */
type Counts = { a: number; b: number; total: number; lastAt: string | null };

const MAZE_RESULTS = {
  a: 'https://app.maze.co/projects/603496314/mazes/603496315/results',
  b: 'https://app.maze.co/projects/603496314/mazes/603503575/results',
} as const;

function isCounts(value: unknown): value is Counts {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.a === 'number' && typeof v.b === 'number' && typeof v.total === 'number';
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('en-SG', { timeZone: 'Asia/Singapore', dateStyle: 'medium', timeStyle: 'short' });
}

export function StudyResults() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/study/counts', { cache: 'no-store' });
      const body: unknown = res.ok ? await res.json() : null;
      if (!isCounts(body)) throw new Error('bad counts');
      setCounts(body);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen nav={<NavBar title="Study results" />} hideTabBar>
      <div className="stack gap-4">
        <p className="t-muted">People sent to each version by kinvo.nuza.dev/go. Pilot links with ?v=a or ?v=b are not counted.</p>
        {failed && <p className="t-danger">Could not load the counts. Try again.</p>}
        {counts && (
          <>
            <div className="row gap-3">
              <div className="k-card stack gap-1" style={{ flex: 1 }}>
                <span className="t-subtitle">A: stacked</span>
                <span className="t-display">{counts.a}</span>
                <a href={MAZE_RESULTS.a} target="_blank" rel="noreferrer">Maze results A</a>
              </div>
              <div className="k-card stack gap-1" style={{ flex: 1 }}>
                <span className="t-subtitle">B: side by side</span>
                <span className="t-display">{counts.b}</span>
                <a href={MAZE_RESULTS.b} target="_blank" rel="noreferrer">Maze results B</a>
              </div>
            </div>
            <p className="t-body">
              Total {counts.total}. Difference {Math.abs(counts.a - counts.b)}.
              {counts.lastAt ? ` Last visitor ${formatTime(counts.lastAt)}.` : ' No visitors yet.'}
            </p>
            <p className="t-muted">Completed responses can be lower than these numbers. Check them in Maze.</p>
          </>
        )}
        <Button variant="outline" size="md" onClick={() => void load()}>
          Refresh
        </Button>
      </div>
    </Screen>
  );
}
