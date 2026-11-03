import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../components/index.ts';
import { useStore } from '../data/react.tsx';
import { paths } from './paths.ts';

/**
 * "Reset demo" at the top right of the page, outside the phone frame, so a take can start over
 * after a misclick. It asks first, then reloads on the Archive so the intro plays again.
 * Only shown on wide screens, where the page has room around the phone frame.
 */
export function ResetButton() {
  const store = useStore();
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (!window.confirm('Reset the demo to the start of the scenario? This clears the recording, meanings and Auntie Lin.')) return;
    setBusy(true);
    try {
      await store.reset();
      // Keep offline mode (?store=local) across the reload.
      window.location.assign(store.mode === 'local' ? `${paths.archive()}?store=local` : paths.archive());
    } catch {
      setBusy(false);
      window.alert('Could not reset. Try again.');
    }
  }

  return createPortal(
    <div className="demo-reset">
      <Button variant="destructive-outline" size="sm" icon="restart" onClick={() => void reset()} disabled={busy}>
        {busy ? 'Resetting' : 'Reset demo'}
      </Button>
    </div>,
    document.body,
  );
}
