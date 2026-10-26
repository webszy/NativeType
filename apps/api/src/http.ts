import type { AnalyticsErrorBody, AnalyticsErrorCode } from '@nativetype/contracts';

export const MAX_BODY_BYTES = 1024;

export function applyCommonHeaders(headers: Headers): Headers {
  const next = new Headers(headers);
  next.set('cache-control', 'no-store');
  next.set('x-content-type-options', 'nosniff');
  next.set('referrer-policy', 'no-referrer');
  next.set('vary', 'origin');
  return next;
}

export function jsonError(
  status: number,
  code: AnalyticsErrorCode,
  headers: Headers,
): Response {
  const body: AnalyticsErrorBody = { error: code };
  const responseHeaders = applyCommonHeaders(headers);
  responseHeaders.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

export function noContent(headers: Headers): Response {
  return new Response(null, { status: 204, headers: applyCommonHeaders(headers) });
}

export function methodNotAllowed(headers: Headers): Response {
  const responseHeaders = applyCommonHeaders(headers);
  responseHeaders.set('allow', 'POST, OPTIONS');
  responseHeaders.set('content-type', 'application/json; charset=utf-8');
  const body: AnalyticsErrorBody = { error: 'method_not_allowed' };
  return new Response(JSON.stringify(body), { status: 405, headers: responseHeaders });
}

export function rateLimited(headers: Headers, retryAfterSeconds: number): Response {
  const responseHeaders = applyCommonHeaders(headers);
  responseHeaders.set('content-type', 'application/json; charset=utf-8');
  responseHeaders.set('retry-after', String(retryAfterSeconds));
  const body: AnalyticsErrorBody = { error: 'rate_limited' };
  return new Response(JSON.stringify(body), { status: 429, headers: responseHeaders });
}

/**
 * Origin is not authentication. A matching Origin only receives CORS headers.
 * Requests with any other Origin, or no Origin, are still processed.
 * "*" is never reflected, even if it appears in the configured list.
 */
export function allowedOrigins(configured: string | undefined): ReadonlySet<string> {
  const origins = new Set<string>();
  if (!configured) return origins;
  for (const part of configured.split(',')) {
    const origin = part.trim();
    if (origin.length === 0 || origin === '*') continue;
    origins.add(origin);
  }
  return origins;
}

export function corsHeaders(request: Request, configured: string | undefined): Headers {
  const headers = new Headers();
  const origin = request.headers.get('origin');
  if (origin && allowedOrigins(configured).has(origin)) {
    headers.set('access-control-allow-origin', origin);
  }
  return headers;
}

export function preflight(request: Request, configured: string | undefined): Response {
  const headers = corsHeaders(request, configured);
  if (!headers.has('access-control-allow-origin')) {
    return jsonError(403, 'forbidden', headers);
  }
  headers.set('access-control-allow-methods', 'POST, OPTIONS');
  headers.set('access-control-allow-headers', 'content-type');
  headers.set('access-control-max-age', '86400');
  return new Response(null, { status: 204, headers: applyCommonHeaders(headers) });
}

export function isJsonContentType(value: string | null): boolean {
  if (value === null) return false;
  const [media, ...params] = value.split(';');
  if (media?.trim().toLowerCase() !== 'application/json') return false;
  for (const param of params) {
    const trimmed = param.trim();
    if (trimmed.length === 0) return false;
    const separator = trimmed.indexOf('=');
    if (separator === -1) return false;
    const name = trimmed.slice(0, separator).trim().toLowerCase();
    const raw = trimmed.slice(separator + 1).trim().replaceAll('"', '').toLowerCase();
    if (name !== 'charset' || (raw !== 'utf-8' && raw !== 'utf8')) return false;
  }
  return true;
}

export type BodyRead = Uint8Array | 'too_large' | 'invalid_length';

/** Reads at most maxBytes. A declared Content-Length above the limit is rejected before the body is consumed. */
export async function readBodyLimited(request: Request, maxBytes: number): Promise<BodyRead> {
  const declared = request.headers.get('content-length');
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) return 'invalid_length';
    const length = Number(declared);
    if (!Number.isSafeInteger(length) || length > maxBytes) return 'too_large';
  }

  const body = request.body;
  if (body === null) return new Uint8Array();

  const reader = body.getReader();
  const parts: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      received += value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        return 'too_large';
      }
      parts.push(value);
    }
  } catch {
    await reader.cancel().catch(() => undefined);
    return 'too_large';
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

export function decodeUtf8(bytes: Uint8Array): string | 'invalid' {
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return 'invalid';
  }
}
