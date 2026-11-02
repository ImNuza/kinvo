// Seed data: the Iter2 scenario at the moment before Auntie Lin is added.
// Mei Xin recorded Ah Ma's swing story at Sunday lunch, sent it to Mum, and Mum added a meaning.

import type { AppState, SuggestedReply } from './types.ts';

/** The demo runs on the scenario day. Screens use this as "today", not the real clock date. */
export const DEMO_TODAY = '2026-09-13';

export const PERSON = {
  meixin: 'meixin',
  ahma: 'ahma',
  mum: 'mum',
  /** Id that "Add family member" produces for the name "Auntie Lin" (see personIdFromName). */
  auntieLin: 'auntie-lin',
} as const;

export const SWING_STORY_ID = 'story-swing';

/** Exact scenario text. Screens and tests can use it for demo prefill. Never edit the wording. */
export const SCENARIO = {
  storyTitle: "Ah Ma's swing story",
  storyNote: 'Ah Ma talked about the swing at Kampong Lorong Buangkok.',
  place: 'Toa Payoh',
  occasion: 'Sunday lunch',
  durationSec: 12,
  term: 'chhiu-chhian-kha',
  context: "Ah Ma's childhood at Kampong Lorong Buangkok",
  mumMeaning: 'It just means the area under a swing. Ah Ma used to play there as a kid.',
  auntieLinMeaning:
    "It wasn't just any swing. The carpenter in the kampong built it, and it was where everyone gathered in the evenings. Ah Ma calling it 'the swing' is like calling it the heart of the kampong.",
  auntieLinReply: 'I lived right next to the kampong. I sat at that swing every evening too.',
  mumReply: 'You lived closer than I did. Your version is the fuller one.',
  suggestedReply: {
    phrase: 'Hit ê chhiu-chhian taⁿ-á iáu tī--bô?',
    english: 'Is that swing still there now?',
  } satisfies SuggestedReply,
  times: {
    mumMeaning: '2026-09-13T19:40:00+08:00',
    auntieLinMeaning: '2026-09-13T21:05:00+08:00',
    auntieLinReply: '2026-09-13T21:12:00+08:00',
    mumReply: '2026-09-13T21:20:00+08:00',
  },
} as const;

/** Older saved stories, listed on 06c Select a story. A story with no audio (durationSec 0) is a photo. */
const PAST_STORIES = [
  { id: 'story-saturday-lunch', title: 'Saturday lunch with Ah Ma', place: 'Toa Payoh', occasion: 'Saturday lunch', date: '2026-09-12', durationSec: 0 },
  { id: 'story-movie-date', title: 'Movie date with Ah Ma', place: 'Vivocity', occasion: 'Movie date', date: '2026-09-11', durationSec: 0 },
  { id: 'story-voice-note', title: 'Voice note', place: '', occasion: '', date: '2026-09-09', durationSec: 7 },
] as const;

const HOUR_MS = 60 * 60 * 1000;

/**
 * Mum went offline two hours before the seed was made, so 06 shows "Last online 2h ago".
 * Rounded down to the hour, so two seeds made in the same hour are equal.
 */
function mumLastSeen(now: number): string {
  return new Date(Math.floor(now / HOUR_MS) * HOUR_MS - 2 * HOUR_MS).toISOString();
}

export function createSeed(now: number = Date.now()): AppState {
  return {
    schema: 1,
    people: [
      {
        id: PERSON.meixin,
        name: 'Mei Xin',
        initials: 'MX',
        relationship: 'self',
        online: true,
        addedAt: '2026-08-01T10:00:00+08:00',
        addedBy: null,
      },
      {
        id: PERSON.ahma,
        name: 'Ah Ma',
        initials: 'AM',
        relationship: 'grandma',
        online: true,
        addedAt: '2026-08-01T10:00:00+08:00',
        addedBy: PERSON.meixin,
      },
      {
        id: PERSON.mum,
        name: 'Mum',
        initials: 'ML',
        relationship: 'mum',
        online: false,
        lastSeenAt: mumLastSeen(now),
        addedAt: '2026-08-01T10:05:00+08:00',
        addedBy: PERSON.meixin,
      },
    ],
    stories: [
      {
        id: SWING_STORY_ID,
        title: SCENARIO.storyTitle,
        note: SCENARIO.storyNote,
        place: SCENARIO.place,
        occasion: SCENARIO.occasion,
        date: DEMO_TODAY,
        durationSec: SCENARIO.durationSec,
        status: 'saved',
        createdBy: PERSON.meixin,
        createdAt: '2026-09-13T14:14:00+08:00',
        updatedAt: '2026-09-13T14:16:00+08:00',
        term: SCENARIO.term,
        agreedMeaningId: null,
        agreedBy: null,
        agreedAt: null,
      },
      ...PAST_STORIES.map((s) => ({
        ...s,
        note: '',
        status: 'saved' as const,
        createdBy: PERSON.meixin,
        createdAt: `${s.date}T20:00:00+08:00`,
        updatedAt: `${s.date}T20:00:00+08:00`,
        term: null,
        agreedMeaningId: null,
        agreedBy: null,
        agreedAt: null,
      })),
    ],
    meanings: [
      {
        id: 'meaning-mum',
        storyId: SWING_STORY_ID,
        authorId: PERSON.mum,
        text: SCENARIO.mumMeaning,
        context: SCENARIO.context,
        suggestedReply: { ...SCENARIO.suggestedReply },
        createdAt: SCENARIO.times.mumMeaning,
      },
    ],
    replies: [],
    requests: [
      {
        id: 'request-mum',
        storyId: SWING_STORY_ID,
        fromId: PERSON.meixin,
        toId: PERSON.mum,
        ask: 'meaning',
        status: 'answered',
        createdAt: '2026-09-13T14:16:00+08:00',
      },
    ],
    attempts: [],
    history: [
      { date: '2026-09-05', hasMeaning: true },
      { date: '2026-09-08', hasMeaning: false },
      { date: '2026-09-09', hasMeaning: true },
      { date: '2026-09-10', hasMeaning: true },
      { date: '2026-09-11', hasMeaning: true },
      { date: '2026-09-12', hasMeaning: true },
    ],
  };
}
