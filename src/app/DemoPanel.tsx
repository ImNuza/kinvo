import { useEffect, useState } from 'react';
import { Button, ChoiceChipGroup, Sheet } from '../components/index.ts';
import { useStore } from '../data/react.tsx';
import { PERSONAS, setPersona, setVariant, usePersona, useVariant, type PersonaId, type Variant } from '../lib/session.ts';

/**
 * Hidden demo controls for testers and the presenter.
 * Open with the small dot in the top-right corner, Shift+D, or ?demo=1.
 */
export function DemoPanel() {
  const store = useStore();
  const persona = usePersona();
  const variant = useVariant();
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).get('demo') === '1');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea')) return;
      if (e.shiftKey && e.key.toLowerCase() === 'd') setOpen((v) => !v);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function reset() {
    setBusy(true);
    try {
      await store.reset();
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className="demo-trigger" aria-label="Open demo panel" onClick={() => setOpen(true)} />
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Demo"
        rightAction={{ label: 'Done', onClick: () => setOpen(false) }}
      >
        <div className="stack gap-5 demo-panel">
          <ChoiceChipGroup<PersonaId>
            label="Use the app as"
            options={PERSONAS.map((p) => ({ value: p.id, label: p.name }))}
            value={persona}
            onChange={setPersona}
          />
          <ChoiceChipGroup<Variant>
            label="A/B version (04 and 05)"
            options={[
              { value: 'a', label: 'A: ask while saving' },
              { value: 'b', label: 'B: ask after saving' },
            ]}
            value={variant}
            onChange={setVariant}
          />
          <div className="stack gap-2">
            <p className="t-subtitle">Data</p>
            <p className="t-muted">
              {store.mode === 'api'
                ? 'Shared. Everyone on kinvo.nuza.dev sees the same family.'
                : 'This browser only. Tabs in this browser stay in sync.'}
            </p>
            <Button variant="destructive-outline" size="md" icon="restart" onClick={reset} disabled={busy}>
              Reset to the start of the scenario
            </Button>
            <p className="t-muted" role="status">
              {done ? 'Data reset. Auntie Lin is not in the family yet.' : ''}
            </p>
          </div>
        </div>
      </Sheet>
    </>
  );
}
