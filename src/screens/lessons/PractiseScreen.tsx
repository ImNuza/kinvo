import { useState } from 'react';
import { useParams } from 'react-router';
import { Button, ButtonLink, Icon, NavBar, PlayButton, Screen, Waveform } from '../../components/index.ts';
import { useAppState, useDispatch } from '../../data/react.tsx';
import { AH_MA_CLIP_URL, saveClip, useClipUrl, usePlayer, useRecorder, type RecorderStatus } from '../../lib/audio.ts';
import { newId, nowIso } from '../../lib/ids.ts';
import { usePersona } from '../../lib/session.ts';
import { paths } from '../../app/paths.ts';
import { lessons, type Lesson } from '../../shared/index.ts';
import { TIP_TEXT, measureBlob, scoreAttempt, type AttemptResult } from './score.ts';
import './lessons.css';

const TRAIL = [{ label: 'Lessons', to: paths.lessons() }];
const PASS_SCORE = 70;
const BARS = 26;
const WAVE_HEIGHT = 28;

const MIC_MESSAGES: Partial<Record<RecorderStatus, string>> = {
  denied: 'The microphone is blocked. Allow it for this site in your browser settings, then tap Try again.',
  unsupported: 'This browser cannot record audio. Open Kinvo in Chrome or Safari on your phone.',
  error: 'The microphone did not start. Check that a microphone is connected, then try again.',
};

