// Read-only helpers over AppState. Pure functions, safe on client and server.

import type { AppState, IsoDate, Meaning, Person, Story, SuggestedReply, ThreadReply } from './types.ts';

export type StoryPill = 'draft' | 'waiting' | 'differ' | 'agreed' | 'ready';

const byTime = <T extends { createdAt: string }>(a: T, b: T) => Date.parse(a.createdAt) - Date.parse(b.createdAt);

export function personById(state: AppState, id: string | null | undefined): Person | undefined {
  return id ? state.people.find((p) => p.id === id) : undefined;
}

export function storyById(state: AppState, id: string | null | undefined): Story | undefined {
  return id ? state.stories.find((s) => s.id === id) : undefined;
}

/** Oldest first. */
export function meaningsForStory(state: AppState, storyId: string): Meaning[] {
  return state.meanings.filter((m) => m.storyId === storyId).sort(byTime);
}

/** Oldest first. */
export function repliesForStory(state: AppState, storyId: string): ThreadReply[] {
  return state.replies.filter((r) => r.storyId === storyId).sort(byTime);
}

export function agreedMeaning(state: AppState, storyId: string): Meaning | undefined {
  const story = storyById(state, storyId);
  return story?.agreedMeaningId ? state.meanings.find((m) => m.id === story.agreedMeaningId) : undefined;
}

/** True when two or more people gave a meaning and nobody marked one as agreed. */
export function meaningsDiffer(state: AppState, storyId: string): boolean {
  const story = storyById(state, storyId);
  if (!story || story.agreedMeaningId) return false;
  const authors = new Set(meaningsForStory(state, storyId).map((m) => m.authorId));
  return authors.size >= 2;
}

export function openRequestsFor(state: AppState, personId: string) {
  return state.requests.filter((r) => r.toId === personId && r.status === 'open');
}

export function storyPill(state: AppState, storyId: string): StoryPill | null {
  const story = storyById(state, storyId);
  if (!story) return null;
  if (story.status === 'draft') return 'draft';
  if (story.agreedMeaningId) return 'agreed';
  if (meaningsDiffer(state, storyId)) return 'differ';
  if (state.requests.some((r) => r.storyId === storyId && r.status === 'open')) return 'waiting';
  if (meaningsForStory(state, storyId).length > 0) return 'ready';
  return null;
}

export type Lesson = {
  storyId: string;
  storyTitle: string;
  storyDate: IsoDate;
  occasion: string;
  phrase: SuggestedReply;
  /** Who suggested the phrase. */
  suggestedBy: Person | undefined;
  agreed: Meaning | undefined;
  agreedAuthor: Person | undefined;
  pill: StoryPill | null;
};

/** One lesson per saved story that has a suggested reply. Lessons only come from recorded conversations. */
export function lessons(state: AppState): Lesson[] {
  const out: Lesson[] = [];
  for (const story of state.stories) {
    if (story.status !== 'saved') continue;
    const meanings = meaningsForStory(state, story.id);
    const agreed = agreedMeaning(state, story.id);
    const source = (agreed?.suggestedReply ? agreed : undefined) ?? meanings.find((m) => m.suggestedReply);
    if (!source?.suggestedReply) continue;
    out.push({
      storyId: story.id,
      storyTitle: story.title,
      storyDate: story.date,
      occasion: story.occasion,
      phrase: source.suggestedReply,
      suggestedBy: personById(state, source.authorId),
      agreed,
      agreedAuthor: personById(state, agreed?.authorId),
      pill: storyPill(state, story.id),
    });
  }
  return out;
}

export type CalendarDay = {
  date: IsoDate;
  hasRecording: boolean;
  hasMeaning: boolean;
  storyIds: string[];
};

/** Recording days keyed by date: history plus every story. */
export function calendarDays(state: AppState): Map<IsoDate, CalendarDay> {
  const days = new Map<IsoDate, CalendarDay>();
  for (const h of state.history) {
    days.set(h.date, { date: h.date, hasRecording: true, hasMeaning: h.hasMeaning, storyIds: [] });
  }
  for (const s of state.stories) {
    const day = days.get(s.date) ?? { date: s.date, hasRecording: true, hasMeaning: false, storyIds: [] };
    day.storyIds.push(s.id);
    if (state.meanings.some((m) => m.storyId === s.id)) day.hasMeaning = true;
    days.set(s.date, day);
  }
  return days;
}

export function addDays(date: IsoDate, delta: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * Streak = consecutive days with a meaning, ending yesterday, plus today when
 * today's story has an agreed meaning. Seed gives 4 (9 to 12 Sep), as in frames 01 and 05.
 */
export function streak(state: AppState, today: IsoDate): { count: number; days: IsoDate[] } {
  const cal = calendarDays(state);
  const days: IsoDate[] = [];
  let d = addDays(today, -1);
  while (cal.get(d)?.hasMeaning) {
    days.unshift(d);
    d = addDays(d, -1);
  }
  const todayDone = state.stories.some((s) => s.date === today && s.agreedMeaningId);
  if (todayDone) days.push(today);
  return { count: days.length, days };
}
