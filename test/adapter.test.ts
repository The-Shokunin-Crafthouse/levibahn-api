import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { adapt } from '../lib/node-adapter.js';

test('the Node adapter flushes headers before the first body byte', async () => {
  const log: string[] = [];
  const res = {
    statusCode: 0,
    setHeader: (k: string) => log.push(`header:${k}`),
    flushHeaders: () => log.push('flushHeaders'),
    write: () => (log.push('write'), true),
    end: () => log.push('end'),
  } as unknown as ServerResponse;
  const req = Object.assign(new PassThrough(), { method: 'GET', url: '/', headers: { host: 'x' } }) as unknown as IncomingMessage;
  (req as unknown as PassThrough).end();
  const h = adapt(async () => new Response('hi', { headers: { 'x-a': '1' } }));
  await h(req, res);
  const flush = log.indexOf('flushHeaders');
  assert.ok(flush > log.indexOf('header:x-a'), 'flush comes after headers are set');
  assert.ok(flush < log.indexOf('write'), 'flush comes before the first write');
});
