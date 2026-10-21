// Every change to AppState is one of these actions. The client creates ids and
// timestamps, so the reducer stays pure and the server can replay the same action.

import type {
  IsoDate,
  IsoTime,
  MeaningId,
  PersonId,
  Relationship,
  StoryId,
  StoryStatus,
  SuggestedReply,
} from './types.ts';

export type Action =
  | {
      type: 'story/create';
      id: StoryId;
      title: string;
      note: string;
      place: string;
      occasion: string;
      date: IsoDate;
      durationSec: number;
      status: StoryStatus;
      by: PersonId;
      at: IsoTime;
    }
  | {
      type: 'story/update';
      id: StoryId;
      title?: string;
      note?: string;
      status?: StoryStatus;
      term?: string;
      at: IsoTime;
    }
  | { type: 'story/delete'; id: StoryId }
  | {
      type: 'person/add';
      id: PersonId;
      name: string;
      relationship: Relationship;
      by: PersonId;
      at: IsoTime;
    }
  | {
      type: 'request/send';
      id: string;
      storyId: StoryId;
      fromId: PersonId;
      toId: PersonId;
      at: IsoTime;
    }
  | {
      type: 'meaning/add';
      id: MeaningId;
      storyId: StoryId;
      authorId: PersonId;
      text: string;
      context: string;
      suggestedReply: SuggestedReply | null;
      at: IsoTime;
    }
  | {
      type: 'reply/add';
      id: string;
      storyId: StoryId;
      authorId: PersonId;
      text: string;
      at: IsoTime;
    }
  | { type: 'meaning/agree'; storyId: StoryId; meaningId: MeaningId; by: PersonId; at: IsoTime }
  | { type: 'meaning/unagree'; storyId: StoryId }
  | { type: 'attempt/add'; id: string; storyId: StoryId; personId: PersonId; score: number; at: IsoTime };

export type ActionType = Action['type'];

export const ACTION_TYPES: readonly ActionType[] = [
  'story/create',
  'story/update',
  'story/delete',
  'person/add',
  'request/send',
  'meaning/add',
  'reply/add',
  'meaning/agree',
  'meaning/unagree',
  'attempt/add',
];
