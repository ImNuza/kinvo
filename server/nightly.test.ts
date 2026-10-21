import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { nextResetAt, scheduleNightly } from './nightly.ts';

const sgt = (iso: string) => Date.parse(`${iso}+08:00`);

describe('nextResetAt', () => {
  it('picks 04:00 the same day when it is earlier than 04:00 in Singapore', () => {
    assert.equal(nextResetAt(sgt('2026-09-13T01:30:00')), sgt('2026-09-13T04:00:00'));
    assert.equal(nextResetAt(sgt('2026-09-13T00:00:00')), sgt('2026-09-13T04:00:00'));
    assert.equal(nextResetAt(sgt('2026-09-13T03:59:59.999')), sgt('2026-09-13T04:00:00'));
  });

  it('picks 04:00 the next day when it is exactly 04:00 or later', () => {
    assert.equal(nextResetAt(sgt('2026-09-13T04:00:00')), sgt('2026-09-14T04:00:00'));
    assert.equal(nextResetAt(sgt('2026-09-13T04:00:00.001')), sgt('2026-09-14T04:00:00'));
    assert.equal(nextResetAt(sgt('2026-09-13T12:00:00')), sgt('2026-09-14T04:00:00'));
    assert.equal(nextResetAt(sgt('2026-09-13T23:59:59')), sgt('2026-09-14T04:00:00'));
  });

  it('uses the Singapore date, not the UTC date', () => {
    // 20:00 UTC on 12 Sep is 04:00 SGT on 13 Sep.
    assert.equal(nextResetAt(Date.parse('2026-09-12T19:59:59Z')), Date.parse('2026-09-12T20:00:00Z'));
    assert.equal(nextResetAt(Date.parse('2026-09-12T20:00:00Z')), Date.parse('2026-09-13T20:00:00Z'));
    assert.equal(nextResetAt(Date.parse('2026-09-12T23:00:00Z')), Date.parse('2026-09-13T20:00:00Z'));
  });

  it('crosses month and year ends', () => {
    assert.equal(nextResetAt(sgt('2026-09-30T10:00:00')), sgt('2026-10-01T04:00:00'));
    assert.equal(nextResetAt(sgt('2026-12-31T10:00:00')), sgt('2027-01-01T04:00:00'));
    assert.equal(nextResetAt(sgt('2028-02-28T10:00:00')), sgt('2028-02-29T04:00:00'));
  });

  it('is always in the future and within 24 hours', () => {
    const start = Date.parse('2026-01-01T00:00:00Z');
    for (let i = 0; i < 500; i += 1) {
      const t = start + i * 7_654_321;
      const next = nextResetAt(t);
      assert.ok(next > t);
      assert.ok(next - t <= 24 * 60 * 60 * 1000);
      assert.equal((next + 8 * 60 * 60 * 1000) % (24 * 60 * 60 * 1000), 4 * 60 * 60 * 1000);
    }
  });
});

describe('scheduleNightly', () => {
  it('can be stopped before it runs', () => {
    let runs = 0;
    const stop = scheduleNightly({ now: () => Date.now(), run: () => { runs += 1; } });
    stop();
    assert.equal(runs, 0);
  });
});
