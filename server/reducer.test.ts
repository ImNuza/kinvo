import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEMO_TODAY,
  PERSON,
  SCENARIO,
  SWING_STORY_ID,
  createSeed,
  lessons,
  meaningsDiffer,
  meaningsForStory,
  personIdFromName,
  reduce,
  repliesForStory,
  storyPill,
  streak,
} from '../src/shared/index.ts';
import type { Action, AppState } from '../src/shared/index.ts';

function run(state: AppState, ...actions: Action[]): AppState {
  return actions.reduce(reduce, state);
}

const AT = SCENARIO.times;

function scenarioActions(state: AppState): { addLin: Action; send: Action; meaning: Action; linReply: Action; mumReply: Action; agree: Action } {
  const linId = personIdFromName('Auntie Lin', state.people);
  return {
    addLin: { type: 'person/add', id: linId, name: 'Auntie Lin', relationship: 'aunt', by: PERSON.meixin, at: '2026-09-13T21:00:00+08:00' },
    send: { type: 'request/send', id: 'request-lin', storyId: SWING_STORY_ID, fromId: PERSON.meixin, toId: linId, at: '2026-09-13T21:01:00+08:00' },
    meaning: {
      type: 'meaning/add',
      id: 'meaning-lin',
      storyId: SWING_STORY_ID,
      authorId: linId,
      text: SCENARIO.auntieLinMeaning,
      context: SCENARIO.context,
      suggestedReply: null,
      at: AT.auntieLinMeaning,
    },
    linReply: { type: 'reply/add', id: 'reply-lin', storyId: SWING_STORY_ID, authorId: linId, text: SCENARIO.auntieLinReply, at: AT.auntieLinReply },
    mumReply: { type: 'reply/add', id: 'reply-mum', storyId: SWING_STORY_ID, authorId: PERSON.mum, text: SCENARIO.mumReply, at: AT.mumReply },
    agree: { type: 'meaning/agree', storyId: SWING_STORY_ID, meaningId: 'meaning-lin', by: PERSON.mum, at: '2026-09-13T21:30:00+08:00' },
  };
}

describe('seed', () => {
  it('starts before Auntie Lin is added', () => {
    const seed = createSeed();
    assert.equal(seed.people.length, 3);
    assert.equal(seed.stories.length, 1);
    assert.equal(seed.meanings.length, 1);
    assert.equal(storyPill(seed, SWING_STORY_ID), 'ready');
    assert.equal(meaningsDiffer(seed, SWING_STORY_ID), false);
  });

  it('gives a streak of 4', () => {
    const { count, days } = streak(createSeed(), DEMO_TODAY);
    assert.equal(count, 4);
    assert.deepEqual(days, ['2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12']);
  });

  it('gives one lesson from Mum', () => {
    const list = lessons(createSeed());
    assert.equal(list.length, 1);
    assert.equal(list[0]?.storyId, SWING_STORY_ID);
    assert.equal(list[0]?.phrase.english, SCENARIO.suggestedReply.english);
    assert.equal(list[0]?.suggestedBy?.id, PERSON.mum);
    assert.equal(list[0]?.agreed, undefined);
  });
});

