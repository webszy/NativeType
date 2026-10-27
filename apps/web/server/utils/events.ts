import {
  analyticsRateLimitPeriodSeconds,
  hashInstallId,
  isUsableHmacSecret,
  purgeExpiredUsage,
  recordUsage,
  safeErrorDetail,
  type RateLimiter,
  type UsageDatabase,
} from './analytics';
import { utcDateString } from './dates';
import { corsHeaders, jsonError, methodNotAllowed, noContent, preflight, rateLimited, resolveAllowedOrigins, type CorsBindings } from './http';
import { parseAnalyticsRequest } from './validate';

/** Must match the Nuxt file route `server/api/v1/events.ts`. */
export const analyticsEventsPath = '/api/v1/events';

export interface AnalyticsBindings extends CorsBindings {
  DB: UsageDatabase;
  ANALYTICS_HMAC_SECRET: string;
  ANALYTICS_RATE_LIMITER: RateLimiter;
}

export async function handleEventRequest(
  request: Request,
  env: AnalyticsBindings,
  now: Date = new Date(),
): Promise<Response> {
  const allowedOrigins = resolveAllowedOrigins(env);
  const headers = corsHeaders(request, allowedOrigins);
  if (request.method === 'OPTIONS') return preflight(request, allowedOrigins);
  if (request.method !== 'POST') return methodNotAllowed(headers);

  const parsed = await parseAnalyticsRequest(request);
  if (!parsed.ok) return jsonError(parsed.status, parsed.code, headers);

  if (!isUsableHmacSecret(env.ANALYTICS_HMAC_SECRET)) {
    logFailure('analytics hmac secret is not configured');
    return jsonError(503, 'unavailable', headers);
  }

  let installHash: string;
  try {
    installHash = await hashInstallId(parsed.event.installId, env.ANALYTICS_HMAC_SECRET);
  } catch (error) {
    logFailure('analytics hmac failed', error, env.ANALYTICS_HMAC_SECRET);
    return jsonError(503, 'unavailable', headers);
  }

  try {
    const decision = await env.ANALYTICS_RATE_LIMITER.limit({ key: installHash });
    if (decision?.success !== true) {
      return rateLimited(headers, analyticsRateLimitPeriodSeconds);
    }
  } catch (error) {
    logFailure('analytics rate limit failed', error, env.ANALYTICS_HMAC_SECRET);
    return jsonError(503, 'unavailable', headers);
  }

  try {
    await recordUsage(env.DB, {
      date: utcDateString(now),
      installHash,
      event: parsed.event.event,
    });
  } catch (error) {
    logFailure('usage write failed', error, env.ANALYTICS_HMAC_SECRET);
    return jsonError(503, 'unavailable', headers);
  }

  return noContent(headers);
}

export async function handleScheduled(db: UsageDatabase, now: Date): Promise<void> {
  try {
    const result = await purgeExpiredUsage(db, now);
    console.log(JSON.stringify({
      message: 'usage retention completed',
      today: result.today,
      oldestRetained: result.oldestRetained,
      deleted: result.deleted,
    }));
  } catch (error) {
    logFailure('usage retention failed', error);
    throw error;
  }
}

function logFailure(message: string, error?: unknown, secret?: string): void {
  const entry: { message: string; error?: string } = { message };
  if (error !== undefined) entry.error = safeErrorDetail(error, secret);
  console.error(JSON.stringify(entry));
}
