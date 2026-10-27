import { env, SELF } from 'cloudflare:test';
import { expect } from 'vitest';
import { hashInstallId } from '../server/utils/analytics';
import { handleEventRequest } from '../server/utils/events';
import { resolveAllowedOrigins } from '../server/utils/http';

export const INSTALL_A = '11111111-1111-4111-8111-111111111111';
export const INSTALL_B = '22222222-2222-4222-8222-222222222222';
export const INSTALL_C = '33333333-3333-4333-8333-333333333333';
export const INSTALL_D = '44444444-4444-4444-8444-444444444444';
export const INSTALL_E = '55555555-5555-4555-8555-555555555555';
export const INSTALL_H = '66666666-6666-4666-8666-666666666666';

export function allowedOrigin(): string {
  const origin = resolveAllowedOrigins(env).split(',')[0]?.trim();
  if (!origin) throw new Error('No allowed origin is configured in the test bindings');
  return origin;
}

export function eventsUrl(): string {
  return 'https://nativetype-api.test/api/v1/events';
}

export function eventRequest(
  body: unknown,
  init: {
    method?: string;
    origin?: string;
    contentType?: string | null;
    rawBody?: BodyInit | null;
  } = {},
): Request {
  const headers = new Headers();
  if (init.contentType !== null) {
    headers.set('content-type', init.contentType ?? 'application/json');
  }
  if (init.origin) headers.set('origin', init.origin);
  const method = init.method ?? 'POST';
  const requestInit: RequestInit = { method, headers };
  if (init.rawBody != null || method === 'POST') {
    requestInit.body = init.rawBody ?? JSON.stringify(body);
  }
  return new Request(eventsUrl(), requestInit);
}

export function send(request: Request): Promise<Response> {
  return SELF.fetch(request);
}

export function postEvent(
  installId: string,
  event: 'translation_success' | 'replace_success' | 'translation_error',
  init: { origin?: string; now?: Date } = {},
): Promise<Response> {
  const request = eventRequest({ installId, event }, { origin: init.origin });
  if (init.now) return handleEventRequest(request, env, init.now);
  return send(request);
}

export async function expectPrivate(response: Response, ...hidden: string[]): Promise<string> {
  const text = await response.text();
  for (const value of hidden) {
    expect(text.includes(value)).toBe(false);
  }
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('access-control-allow-origin')).not.toBe('*');
  return text;
}

export async function installHash(installId: string): Promise<string> {
  return hashInstallId(installId.toLowerCase(), env.ANALYTICS_HMAC_SECRET);
}

export async function clearUsage(): Promise<void> {
  await env.DB.prepare('DELETE FROM usage_daily').run();
}