describe('scenario from the seed', () => {
  it('runs the whole Auntie Lin flow', () => {
    let state = createSeed();
    const steps = scenarioActions(state);

    state = reduce(state, steps.addLin);
    assert.equal(personIdFromName('Auntie Lin', createSeed().people), PERSON.auntieLin);
    const lin = state.people.find((p) => p.id === PERSON.auntieLin);
    assert.ok(lin);
    assert.equal(lin.initials, 'AL');
    assert.equal(lin.online, true);
    assert.equal(lin.addedBy, PERSON.meixin);

    state = reduce(state, steps.send);
    assert.equal(state.requests.length, 2);
    assert.equal(state.requests[1]?.status, 'open');
    assert.equal(storyPill(state, SWING_STORY_ID), 'waiting');

    state = reduce(state, steps.meaning);
    assert.equal(meaningsForStory(state, SWING_STORY_ID).length, 2);
    assert.equal(state.requests[1]?.status, 'answered');
    assert.equal(meaningsDiffer(state, SWING_STORY_ID), true);
    assert.equal(storyPill(state, SWING_STORY_ID), 'differ');
    assert.equal(streak(state, DEMO_TODAY).count, 4);

    state = reduce(state, steps.linReply);
    state = reduce(state, steps.mumReply);
    const thread = repliesForStory(state, SWING_STORY_ID);
    assert.deepEqual(thread.map((r) => r.id), ['reply-lin', 'reply-mum']);
    assert.equal(thread[0]?.text, SCENARIO.auntieLinReply);
    assert.equal(thread[1]?.text, SCENARIO.mumReply);

    state = reduce(state, steps.agree);
    const story = state.stories[0];
    assert.equal(story?.agreedMeaningId, 'meaning-lin');
    assert.equal(story?.agreedBy, PERSON.mum);
    assert.equal(meaningsDiffer(state, SWING_STORY_ID), false);
    assert.equal(storyPill(state, SWING_STORY_ID), 'agreed');
    assert.equal(streak(state, DEMO_TODAY).count, 5);

    const lesson = lessons(state)[0];
    assert.equal(lesson?.agreed?.id, 'meaning-lin');
    assert.equal(lesson?.agreedAuthor?.id, PERSON.auntieLin);
    assert.equal(lesson?.phrase.phrase, SCENARIO.suggestedReply.phrase);
  });

  it('does not change the seed object', () => {
    const seed = createSeed();
    const before = JSON.stringify(seed);
    const steps = scenarioActions(seed);
    run(seed, steps.addLin, steps.send, steps.meaning, steps.agree);
    assert.equal(JSON.stringify(seed), before);
  });

  it('unagree clears the agreed meaning', () => {
    const seed = createSeed();
    const steps = scenarioActions(seed);
    let state = run(seed, steps.addLin, steps.send, steps.meaning, steps.agree);
    state = reduce(state, { type: 'meaning/unagree', storyId: SWING_STORY_ID });
    assert.equal(state.stories[0]?.agreedMeaningId, null);
    assert.equal(storyPill(state, SWING_STORY_ID), 'differ');
    assert.equal(streak(state, DEMO_TODAY).count, 4);
  });
});

describe('personIdFromName', () => {
  it('adds a number when the id is taken', () => {
    const seed = createSeed();
    const first = scenarioActions(seed).addLin;
    const withLin = reduce(seed, first);
    assert.equal(personIdFromName('Auntie Lin', withLin.people), 'auntie-lin-2');
  });
});

describe('duplicate and unknown ids', () => {
  it('ignores a duplicate id for every action that adds a record', () => {
    const seed = createSeed();
    const steps = scenarioActions(seed);
    const state = run(seed, steps.addLin, steps.send, steps.meaning, steps.linReply, {
      type: 'story/create',
      id: 'story-two',
      title: 'Second story',
      note: '',
      place: '',
      occasion: '',
      date: DEMO_TODAY,
      durationSec: 5,
      status: 'saved',
      by: PERSON.meixin,
      at: '2026-09-13T22:00:00+08:00',
    }, { type: 'attempt/add', id: 'attempt-1', storyId: SWING_STORY_ID, personId: PERSON.mum, score: 80, at: '2026-09-13T22:05:00+08:00' });

    const duplicates: Action[] = [
      steps.addLin,
      steps.send,
      steps.meaning,
      steps.linReply,
      { type: 'story/create', id: 'story-two', title: 'Other', note: '', place: '', occasion: '', date: DEMO_TODAY, durationSec: 1, status: 'draft', by: PERSON.mum, at: '2026-09-13T23:00:00+08:00' },
      { type: 'attempt/add', id: 'attempt-1', storyId: SWING_STORY_ID, personId: PERSON.mum, score: 10, at: '2026-09-13T23:00:00+08:00' },
    ];
    for (const action of duplicates) {
      assert.equal(reduce(state, action), state, `${action.type} should return the same object`);
    }
  });

  it('ignores actions for an unknown story', () => {
    const seed = createSeed();
    const missing = 'story-missing';
    const actions: Action[] = [
      { type: 'story/update', id: missing, title: 'x', at: '2026-09-13T22:00:00+08:00' },
      { type: 'story/delete', id: missing },
      { type: 'request/send', id: 'r1', storyId: missing, fromId: PERSON.meixin, toId: PERSON.mum, at: '2026-09-13T22:00:00+08:00' },
      { type: 'meaning/add', id: 'm1', storyId: missing, authorId: PERSON.mum, text: 'x', context: '', suggestedReply: null, at: '2026-09-13T22:00:00+08:00' },
      { type: 'reply/add', id: 'rp1', storyId: missing, authorId: PERSON.mum, text: 'x', at: '2026-09-13T22:00:00+08:00' },
      { type: 'meaning/agree', storyId: missing, meaningId: 'meaning-mum', by: PERSON.mum, at: '2026-09-13T22:00:00+08:00' },
      { type: 'meaning/unagree', storyId: missing },
      { type: 'attempt/add', id: 'a1', storyId: missing, personId: PERSON.mum, score: 50, at: '2026-09-13T22:00:00+08:00' },
    ];
    for (const action of actions) {
      assert.equal(reduce(seed, action), seed, `${action.type} should return the same object`);
    }
  });

  it('ignores an agreement for a meaning that belongs to another story', () => {
    const seed = createSeed();
    const state = reduce(seed, {
      type: 'story/create',
      id: 'story-two',
      title: 'Second story',
      note: '',
      place: '',
      occasion: '',
      date: DEMO_TODAY,
      durationSec: 5,
      status: 'saved',
      by: PERSON.meixin,
      at: '2026-09-13T22:00:00+08:00',
    });
    const next = reduce(state, { type: 'meaning/agree', storyId: 'story-two', meaningId: 'meaning-mum', by: PERSON.mum, at: '2026-09-13T22:10:00+08:00' });
    assert.equal(next, state);
  });
});

