import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { paths } from '../../app/paths.ts';
import { Button, Field, NavBar, PhraseCard, PlayButton, Screen } from '../../components/index.ts';
import { useAppState, useDispatch } from '../../data/react.tsx';
import { AH_MA_CLIP_URL, saveClip, useClipUrl, usePlayer, useRecorder } from '../../lib/audio.ts';
import { newId, nowIso } from '../../lib/ids.ts';
import { usePersona } from '../../lib/session.ts';
import { formatDuration, meaningsForStory, personById, storyById } from '../../shared/index.ts';
import type { Story, SuggestedReply } from '../../shared/index.ts';
import { LiveMessage } from './LiveMessage.tsx';
import './meanings.css';

/** 09 Add meaning (318:445). */
export function AddMeaningScreen() {
  const { storyId = '' } = useParams();
  const state = useAppState();
  const story = storyById(state, storyId);

  if (!story) {
    return (
      <Screen nav={<NavBar trail={[{ label: 'Family', to: paths.family() }]} current="Add meaning" />} tab="family">
        <div className="stack gap-3">
          <p className="t-subtitle">Story not found</p>
          <Link to={paths.family()} className="meanings__textlink">
            Go to Family
          </Link>
        </div>
      </Screen>
    );
  }
  return <AddMeaningForm key={story.id} story={story} />;
}

function AddMeaningForm({ story }: { story: Story }) {
  const storyId = story.id;
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const persona = usePersona();
  const state = useAppState();

  const existing = meaningsForStory(state, storyId);
  const newest = existing[existing.length - 1];
  const currentReply: SuggestedReply | null =
    [...existing].reverse().find((m) => m.suggestedReply)?.suggestedReply ?? null;
  const creator = personById(state, story.createdBy);

  const [meaning, setMeaning] = useState('');
  const [contextEdit, setContextEdit] = useState<string | null>(null);
  const [phraseDraft, setPhraseDraft] = useState<SuggestedReply | null>(null);
  const [editingPhrase, setEditingPhrase] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const context = contextEdit ?? newest?.context ?? '';

  // Ah Ma's clip: the copy on this phone, else the placeholder.
  const clipUrl = useClipUrl(storyId);
  const clip = usePlayer(clipUrl ?? AH_MA_CLIP_URL);

  const recorder = useRecorder();
  const replyPlayer = usePlayer(recorder.status === 'stopped' ? recorder.url : null);
  const recording = recorder.status === 'recording';
  const recorded = recorder.status === 'stopped' && recorder.blob !== null;
  const micProblem =
    recorder.status === 'denied'
      ? 'The microphone is blocked. Allow it in your browser settings and try again.'
      : recorder.status === 'unsupported'
        ? 'This browser cannot record audio.'
        : recorder.status === 'error'
          ? 'The microphone did not start. Try again.'
          : '';

  const showPhraseInputs = editingPhrase || currentReply === null;
  const shownReply = phraseDraft ?? currentReply;

  const startEditing = () => {
    setPhraseDraft(phraseDraft ?? currentReply ?? { phrase: '', english: '' });
    setEditingPhrase(true);
  };
  const doneEditing = () => {
    if (phraseDraft && !phraseDraft.phrase.trim() && !phraseDraft.english.trim()) setPhraseDraft(null);
    setEditingPhrase(false);
  };

  const suggestedReplyToSave = (): SuggestedReply | null => {
    if (!phraseDraft) return null;
    const phrase = phraseDraft.phrase.trim();
    const english = phraseDraft.english.trim();
    if (!phrase) return null;
    if (currentReply && currentReply.phrase === phrase && currentReply.english === english) return null;
    return { phrase, english };
  };

  const canSave = meaning.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError(false);
    try {
      if (recorder.blob) await saveClip(`reply-${storyId}-${persona}`, recorder.blob);
      await dispatch({
        type: 'meaning/add',
        id: newId('meaning'),
        storyId,
        authorId: persona,
        text: meaning.trim(),
        context: context.trim(),
        suggestedReply: suggestedReplyToSave(),
        at: nowIso(),
      });
      navigate(paths.meanings(storyId), { replace: true });
    } catch {
      setSaving(false);
      setSaveError(true);
    }
  };

  const nav = (
    <NavBar trail={[{ label: story.title, to: paths.meanings(storyId) }]} current="Add meaning" />
  );
  const footer = (
    <div className="add-meaning__footer">
      <LiveMessage className="t-danger">{saveError ? 'Could not save. Try again.' : ''}</LiveMessage>
      <Button size="md" icon="save" block disabled={!canSave} onClick={() => void save()}>
        Save
      </Button>
    </div>
  );

  return (
    <Screen nav={nav} tab="family" footer={footer} bodyClassName="add-meaning">
      <div className="add-meaning__clip">
        <PlayButton playing={clip.playing} onClick={clip.toggle} label="Play Ah Ma's voice" />
        <p className="t-subtitle">Ah Ma · {formatDuration(story.durationSec)}</p>
      </div>
      <LiveMessage className="t-muted">{clip.failed ? 'The clip is not available on this phone.' : ''}</LiveMessage>

      <Field label="Meaning" value={meaning} onChange={setMeaning} multiline rows={2} />
      <Field label="Context" value={context} onChange={setContextEdit} />

      <section className="add-meaning__reply" aria-labelledby="add-meaning-reply-title">
        <h2 id="add-meaning-reply-title" className="t-subtitle">
          Suggested reply (Hokkien)
        </h2>

        {showPhraseInputs ? (
          <div className="stack gap-3">
            <Field
              label="Hokkien phrase"
              value={phraseDraft?.phrase ?? ''}
              onChange={(phrase) => setPhraseDraft({ english: phraseDraft?.english ?? '', phrase })}
            />
            <Field
              label="English meaning"
              value={phraseDraft?.english ?? ''}
              onChange={(english) => setPhraseDraft({ phrase: phraseDraft?.phrase ?? '', english })}
            />
            {currentReply && (
              <Button variant="link" size="sm" onClick={doneEditing} className="add-meaning__quiet">
                Done
              </Button>
            )}
          </div>
        ) : (
          shownReply && (
            <PhraseCard label={`For ${creator?.name ?? 'the listener'} to ask`} phrase={shownReply.phrase} english={shownReply.english} />
          )
        )}

        {recorded ? (
          <div className="add-meaning__recorded">
            <PlayButton playing={replyPlayer.playing} onClick={replyPlayer.toggle} label="Play your reply" />
            <p className="t-subtitle grow">Your reply · {formatDuration(recorder.elapsedSec)}</p>
            <Button variant="link" size="sm" onClick={() => void recorder.start()}>
              Record again
            </Button>
          </div>
        ) : recording ? (
          <Button
            variant="outline"
            size="md"
            icon="stop"
            block
            aria-label={`Stop recording, ${formatDuration(recorder.elapsedSec)}`}
            onClick={() => void recorder.stop()}
          >
            Stop · {formatDuration(recorder.elapsedSec)}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="md"
            icon="mic"
            block
            disabled={recorder.status === 'requesting'}
            onClick={() => void recorder.start()}
          >
            Record your reply
          </Button>
        )}

        <LiveMessage className="t-danger">{micProblem}</LiveMessage>

        {!showPhraseInputs && (
          <Button variant="link" size="sm" onClick={startEditing} className="add-meaning__quiet">
            Edit phrase
          </Button>
        )}
      </section>
    </Screen>
  );
}
