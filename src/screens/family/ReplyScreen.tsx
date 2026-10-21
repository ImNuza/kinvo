import { useParams } from 'react-router';
import { paths } from '../../app/paths.ts';
import { Avatar, Button, ButtonLink, NavBar, Pill, Screen } from '../../components/index.ts';
import { useAppState } from '../../data/react.tsx';
import { AH_MA_CLIP_URL, usePlayer } from '../../lib/audio.ts';
import { usePersona } from '../../lib/session.ts';
import { meaningsDiffer, meaningsForStory, personById, storyById, type Person } from '../../shared/index.ts';
import { newestFirst, pronounsFor } from './people.ts';
import './family.css';

/** 08 Auntie Lin replied (318:390). Also the waiting state before the reply arrives. */
export function ReplyScreen() {
  const { storyId = '' } = useParams();
  const state = useAppState();
  const persona = usePersona();
  const player = usePlayer(AH_MA_CLIP_URL);

  const trail = [
    { label: 'Family', to: paths.family() },
    { label: 'Send story', to: paths.send(storyId) },
  ];
  const nav = <NavBar trail={trail} current="Reply" />;

  const story = storyById(state, storyId);
  if (!story) {
    return (
      <Screen nav={nav} tab="family">
        <div className="stack gap-4 fam-missing">
          <p className="t-title">Story not found</p>
          <ButtonLink variant="outline" size="md" to={paths.family()}>
            Back to Family
          </ButtonLink>
        </div>
      </Screen>
    );
  }

  const meanings = meaningsForStory(state, story.id);
  const sent = newestFirst(state.requests.filter((r) => r.storyId === story.id && r.fromId === persona))[0];
  const helperId = sent?.toId ?? newestFirst(meanings.filter((m) => m.authorId !== persona))[0]?.authorId;
  const helper = personById(state, helperId);

  if (!helper) {
    return (
      <Screen nav={nav} tab="family">
        <div className="stack gap-4 fam-missing">
          <p className="t-title">No one has been asked yet</p>
          <ButtonLink variant="primary" size="md" to={paths.send(story.id)}>
            Send story
          </ButtonLink>
        </div>
      </Screen>
    );
  }

  const pronoun = pronounsFor(helper.relationship);
  const helperMeaning = meanings.find((m) => m.authorId === helper.id);
  const differ = meaningsDiffer(state, story.id);

  if (!helperMeaning) {
    return (
      <Screen nav={nav} tab="family" bodyClassName="reply-body">
        <div className="reply-hero" role="status">
          <Avatar initials={helper.initials} size={72} status={helper.online ? 'online' : 'offline'} label={`${helper.name}, ${helper.online ? 'online' : 'offline'}`} />
          <h2 className="t-title t-center">Waiting for {helper.name}</h2>
          <p className="t-body t-muted t-center">You will see {pronoun.object} meaning here when {pronoun.subject.toLowerCase()} adds it.</p>
          <Pill kind="waiting" />
        </div>
      </Screen>
    );
  }

  const other: Person | undefined = personById(
    state,
    meanings.find((m) => m.authorId === persona && m.authorId !== helper.id)?.authorId ??
      newestFirst(meanings.filter((m) => m.authorId !== helper.id))[0]?.authorId,
  );
  const possessive = pronoun.subject === 'They' ? 'Their' : pronoun.subject === 'He' ? 'His' : 'Her';
  const detail = differ
    ? `${possessive} meaning is different from ${other ? `${other.name}'s` : 'the others'}. Compare them and agree on one before you practise.`
    : `See what ${pronoun.subject.toLowerCase()} wrote.`;

  return (
    <Screen nav={nav} tab="family" bodyClassName="reply-body">
      <div className="reply-hero" role="status">
        <Avatar initials={helper.initials} size={72} status={helper.online ? 'online' : 'offline'} label={`${helper.name}, ${helper.online ? 'online' : 'offline'}`} />
        <h2 className="t-title t-center">{helper.name} added a meaning</h2>
        <p className="t-body t-muted t-center">{detail}</p>
        {differ && <Pill kind="differ" />}
      </div>
      <div className="stack gap-3 reply-actions">
        <ButtonLink variant="primary" size="lg" block to={paths.meanings(story.id)}>
          {differ ? 'Compare meanings' : 'See meaning'}
        </ButtonLink>
        <Button variant="outline" size="lg" block icon="listen" onClick={player.toggle}>
          {player.playing ? 'Pause' : 'Listen to Ah Ma'}
        </Button>
        {player.failed && (
          <p role="status" className="t-body t-muted t-center">
            Ah Ma's recording could not play.
          </p>
        )}
      </div>
    </Screen>
  );
}
