// Pure reducer: reduce(state, action) -> state. No I/O, no clock, no randomness.
// An action that does not apply (unknown id, duplicate id) returns the same state object.

import type { Action } from './actions.ts';
import type { AppState, Person, Story } from './types.ts';

export function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return (words[0] ?? '?').slice(0, 2).toUpperCase();
}

/** "Auntie Lin" -> "auntie-lin". Adds "-2", "-3" when the id is taken. */
export function personIdFromName(name: string, people: readonly Person[]): string {
  const base =
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'person';
  const taken = new Set(people.map((p) => p.id));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function updateStory(state: AppState, id: string, patch: (s: Story) => Story): AppState {
  const index = state.stories.findIndex((s) => s.id === id);
  if (index === -1) return state;
  const stories = state.stories.slice();
  stories[index] = patch(stories[index]!);
  return { ...state, stories };
}

export function reduce(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'story/create': {
      if (state.stories.some((s) => s.id === action.id)) return state;
      const story: Story = {
        id: action.id,
        title: action.title,
        note: action.note,
        place: action.place,
        occasion: action.occasion,
        date: action.date,
        durationSec: action.durationSec,
        status: action.status,
        createdBy: action.by,
        createdAt: action.at,
        updatedAt: action.at,
        term: null,
        agreedMeaningId: null,
        agreedBy: null,
        agreedAt: null,
      };
      return { ...state, stories: [...state.stories, story] };
    }

    case 'story/update':
      return updateStory(state, action.id, (s) => ({
        ...s,
        title: action.title ?? s.title,
        note: action.note ?? s.note,
        status: action.status ?? s.status,
        term: action.term ?? s.term,
        updatedAt: action.at,
      }));

    case 'story/delete': {
      if (!state.stories.some((s) => s.id === action.id)) return state;
      const keep = <T extends { storyId: string }>(items: T[]) => items.filter((i) => i.storyId !== action.id);
      return {
        ...state,
        stories: state.stories.filter((s) => s.id !== action.id),
        meanings: keep(state.meanings),
        replies: keep(state.replies),
        requests: keep(state.requests),
        attempts: keep(state.attempts),
      };
    }

    case 'person/add': {
      if (state.people.some((p) => p.id === action.id)) return state;
      const person: Person = {
        id: action.id,
        name: action.name.trim(),
        initials: initialsFromName(action.name),
        relationship: action.relationship,
        online: true,
        addedAt: action.at,
        addedBy: action.by,
      };
      return { ...state, people: [...state.people, person] };
    }

    case 'request/send': {
      if (state.requests.some((r) => r.id === action.id)) return state;
      if (!state.stories.some((s) => s.id === action.storyId)) return state;
      if (!state.people.some((p) => p.id === action.toId)) return state;
      return {
        ...state,
        requests: [
          ...state.requests,
          {
            id: action.id,
            storyId: action.storyId,
            fromId: action.fromId,
            toId: action.toId,
            ask: 'meaning',
            status: 'open',
            createdAt: action.at,
          },
        ],
      };
    }

    case 'meaning/add': {
      if (state.meanings.some((m) => m.id === action.id)) return state;
      if (!state.stories.some((s) => s.id === action.storyId)) return state;
      return {
        ...state,
        meanings: [
          ...state.meanings,
          {
            id: action.id,
            storyId: action.storyId,
            authorId: action.authorId,
            text: action.text,
            context: action.context,
            suggestedReply: action.suggestedReply,
            createdAt: action.at,
          },
        ],
        requests: state.requests.map((r) =>
          r.storyId === action.storyId && r.toId === action.authorId && r.status === 'open'
            ? { ...r, status: 'answered' }
            : r,
        ),
      };
    }

    case 'reply/add': {
      if (state.replies.some((r) => r.id === action.id)) return state;
      if (!state.stories.some((s) => s.id === action.storyId)) return state;
      return {
        ...state,
        replies: [
          ...state.replies,
          { id: action.id, storyId: action.storyId, authorId: action.authorId, text: action.text, createdAt: action.at },
        ],
      };
    }

    case 'meaning/agree': {
      const meaning = state.meanings.find((m) => m.id === action.meaningId);
      if (!meaning || meaning.storyId !== action.storyId) return state;
      return updateStory(state, action.storyId, (s) => ({
        ...s,
        agreedMeaningId: action.meaningId,
        agreedBy: action.by,
        agreedAt: action.at,
      }));
    }

    case 'meaning/unagree':
      return updateStory(state, action.storyId, (s) =>
        s.agreedMeaningId === null ? s : { ...s, agreedMeaningId: null, agreedBy: null, agreedAt: null },
      );

    case 'attempt/add': {
      if (state.attempts.some((a) => a.id === action.id)) return state;
      if (!state.stories.some((s) => s.id === action.storyId)) return state;
      const score = Math.max(0, Math.min(100, Math.round(action.score)));
      return {
        ...state,
        attempts: [
          ...state.attempts,
          { id: action.id, storyId: action.storyId, personId: action.personId, score, createdAt: action.at },
        ],
      };
    }

    default: {
      const unknownAction: never = action;
      void unknownAction;
      return state;
    }
  }
}
