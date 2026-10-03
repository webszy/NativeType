import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from '../load-ts.mjs';

const { defaultLanguagePair, isTranslatableInput } = await loadTs('languages/config.ts');

test('the only configured pair is Chinese to English', () => {
  assert.deepEqual(defaultLanguagePair, { source: 'zh', target: 'en' });
});

test('Han text is eligible only for the Chinese to English pair', () => {
  assert.equal(isTranslatableInput('你好', defaultLanguagePair), true);
  assert.equal(isTranslatableInput('Hello', defaultLanguagePair), false);
  assert.equal(isTranslatableInput('你好', { source: 'ja', target: 'en' }), false);
  assert.equal(isTranslatableInput('你好', { source: 'zh', target: 'ja' }), false);
});

test('language labels follow the configured pair', async () => {
  const { describeLanguagePair } = await loadTs('languages/config.ts');
  assert.equal(describeLanguagePair(defaultLanguagePair), 'Chinese → English');
  assert.equal(describeLanguagePair({ source: 'zh', target: 'ja' }), 'Chinese → Japanese');
});