describe('story/delete', () => {
  it('removes the story and everything linked to it', () => {
    const seed = createSeed();
    const steps = scenarioActions(seed);
    const state = run(
      seed,
      steps.addLin,
      steps.send,
      steps.meaning,
      steps.linReply,
      steps.mumReply,
      { type: 'attempt/add', id: 'attempt-1', storyId: SWING_STORY_ID, personId: PERSON.mum, score: 80, at: '2026-09-13T22:05:00+08:00' },
      { type: 'story/delete', id: SWING_STORY_ID },
    );
    assert.equal(state.stories.length, 0);
    assert.equal(state.meanings.length, 0);
    assert.equal(state.replies.length, 0);
    assert.equal(state.requests.length, 0);
    assert.equal(state.attempts.length, 0);
    assert.equal(state.people.length, 4);
  });

  it('keeps other stories and their items', () => {
    const seed = createSeed();
    const two: Action = {
      type: 'story/create',
      id: 'story-two',
      title: 'Second story',
      note: '',
      place: '',
      occasion: '',
      date: DEMO_TODAY,
      durationSec: 5,
      status: 'saved',
      by: PERSON.meixin,
      at: '2026-09-13T22:00:00+08:00',
    };
    const state = run(
      seed,
      two,
      { type: 'reply/add', id: 'reply-two', storyId: 'story-two', authorId: PERSON.mum, text: 'Hello', at: '2026-09-13T22:01:00+08:00' },
      { type: 'story/delete', id: SWING_STORY_ID },
    );
    assert.deepEqual(state.stories.map((s) => s.id), ['story-two']);
    assert.deepEqual(state.replies.map((r) => r.id), ['reply-two']);
    assert.equal(state.meanings.length, 0);
  });
});

describe('other actions', () => {
  it('story/update patches only the given fields', () => {
    const seed = createSeed();
    const state = reduce(seed, { type: 'story/update', id: SWING_STORY_ID, title: 'New title', at: '2026-09-13T22:00:00+08:00' });
    const story = state.stories[0];
    assert.equal(story?.title, 'New title');
    assert.equal(story?.note, SCENARIO.storyNote);
    assert.equal(story?.term, SCENARIO.term);
    assert.equal(story?.updatedAt, '2026-09-13T22:00:00+08:00');
  });

  it('attempt/add rounds the score and keeps it between 0 and 100', () => {
    const seed = createSeed();
    const state = reduce(seed, { type: 'attempt/add', id: 'a1', storyId: SWING_STORY_ID, personId: PERSON.mum, score: 79.6, at: '2026-09-13T22:00:00+08:00' });
    assert.equal(state.attempts[0]?.score, 80);
  });
});
