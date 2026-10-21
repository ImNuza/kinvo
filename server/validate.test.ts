import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ACTION_TYPES, LIMITS, parseAction } from '../src/shared/index.ts';
import type { Action } from '../src/shared/index.ts';

const AT = '2026-09-13T21:05:00+08:00';

const GOOD: Record<Action['type'], Action> = {
  'story/create': {
    type: 'story/create', id: 'story-1', title: "Ah Ma's swing story", note: 'Note', place: 'Toa Payoh', occasion: 'Sunday lunch',
    date: '2026-09-13', durationSec: 12, status: 'saved', by: 'meixin', at: AT,
  },
  'story/update': { type: 'story/update', id: 'story-1', title: 'New', note: '', status: 'draft', term: 'chhiu-chhian-kha', at: AT },
  'story/delete': { type: 'story/delete', id: 'story-1' },
  'person/add': { type: 'person/add', id: 'auntie-lin', name: 'Auntie Lin', relationship: 'aunt', by: 'meixin', at: AT },
  'request/send': { type: 'request/send', id: 'req-1', storyId: 'story-1', fromId: 'meixin', toId: 'auntie-lin', at: AT },
  'meaning/add': {
    type: 'meaning/add', id: 'm-1', storyId: 'story-1', authorId: 'mum', text: 'Under the swing', context: 'Kampong',
    suggestedReply: { phrase: 'Hit ê chhiu-chhian taⁿ-á iáu tī--bô?', english: 'Is that swing still there now?' }, at: AT,
  },
  'reply/add': { type: 'reply/add', id: 'rp-1', storyId: 'story-1', authorId: 'mum', text: 'Hello', at: AT },
  'meaning/agree': { type: 'meaning/agree', storyId: 'story-1', meaningId: 'm-1', by: 'mum', at: AT },
  'meaning/unagree': { type: 'meaning/unagree', storyId: 'story-1' },
  'attempt/add': { type: 'attempt/add', id: 'a-1', storyId: 'story-1', personId: 'mum', score: 87, at: AT },
};

function bad(action: Action, patch: Record<string, unknown>): unknown {
  return { ...action, ...patch };
}

describe('parseAction accepts good input', () => {
  it('covers every action type', () => {
    assert.deepEqual(Object.keys(GOOD).sort(), [...ACTION_TYPES].sort());
  });

  for (const type of ACTION_TYPES) {
    it(`accepts ${type}`, () => {
      assert.deepEqual(parseAction(GOOD[type]), GOOD[type]);
    });
  }

  it('accepts a meaning without a suggested reply', () => {
    const action = { ...GOOD['meaning/add'], suggestedReply: null };
    assert.deepEqual(parseAction(action), action);
  });

  it('accepts a story/update with only the required fields', () => {
    const action = { type: 'story/update', id: 'story-1', at: AT };
    assert.deepEqual(parseAction(action), action);
  });

  it('accepts empty optional text', () => {
    const action = { ...GOOD['story/create'], note: '', place: '', occasion: '' };
    assert.deepEqual(parseAction(action), action);
  });

  it('accepts text at the length limit', () => {
    const action = { ...GOOD['reply/add'], text: 'a'.repeat(LIMITS.text) };
    assert.notEqual(parseAction(action), null);
  });
});

