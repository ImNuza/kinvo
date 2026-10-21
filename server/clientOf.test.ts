import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { test } from 'node:test';
import { clientOf } from './app.ts';

function req(remoteAddress: string, headers: Record<string, string>): IncomingMessage {
  return { socket: { remoteAddress }, headers } as unknown as IncomingMessage;
}

test('clientOf prefers Cf-Connecting-IP behind the local proxy', () => {
  assert.equal(clientOf(req('127.0.0.1', { 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '127.0.0.1' })), '203.0.113.7');
});

test('clientOf falls back to the first X-Forwarded-For value', () => {
  assert.equal(clientOf(req('127.0.0.1', { 'x-forwarded-for': '198.51.100.2, 127.0.0.1' })), '198.51.100.2');
});

test('clientOf ignores headers from a non-local peer', () => {
  assert.equal(clientOf(req('192.0.2.9', { 'cf-connecting-ip': '203.0.113.7' })), '192.0.2.9');
});
