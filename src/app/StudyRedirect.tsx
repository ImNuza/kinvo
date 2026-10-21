import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { NavBar, Screen } from '../components/index.ts';

/**
 * Iter2 A/B experiment (Iter2.05): one public link that sends each visitor to the Maze study
 * for version A (ask during save) or version B (ask after save). Fill in the links when the
 * studies are published. Empty links show a "not open yet" message.
 */
export const STUDY_LINKS: Record<StudyVersion, string> = {
  a: '',
  b: '',
};

type StudyVersion = 'a' | 'b';

const STORAGE_KEY = 'kinvo.study.v1';

function isVersion(value: string | null): value is StudyVersion {
  return value === 'a' || value === 'b';
}

/** ?v=a or ?v=b forces a version for testing and is not remembered. Otherwise the first pick sticks to this browser. */
function pickVersion(search: string): StudyVersion {
  const forced = new URLSearchParams(search).get('v');
  if (isVersion(forced)) return forced;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isVersion(saved)) return saved;
  } catch {
    // Storage blocked: fall through to a fresh pick.
  }
  const picked: StudyVersion = Math.random() < 0.5 ? 'a' : 'b';
  try {
    localStorage.setItem(STORAGE_KEY, picked);
  } catch {
    // Storage blocked: the visitor may get a new pick on reload.
  }
  return picked;
}

export function StudyRedirect() {
  const { search } = useLocation();
  const [version] = useState(() => pickVersion(search));
  const url = STUDY_LINKS[version];

  useEffect(() => {
    if (url) window.location.replace(url);
  }, [url]);

  return (
    <Screen nav={<NavBar title="Kinvo study" />} hideTabBar>
      {url ? (
        <div className="stack gap-4">
          <p className="t-body">Opening the study…</p>
          <a className="k-btn k-btn--primary k-btn--lg k-btn--block" href={url}>
            <span>Open the study</span>
          </a>
        </div>
      ) : (
        <p className="t-muted">The study is not open yet. Please try this link again later.</p>
      )}
    </Screen>
  );
}