function PractiseBody({ lesson }: { lesson: Lesson }) {
  const state = useAppState();
  const dispatch = useDispatch();
  const persona = usePersona();
  const recorder = useRecorder();
  const reference = usePlayer(AH_MA_CLIP_URL);

  const latest = state.attempts
    .filter((a) => a.storyId === lesson.storyId && a.personId === persona)
    .reduce<(typeof state.attempts)[number] | undefined>((best, a) => (!best || a.createdAt >= best.createdAt ? a : best), undefined);
  const savedUrl = useClipUrl(latest?.id);
  const attemptSrc = recorder.url ?? savedUrl;
  const attemptPlayer = usePlayer(attemptSrc);

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const recording = recorder.status === 'recording';
  const starting = recorder.status === 'requesting';
  const hasAttempt = result !== null || latest !== undefined;
  const score = result?.score ?? latest?.score;
  const tip = TIP_TEXT[result?.tip ?? 'default'];
  const showScore = hasAttempt && score !== undefined && !recording && !starting;
  const micMessage = MIC_MESSAGES[recorder.status];

  const record = async () => {
    reference.stop();
    attemptPlayer.stop();
    setSaveError(false);
    await recorder.start();
  };

  const stop = async () => {
    const levels = recorder.levels;
    const elapsed = recorder.elapsedSec;
    const blob = await recorder.stop();
    if (!blob) return;
    setBusy(true);
    const measure = await measureBlob(blob, { durationSec: elapsed, levels });
    const outcome = scoreAttempt(measure, reference.durationSec);
    const id = newId('attempt');
    try {
      await saveClip(id, blob);
      await dispatch({ type: 'attempt/add', id, storyId: lesson.storyId, personId: persona, score: outcome.score, at: nowIso() });
    } catch {
      setSaveError(true);
    }
    setResult(outcome);
    setBusy(false);
  };

  let status = '';
  if (recording) status = 'Recording';
  else if (busy) status = 'Checking your attempt';
  else if (showScore) status = `Accuracy match ${score} percent. ${tip}`;

  let action;
  if (recording) {
    action = (
      <Button size="md" icon="stop" onClick={stop}>
        Stop
      </Button>
    );
  } else if (hasAttempt) {
    action = (
      <Button size="md" icon="restart" onClick={record} disabled={starting || busy}>
        Try again
      </Button>
    );
  } else {
    action = (
      <Button size="md" icon="mic" onClick={record} disabled={starting}>
        Record
      </Button>
    );
  }

  const footer = (
    <>
      <ButtonLink to={paths.lessons()} variant="ghost" size="md" icon="skip">
        Skip
      </ButtonLink>
      {action}
    </>
  );

  return (
    <Screen nav={<NavBar trail={TRAIL} current="Practise" />} tab="lessons" footer={footer}>
      <div className="prac">
        <section className="k-card prac-card" aria-label="Ask Ah Ma">
          <p className="t-subtitle t-heritage">Ask Ah Ma</p>
          <p className="t-title" lang="nan">
            {lesson.phrase.phrase}
          </p>
          <p className="t-muted">{lesson.phrase.english}</p>
        </section>

        <section className="k-card prac-card" aria-label="Ah Ma's voice">
          <p className="t-subtitle t-heritage">Ah Ma&rsquo;s voice</p>
          <div className="prac-card__row">
            <PlayButton playing={reference.playing} onClick={reference.toggle} label="Play Ah Ma's voice" disabled={reference.failed} />
            <Waveform
              bars={BARS}
              height={WAVE_HEIGHT}
              tone="heritage"
              seed={3}
              progress={reference.playing || reference.progress > 0 ? reference.progress : undefined}
            />
          </div>
        </section>

        <section className="k-card prac-card" aria-label="Your attempt">
          <p className="t-subtitle t-primary">Your attempt</p>
          {hasAttempt || recording || starting ? (
            <div className="prac-card__row">
              <PlayButton
                tone="primary"
                playing={attemptPlayer.playing}
                onClick={attemptPlayer.toggle}
                label="Play your attempt"
                disabled={recording || starting || !attemptSrc || attemptPlayer.failed}
              />
              <Waveform
                bars={BARS}
                height={WAVE_HEIGHT}
                tone="primary"
                seed={7}
                levels={recording || starting ? (recorder.levels.length > 0 ? recorder.levels : [0]) : undefined}
                progress={attemptPlayer.playing || attemptPlayer.progress > 0 ? attemptPlayer.progress : undefined}
              />
            </div>
          ) : (
            <p className="t-muted">Tap Record and say the phrase.</p>
          )}
        </section>

        {micMessage && (
          <p className="prac-error" role="alert">
            {micMessage}
          </p>
        )}
        {saveError && (
          <p className="prac-error" role="alert">
            Your attempt could not be saved. The score is shown for now.
          </p>
        )}

        {showScore && score !== undefined && (
          <div className="prac-score">
            <div className="prac-score__head">
              <p className="t-subtitle">Accuracy Match</p>
              <p className="prac-score__value">
                <span>{score}%</span>
                {score >= PASS_SCORE && (
                  <span className="prac-score__check">
                    <Icon name="check" size={16} />
                  </span>
                )}
              </p>
            </div>
            <div
              className="prac-bar"
              role="progressbar"
              aria-label="Accuracy Match"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={score}
            >
              <div className="prac-bar__fill" style={{ width: `${score}%` }} />
            </div>
            <p className="prac-tip">{tip}</p>
            <p className="t-muted prac-note">Estimate from timing and loudness only.</p>
          </div>
        )}

        <p className="sr-only" role="status">
          {status}
        </p>
      </div>
    </Screen>
  );
}

/** 13 Practise phrase (319:615). */
export function PractiseScreen() {
  const { storyId = '' } = useParams();
  const state = useAppState();
  const lesson = lessons(state).find((l) => l.storyId === storyId);

  if (!lesson) {
    return (
      <Screen nav={<NavBar trail={TRAIL} current="Practise" />} tab="lessons">
        <div className="prac-missing">
          <p className="t-muted">This lesson is not available. A lesson comes from a saved story that has a phrase.</p>
          <ButtonLink to={paths.lessons()} variant="outline">
            Go to Lessons
          </ButtonLink>
        </div>
      </Screen>
    );
  }
  return <PractiseBody key={lesson.storyId} lesson={lesson} />;
}
