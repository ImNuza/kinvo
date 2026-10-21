import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Button, Field, NavBar, Screen, Waveform } from '../../components/index.ts';
import { paths } from '../../app/paths.ts';
import { useAppState, useDispatch } from '../../data/react.tsx';
import { nowIso } from '../../lib/ids.ts';
import { useVariant } from '../../lib/session.ts';
import { formatDuration, formatTime, storyById, type Story } from '../../shared/index.ts';
import { StoryNotFound } from './StoryNotFound.tsx';
import { useStoryClip } from './useStoryClip.ts';
import './record.css';

/** Wait this long after typing stops before the draft is saved. */
const AUTOSAVE_MS = 600;

/** 04 Save this take (316:399). A/B: see useVariant(). */
export function SaveTakeScreen() {
  const { storyId = '' } = useParams();
  const story = storyById(useAppState(), storyId);
  if (!story) return <StoryNotFound current="Save this take" />;
  return <SaveTakeForm key={story.id} story={story} />;
}

function SaveTakeForm({ story }: { story: Story }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const variant = useVariant();
  const player = useStoryClip(story.id);

  const [title, setTitle] = useState(story.title);
  const [note, setNote] = useState(story.note);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const titleEmpty = title.trim() === '';
  const { id: storyId, title: savedTitle, note: savedNote } = story;

  // Autosave: 600 ms after typing stops.
  useEffect(() => {
    if (titleEmpty) return;
    const nextTitle = title.trim();
    if (nextTitle === savedTitle && note === savedNote) return;
    const timer = window.setTimeout(() => {
      void dispatch({ type: 'story/update', id: storyId, title: nextTitle, note, at: nowIso() }).catch(() => undefined);
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [title, note, titleEmpty, savedTitle, savedNote, storyId, dispatch]);

  async function save(next: string) {
    if (titleEmpty || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      await dispatch({ type: 'story/update', id: storyId, title: title.trim(), note, status: 'saved', at: nowIso() });
      navigate(next);
    } catch {
      setFailed(true);
      setSaving(false);
    }
  }

  const footer =
    variant === 'b' ? (
      <Button variant="primary" icon="save" disabled={titleEmpty || saving} onClick={() => void save(paths.saved(storyId))}>
        Save
      </Button>
    ) : (
      <div className="rec-footer-stack">
        <Button
          variant="primary"
          size="md"
          icon="send"
          block
          disabled={titleEmpty || saving}
          onClick={() => void save(paths.send(storyId))}
        >
          Save and ask a helper
        </Button>
        <Button
          variant="outline"
          size="md"
          block
          disabled={titleEmpty || saving}
          onClick={() => void save(paths.saved(storyId))}
        >
          Save without asking
        </Button>
      </div>
    );

  return (
    <Screen
      nav={<NavBar trail={[{ label: 'Record', to: paths.record() }]} current="Save this take" />}
      tab="record"
      footer={footer}
    >
      <button
        type="button"
        className="rec-voice"
        onClick={player.toggle}
        aria-label={player.playing ? 'Pause recording' : 'Play recording'}
        aria-pressed={player.playing}
      >
        <span className="rec-voice__label">Voice</span>
        <Waveform tone="heritage" height={28} bars={43} seed={3} progress={player.playing ? player.progress : undefined} />
        <span className="rec-voice__time">{formatDuration(story.durationSec)}</span>
      </button>

      <div className="rec-save-form">
        <Field
          label="Title"
          value={title}
          onChange={setTitle}
          maxLength={80}
          invalid={titleEmpty}
          hint={titleEmpty ? 'Add a title so you can find this story later.' : undefined}
        />
        <Field label="What happened (optional)" value={note} onChange={setNote} multiline rows={2} />
        <p className="t-muted t-italic" role="status">
          {failed ? 'Kinvo could not save this take. Try again.' : `Draft saved ${formatTime(story.updatedAt)}`}
        </p>
      </div>
    </Screen>
  );
}
