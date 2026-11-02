import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router';
import { paths } from '../../app/paths.ts';
import { ButtonLink, Icon, NavBar, PlayButton, Screen, ThreadReply } from '../../components/index.ts';
import { useAppState, useDispatch } from '../../data/react.tsx';
import { AH_MA_CLIP_URL, useClipUrl, usePlayer } from '../../lib/audio.ts';
import { newId, nowIso } from '../../lib/ids.ts';
import { usePersona } from '../../lib/session.ts';
import {
  agreedMeaning,
  formatDayMonth,
  formatTime,
  meaningsDiffer,
  meaningsForStory,
  personById,
  repliesForStory,
  storyById,
} from '../../shared/index.ts';
import type { AppState, Meaning, Person, Story, ThreadReply as Reply } from '../../shared/index.ts';
import { LiveMessage } from './LiveMessage.tsx';
import './meanings.css';

const UNKNOWN_NAME = 'Someone';
const UNKNOWN_INITIALS = '?';

/** Threads the family resolved before the scenario. Shown under "Resolved · saved for review". */
const PAST_THREADS = [{ id: 'lim-kopi', title: '"Lim kopi" · 3 comments', detail: 'Resolved by Mum · 5 Sep' }];

type Tab = 'open' | 'resolved';

function nameOf(person: Person | undefined) {
  return person?.name ?? UNKNOWN_NAME;
}
function initialsOf(person: Person | undefined) {
  return person?.initials ?? UNKNOWN_INITIALS;
}

/** "Mum's", or "Your" ("your" mid-sentence) for the acting person. */
function ownerLabel(person: Person | undefined, persona: string, midSentence = false) {
  if (person?.id === persona) return midSentence ? 'your' : 'Your';
  return `${nameOf(person)}'s`;
}

/** The meaning the discussion is about: the newest one written before the first reply. */
function threadMeaning(meanings: Meaning[], replies: Reply[]): Meaning | undefined {
  const firstReply = replies[0];
  if (!firstReply) return meanings[meanings.length - 1];
  const before = meanings.filter((m) => Date.parse(m.createdAt) <= Date.parse(firstReply.createdAt));
  return before[before.length - 1] ?? meanings[meanings.length - 1];
}

function storyHeading(story: Story) {
  return `${story.occasion || story.title} · ${formatDayMonth(story.date)}`;
}

function statusLine(agreed: boolean, differ: boolean, count: number): { text: string; tone: string } {
  if (agreed) return { text: 'Agreed · lesson ready', tone: 'meanings__status--agreed' };
  if (differ) return { text: 'Meanings differ · lesson waits until agreed', tone: 'meanings__status--differ' };
  return { text: count === 0 ? 'No meanings yet' : 'One meaning so far', tone: '' };
}

function storyteller(state: AppState) {
  return state.people.find((p) => p.relationship === 'grandma')?.name ?? 'Ah Ma';
}

