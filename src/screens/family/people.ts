import type { Person, Relationship } from '../../shared/index.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

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
