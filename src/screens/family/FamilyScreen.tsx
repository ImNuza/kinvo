import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { paths } from '../../app/paths.ts';
import { Avatar, ButtonLink, Icon, NavBar, Screen } from '../../components/index.ts';
import { useAppState } from '../../data/react.tsx';
import { usePersona } from '../../lib/session.ts';
import {
  meaningsDiffer,
  meaningsForStory,
  openRequestsFor,
  personById,
  storyById,
  type AppState,
  type Person,
} from '../../shared/index.ts';
import { AddMemberSheet } from './AddMemberSheet.tsx';
import { isJustAdded, listStatusText, newestFirst } from './people.ts';
import './family.css';

type Banner = { key: string; text: string; linkLabel: string; to: string };

function requestBanners(state: AppState, persona: string): Banner[] {
  const banners: Banner[] = [];
  for (const request of openRequestsFor(state, persona)) {
    const story = storyById(state, request.storyId);
    if (!story) continue;
    const sender = personById(state, request.fromId)?.name ?? 'Someone';
    banners.push({
      key: `ask-${request.id}`,
      text: `${sender} sent you ${story.title}`,
      linkLabel: 'Add a meaning',
      to: paths.addMeaning(story.id),
    });
  }
  return banners;
}

function replyBanners(state: AppState, persona: string): Banner[] {
  const banners: Banner[] = [];
  const seen = new Set<string>();
  const answered = newestFirst(state.requests.filter((r) => r.fromId === persona && r.status === 'answered'));
  for (const request of answered) {
    if (seen.has(request.storyId)) continue;
    seen.add(request.storyId);
    if (!meaningsDiffer(state, request.storyId)) continue;
    const hasMeaning = meaningsForStory(state, request.storyId).some((m) => m.authorId === request.toId);
    if (!hasMeaning) continue;
    const helper = personById(state, request.toId)?.name ?? 'Someone';
    banners.push({
      key: `reply-${request.id}`,
      text: `${helper} added a meaning`,
      linkLabel: 'See reply',
      to: paths.reply(request.storyId),
    });
  }
  return banners;
}

/** Newly added people first (newest at the top), then by name. */
function byListOrder(now: number) {
  return (a: Person, b: Person) => {
    const aNew = isJustAdded(a, now);
    const bNew = isJustAdded(b, now);
    if (aNew !== bNew) return aNew ? -1 : 1;
    if (aNew) return Date.parse(b.addedAt) - Date.parse(a.addedAt);
    return a.name.localeCompare(b.name);
  };
}

type MemberRowProps = { person: Person; status: string };

function MemberRow({ person, status }: MemberRowProps) {
  const inner = (
    <>
      <Avatar initials={person.initials} size={40} status={person.online ? 'online' : 'offline'} />
      <span className="fam-row__copy">
        <span className="fam-row__name">{person.name}</span>
        <span className="t-body t-muted">{status}</span>
      </span>
    </>
  );
  // Ah Ma tells the stories, so nobody sends her one to explain.
  if (person.relationship === 'grandma') {
    return (
      <div className="fam-row" data-person-id={person.id}>
        {inner}
      </div>
    );
  }
  return (
    <Link
      to={paths.selectStory(person.id)}
      className="fam-row fam-row--link"
      data-person-id={person.id}
      aria-label={`${person.name}, ${status}. Share a story`}
    >
      {inner}
      <Icon name="chev-right" size={16} className="fam-row__chev" />
    </Link>
  );
}

/** 06 Family members (318:252), 06a Add family member sheet (372:2017), 06b Auntie Lin added (372:2077). */
export function FamilyScreen() {
  const state = useAppState();
  const persona = usePersona();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const now = Date.now();
  const needle = query.trim().toLowerCase();
  const members = state.people
    .filter((p) => p.id !== persona)
    .filter((p) => !needle || p.name.toLowerCase().includes(needle))
    .sort(byListOrder(now));
  const online = members.filter((p) => p.online);
  const offline = members.filter((p) => !p.online);
  const banners = [...requestBanners(state, persona), ...replyBanners(state, persona)];

  // After a new member is added, the sheet closes and focus goes to that member.
  useEffect(() => {
    if (!focusId) return;
    const row = listRef.current?.querySelector<HTMLElement>(`[data-person-id="${CSS.escape(focusId)}"]`);
    if (row) {
      row.focus();
      setFocusId(null);
    }
  }, [focusId, state.people]);

  const groups = [
    { key: 'online', label: `Online · ${online.length}`, people: online },
    { key: 'offline', label: `Offline · ${offline.length}`, people: offline },
  ].filter((g) => g.people.length > 0);

  return (
    <Screen nav={<NavBar title="Family" />} tab="family" bodyClassName="fam-body">
      {banners.length > 0 && (
        <ul className="fam-banners" aria-label="Updates">
          {banners.map((b) => (
            <li key={b.key} className="fam-banner">
              <p className="fam-banner__text t-body">{b.text}</p>
              <ButtonLink variant="link" size="sm" to={b.to}>
                {b.linkLabel}
              </ButtonLink>
            </li>
          ))}
        </ul>
      )}

      <label className="fam-search">
        <Icon name="search" size={18} className="fam-search__icon" />
        <span className="sr-only">Search family members</span>
        <input
          type="search"
          className="fam-search__input"
          placeholder="Search family members"
          value={query}
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>

      <div className="fam-list" ref={listRef}>
        {groups.length === 0 && needle && <p className="fam-empty t-body t-muted">No one matches "{query.trim()}".</p>}
        {groups.map((g) => (
          <section key={g.key} aria-label={g.label}>
            <h2 className="fam-section">{g.label}</h2>
            <ul className="fam-rows">
              {g.people.map((person) => (
                <li key={person.id}>
                  <MemberRow person={person} status={listStatusText(person, now)} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="fam-add-wrap">
        <button type="button" className="fam-add" onClick={() => setSheetOpen(true)}>
          <span className="fam-add__plus">
            <Icon name="plus" size={18} />
          </span>
          Add family member
        </button>
        <p className="fam-add__hint">Invite by phone number or share a link</p>
      </div>

      <AddMemberSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdded={(id) => {
          setSheetOpen(false);
          setQuery('');
          setFocusId(id);
        }}
      />
    </Screen>
  );
}