/** 09a Conflicting meanings (374:2132) and 09b Meaning agreed (427:3257). */
export function MeaningsScreen() {
  const { storyId = '' } = useParams();
  const state = useAppState();
  const dispatch = useDispatch();
  const persona = usePersona();

  const story = storyById(state, storyId);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ open: null, resolved: null });
  const [tabChoice, setTabChoice] = useState<Tab | null>(null);
  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState(false);

  const clipUrl = useClipUrl(storyId);
  const clip = usePlayer(clipUrl ?? AH_MA_CLIP_URL);

  if (!story) {
    return (
      <Screen nav={<NavBar trail={[]} current="Meanings" backTo={paths.family()} />} tab="family">
        <div className="stack gap-3">
          <p className="t-subtitle">Story not found</p>
          <ButtonLink to={paths.family()} variant="outline" size="md">
            Go to Family
          </ButtonLink>
        </div>
      </Screen>
    );
  }

  const meanings = meaningsForStory(state, story.id);
  const replies = repliesForStory(state, story.id);
  const agreed = agreedMeaning(state, story.id);
  const differ = meaningsDiffer(state, story.id);
  const topic = threadMeaning(meanings, replies);
  const topicAuthor = personById(state, topic?.authorId);
  const status = statusLine(Boolean(agreed), differ, meanings.length);
  const canAddMeaning = persona !== story.createdBy && !meanings.some((m) => m.authorId === persona);

  const tab: Tab = tabChoice ?? (agreed ? 'resolved' : 'open');
  const openCount = !agreed && topic ? 1 : 0;
  const resolvedCount = PAST_THREADS.length + (agreed ? 1 : 0);

  const agree = async () => {
    if (!topic) return;
    await dispatch({ type: 'meaning/agree', storyId: story.id, meaningId: topic.id, by: persona, at: nowIso() });
    setTabChoice(null);
    headingRef.current?.focus();
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setSendError(false);
    try {
      await dispatch({ type: 'reply/add', id: newId('reply'), storyId: story.id, authorId: persona, text, at: nowIso() });
      setDraft('');
    } catch {
      setSendError(true);
    }
    inputRef.current?.focus();
  };

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next: Tab = tab === 'open' ? 'resolved' : 'open';
    setTabChoice(next);
    tabRefs.current[next]?.focus();
  };

  const replyList = (
    <ol className="meanings__replies">
      {replies.map((r) => {
        const author = personById(state, r.authorId);
        return (
          <li key={r.id}>
            <ThreadReply authorName={nameOf(author)} authorInitials={initialsOf(author)} createdAt={r.createdAt} text={r.text} />
          </li>
        );
      })}
    </ol>
  );

  const agreedBy = personById(state, story.agreedBy);
  const resolvedBy = agreedBy?.id === persona ? 'you' : nameOf(agreedBy);

  return (
    <Screen nav={<NavBar trail={[]} current="Meanings" backTo={paths.family()} />} tab="family" bodyClassName="meanings-body">
      <header className="meanings__head">
        <h2 className="meanings__title" ref={headingRef} tabIndex={-1}>
          {storyHeading(story)}
        </h2>
        <p className={`meanings__status ${status.tone}`} role="status">
          {status.text}
        </p>
      </header>

      <section className="meanings__card" aria-label={`${storyteller(state)} says ${story.term ?? story.title}`}>
        <p className="meanings__eyebrow">{storyteller(state)} says</p>
        <div className="meanings__phrase-row">
          <PlayButton tone="filled" playing={clip.playing} onClick={clip.toggle} label={`Play ${storyteller(state)}'s voice`} />
          <p className="meanings__phrase" lang="nan-Latn">
            {story.term ?? story.title}
          </p>
        </div>
        <LiveMessage className="t-muted">{clip.failed ? 'The clip is not available on this phone.' : ''}</LiveMessage>
        {meanings.length > 0 && (
          <ul className="meanings__list">
            {meanings.map((m) => {
              const author = personById(state, m.authorId);
              const isAgreed = agreed?.id === m.id;
              const isTopic = topic?.id === m.id && replies.length > 0;
              const className = [
                'meaning-quote',
                isAgreed ? 'meaning-quote--agreed' : '',
                agreed && !isAgreed ? 'meaning-quote--faded' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <li key={m.id} className={className}>
                  <div className="meaning-quote__copy">
                    <p className="meaning-quote__label">
                      {ownerLabel(author, persona)} meaning · {isAgreed ? 'Agreed' : formatTime(m.createdAt)}
                    </p>
                    <p className="meaning-quote__text">{m.text}</p>
                  </div>
                  {isTopic && (
                    <span className="meaning-quote__badge" aria-label={`${replies.length} comments`}>
                      <Icon name="chat" size={12} />
                      <span aria-hidden="true">{replies.length}</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {canAddMeaning && (
          <ButtonLink to={paths.addMeaning(story.id)} variant="link" size="sm" className="meanings__add">
            Add your meaning
          </ButtonLink>
        )}
      </section>

      <div className="meanings__tabs" role="tablist" aria-label="Discussions">
        {(['open', 'resolved'] as const).map((t) => {
          const selected = t === tab;
          const count = t === 'open' ? openCount : resolvedCount;
          return (
            <button
              key={t}
              ref={(el) => {
                tabRefs.current[t] = el;
              }}
              type="button"
              role="tab"
              id={`meanings-tab-${t}`}
              aria-selected={selected}
              aria-controls={`meanings-panel-${t}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? 'meanings__tab meanings__tab--on' : 'meanings__tab'}
              onClick={() => setTabChoice(t)}
              onKeyDown={onTabKey}
            >
              {t === 'open' ? 'Open' : 'Resolved'}
              <span className="meanings__count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="meanings__panel" role="tabpanel" id={`meanings-panel-${tab}`} aria-labelledby={`meanings-tab-${tab}`}>
        {tab === 'open' &&
          (openCount === 0 || !topic ? (
            <p className="t-body t-muted">No open discussions.</p>
          ) : (
            <section className="thread" aria-label={`Discussion on ${ownerLabel(topicAuthor, persona, true)} meaning`}>
              <p className="thread__head">
                On <strong>{ownerLabel(topicAuthor, persona, true)} meaning</strong>
              </p>
              <div className="thread__body">
                {replies.length > 0 && replyList}
                <form className="thread__reply" onSubmit={(e) => void send(e)}>
                  <input
                    ref={inputRef}
                    className="thread__input"
                    type="text"
                    value={draft}
                    placeholder="Reply…"
                    aria-label={`Reply on ${ownerLabel(topicAuthor, persona, true)} meaning`}
                    autoComplete="off"
                    enterKeyHint="send"
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <button type="button" className="thread__agree" onClick={() => void agree()}>
                    <Icon name="check" size={14} />
                    Agree
                  </button>
                </form>
                <LiveMessage className="t-danger">{sendError ? 'Could not send. Try again.' : ''}</LiveMessage>
              </div>
            </section>
          ))}
        {tab === 'resolved' &&
          (agreed ? (
            <section className="thread" aria-label="Resolved discussion">
              <p className="thread__head">
                Resolved by {resolvedBy} · {ownerLabel(personById(state, agreed.authorId), persona)} meaning agreed
              </p>
              {replies.length > 0 && <div className="thread__body">{replyList}</div>}
            </section>
          ) : (
            <p className="t-body t-muted">Nothing resolved on this story yet.</p>
          ))}
      </div>

      <section className="meanings__past" aria-labelledby="meanings-past">
        <h3 id="meanings-past" className="meanings__section">
          Resolved · saved for review
        </h3>
        <ul className="stack gap-2">
          {PAST_THREADS.map((t) => (
            <li key={t.id}>
              <Link to={paths.archive()} className="past-thread">
                <span className="past-thread__tick" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
                <span className="past-thread__copy">
                  <span className="past-thread__title">{t.title}</span>
                  <span className="past-thread__detail">{t.detail}</span>
                </span>
                <Icon name="chev-right" size={16} className="past-thread__chev" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {agreed ? (
        <Link to={paths.lessons()} className="lesson-banner lesson-banner--link">
          <Icon name="sparkle" size={16} />
          Lesson created. Tap to open Lessons.
        </Link>
      ) : (
        <p className="lesson-banner">
          <Icon name="sparkle" size={16} />
          The lesson will use the agreed meaning.
        </p>
      )}
    </Screen>
  );
}
