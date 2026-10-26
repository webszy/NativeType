import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from '../load-ts.mjs';

const { isStatusReplyPath, resolveWritingContext } = await loadTs('platforms/x.ts');

const signals = (overrides) => ({
  connected: true,
  inMenu: false,
  quoteInShell: false,
  quoteOutsideShell: false,
  reply: false,
  ...overrides,
});

test('writing context follows the active composer signals', () => {
  assert.equal(resolveWritingContext(signals({})), 'post');
  assert.equal(resolveWritingContext(signals({ reply: true })), 'reply');
  assert.equal(resolveWritingContext(signals({ quoteInShell: true })), 'quote');
  assert.equal(resolveWritingContext(signals({ quoteInShell: true, reply: true })), 'quote');
  assert.equal(resolveWritingContext(signals({ quoteOutsideShell: true })), 'quote');
  assert.equal(resolveWritingContext(signals({ quoteOutsideShell: true, reply: true })), 'unknown');
  assert.equal(resolveWritingContext(signals({ connected: false })), 'unknown');
  assert.equal(resolveWritingContext(signals({ inMenu: true })), 'unknown');
});

test('only a status permalink is treated as an inline reply path', () => {
  assert.equal(isStatusReplyPath('/someone/status/123'), true);
  assert.equal(isStatusReplyPath('/i/web/status/123'), true);
  assert.equal(isStatusReplyPath('/home'), false);
  assert.equal(isStatusReplyPath('/compose/post'), false);
  assert.equal(isStatusReplyPath('/someone/status/'), false);
});
