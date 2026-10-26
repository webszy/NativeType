import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  analyticsRateLimitPerMinute,
  type UsageDatabase,
} from '../src/analytics';
import { utcDateString } from '../src/dates';
import { handleEventRequest } from '../src/events';
import { MAX_BODY_BYTES } from '../src/http';
import {
  allowedOrigin,
  clearUsage,
  eventRequest,
  eventsUrl,
  expectPrivate,
  INSTALL_A,
  installHash,
  postEvent,
  send,
} from './helpers';

beforeEach(clearUsage);

async function storedHash(installId: string): Promise<string | null> {
  const hash = await installHash(installId);
  const row = await env.DB.prepare(
    'SELECT install_hash FROM usage_daily WHERE install_hash = ?',
  ).bind(hash).first<{ install_hash: string }>();
  return row?.install_hash ?? null;
}

describe('POST /v1/events', () => {
  it('writes a valid event and returns 204 only after the insert', async () => {
    const origin = allowedOrigin();
    const response = await postEvent(INSTALL_A, 'translation_success', { origin });
    expect(response.status).toBe(204);
    expect(response.headers.get('access-control-allow-origin')).toBe(origin);
    expect(response.headers.get('vary')).toBe('origin');
    const text = await expectPrivate(response, INSTALL_A);
    expect(text).toBe('');

    const today = utcDateString(new Date());
    const hash = await storedHash(INSTALL_A);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    const raw = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM usage_daily WHERE install_hash = ?',
    ).bind(INSTALL_A).first<{ n: number }>();
    expect(Number(raw?.n)).toBe(0);
    const row = await env.DB.prepare(
      'SELECT translation_count, replace_count, error_count, install_hash FROM usage_daily WHERE date = ?',
    ).bind(today).first<{
      translation_count: number;
      replace_count: number;
      error_count: number;
      install_hash: string;
    }>();
    expect(row).toMatchObject({ translation_count: 1, replace_count: 0, error_count: 0 });
    expect(row?.install_hash).not.toBe(INSTALL_A);
    expect(JSON.stringify(row).includes(INSTALL_A)).toBe(false);
  });

  it('normalizes UUID case into one install', async () => {
    const upper = INSTALL_A.toUpperCase();
    expect((await postEvent(upper, 'replace_success')).status).toBe(204);
    expect((await postEvent(INSTALL_A, 'replace_success')).status).toBe(204);
    const today = utcDateString(new Date());
    const rows = await env.DB.prepare(
      'SELECT replace_count FROM usage_daily WHERE date = ?',
    ).bind(today).all<{ replace_count: number }>();
    expect(rows.results).toEqual([{ replace_count: 2 }]);
  });

  it('rejects a missing install id, a bad UUID, an unknown event, and extra fields', async () => {
    const cases = [
      { event: 'translation_success' },
      { installId: 'not-a-uuid', event: 'translation_success' },
      { installId: '550e8400-e29b-11d4-a716-446655440000', event: 'translation_success' },
      { installId: INSTALL_A, event: 'page_view' },
      { installId: INSTALL_A, event: 'Translation_Success' },
      { installId: INSTALL_A, event: 'translation_success', url: 'https://x.com/post/1' },
      { installId: INSTALL_A, event: 'translation_success', metadata: { text: 'secret draft' } },
      { installId: 1, event: 'translation_success' },
      ['not', 'an', 'object'],
      null,
    ];
    for (const body of cases) {
      const response = await send(eventRequest(body));
      expect(response.status).toBe(400);
      expect(JSON.parse(await expectPrivate(response, INSTALL_A, 'secret draft', 'x.com'))).toEqual({
        error: 'invalid_request',
      });
    }
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM usage_daily').first<{ n: number }>();
    expect(Number(count?.n)).toBe(0);
  });

  it('rejects invalid JSON, the wrong content type, and a body over 1 KB', async () => {
    const json = await send(eventRequest(undefined, { rawBody: '{', contentType: 'application/json' }));
    expect(json.status).toBe(400);
    expect(JSON.parse(await json.text())).toEqual({ error: 'invalid_json' });

    const text = await send(eventRequest({ installId: INSTALL_A, event: 'translation_success' }, {
      contentType: 'text/plain',
    }));
    expect(text.status).toBe(415);
    expect(JSON.parse(await text.text())).toEqual({ error: 'unsupported_media_type' });

    const missing = await send(eventRequest({ installId: INSTALL_A, event: 'translation_success' }, {
      contentType: null,
    }));
    expect(missing.status).toBe(415);

    const utf16 = await send(eventRequest({ installId: INSTALL_A, event: 'translation_success' }, {
      contentType: 'application/json; charset=utf-16',
    }));
    expect(utf16.status).toBe(415);

    const charset = await postEvent(INSTALL_A, 'translation_error');
    expect(charset.status).toBe(204);

    const withCharset = await send(eventRequest(
      { installId: INSTALL_A, event: 'translation_success' },
      { contentType: 'application/json; charset=UTF-8' },
    ));
    expect(withCharset.status).toBe(204);

    const oversized = await send(eventRequest(undefined, {
      rawBody: `{"installId":"${INSTALL_A}","pad":"${'x'.repeat(MAX_BODY_BYTES)}"}`,
    }));
    expect(oversized.status).toBe(413);
    expect(JSON.parse(await expectPrivate(oversized, INSTALL_A))).toEqual({ error: 'payload_too_large' });

    const binary = new Uint8Array(8);
    binary.fill(0xff);
    const invalidUtf8 = await send(eventRequest(undefined, { rawBody: binary }));
    expect(invalidUtf8.status).toBe(400);
    expect(JSON.parse(await invalidUtf8.text())).toEqual({ error: 'invalid_json' });
  });

  it('rejects unsupported methods and unknown paths', async () => {
    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD']) {
      const response = await send(eventRequest({ installId: INSTALL_A, event: 'translation_success' }, { method }));
      expect(response.status).toBe(405);
      expect(response.headers.get('allow')).toBe('POST, OPTIONS');
      if (method !== 'HEAD') {
        expect(JSON.parse(await response.text())).toEqual({ error: 'method_not_allowed' });
      }
    }
    for (const path of ['/v1/translate', '/v1/retention', '/cdn-cgi/local/scheduled']) {
      const response = await send(new Request(`https://nativetype-api.test${path}`, { method: 'POST' }));
      expect(response.status).toBe(404);
      expect(JSON.parse(await response.text())).toEqual({ error: 'not_found' });
    }
    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM usage_daily').first<{ n: number }>();
    expect(Number(count?.n)).toBe(0);
  });

  it('reflects only configured origins and still accepts a forged origin', async () => {
    const origin = allowedOrigin();
    const allowed = await postEvent(INSTALL_A, 'translation_success', { origin });
    expect(allowed.headers.get('access-control-allow-origin')).toBe(origin);
    expect(allowed.status).toBe(204);

    const foreign = 'https://evil.example';
    const forged = await postEvent(INSTALL_A, 'translation_success', { origin: foreign });
    expect(forged.status).toBe(204);
    expect(forged.headers.get('access-control-allow-origin')).toBeNull();

    const preflightOk = await send(new Request(eventsUrl(), {
      method: 'OPTIONS',
      headers: {
        origin,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    }));
    expect(preflightOk.status).toBe(204);
    expect(preflightOk.headers.get('access-control-allow-origin')).toBe(origin);
    expect(preflightOk.headers.get('access-control-allow-methods')).toBe('POST, OPTIONS');
    expect(preflightOk.headers.get('access-control-allow-headers')).toBe('content-type');
    expect(preflightOk.headers.get('cache-control')).toBe('no-store');

    const preflightNo = await send(new Request(eventsUrl(), {
      method: 'OPTIONS',
      headers: { origin: foreign, 'access-control-request-method': 'POST' },
    }));
    expect(preflightNo.status).toBe(403);
    expect(preflightNo.headers.get('access-control-allow-origin')).toBeNull();
    expect(JSON.parse(await preflightNo.text())).toEqual({ error: 'forbidden' });

    const wildcard = await handleEventRequest(
      eventRequest({ installId: INSTALL_A, event: 'translation_success' }, { origin: 'https://anywhere.example' }),
      { ...env, ALLOWED_ORIGINS: '*' },
    );
    expect(wildcard.status).toBe(204);
    expect(wildcard.headers.get('access-control-allow-origin')).toBeNull();

    const second = 'https://localhost:8787';
    const either = await handleEventRequest(
      eventRequest({ installId: INSTALL_A, event: 'translation_success' }, { origin: second }),
      { ...env, ALLOWED_ORIGINS: `${origin}, ${second}` },
    );
    expect(either.headers.get('access-control-allow-origin')).toBe(second);
  });

  it('limits each hashed install and does not charge invalid requests', async () => {
    const limited = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    for (let attempt = 0; attempt < analyticsRateLimitPerMinute; attempt += 1) {
      const response = await postEvent(limited, 'translation_success');
      expect(response.status).toBe(204);
      await response.arrayBuffer();
    }
    const blocked = await postEvent(limited, 'translation_success');
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('retry-after')).toBe('60');
    expect(JSON.parse(await expectPrivate(blocked, limited))).toEqual({ error: 'rate_limited' });

    const hash = await installHash(limited);
    const row = await env.DB.prepare(
      'SELECT translation_count FROM usage_daily WHERE install_hash = ?',
    ).bind(hash).first<{ translation_count: number }>();
    expect(row?.translation_count).toBe(analyticsRateLimitPerMinute);

    const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    for (let attempt = 0; attempt < analyticsRateLimitPerMinute; attempt += 1) {
      const rejected = await send(eventRequest({ installId: other, event: 'page_view' }));
      expect(rejected.status).toBe(400);
      await rejected.arrayBuffer();
    }
    const accepted = await postEvent(other, 'replace_success');
    expect(accepted.status).toBe(204);
  });

  it('returns 503 when the database or the limiter fails and writes nothing', async () => {
    const failingDatabase: UsageDatabase = {
      prepare() {
        return {
          bind() {
            return {
              async run() {
                throw new Error(`D1 exploded ${INSTALL_A} ${'ab'.repeat(32)} ${env.ANALYTICS_HMAC_SECRET}`);
              },
            };
          },
        };
      },
    };
    const errors: string[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args.map((arg) => String(arg)).join(' '));
    };
    try {
      const response = await handleEventRequest(
        eventRequest({ installId: INSTALL_A, event: 'translation_success' }),
        { ...env, DB: failingDatabase },
      );
      expect(response.status).toBe(503);
      expect(JSON.parse(await expectPrivate(response, INSTALL_A, env.ANALYTICS_HMAC_SECRET))).toEqual({
        error: 'unavailable',
      });

      const denied = await handleEventRequest(
        eventRequest({ installId: INSTALL_A, event: 'translation_success' }),
        { ...env, ANALYTICS_RATE_LIMITER: { limit: async () => ({ success: false }) } },
      );
      expect(denied.status).toBe(429);

      const brokenLimiter = await handleEventRequest(
        eventRequest({ installId: INSTALL_A, event: 'translation_success' }),
        {
          ...env,
          ANALYTICS_RATE_LIMITER: {
            limit: async () => {
              throw new Error('limiter down');
            },
          },
        },
      );
      expect(brokenLimiter.status).toBe(503);

      const missingSecret = await handleEventRequest(
        eventRequest({ installId: INSTALL_A, event: 'translation_success' }),
        { ...env, ANALYTICS_HMAC_SECRET: '' },
      );
      expect(missingSecret.status).toBe(503);
      expect(JSON.parse(await missingSecret.text())).toEqual({ error: 'unavailable' });
    } finally {
      console.error = original;
    }

    const logged = errors.join('\n');
    expect(logged.includes(INSTALL_A)).toBe(false);
    expect(logged.includes(env.ANALYTICS_HMAC_SECRET)).toBe(false);
    expect(logged.includes('ab'.repeat(32))).toBe(false);

    const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM usage_daily').first<{ n: number }>();
    expect(Number(count?.n)).toBe(0);
  });

  it('rejects a prototype payload and does not echo it', async () => {
    const raw = `{"installId":"${INSTALL_A}","event":"translation_success","__proto__":{"admin":true}}`;
    const response = await send(eventRequest(undefined, { rawBody: raw }));
    expect(response.status).toBe(400);
    expect(await expectPrivate(response, INSTALL_A)).toContain('invalid_request');
  });
});
