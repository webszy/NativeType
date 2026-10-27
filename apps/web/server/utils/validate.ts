import {
  analyticsRequestFields,
  isAnalyticsEventType,
  type AnalyticsEventRequest,
  type AnalyticsErrorCode,
} from '@nativetype/contracts';
import {
  decodeUtf8,
  isJsonContentType,
  MAX_BODY_BYTES,
  readBodyLimited,
} from './http';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const allowedFields = new Set<string>(analyticsRequestFields);

export type ParsedEvent =
  | { ok: true; event: AnalyticsEventRequest }
  | { ok: false; status: 400 | 413 | 415; code: AnalyticsErrorCode };

export async function parseAnalyticsRequest(request: Request): Promise<ParsedEvent> {
  if (!isJsonContentType(request.headers.get('content-type'))) {
    return { ok: false, status: 415, code: 'unsupported_media_type' };
  }

  const body = await readBodyLimited(request, MAX_BODY_BYTES);
  if (body === 'too_large') {
    return { ok: false, status: 413, code: 'payload_too_large' };
  }
  if (body === 'invalid_length') {
    return { ok: false, status: 400, code: 'invalid_request' };
  }

  const text = decodeUtf8(body);
  if (text === 'invalid') {
    return { ok: false, status: 400, code: 'invalid_json' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, status: 400, code: 'invalid_json' };
  }

  const event = acceptEvent(parsed);
  if (!event) return { ok: false, status: 400, code: 'invalid_request' };
  return { ok: true, event };
}

function acceptEvent(value: unknown): AnalyticsEventRequest | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  if (Object.getPrototypeOf(value) !== Object.prototype) return undefined;

  const keys = Object.keys(value);
  if (keys.length !== allowedFields.size || keys.some((key) => !allowedFields.has(key))) {
    return undefined;
  }

  const installId = Reflect.get(value, 'installId');
  const event = Reflect.get(value, 'event');
  if (typeof installId !== 'string' || !UUID_V4.test(installId)) return undefined;
  if (typeof event !== 'string' || !isAnalyticsEventType(event)) return undefined;

  return { installId: installId.toLowerCase(), event };
}
