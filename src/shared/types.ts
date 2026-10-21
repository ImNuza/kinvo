// Shared data model. Imported by the web client and by the Node server.
// Keep this file erasable TypeScript only: no enums, no namespaces, no parameter properties.

export type PersonId = string;
export type StoryId = string;
export type MeaningId = string;

/** ISO 8601 timestamp with offset, e.g. "2026-09-13T19:40:00+08:00". */
export type IsoTime = string;
/** Calendar day, e.g. "2026-09-13". */
export type IsoDate = string;

export type Relationship = 'self' | 'grandma' | 'mum' | 'dad' | 'aunt' | 'uncle' | 'cousin' | 'other';

export type Person = {
  id: PersonId;
  name: string;
  /** Two letters shown in the Avatar, e.g. "AL". */
  initials: string;
  relationship: Relationship;
  online: boolean;
  addedAt: IsoTime;
  addedBy: PersonId | null;
};

export type StoryStatus = 'draft' | 'saved';

export type Story = {
  id: StoryId;
  title: string;
  /** "What happened (optional)" on 04. */
  note: string;
  /** e.g. "Toa Payoh". */
  place: string;
  /** e.g. "Sunday lunch". */
  occasion: string;
  date: IsoDate;
  durationSec: number;
  status: StoryStatus;
  createdBy: PersonId;
  createdAt: IsoTime;
  updatedAt: IsoTime;
  /** The Hokkien term the family explains, e.g. "chhiu-chhian-kha". Null until someone sets it. */
  term: string | null;
  agreedMeaningId: MeaningId | null;
  agreedBy: PersonId | null;
  agreedAt: IsoTime | null;
};

export type SuggestedReply = {
  /** Hokkien (POJ), e.g. "Hit ê chhiu-chhian taⁿ-á iáu tī--bô?" */
  phrase: string;
  /** English gloss, e.g. "Is that swing still there now?" */
  english: string;
};

export type Meaning = {
  id: MeaningId;
  storyId: StoryId;
  authorId: PersonId;
  text: string;
  context: string;
  suggestedReply: SuggestedReply | null;
  createdAt: IsoTime;
};

export type ThreadReply = {
  id: string;
  storyId: StoryId;
  authorId: PersonId;
  text: string;
  createdAt: IsoTime;
};

export type HelpRequest = {
  id: string;
  storyId: StoryId;
  fromId: PersonId;
  toId: PersonId;
  /** What the sender asks for. Only "meaning" in Iter2. */
  ask: 'meaning';
  status: 'open' | 'answered';
  createdAt: IsoTime;
};

export type PractiseAttempt = {
  id: string;
  storyId: StoryId;
  personId: PersonId;
  /** 0 to 100. The audio itself never leaves the phone. */
  score: number;
  createdAt: IsoTime;
};

/** Recordings from before the scenario. Read-only, only used to fill the Archive calendar. */
export type HistoryDay = {
  date: IsoDate;
  hasMeaning: boolean;
};

export type AppState = {
  schema: 1;
  people: Person[];
  stories: Story[];
  meanings: Meaning[];
  replies: ThreadReply[];
  requests: HelpRequest[];
  attempts: PractiseAttempt[];
  history: HistoryDay[];
};
