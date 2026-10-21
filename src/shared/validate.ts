// Turns untrusted JSON into an Action, or null. The server must call this on every POST body.

import type { Action } from './actions.ts';
import type { Relationship, StoryStatus, SuggestedReply } from './types.ts';

export const LIMITS = {
  id: 64,
  name: 40,
  title: 80,
  text: 1000,
  durationSec: 60 * 60,
} as const;

const RELATIONSHIPS: readonly Relationship[] = ['self', 'grandma', 'mum', 'dad', 'aunt', 'uncle', 'cousin', 'other'];
const STATUSES: readonly StoryStatus[] = ['draft', 'saved'];

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
function str(v: unknown, max: number, allowEmpty = false): v is string {
  return typeof v === 'string' && v.length <= max && (allowEmpty || v.trim().length > 0);
}
function id(v: unknown): v is string {
  return typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v);
}
function time(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));
}
function date(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function num(v: unknown, min: number, max: number): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
}
function optional<T>(v: unknown, check: (x: unknown) => x is T): boolean {
  return v === undefined || check(v);
}
function reply(v: unknown): v is SuggestedReply | null {
  if (v === null) return true;
  return isObj(v) && str(v.phrase, LIMITS.text) && str(v.english, LIMITS.text, true);
}

export function parseAction(input: unknown): Action | null {
  if (!isObj(input) || typeof input.type !== 'string') return null;
  const a = input;
  switch (a.type) {
    case 'story/create':
      if (
        id(a.id) && str(a.title, LIMITS.title) && str(a.note, LIMITS.text, true) && str(a.place, LIMITS.name, true) &&
        str(a.occasion, LIMITS.name, true) && date(a.date) && num(a.durationSec, 0, LIMITS.durationSec) &&
        STATUSES.includes(a.status as StoryStatus) && id(a.by) && time(a.at)
      ) {
        return {
          type: a.type, id: a.id, title: a.title, note: a.note, place: a.place, occasion: a.occasion,
          date: a.date, durationSec: a.durationSec, status: a.status as StoryStatus, by: a.by, at: a.at,
        };
      }
      return null;
    case 'story/update':
      if (
        id(a.id) && time(a.at) &&
        optional(a.title, (x): x is string => str(x, LIMITS.title)) &&
        optional(a.note, (x): x is string => str(x, LIMITS.text, true)) &&
        optional(a.term, (x): x is string => str(x, LIMITS.name)) &&
        (a.status === undefined || STATUSES.includes(a.status as StoryStatus))
      ) {
        const out: Extract<Action, { type: 'story/update' }> = { type: a.type, id: a.id, at: a.at };
        if (typeof a.title === 'string') out.title = a.title;
        if (typeof a.note === 'string') out.note = a.note;
        if (typeof a.term === 'string') out.term = a.term;
        if (a.status !== undefined) out.status = a.status as StoryStatus;
        return out;
      }
      return null;
    case 'story/delete':
      return id(a.id) ? { type: a.type, id: a.id } : null;
    case 'person/add':
      if (id(a.id) && str(a.name, LIMITS.name) && RELATIONSHIPS.includes(a.relationship as Relationship) && id(a.by) && time(a.at)) {
        return { type: a.type, id: a.id, name: a.name, relationship: a.relationship as Relationship, by: a.by, at: a.at };
      }
      return null;
    case 'request/send':
      if (id(a.id) && id(a.storyId) && id(a.fromId) && id(a.toId) && time(a.at)) {
        return { type: a.type, id: a.id, storyId: a.storyId, fromId: a.fromId, toId: a.toId, at: a.at };
      }
      return null;
    case 'meaning/add':
      if (
        id(a.id) && id(a.storyId) && id(a.authorId) && str(a.text, LIMITS.text) && str(a.context, LIMITS.text, true) &&
        reply(a.suggestedReply) && time(a.at)
      ) {
        const sr = a.suggestedReply;
        return {
          type: a.type, id: a.id, storyId: a.storyId, authorId: a.authorId, text: a.text, context: a.context,
          suggestedReply: sr === null ? null : { phrase: sr.phrase, english: sr.english }, at: a.at,
        };
      }
      return null;
    case 'reply/add':
      if (id(a.id) && id(a.storyId) && id(a.authorId) && str(a.text, LIMITS.text) && time(a.at)) {
        return { type: a.type, id: a.id, storyId: a.storyId, authorId: a.authorId, text: a.text, at: a.at };
      }
      return null;
    case 'meaning/agree':
      if (id(a.storyId) && id(a.meaningId) && id(a.by) && time(a.at)) {
        return { type: a.type, storyId: a.storyId, meaningId: a.meaningId, by: a.by, at: a.at };
      }
      return null;
    case 'meaning/unagree':
      return id(a.storyId) ? { type: a.type, storyId: a.storyId } : null;
    case 'attempt/add':
      if (id(a.id) && id(a.storyId) && id(a.personId) && num(a.score, 0, 100) && time(a.at)) {
        return { type: a.type, id: a.id, storyId: a.storyId, personId: a.personId, score: a.score, at: a.at };
      }
      return null;
    default:
      return null;
  }
}
