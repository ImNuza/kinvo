import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import { paths } from '../../app/paths.ts';
import { Avatar, Button, ButtonLink, Checkbox, NavBar, Screen } from '../../components/index.ts';
import { useAppState, useDispatch } from '../../data/react.tsx';
import { newId, nowIso } from '../../lib/ids.ts';
import { usePersona } from '../../lib/session.ts';
import {
  formatDuration,
  meaningsForStory,
  personById,
  storyById,
  type AppState,
  type Person,
} from '../../shared/index.ts';
import { isJustAdded, pronounsFor, statusText } from './people.ts';
import './family.css';

const TRAIL = [{ label: 'Family', to: paths.family() }];

function meaningSummary(state: AppState, storyId: string): string {
  const meanings = meaningsForStory(state, storyId);
  if (meanings.length === 0) return 'No meanings yet';
  if (meanings.length === 1) {
    const author = personById(state, meanings[0]!.authorId)?.name ?? 'Someone';
    return `${author} added a meaning`;
  }
  return `${meanings.length} meanings`;
}

function cardLine(person: Person, selected: boolean): string {
  const fresh = isJustAdded(person);
  if (selected && fresh) return 'Selected · just added';
  if (selected) return 'Selected';
  return statusText(person);
}

/** 07 Send story (318:329). */
export function SendStoryScreen() {
  const { storyId = '' } = useParams();
  const [search] = useSearchParams();
  const state = useAppState();
  const dispatch = useDispatch();
  const persona = usePersona();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<string | null>(null);
  const [askMeaning, setAskMeaning] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const sendingId = useId();
  const toId = useId();
  const askId = useId();

  const story = storyById(state, storyId);
  if (!story) {
    return (
      <Screen nav={<NavBar trail={TRAIL} current="Send story" />} tab="family">
        <div className="stack gap-4 fam-missing">
          <p className="t-title">Story not found</p>
          <ButtonLink variant="outline" size="md" to={paths.family()}>
            Back to Family
          </ButtonLink>
        </div>
      </Screen>
    );
  }

  const candidates = state.people
    .filter((p) => p.relationship !== 'grandma' && p.id !== persona)
    .sort((a, b) => Date.parse(a.addedAt) - Date.parse(b.addedAt));
  const wanted = search.get('to');
  const newest = candidates[candidates.length - 1];
  const defaultId = candidates.find((p) => p.id === wanted)?.id ?? newest?.id ?? null;
  const selected = candidates.find((p) => p.id === picked) ?? candidates.find((p) => p.id === defaultId);
  const pronoun = pronounsFor(selected?.relationship ?? null);
  const canSend = Boolean(selected) && askMeaning && !sending;

  function onKey(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    const delta = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + candidates.length) % candidates.length;
    setPicked(candidates[next]!.id);
    refs.current[next]?.focus();
  }

  async function send() {
    if (!selected || !canSend) return;
    setSending(true);
    setError('');
    try {
      await dispatch({ type: 'request/send', id: newId('request'), storyId: story!.id, fromId: persona, toId: selected.id, at: nowIso() });
      navigate(paths.reply(story!.id));
    } catch {
      setSending(false);
      setError('Could not send the story. Try again.');
    }
  }

  const selectedIndex = candidates.findIndex((p) => p.id === selected?.id);

  return (
    <Screen
      nav={<NavBar trail={TRAIL} current="Send story" />}
      tab="family"
      bodyClassName="send-body"
      footer={
        <div className="stack gap-2 send-footer">
          {error && (
            <p role="alert" className="t-body t-danger">
              {error}
            </p>
          )}
          <Button variant="primary" size="md" icon="send" block disabled={!canSend} onClick={() => void send()}>
            {selected ? `Send to ${selected.name}` : 'Send'}
          </Button>
        </div>
      }
    >
      <section className="stack send-section send-section--first" aria-labelledby={sendingId}>
        <h2 id={sendingId} className="t-subtitle">
          You are sending
        </h2>
        <div className="send-story">
          <p className="send-story__title">{story.title}</p>
          <p className="t-body t-muted">
            {story.place} · {formatDuration(story.durationSec)} · {meaningSummary(state, story.id)}
          </p>
        </div>
      </section>

      <section className="stack send-section" aria-labelledby={toId}>
        <h2 id={toId} className="t-subtitle">
          Send to
        </h2>
        {candidates.length === 0 ? (
          <p className="t-body t-muted">No one to send to yet. Add a family member first.</p>
        ) : (
          <div role="radiogroup" aria-labelledby={toId} className="send-people">
            {candidates.map((person, index) => {
              const on = person.id === selected?.id;
              return (
                <button
                  key={person.id}
                  ref={(el) => {
                    refs.current[index] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  tabIndex={on || (selectedIndex === -1 && index === 0) ? 0 : -1}
                  className={on ? 'send-person send-person--on' : 'send-person'}
                  onClick={() => setPicked(person.id)}
                  onKeyDown={(e) => onKey(e, index)}
                >
                  <Avatar initials={person.initials} size={40} status={person.online ? 'online' : 'offline'} />
                  <span className="stack send-person__text">
                    <span className="t-subtitle">{person.name}</span>
                    <span className="t-body t-muted">{cardLine(person, on)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className="stack send-section" aria-labelledby={askId}>
        <h2 id={askId} className="t-subtitle">
          Ask {pronoun.object} to add
        </h2>
        <Checkbox checked={askMeaning} onChange={setAskMeaning}>
          Meaning
        </Checkbox>
      </section>
    </Screen>
  );
}
