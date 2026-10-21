import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { paths } from '../../app/paths.ts';
import { Avatar, Button, ButtonLink, NavBar, Screen } from '../../components/index.ts';
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
import { newestFirst, statusText } from './people.ts';
import './family.css';

/** Free spots on the card, as a percent of its width and height. Ah Ma takes the first one. */
const SLOTS: { left: number; top: number }[] = [
  { left: 50, top: 20.6 },
  { left: 22, top: 52.4 },
  { left: 78.3, top: 42.9 },
  { left: 80, top: 18 },
  { left: 22, top: 28 },
  { left: 50, top: 40 },
  { left: 50, top: 58 },
];

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

/** 06 Family members (318:252), 06a Add family member sheet (372:2017), 06b Auntie Lin added (372:2077). */
export function FamilyScreen() {
  const state = useAppState();
  const persona = usePersona();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const now = Date.now();
  const ahMa = state.people.find((p) => p.relationship === 'grandma');
  const others = state.people
    .filter((p) => p.id !== persona && p.id !== ahMa?.id)
    .sort((a, b) => Date.parse(a.addedAt) - Date.parse(b.addedAt));
  const members: Person[] = ahMa ? [ahMa, ...others] : others;

  // A member tap sends the newest saved story that already has a meaning (the one the family is
  // discussing), else the newest saved story.
  const saved = newestFirst(state.stories.filter((s) => s.status === 'saved'));
  const latestStory = saved.find((s) => state.meanings.some((m) => m.storyId === s.id)) ?? saved[0];
  const banners = [...requestBanners(state, persona), ...replyBanners(state, persona)];

  // After a new member is added, the sheet closes and focus goes to that member.
  useEffect(() => {
    if (!focusId) return;
    const button = cardRef.current?.querySelector<HTMLElement>(`[data-person-id="${CSS.escape(focusId)}"]`);
    if (button) {
      button.focus();
      setFocusId(null);
    }
  }, [focusId, state.people]);

  function openSend(person: Person) {
    if (!latestStory) return;
    navigate(`${paths.send(latestStory.id)}?to=${encodeURIComponent(person.id)}`);
  }

  return (
    <Screen
      nav={<NavBar title="Family" />}
      tab="family"
      bodyClassName="fam-body"
      footer={
        <div className="fam-footer">
          <Button variant="primary" size="md" block onClick={() => setSheetOpen(true)}>
            Add family member
          </Button>
        </div>
      }
    >
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

      <section className="fam-card" ref={cardRef} aria-label="Family members">
        <svg className="fam-hill" viewBox="0 0 350 178" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
          <path d="M0 66 A265 265 0 0 1 350 66 V178 H0 Z" fill="var(--clay-tint)" />
          <path d="M0 66 A265 265 0 0 1 350 66" fill="none" stroke="var(--clay)" strokeWidth="2" />
          <ellipse cx="102" cy="61" rx="42" ry="12" fill="var(--clay)" />
          <ellipse cx="252" cy="118" rx="62" ry="20" fill="var(--clay)" />
          <ellipse cx="318" cy="176" rx="25" ry="8" fill="var(--clay)" />
        </svg>
        {members.map((person, index) => {
          const slot = SLOTS[index % SLOTS.length]!;
          const status = statusText(person, now);
          const style = { left: `${slot.left}%`, top: `${slot.top}%` };
          const inner = (
            <>
              <Avatar initials={person.initials} size={56} status={person.online ? 'online' : 'offline'} />
              <span className="t-subtitle">{person.name}</span>
              <span className="t-body t-muted">{status}</span>
            </>
          );
          if (person.id === ahMa?.id || !latestStory) {
            return (
              <div key={person.id} className="fam-member" style={style} data-person-id={person.id}>
                {inner}
              </div>
            );
          }
          return (
            <button
              key={person.id}
              type="button"
              className="fam-member fam-member--button"
              style={style}
              data-person-id={person.id}
              aria-label={`Send a story to ${person.name}`}
              onClick={() => openSend(person)}
            >
              {inner}
            </button>
          );
        })}
      </section>

      <AddMemberSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdded={(id) => {
          setSheetOpen(false);
          setFocusId(id);
        }}
      />
    </Screen>
  );
}