describe('parseAction rejects bad input', () => {
  it('rejects values that are not action objects', () => {
    for (const value of [null, undefined, 42, 'story/delete', true, [], [GOOD['story/delete']]]) {
      assert.equal(parseAction(value), null);
    }
  });

  it('rejects a missing, wrong or unknown type', () => {
    assert.equal(parseAction({ id: 'story-1' }), null);
    assert.equal(parseAction({ type: 5, id: 'story-1' }), null);
    assert.equal(parseAction({ type: 'story/explode', id: 'story-1' }), null);
    assert.equal(parseAction({ type: '', id: 'story-1' }), null);
    assert.equal(parseAction({ type: '__proto__' }), null);
  });

  it('rejects bad ids', () => {
    const badIds: unknown[] = ['', 'has space', 'semi;colon', '../etc', 'a'.repeat(LIMITS.id + 1), 'café', 42, null, undefined, {}];
    for (const value of badIds) {
      assert.equal(parseAction(bad(GOOD['story/delete'], { id: value })), null, `id ${String(value)}`);
      assert.equal(parseAction(bad(GOOD['story/create'], { id: value })), null);
      assert.equal(parseAction(bad(GOOD['meaning/agree'], { meaningId: value })), null);
      assert.equal(parseAction(bad(GOOD['request/send'], { toId: value })), null);
      assert.equal(parseAction(bad(GOOD['attempt/add'], { personId: value })), null);
    }
  });

  it('accepts an id of exactly 64 characters', () => {
    assert.notEqual(parseAction(bad(GOOD['story/delete'], { id: 'a'.repeat(LIMITS.id) })), null);
  });

  it('rejects over-long text', () => {
    assert.equal(parseAction(bad(GOOD['reply/add'], { text: 'a'.repeat(LIMITS.text + 1) })), null);
    assert.equal(parseAction(bad(GOOD['meaning/add'], { context: 'a'.repeat(LIMITS.text + 1) })), null);
    assert.equal(parseAction(bad(GOOD['story/create'], { title: 'a'.repeat(LIMITS.title + 1) })), null);
    assert.equal(parseAction(bad(GOOD['story/create'], { place: 'a'.repeat(LIMITS.name + 1) })), null);
    assert.equal(parseAction(bad(GOOD['person/add'], { name: 'a'.repeat(LIMITS.name + 1) })), null);
    assert.equal(parseAction(bad(GOOD['story/update'], { term: 'a'.repeat(LIMITS.name + 1) })), null);
    const reply = { phrase: 'a'.repeat(LIMITS.text + 1), english: 'ok' };
    assert.equal(parseAction(bad(GOOD['meaning/add'], { suggestedReply: reply })), null);
  });

  it('rejects empty required text', () => {
    assert.equal(parseAction(bad(GOOD['reply/add'], { text: '   ' })), null);
    assert.equal(parseAction(bad(GOOD['story/create'], { title: '' })), null);
    assert.equal(parseAction(bad(GOOD['person/add'], { name: '' })), null);
  });

  it('rejects wrong types', () => {
    assert.equal(parseAction(bad(GOOD['reply/add'], { text: 123 })), null);
    assert.equal(parseAction(bad(GOOD['reply/add'], { text: ['a'] })), null);
    assert.equal(parseAction(bad(GOOD['story/create'], { durationSec: '12' })), null);
    assert.equal(parseAction(bad(GOOD['story/create'], { durationSec: -1 })), null);
    assert.equal(parseAction(bad(GOOD['story/create'], { durationSec: Number.NaN })), null);
    assert.equal(parseAction(bad(GOOD['story/create'], { durationSec: LIMITS.durationSec + 1 })), null);
    assert.equal(parseAction(bad(GOOD['story/create'], { status: 'published' })), null);
    assert.equal(parseAction(bad(GOOD['story/update'], { status: 'published' })), null);
    assert.equal(parseAction(bad(GOOD['person/add'], { relationship: 'boss' })), null);
    assert.equal(parseAction(bad(GOOD['meaning/add'], { suggestedReply: 'hi' })), null);
    assert.equal(parseAction(bad(GOOD['meaning/add'], { suggestedReply: { phrase: 'x' } })), null);
    assert.equal(parseAction(bad(GOOD['meaning/add'], { suggestedReply: undefined })), null);
  });

  it('rejects scores outside 0 to 100', () => {
    assert.equal(parseAction(bad(GOOD['attempt/add'], { score: -1 })), null);
    assert.equal(parseAction(bad(GOOD['attempt/add'], { score: 101 })), null);
    assert.equal(parseAction(bad(GOOD['attempt/add'], { score: '50' })), null);
    assert.equal(parseAction(bad(GOOD['attempt/add'], { score: Infinity })), null);
    assert.notEqual(parseAction(bad(GOOD['attempt/add'], { score: 0 })), null);
    assert.notEqual(parseAction(bad(GOOD['attempt/add'], { score: 100 })), null);
  });

  it('rejects bad dates and times', () => {
    assert.equal(parseAction(bad(GOOD['story/create'], { date: '13/09/2026' })), null);
    assert.equal(parseAction(bad(GOOD['story/create'], { date: '2026-9-13' })), null);
    assert.equal(parseAction(bad(GOOD['reply/add'], { at: 'yesterday' })), null);
    assert.equal(parseAction(bad(GOOD['reply/add'], { at: 12345 })), null);
    assert.equal(parseAction(bad(GOOD['reply/add'], { at: undefined })), null);
  });

  it('rejects a missing required field', () => {
    for (const type of ACTION_TYPES) {
      const base = GOOD[type] as Record<string, unknown>;
      for (const key of Object.keys(base)) {
        if (key === 'type') continue;
        const optionalKey = type === 'story/update' && ['title', 'note', 'status', 'term'].includes(key);
        if (optionalKey) continue;
        const copy = { ...base };
        delete copy[key];
        assert.equal(parseAction(copy), null, `${type} without ${key}`);
      }
    }
  });
});

describe('parseAction output', () => {
  it('drops extra fields', () => {
    for (const type of ACTION_TYPES) {
      const input = { ...GOOD[type], admin: true, extra: { deep: 'x' }, __proto__: { polluted: true } };
      const out = parseAction(input);
      assert.notEqual(out, null, type);
      assert.deepEqual(out, GOOD[type]);
      assert.equal('admin' in (out as object), false);
      assert.equal('extra' in (out as object), false);
    }
  });

  it('drops extra fields inside the suggested reply', () => {
    const input = { ...GOOD['meaning/add'], suggestedReply: { phrase: 'a', english: 'b', evil: 1 } };
    const out = parseAction(input);
    assert.deepEqual((out as Extract<Action, { type: 'meaning/add' }>).suggestedReply, { phrase: 'a', english: 'b' });
  });

  it('does not copy a story/update field that is undefined', () => {
    const out = parseAction({ type: 'story/update', id: 'story-1', at: AT, title: undefined });
    assert.equal(out !== null && 'title' in out, false);
  });

  it('works on JSON that came off the wire', () => {
    const wire: unknown = JSON.parse(JSON.stringify(GOOD['meaning/add']));
    assert.deepEqual(parseAction(wire), GOOD['meaning/add']);
  });
});
