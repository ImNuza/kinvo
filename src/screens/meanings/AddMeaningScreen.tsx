import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { paths } from '../../app/paths.ts';
import { Button, Field, NavBar, PhraseCard, PlayButton, Screen } from '../../components/index.ts';
import { useAppState, useDispatch } from '../../data/react.tsx';
import { AH_MA_CLIP_URL, saveClip, useClipUrl, usePlayer, useRecorder } from '../../lib/audio.ts';
import { newId, nowIso } from '../../lib/ids.ts';
import { usePersona } from '../../lib/session.ts';
import { PERSON, SCENARIO, SWING_STORY_ID, formatDuration, meaningsForStory, personById, storyById } from '../../shared/index.ts';
import type { AppState, Person, Story, SuggestedReply } from '../../shared/index.ts';
import { LiveMessage } from './LiveMessage.tsx';
import './meanings.css';

type Script = { text: string; reply: SuggestedReply | null; at: string };

/**
 * Scenario text for the swing story, so the demo follows Iter2.02 word for word.
 * Only used while that person has no meaning on the story yet. The time is the scenario time.
 */
function scenarioScript(state: AppState, story: Story, author: Person | undefined): Script | null {
  if (story.id !== SWING_STORY_ID || !author) return null;
  if (meaningsForStory(state, story.id).some((m) => m.authorId === author.id)) return null;
  if (author.relationship === 'mum') {
    return { text: SCENARIO.mumMeaning, reply: { ...SCENARIO.suggestedReply }, at: SCENARIO.times.mumMeaning };
  }
  if (author.id === PERSON.auntieLin) {
    return { text: SCENARIO.auntieLinMeaning, reply: null, at: SCENARIO.times.auntieLinMeaning };
  }
  return null;
}

/** 09 Add meaning (318:445). ?by=<person> means that person adds the meaning on this phone. */
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
  const [search] = useSearchParams();

  // Scenario: Mum adds her meaning on Mei Xin's phone at dinner.
  const byId = search.get('by');
  const helper = byId && byId !== persona ? personById(state, byId) : undefined;
  const authorId = helper?.id ?? persona;
  const script = scenarioScript(state, story, personById(state, authorId));

  const existing = meaningsForStory(state, storyId);
  const newest = existing[existing.length - 1];
  const currentReply: SuggestedReply | null =
    [...existing].reverse().find((m) => m.suggestedReply)?.suggestedReply ?? null;
  const creator = personById(state, story.createdBy);

  const [meaning, setMeaning] = useState(script?.text ?? '');
  const [contextEdit, setContextEdit] = useState<string | null>(null);
  const [phraseDraft, setPhraseDraft] = useState<SuggestedReply | null>(currentReply ? null : (script?.reply ?? null));
  const [editingPhrase, setEditingPhrase] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const context = contextEdit ?? newest?.context ?? (script ? SCENARIO.context : '');

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

  const shownReply = phraseDraft ?? currentReply;
  const showPhraseInputs = editingPhrase || shownReply === null;

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
      if (recorder.blob) await saveClip(`reply-${storyId}-${authorId}`, recorder.blob);
      await dispatch({
        type: 'meaning/add',
        id: newId('meaning'),
        storyId,
        authorId,
        text: meaning.trim(),
        context: context.trim(),
        suggestedReply: suggestedReplyToSave(),
        at: script && meaning.trim() === script.text ? script.at : nowIso(),
      });
      // Figma 09: Save goes to Family when a family member added the meaning on this phone.
      navigate(helper ? paths.family() : paths.meanings(storyId), { replace: true });
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
