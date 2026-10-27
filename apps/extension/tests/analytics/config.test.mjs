import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadTs } from '../load-ts.mjs';

const { analyticsEndpoint } = await loadTs('analytics/config.ts');

test('analytics configuration requires a clean HTTPS origin', () => {
  for (const value of [undefined, '', 'no URL', 'http://localhost:8787', 'https://user:secret@api.test',
    'https://api.test/path', 'https://api.test/?text=draft', 'https://api.test/#fragment', ' https://api.test']) {
    assert.equal(analyticsEndpoint(value, 'development'), undefined, String(value));
  }
  assert.equal(analyticsEndpoint('https://localhost:8787', 'development'), 'https://localhost:8787/v1/events');
});

test('development and tests reject both known production hosts and have no fallback', () => {
  for (const mode of ['development', 'test']) {
    for (const host of ['api.typewith.si', 'api.typewith.si.', 'nativetype-api.cycceme.workers.dev']) {
      assert.equal(analyticsEndpoint(`https://${host}`, mode), undefined);
    }
    assert.equal(analyticsEndpoint(undefined, mode), undefined);
  }
  for (const host of ['localhost', '127.0.0.1', '[::1]', 'api.test']) {
    assert.equal(analyticsEndpoint(`https://${host}`, 'production'), undefined);
  }
  assert.equal(analyticsEndpoint('https://api.typewith.si', 'production'), 'https://api.typewith.si/v1/events');
});

test('production environment uses the repository Worker custom domain', async () => {
  const env = await readFile(new URL('../../.env.production', import.meta.url), 'utf8');
  const worker = await readFile(new URL('../../../api/wrangler.jsonc', import.meta.url), 'utf8');
  assert.match(env, /WXT_ANALYTICS_API_BASE_URL=https:\/\/api\.typewith\.si/);
  assert.match(worker, /"pattern": "api\.typewith\.si"/);
});
