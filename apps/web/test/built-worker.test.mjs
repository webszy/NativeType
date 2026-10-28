import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { unstable_dev } from 'wrangler';

const root = fileURLToPath(new URL('../', import.meta.url));
const allowedOrigin = 'chrome-extension://emicomnfbabkhcpphlihhbddhlmkdhfk';
const storeUrl = 'https://chromewebstore.google.com/detail/nativetype/emicomnfbabkhcpphlihhbddhlmkdhfk?authuser=0&hl=en';
let fixture;
let worker;

before(async () => {
  // Use the real compiled entry and assets with disposable, local-only bindings.
  const built = path.join(root, '.output/server');
  const config = JSON.parse(await readFile(path.join(built, 'wrangler.json'), 'utf8'));
  fixture = await mkdtemp(path.join(tmpdir(), 'nativetype-built-worker-'));
  delete config.account_id;
  delete config.secrets;
  config.name = 'nativetype-built-worker-test';
  config.routes = [];
  config.main = path.resolve(built, config.main);
  config.assets.directory = path.resolve(built, config.assets.directory);
  config.vars.ANALYTICS_HMAC_SECRET = 'test-only-built-worker-secret-do-not-deploy';
  config.d1_databases = [{
    binding: 'DB',
    database_name: 'nativetype-built-worker-test',
    database_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  }];
  const configPath = path.join(fixture, 'wrangler.json');
  await writeFile(configPath, JSON.stringify(config));
  worker = await unstable_dev(config.main, {
    config: configPath,
    local: true,
    ip: '127.0.0.1',
    port: 0,
    inspectorPort: 0,
    persist: false,
    logLevel: 'error',
    experimental: {
      disableExperimentalWarning: true,
      disableDevRegistry: true,
      forceLocal: true,
      watch: false,
    },
  });
}, { timeout: 30_000 });

after(async () => {
  try {
    await worker?.stop();
  } finally {
    if (fixture) await rm(fixture, { recursive: true, force: true });
  }
});

function fetchWorker(route, init = {}) {
  const url = new URL(route, `http://${worker.address}:${worker.port}`);
  return fetch(url, { ...init, signal: AbortSignal.timeout(5000) });
}

/** Leave the upload open: a size rejection must not wait for request EOF. */
async function rejectOpenUpload(route, { declaredLength, chunk } = {}) {
  let request;
  try {
    return await new Promise((resolve, reject) => {
      const headers = { 'content-type': 'application/json', origin: allowedOrigin };
      if (declaredLength !== undefined) headers['content-length'] = String(declaredLength);
      request = http.request({
        hostname: worker.address,
        port: worker.port,
        path: route,
        method: 'POST',
        headers,
      }, response => {
        let body = '';
        response.setEncoding('utf8');
        response.on('data', value => { body += value; });
        response.on('error', reject);
        response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body }));
      });
      request.on('error', reject);
      request.setTimeout(3000, () => request.destroy(new Error('Worker waited for upload EOF before rejecting the body')));
      request.flushHeaders();
      if (chunk) request.write(chunk);
    });
  } finally {
    request?.destroy();
  }
}

function assertTooLarge(response) {
  assert.equal(response.status, 413);
  assert.deepEqual(JSON.parse(response.body), { error: 'payload_too_large' });
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['access-control-allow-origin'], allowedOrigin);
}

test('rendered installation links all open the published store listing', async () => {
  const response = await fetchWorker('/');
  assert.equal(response.status, 200);
  const html = await response.text();
  const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>\s*Add to Chrome\s*<\/a>/g)];
  assert.equal(links.length, 2);
  for (const link of links) assert.equal(link[1].replaceAll('&amp;', '&'), storeUrl);
  assert.ok(html.includes(`href="${storeUrl.replaceAll('&', '&amp;')}"`));
  assert.ok(!html.includes('Chrome Web Store link is not configured yet'));
  assert.ok(!html.includes('Chrome Web Store listing is not linked yet'));
});

test('the compiled Worker preserves pages, API routing and CORS', async () => {
  assert.equal((await fetchWorker('/privacy')).status, 200);
  const method = await fetchWorker('/api/v1/events');
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'POST, OPTIONS');
  const preflight = await fetchWorker('/api/v1/events', {
    method: 'OPTIONS',
    headers: { origin: allowedOrigin, 'access-control-request-method': 'POST' },
  });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), allowedOrigin);
  assert.equal((await fetchWorker('/api/missing')).status, 404);
});

test('a body at the 1024-byte limit still reaches API validation', async () => {
  const response = await fetchWorker('/api/v1/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}'.padEnd(1024, ' '),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'invalid_request' });
});

test('an oversized declared length is rejected before any body is sent', async () => {
  assertTooLarge(await rejectOpenUpload('/api/v1/events', { declaredLength: 1025 }));
});

test('chunked uploads are rejected as soon as received bytes exceed 1024', async () => {
  assertTooLarge(await rejectOpenUpload('/api/v1/events', { chunk: 'x'.repeat(1025) }));
});

test('unknown paths cannot bypass the limit and reach Nitro buffering', async () => {
  assertTooLarge(await rejectOpenUpload('/not-a-route', { chunk: 'x'.repeat(4096) }));
});
