import { useEffect, useRef, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router';
import { Alert, Button, NavBar, Screen, Waveform } from '../../components/index.ts';
import { paths } from '../../app/paths.ts';
import { useDispatch } from '../../data/react.tsx';
import { saveClip, useRecorder } from '../../lib/audio.ts';
import { newId, nowIso } from '../../lib/ids.ts';
import { usePersona } from '../../lib/session.ts';
import { DEMO_TODAY, SCENARIO, formatDuration } from '../../shared/index.ts';
import './record.css';

/** Seconds used when the story is created without audio, so a desktop demo can go on. */
const NO_AUDIO_SECONDS = 12;

const MESSAGE_BLOCKED = 'Kinvo cannot use the microphone. Allow microphone access and try again.';
const MESSAGE_UNSUPPORTED = 'This browser cannot record audio. Try another browser, or continue without audio.';

/** 03 Recording (316:329) and 03a Leave recording warning (370:1948). */
export function RecordingScreen() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const persona = usePersona();
  const recorder = useRecorder();
  const { status, elapsedSec, levels } = recorder;

  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const live = status === 'recording' || status === 'requesting';
  const failed = status === 'denied' || status === 'unsupported' || status === 'error';

  // The recorder hook is only started once, even when React runs the effect twice in development.
  const started = useRef(false);
  const { start } = recorder;
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
  }, [start]);

  // Leaving is allowed after Stop, Save as draft, Discard and Continue without audio.
  const allowLeave = useRef(false);
  const liveRef = useRef(live);
  useEffect(() => {
    liveRef.current = live;
  }, [live]);
  const blocker = useBlocker(() => liveRef.current && !allowLeave.current);

  useEffect(() => {
    if (!live) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [live]);

  /** Creates the story as a draft. Returns its id. */
  async function createDraft(durationSec: number, clip: Blob | null): Promise<string> {
    const id = newId('story');
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
    if (clip) await saveClip(id, clip);
    return id;
  }

  /** Stops the recorder and saves the take as a draft. Returns the story id, or null when it failed. */
  async function stopAndSave(): Promise<string | null> {
    setBusy(true);
    setSaveError(false);
    try {
      const seconds = elapsedSec;
      const clip = await recorder.stop();
      return await createDraft(seconds, clip);
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

  async function onContinueWithoutAudio() {
    if (busy) return;
    setBusy(true);
    setSaveError(false);
    allowLeave.current = true;
    try {
      const id = await createDraft(NO_AUDIO_SECONDS, null);
      navigate(paths.save(id), { replace: true });
    } catch {
      allowLeave.current = false;
      setSaveError(true);
      setBusy(false);
    }
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
      {!failed && (
        <Button
          variant="primary"
          icon="stop"
          className="rec-footer__stop"
          onClick={() => void onStop()}
          disabled={busy || status !== 'recording'}
        >
          Stop
        </Button>
      )}
    </>
  );

  return (
    <>
      <Screen nav={nav} tab="record" bodyClassName="rec-body rec-body--live" footer={footer}>
        <div className="rec-live">
          {failed ? null : (
            <div className="rec-pill">
              <span className="rec-pill__dot" aria-hidden="true" />
              <span className="rec-pill__label">REC</span>
              <span role="timer" aria-label="Recording time">
                {formatDuration(elapsedSec)}
              </span>
            </div>
          )}
          <h2 className="t-title">{failed ? 'Cannot start recording' : 'Ah Ma is speaking'}</h2>
          <p className="rec-live__place t-muted t-italic">
            {SCENARIO.occasion} · {SCENARIO.place}
          </p>
          <div className="rec-card">
            {failed ? (
              <>
                <p className="rec-card__message" role="status">
                  {status === 'unsupported' ? MESSAGE_UNSUPPORTED : MESSAGE_BLOCKED}
                </p>
                <div className="rec-card__actions">
                  <Button variant="primary" size="md" onClick={() => void recorder.start()} disabled={busy}>
                    Try again
                  </Button>
                  <Button variant="outline" size="md" onClick={() => void onContinueWithoutAudio()} disabled={busy}>
                    Continue without audio
                  </Button>
                </div>
              </>
            ) : (
              <Waveform levels={levels} bars={22} tone="heritage" height={90} />
            )}
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
        title="Leave this recording?"
        message={`You'll lose ${formatDuration(elapsedSec)} of Ah Ma's story. Save it as a draft to finish it later.`}
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
