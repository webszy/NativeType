import type { AnalyticsEventType } from '@nativetype/contracts';
import { oldestRetainedUtcDate, utcDateString } from './dates';

/**
 * Must match ratelimits.simple in wrangler.jsonc.
 * The binding enforces the limit. These values only set Retry-After and the tests.
 */
export const analyticsRateLimitPerMinute = 60;
export const analyticsRateLimitPeriodSeconds = 60;

/** Reject missing, short, or padded secrets. There is no default key. */
export const MIN_HMAC_SECRET_LENGTH = 32;

export function isUsableHmacSecret(secret: unknown): secret is string {
  return typeof secret === 'string'
    && secret.length >= MIN_HMAC_SECRET_LENGTH
    && secret === secret.trim();
}

/**
 * HMAC-SHA256 of the install id. Rotating ANALYTICS_HMAC_SECRET changes every
 * hash, so the same installation counts as a new one across the rotation.
 * The raw install id is not stored or logged.
 */
export async function hashInstallId(installId: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(installId),
  );
  const bytes = new Uint8Array(signature);
  let hex = '';
  for (const byte of bytes) {
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

export interface UsageRunResult {
  success?: boolean;
  error?: string;
  meta?: {
    changes?: number;
  };
}

export interface UsageStatement {
  bind(...values: ReadonlyArray<string | number | null>): {
    run(): Promise<UsageRunResult>;
  };
}

export interface UsageDatabase {
  prepare(query: string): UsageStatement;
}

export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

const UPSERT_USAGE = `INSERT INTO usage_daily (
  date,
  install_hash,
  translation_count,
  replace_count,
  error_count
) VALUES (?, ?, ?, ?, ?)
ON CONFLICT (date, install_hash) DO UPDATE SET
  translation_count = translation_count + excluded.translation_count,
  replace_count = replace_count + excluded.replace_count,
  error_count = error_count + excluded.error_count`;

const DELETE_EXPIRED = `DELETE FROM usage_daily WHERE date < ?`;

function increments(event: AnalyticsEventType): {
  translation: number;
  replace: number;
  error: number;
} {
  switch (event) {
    case 'translation_success':
      return { translation: 1, replace: 0, error: 0 };
    case 'replace_success':
      return { translation: 0, replace: 1, error: 0 };
    case 'translation_error':
      return { translation: 0, replace: 0, error: 1 };
    default: {
      const unexpected: never = event;
      throw new Error(`unsupported event ${String(unexpected)}`);
    }
  }
}

/**
 * Counts one accepted report. A repeated POST increments the count again.
 * There is no event id, so the API cannot tell a retry from a new event.
 * Active-install queries still count the install once per window.
 */
export async function recordUsage(
  db: UsageDatabase,
  input: { date: string; installHash: string; event: AnalyticsEventType },
): Promise<void> {
  const counts = increments(input.event);
  const result = await db.prepare(UPSERT_USAGE).bind(
    input.date,
    input.installHash,
    counts.translation,
    counts.replace,
    counts.error,
  ).run();
  assertWriteSucceeded(result);
}

export interface RetentionResult {
  today: string;
  oldestRetained: string;
  deleted: number | null;
}

/**
 * Deletes rows older than the inclusive retention window. Safe to run twice.
 * `now` is the Worker's UTC clock, or the cron scheduledTime.
 */
export async function purgeExpiredUsage(
  db: UsageDatabase,
  now: Date,
  retentionDays?: number,
): Promise<RetentionResult> {
  const today = utcDateString(now);
  const oldestRetained = oldestRetainedUtcDate(today, retentionDays);
  const result = await db.prepare(DELETE_EXPIRED).bind(oldestRetained).run();
  assertWriteSucceeded(result);
  const deleted = result.meta?.changes;
  return {
    today,
    oldestRetained,
    deleted: typeof deleted === 'number' ? deleted : null,
  };
}

function assertWriteSucceeded(result: UsageRunResult): void {
  if (result.success === false) {
    throw new Error(result.error && result.error.length > 0 ? result.error : 'd1 write unsuccessful');
  }
}

/** Removes secrets, install ids, and hashes before a log line is emitted. */
export function safeErrorDetail(error: unknown, secret?: string): string {
  let message = error instanceof Error ? error.message : 'unknown error';
  if (secret && secret.length > 0) {
    message = message.split(secret).join('[redacted]');
  }
  return message
    .replace(/[0-9a-f]{64}/gi, '[redacted]')
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '[redacted]',
    )
    .slice(0, 300);
}
