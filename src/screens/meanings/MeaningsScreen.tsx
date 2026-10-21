import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router';
import { paths } from '../../app/paths.ts';
import { Button, ButtonLink, Icon, MeaningCard, NavBar, Pill, Screen, ThreadReply } from '../../components/index.ts';
import { useAppState, useDispatch } from '../../data/react.tsx';
import { newId, nowIso } from '../../lib/ids.ts';
import { usePersona } from '../../lib/session.ts';
import {
  agreedMeaning,
  meaningsDiffer,
  meaningsForStory,
  personById,
  repliesForStory,
  storyById,
} from '../../shared/index.ts';
import type { AppState, Meaning, Person } from '../../shared/index.ts';
import { LiveMessage } from './LiveMessage.tsx';
import './meanings.css';

const UNKNOWN_NAME = 'Someone';
const UNKNOWN_INITIALS = '?';

function nameOf(person: Person | undefined) {
  return person?.name ?? UNKNOWN_NAME;
}
function initialsOf(person: Person | undefined) {
  return person?.initials ?? UNKNOWN_INITIALS;
}

/** "Mum", "Mum and Auntie Lin", "Mum, Auntie Lin and Dad". */
function joinNames(names: string[]) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Everyone who wrote a meaning or a reply on this story, first appearance first, minus the acting person. */
function otherVoices(state: AppState, storyId: string, persona: string): string[] {
  const writings = [...meaningsForStory(state, storyId), ...repliesForStory(state, storyId)].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  const seen = new Set<string>();
  const names: string[] = [];
  for (const w of writings) {
    if (w.authorId === persona || seen.has(w.authorId)) continue;
    seen.add(w.authorId);
    names.push(nameOf(personById(state, w.authorId)));
  }
  return names;
}

/** 09a Conflicting meanings (374:2132) and 09b Meaning agreed (374:2272). No tab bar. */
export function MeaningsScreen() {
  const { storyId = '' } = useParams();
  const state = useAppState();
  const dispatch = useDispatch();
  const persona = usePersona();

  const story = storyById(state, storyId);

  const termRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState('');
  const [sentCount, setSentCount] = useState(0);
  const [sendError, setSendError] = useState(false);

  // After you send a reply, show the newest one.
  useEffect(() => {
    if (sentCount === 0) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    listRef.current?.lastElementChild?.scrollIntoView({ block: 'end', behavior: reduced ? 'auto' : 'smooth' });
  }, [sentCount]);

  if (!story) {
    return (
      <Screen
        nav={<NavBar trail={[{ label: 'Archive', to: paths.archive() }]} current="Meanings" />}
        hideTabBar
      >
        <div className="stack gap-3">
          <p className="t-subtitle">Story not found</p>
          <Link to={paths.family()} className="meanings__textlink">
            Go to Family
          </Link>
        </div>
      </Screen>
    );
  }

  const meanings = meaningsForStory(state, story.id);
  const replies = repliesForStory(state, story.id);
  const agreed = agreedMeaning(state, story.id);
  const differ = meaningsDiffer(state, story.id);
  const agreedAuthor = personById(state, agreed?.authorId);
  const agreedBy = personById(state, story.agreedBy);

  const ordered: Meaning[] = agreed ? [agreed, ...meanings.filter((m) => m.id !== agreed.id)] : meanings;
  const hasOwnMeaning = meanings.some((m) => m.authorId === persona);
  const canAddMeaning = persona !== story.createdBy && !hasOwnMeaning;

  const subtitle = agreed
    ? `${story.title} · ${nameOf(agreedAuthor)}'s meaning`
    : `${story.title} · ${meanings.length} ${meanings.length === 1 ? 'meaning' : 'meanings'}`;

  const voices = otherVoices(state, story.id, persona);
  const placeholder = voices.length > 0 ? `Reply to ${joinNames(voices)}` : 'Reply to the family';

  const agree = async (meaningId: string) => {
    await dispatch({ type: 'meaning/agree', storyId: story.id, meaningId, by: persona, at: nowIso() });
    termRef.current?.focus();
  };

  const unagree = async () => {
    await dispatch({ type: 'meaning/unagree', storyId: story.id });
    termRef.current?.focus();
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSendError(false);
    try {
      await dispatch({ type: 'reply/add', id: newId('reply'), storyId: story.id, authorId: persona, text, at: nowIso() });
      setDraft('');
      setSentCount((n) => n + 1);
    } catch {
      setSendError(true);
    }
    inputRef.current?.focus();
  };

  let agreementNote = '';
  if (agreed) {
    const ownerOfMeaning = agreedAuthor?.id === persona ? 'your' : `${nameOf(agreedAuthor)}'s`;
    agreementNote =
      story.agreedBy === persona
        ? `You marked ${ownerOfMeaning} meaning as agreed. Your lesson now uses it.`
        : `${nameOf(agreedBy)} marked ${ownerOfMeaning} meaning as agreed.`;
  }

  const composer = (
    <form className="composer" onSubmit={(e) => void send(e)}>
      <input
        ref={inputRef}
        className="composer__input"
        type="text"
        value={draft}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        enterKeyHint="send"
        onChange={(e) => setDraft(e.target.value)}
      />
      <button type="submit" className="composer__send" aria-label="Send reply">
        <Icon name="send" size={18} />
      </button>
      <LiveMessage className="composer__error t-danger">{sendError ? 'Could not send. Try again.' : ''}</LiveMessage>
    </form>
  );

  return (
    <Screen
      nav={<NavBar trail={[{ label: story.title, to: paths.archive() }]} current="Meanings" />}
      hideTabBar
      footer={composer}
    >
      <div className="meanings">
        <header className="meanings__head">
          {differ && <Pill kind="differ" />}
          {agreed && <Pill kind="agreed" />}
          <h2 className="meanings__term" ref={termRef} tabIndex={-1}>
            {story.term ?? story.title}
          </h2>
          <p className="t-muted">{subtitle}</p>
        </header>

        <div className="meanings__cards">
          {ordered.map((m) => {
            const author = personById(state, m.authorId);
            const isAgreed = agreed?.id === m.id;
            return (
              <MeaningCard
                key={m.id}
                authorName={nameOf(author)}
                authorInitials={initialsOf(author)}
                createdAt={m.createdAt}
                text={m.text}
                agreed={isAgreed}
                onMarkAgreed={agreed ? undefined : () => void agree(m.id)}
              />
            );
          })}
          {canAddMeaning && (
            <ButtonLink to={paths.addMeaning(story.id)} variant="link" size="sm" className="meanings__add">
              Add your meaning
            </ButtonLink>
          )}
        </div>

        <section className="meanings__thread" aria-labelledby="meanings-discussion">
          <h3 id="meanings-discussion" className="t-subtitle">
            Discussion
          </h3>
          {replies.length === 0 ? (
            <p className="t-muted">No replies yet.</p>
          ) : (
            <ol className="meanings__replies" ref={listRef}>
              {replies.map((r) => {
                const author = personById(state, r.authorId);
                return (
                  <li key={r.id}>
                    <ThreadReply
                      authorName={nameOf(author)}
                      authorInitials={initialsOf(author)}
                      createdAt={r.createdAt}
                      text={r.text}
                    />
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <div className="meanings__agreement">
          <div role="status">{agreed && <p className="t-muted t-center">{agreementNote}</p>}</div>
          {agreed && (
            <Button variant="link" size="sm" className="meanings__change" onClick={() => void unagree()}>
              Change
            </Button>
          )}
        </div>
      </div>
    </Screen>
  );
}
