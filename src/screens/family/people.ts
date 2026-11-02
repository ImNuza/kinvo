import {
  formatDuration,
  meaningsForStory,
  personById,
  type AppState,
  type Person,
  type Relationship,
  type Story,
} from '../../shared/index.ts';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** True when the person joined the family space in the last 24 hours. */
export function isJustAdded(person: Person, now: number = Date.now()): boolean {
  const added = Date.parse(person.addedAt);
  return Number.isFinite(added) && now - added >= 0 && now - added < DAY_MS;
}

/** Status line under a member: "Just added", "Online" or "Offline". */
export function statusText(person: Person, now?: number): string {
  if (isJustAdded(person, now)) return 'Just added';
  return person.online ? 'Online' : 'Offline';
}

/** "2h ago", "3d ago". Under an hour is "just now". */
function agoText(iso: string, now: number): string {
  const elapsed = now - Date.parse(iso);
  if (!Number.isFinite(elapsed) || elapsed < HOUR_MS) return 'just now';
  if (elapsed < DAY_MS) return `${Math.floor(elapsed / HOUR_MS)}h ago`;
  return `${Math.floor(elapsed / DAY_MS)}d ago`;
}

/** Status line in the 06 member list: "Just added · tap to share a story", "Online now", "Last online 2h ago". */
export function listStatusText(person: Person, now: number = Date.now()): string {
  if (isJustAdded(person, now)) return 'Just added · tap to share a story';
  if (person.online) return 'Online now';
  return person.lastSeenAt ? `Last online ${agoText(person.lastSeenAt, now)}` : 'Offline';
}

/** "Mum added a meaning", "2 meanings" or "No meanings yet". */
export function meaningSummary(state: AppState, storyId: string): string {
  const meanings = meaningsForStory(state, storyId);
  if (meanings.length === 0) return 'No meanings yet';
  if (meanings.length === 1) {
    const author = personById(state, meanings[0]!.authorId)?.name ?? 'Someone';
    return `${author} added a meaning`;
  }
  return `${meanings.length} meanings`;
}

/** A story with no audio is a photo story. */
export function isPhotoStory(story: Story): boolean {
  return story.durationSec === 0;
}

/** "Toa Payoh · 0:12 · Mum added a meaning". Empty parts are left out. */
export function storyDetail(state: AppState, story: Story): string {
  const parts = [story.place];
  if (!isPhotoStory(story)) parts.push(formatDuration(story.durationSec));
  if (meaningsForStory(state, story.id).length > 0) parts.push(meaningSummary(state, story.id));
  return parts.filter(Boolean).join(' · ');
}

export type Pronouns = { subject: 'She' | 'He' | 'They'; object: 'her' | 'him' | 'them' };

/** She for mum, aunt and grandma. He for dad and uncle. They for everyone else. */
export function pronounsFor(relationship: Relationship | null): Pronouns {
  if (relationship === 'mum' || relationship === 'aunt' || relationship === 'grandma') {
    return { subject: 'She', object: 'her' };
  }
  if (relationship === 'dad' || relationship === 'uncle') {
    return { subject: 'He', object: 'him' };
  }
  return { subject: 'They', object: 'them' };
}

/** Newest first. */
export function newestFirst<T extends { createdAt: string }>(items: readonly T[]): T[] {
  return items.slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
