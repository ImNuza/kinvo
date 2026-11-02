import { useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router';
import { Alert, Button, NavBar, Screen, Waveform } from '../../components/index.ts';
import { paths } from '../../app/paths.ts';
import { useAppState, useDispatch } from '../../data/react.tsx';
import { useRecorder } from '../../lib/audio.ts';
import { newId, nowIso } from '../../lib/ids.ts';
import { usePersona } from '../../lib/session.ts';
import { DEMO_TODAY, SCENARIO, SWING_STORY_ID, formatDuration, storyById } from '../../shared/index.ts';
import './record.css';

/** 03 Recording (316:329) and 03a Leave recording warning (370:1948). */
export function RecordingScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const state = useAppState();
  const persona = usePersona();
  const recorder = useRecorder();
  const { status, elapsedSec, levels } = recorder;

  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const live = status === 'recording' || status === 'requesting';

  // The recorder hook is only started once, even when React runs the effect twice in development.
  const started = useRef(false);
  const { start } = recorder;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  // Leaving is allowed after Stop, Save as draft and Discard.
  const allowLeave = useRef(false);
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  }, [live]);
  const blocker = useBlocker(() => liveRef.current && !allowLeave.current);

  // The length at the moment the warning opened. The warning and the saved draft both use it.
  const [heldSec, setHeldSec] = useState<number | null>(null);
  const blocked = blocker.state === 'blocked';
  useEffect(() => {
    setHeldSec(blocked ? elapsedSec : null);
    // Runs only when the warning opens or closes, not on every tick.
  }, [blocked]);
  const takeSec = heldSec ?? elapsedSec;

  useEffect(() => {
    if (!live) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [live]);

  /**
   * Creates the story as a draft. Returns its id. The first recording is the scenario's swing story,
   * so it gets the scenario id and Ah Ma's term. The recording is simulated, so no clip is saved
   * and later screens play the placeholder of Ah Ma's voice.
   */
  async function createDraft(durationSec: number): Promise<string> {
    const id = storyById(state, SWING_STORY_ID) ? newId('story') : SWING_STORY_ID;
    await dispatch({
      type: 'story/create',
      id,
      title: SCENARIO.storyTitle,
      note: SCENARIO.storyNote,
      place: SCENARIO.place,
      occasion: SCENARIO.occasion,
      date: DEMO_TODAY,
      durationSec,
      status: 'draft',
      by: persona,
      at: nowIso(),
    });
    if (id === SWING_STORY_ID) {
      await dispatch({ type: 'story/update', id, term: SCENARIO.term, at: nowIso() });
    }
    return id;
  }

  /** Stops the recorder and saves the take as a draft. Returns the story id, or null when it failed. */
  async function stopAndSave(): Promise<string | null> {
    setBusy(true);
    setSaveError(false);
    try {
      const seconds = takeSec;
      await recorder.stop();
      return await createDraft(seconds);
    } catch {
      setSaveError(true);
      setBusy(false);
      return null;
    }
  }

  async function onStop() {
    if (busy) return;
    allowLeave.current = true;
    const id = await stopAndSave();
    if (id) navigate(paths.save(id), { replace: true });
    else allowLeave.current = false;
  }

  async function onSaveAsDraft() {
    if (busy) return;
    allowLeave.current = true;
    const id = await stopAndSave();
    if (id) blocker.proceed?.();
    else allowLeave.current = false;
  }

  function onDiscard() {
    if (busy) return;
    allowLeave.current = true;
    recorder.discard();
    blocker.proceed?.();
  }

  function onKeepRecording() {
    blocker.reset?.();
  }

  const nav = <NavBar trail={[{ label: 'Record', to: paths.record() }]} current="Recording" />;

  const footer = (
    <>
      <Button
        variant="ghost"
        icon="x"
        className="rec-footer__cancel"
        onClick={() => navigate(paths.archive())}
        disabled={busy}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        icon="stop"
        className="rec-footer__stop"
        onClick={() => void onStop()}
        disabled={busy || status !== 'recording'}
      >
        Stop
      </Button>
    </>
  );

  return (
    <>
      <Screen nav={nav} tab="record" bodyClassName="rec-body rec-body--live" footer={footer}>
        <div className="rec-live">
          <div className="rec-pill">
            <span className="rec-pill__dot" aria-hidden="true" />
            <span className="rec-pill__label">REC</span>
            <span role="timer" aria-label="Recording time">
              {formatDuration(elapsedSec)}
            </span>
          </div>
          <h2 className="t-title">Ah Ma is speaking</h2>
          <p className="rec-live__place t-muted t-italic">
            {SCENARIO.occasion} · {SCENARIO.place}
          </p>
          <div className="rec-card">
            <Waveform levels={levels} bars={22} tone="heritage" height={90} />
          </div>
          {saveError && (
            <p className="rec-error" role="alert">
              Kinvo could not save this take. Try again.
            </p>
          )}
        </div>
      </Screen>
      <Alert
        open={blocker.state === 'blocked'}
        icon="warn"
        title="Leave this recording?"
        message={`You'll lose ${formatDuration(takeSec)} of Ah Ma's story. Save it as a draft and finish it later.`}
        actions={[
          { label: 'Save as draft', tone: 'bold', onClick: () => void onSaveAsDraft() },
          { label: 'Keep recording', onClick: onKeepRecording },
          { label: 'Discard recording', tone: 'destructive', onClick: onDiscard },
        ]}
        onDismiss={onKeepRecording}
      />
    </>
  );
}
