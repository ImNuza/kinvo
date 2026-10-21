import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRateLimiter } from './rateLimit.ts';

describe('createRateLimiter', () => {
  it('allows max requests per window for each client', () => {
    let clock = 0;
    const limiter = createRateLimiter({ max: 2, windowMs: 1000, now: () => clock });
    assert.equal(limiter.allow('a'), true);
    assert.equal(limiter.allow('a'), true);
    assert.equal(limiter.allow('a'), false);
    assert.equal(limiter.allow('b'), true);
    clock = 1000;
    assert.equal(limiter.allow('a'), true);
  });

  it('keeps memory bounded when many clients appear', () => {
    let clock = 0;
    const limiter = createRateLimiter({ max: 5, windowMs: 60_000, now: () => clock, maxClients: 100 });
    for (let i = 0; i < 10_000; i += 1) {
      clock += 1;
      limiter.allow(`client-${i}`);
      assert.ok(limiter.size() <= 100);
    }
  });

  it('drops expired entries first', () => {
    let clock = 0;
    const limiter = createRateLimiter({ max: 1, windowMs: 1000, now: () => clock, maxClients: 3 });
    limiter.allow('a');
    limiter.allow('b');
    clock = 500;
    limiter.allow('c');
    clock = 1000;
    limiter.allow('d');
    assert.equal(limiter.size(), 2);
    assert.equal(limiter.allow('c'), false);
  });
});
