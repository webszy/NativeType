import { createScheduledController, env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { recordUsage, type UsageDatabase } from '../server/utils/analytics';
import { addUtcDays, oldestRetainedUtcDate, windowStartUtcDate } from '../server/utils/dates';
import { handleScheduled } from '../server/utils/events';
import worker from './worker';
import { clearUsage, installHash, INSTALL_A, INSTALL_B, INSTALL_C, INSTALL_D, INSTALL_E, INSTALL_H } from './helpers';

const today = '2026-10-26';
const scheduledAt = new Date('2026-10-26T03:00:00.000Z');

beforeEach(clearUsage);

async function remember(
  installId: string,
  date: string,
  event: 'translation_success' | 'replace_success' | 'translation_error',
): Promise<void> {
  await recordUsage(env.DB, {
    date,
    installHash: await installHash(installId),
    event,
  });
}

async function runRetention(now = scheduledAt): Promise<void> {
  if (!worker.scheduled) throw new Error('scheduled handler is missing');
  await worker.scheduled(
    createScheduledController({ scheduledTime: now, cron: '0 3 * * *' }),
    env,
  );
}

async function dates(): Promise<string[]> {
  const rows = await env.DB.prepare(
    'SELECT DISTINCT date FROM usage_daily ORDER BY date',
  ).all<{ date: string }>();
  return rows.results.map((row) => row.date);
}

async function active(start: string, end: string): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(DISTINCT install_hash) AS active
     FROM usage_daily
     WHERE date >= ? AND date <= ? AND translation_count > 0`,
  ).bind(start, end).first<{ active: number }>();
  return Number(row?.active ?? 0);
}

describe('90-day retention', () => {
  it('deletes only rows outside the inclusive UTC window and is safe to repeat', async () => {
    await remember(INSTALL_A, today, 'translation_success');
    await remember(INSTALL_B, addUtcDays(today, -6), 'translation_success');
    await remember(INSTALL_H, addUtcDays(today, -7), 'translation_success');
    await remember(INSTALL_D, addUtcDays(today, -29), 'translation_success');
    await remember(INSTALL_E, addUtcDays(today, -30), 'translation_success');
    await remember(INSTALL_C, today, 'translation_error');
    await remember(INSTALL_A, oldestRetainedUtcDate(today), 'translation_success');
    await remember(INSTALL_B, addUtcDays(today, -90), 'translation_success');
    await remember(INSTALL_D, addUtcDays(today, -120), 'translation_success');

    const logs: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.map((arg) => String(arg)).join(' '));
    };
    try {
      await runRetention();
      await runRetention();
    } finally {
      console.log = original;
    }

    expect(await dates()).toEqual([
      oldestRetainedUtcDate(today),
      addUtcDays(today, -30),
      addUtcDays(today, -29),
      addUtcDays(today, -7),
      addUtcDays(today, -6),
      today,
    ]);
    expect(await active(today, today)).toBe(1);
    expect(await active(windowStartUtcDate(today, 7), today)).toBe(2);
    expect(await active(windowStartUtcDate(today, 30), today)).toBe(4);
    expect(logs.length).toBeGreaterThan(0);
    const completed = logs.map((line) => JSON.parse(line) as {
      message: string;
      oldestRetained: string;
      deleted: number;
    });
    expect(completed[0]).toMatchObject({
      message: 'usage retention completed',
      oldestRetained: oldestRetainedUtcDate(today),
      deleted: 2,
    });
    expect(completed[1]).toMatchObject({ deleted: 0 });
    expect(logs.join('\n').includes(INSTALL_A)).toBe(false);
  });

  it('logs a redacted retention failure and leaves the rows in place', async () => {
    await remember(INSTALL_A, today, 'translation_success');
    const failing: UsageDatabase = {
      prepare() {
        return {
          bind() {
            return {
              async run() {
                throw new Error(`delete failed ${INSTALL_A} ${'cd'.repeat(32)}`);
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
    await expect(handleScheduled(failing, scheduledAt)).rejects.toThrow(/delete failed/);
    console.error = original;

    const logged = errors.join('\n');
    expect(logged.includes('usage retention failed')).toBe(true);
    expect(logged.includes(INSTALL_A)).toBe(false);
    expect(logged.includes('cd'.repeat(32))).toBe(false);
    expect(await dates()).toEqual([today]);
  });
});
