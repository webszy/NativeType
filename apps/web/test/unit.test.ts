import { describe, expect, it } from 'vitest';
import {
  hashInstallId,
  isUsableHmacSecret,
  MIN_HMAC_SECRET_LENGTH,
  safeErrorDetail,
} from '../server/utils/analytics';
import { addUtcDays, oldestRetainedUtcDate, utcDateString, windowStartUtcDate } from '../server/utils/dates';
import { resolveAllowedOrigins } from '../server/utils/http';

describe('extension origins', () => {
  const productionId = 'a'.repeat(32);
  const devId = 'b'.repeat(32);

  it('builds both origins from separate IDs', () => {
    expect(resolveAllowedOrigins({ PRODUCTION_ID: productionId, DEV_ID: ` ${devId} ` })).toBe(
      `chrome-extension://${productionId},chrome-extension://${devId}`,
    );
  });

  it('deduplicates IDs and ignores missing or malformed IDs', () => {
    expect(resolveAllowedOrigins({ PRODUCTION_ID: productionId, DEV_ID: productionId })).toBe(`chrome-extension://${productionId}`);
    for (const invalid of ['', '*', 'short', 'z'.repeat(32), `${devId},https://other.example`, `chrome-extension://${devId}`]) {
      expect(resolveAllowedOrigins({ DEV_ID: invalid })).toBe('');
    }
    expect(resolveAllowedOrigins({})).toBe('');
  });

  it('keeps explicitly configured extra origins and filters wildcards', () => {
    expect(resolveAllowedOrigins({
      PRODUCTION_ID: productionId,
      ALLOWED_ORIGINS: `*,https://example.com,chrome-extension://${productionId}`,
    })).toBe(`https://example.com,chrome-extension://${productionId}`);
  });
});

describe('UTC dates', () => {
  it('uses the UTC calendar date across the day boundary', () => {
    expect(utcDateString(new Date('2026-10-26T00:00:00.000Z'))).toBe('2026-10-26');
    expect(utcDateString(new Date('2026-10-26T23:59:59.999Z'))).toBe('2026-10-26');
    expect(utcDateString(new Date('2026-10-27T00:00:00.000Z'))).toBe('2026-10-27');
    expect(utcDateString(new Date('2026-10-26T08:00:00.000+09:00'))).toBe('2026-10-25');
  });

  it('adds days across month and leap-year boundaries', () => {
    expect(addUtcDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addUtcDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addUtcDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('rejects dates that are not real calendar days', () => {
    expect(() => addUtcDays('2026-02-31', 0)).toThrow(/UTC date/);
    expect(() => addUtcDays('26-10-26', 0)).toThrow(/UTC date/);
  });

  it('keeps 90 UTC dates, ending today', () => {
    const today = '2026-10-26';
    const oldest = oldestRetainedUtcDate(today);
    expect(oldest).toBe(addUtcDays(today, -89));
    expect(addUtcDays(today, -90) < oldest).toBe(true);
    expect(windowStartUtcDate(today, 7)).toBe(addUtcDays(today, -6));
    expect(windowStartUtcDate(today, 30)).toBe(addUtcDays(today, -29));
  });
});

describe('install hash', () => {
  const secret = 'a'.repeat(MIN_HMAC_SECRET_LENGTH);
  const installId = '11111111-1111-4111-8111-111111111111';

  it('is a stable HMAC and changes when the secret changes', async () => {
    const first = await hashInstallId(installId, secret);
    const second = await hashInstallId(installId, secret);
    const rotated = await hashInstallId(installId, `${secret}x`);
    expect(first).toBe(second);
    expect(rotated).not.toBe(first);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first.includes(installId.replaceAll('-', ''))).toBe(false);
  });

  it('rejects a missing, short, or padded secret', () => {
    expect(isUsableHmacSecret(undefined)).toBe(false);
    expect(isUsableHmacSecret('')).toBe(false);
    expect(isUsableHmacSecret('short-secret')).toBe(false);
    expect(isUsableHmacSecret(` ${'a'.repeat(MIN_HMAC_SECRET_LENGTH)}`)).toBe(false);
    expect(isUsableHmacSecret('a'.repeat(MIN_HMAC_SECRET_LENGTH))).toBe(true);
  });

  it('redacts secrets, install ids, and hashes from error text', async () => {
    const hash = await hashInstallId(installId, secret);
    const detail = safeErrorDetail(
      new Error(`failed ${installId} ${hash} ${secret}`),
      secret,
    );
    expect(detail.includes(secret)).toBe(false);
    expect(detail.includes(installId)).toBe(false);
    expect(detail.includes(hash)).toBe(false);
    expect(detail.includes('[redacted]')).toBe(true);
  });
});
