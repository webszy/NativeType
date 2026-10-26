import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { addUtcDays, windowStartUtcDate } from '../src/dates';
import {
  dailyTrendSql,
  rollingMauSql,
  rollingTotalsSql,
  rollingWauSql,
  todayDauSql,
} from '../src/stats-sql';
import {
  clearUsage,
  INSTALL_A,
  INSTALL_B,
  INSTALL_C,
  INSTALL_D,
  INSTALL_E,
  INSTALL_H,
  postEvent,
} from './helpers';

beforeEach(clearUsage);

const today = '2026-10-26';

function at(date: string): Date {
  return new Date(`${date}T12:00:00.000Z`);
}

async function report(
  installId: string,
  event: 'translation_success' | 'replace_success' | 'translation_error',
  date: string,
  times = 1,
): Promise<void> {
  for (let attempt = 0; attempt < times; attempt += 1) {
    const response = await postEvent(installId, event, { now: at(date) });
    expect(response.status).toBe(204);
    await response.arrayBuffer();
  }
}

async function activeInstalls(start: string, end: string): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(DISTINCT install_hash) AS active
     FROM usage_daily
     WHERE date >= ? AND date <= ? AND translation_count > 0`,
  ).bind(start, end).first<{ active: number }>();
  return Number(row?.active ?? 0);
}

describe('active install definitions', () => {
  it('dedupes installs across a rolling window and ignores error-only installs', async () => {
    await report(INSTALL_A, 'translation_success', today, 10);
    await report(INSTALL_A, 'replace_success', today, 2);
    await report(INSTALL_B, 'translation_success', today, 3);
    await report(INSTALL_C, 'translation_error', today, 4);
    await report(INSTALL_H, 'replace_success', today, 5);
    await report(INSTALL_A, 'translation_success', addUtcDays(today, -1));
    await report(INSTALL_B, 'translation_success', addUtcDays(today, -1));
    await report(INSTALL_B, 'translation_success', addUtcDays(today, -2));
    await report(INSTALL_B, 'translation_success', addUtcDays(today, -3));
    await report(INSTALL_D, 'translation_success', addUtcDays(today, -10));
    await report(INSTALL_E, 'translation_success', addUtcDays(today, -40));

    const day = await env.DB.prepare(
      `SELECT
         COALESCE(SUM(translation_count), 0) AS translation_count,
         COALESCE(SUM(replace_count), 0) AS replace_count,
         COALESCE(SUM(error_count), 0) AS error_count
       FROM usage_daily WHERE date = ?`,
    ).bind(today).first<{
      translation_count: number;
      replace_count: number;
      error_count: number;
    }>();
    expect(day).toMatchObject({ translation_count: 13, replace_count: 7, error_count: 4 });

    expect(await activeInstalls(today, today)).toBe(2);
    expect(await activeInstalls(windowStartUtcDate(today, 7), today)).toBe(2);
    expect(await activeInstalls(windowStartUtcDate(today, 30), today)).toBe(3);
    expect(await activeInstalls(addUtcDays(today, -40), today)).toBe(4);

    const rows = await env.DB.prepare('SELECT COUNT(*) AS n FROM usage_daily').first<{ n: number }>();
    expect(Number(rows?.n)).toBe(10);
  });

  it('counts a repeated submission again and keeps a single active install', async () => {
    await report(INSTALL_A, 'translation_success', today, 2);
    expect(await activeInstalls(today, today)).toBe(1);
    const row = await env.DB.prepare(
      'SELECT translation_count FROM usage_daily WHERE date = ?',
    ).bind(today).first<{ translation_count: number }>();
    expect(row?.translation_count).toBe(2);
  });

  it('does not lose increments when the same install is reported concurrently', async () => {
    const now = at(today);
    const responses = await Promise.all(
      Array.from({ length: 20 }, () => postEvent(INSTALL_B, 'translation_success', { now })),
    );
    for (const response of responses) {
      expect(response.status).toBe(204);
    }
    const row = await env.DB.prepare(
      'SELECT translation_count FROM usage_daily WHERE date = ?',
    ).bind(today).first<{ translation_count: number }>();
    expect(row?.translation_count).toBe(20);
    expect(await activeInstalls(today, today)).toBe(1);
  });

  it('stores the worker UTC date, including the previous UTC day for a positive offset', async () => {
    expect((await postEvent(INSTALL_A, 'translation_success', {
      now: new Date('2026-10-26T23:30:00.000Z'),
    })).status).toBe(204);
    expect((await postEvent(INSTALL_A, 'translation_success', {
      now: new Date('2026-10-27T00:30:00.000Z'),
    })).status).toBe(204);
    expect((await postEvent(INSTALL_B, 'translation_success', {
      now: new Date('2026-10-26T08:00:00.000+09:00'),
    })).status).toBe(204);

    const dates = await env.DB.prepare(
      'SELECT date, translation_count FROM usage_daily ORDER BY date',
    ).all<{ date: string; translation_count: number }>();
    expect(dates.results).toEqual([
      { date: '2026-10-25', translation_count: 1 },
      { date: '2026-10-26', translation_count: 1 },
      { date: '2026-10-27', translation_count: 1 },
    ]);
  });
});

describe('operator SQL', () => {
  it('runs the documented D1 queries for rolling UTC windows', async () => {
    async function insert(daysAgo: number, hash: string, translation: number, replace: number, error: number) {
      const modifier = daysAgo === 0 ? '+0 days' : `-${daysAgo} days`;
      await env.DB.prepare(
        `INSERT INTO usage_daily (date, install_hash, translation_count, replace_count, error_count)
         VALUES (date('now', ?), ?, ?, ?, ?)`,
      ).bind(modifier, hash, translation, replace, error).run();
    }

    await insert(0, '11'.repeat(32), 10, 1, 0);
    await insert(0, '22'.repeat(32), 3, 0, 0);
    await insert(0, '33'.repeat(32), 0, 0, 2);
    await insert(0, '44'.repeat(32), 0, 4, 0);
    await insert(1, '11'.repeat(32), 1, 0, 0);
    await insert(1, '22'.repeat(32), 1, 0, 0);
    await insert(2, '22'.repeat(32), 1, 0, 0);
    await insert(3, '22'.repeat(32), 1, 0, 0);
    await insert(10, '55'.repeat(32), 1, 0, 0);
    await insert(40, '66'.repeat(32), 1, 0, 0);
    await insert(89, '77'.repeat(32), 1, 0, 0);
    await insert(90, '88'.repeat(32), 1, 0, 0);

    const dau = await env.DB.prepare(todayDauSql).first<{ dau: number }>();
    const wau = await env.DB.prepare(rollingWauSql).first<{ wau: number }>();
    const mau = await env.DB.prepare(rollingMauSql).first<{ mau: number }>();
    const totals = await env.DB.prepare(rollingTotalsSql).first<{
      translation_count: number;
      replace_count: number;
      error_count: number;
    }>();
    const trend = await env.DB.prepare(dailyTrendSql).all<{
      date: string;
      dau: number;
      translation_count: number;
      replace_count: number;
      error_count: number;
    }>();

    expect(Number(dau?.dau)).toBe(2);
    expect(Number(wau?.wau)).toBe(2);
    expect(Number(mau?.mau)).toBe(3);
    expect(totals).toMatchObject({ translation_count: 18, replace_count: 5, error_count: 2 });
    expect(trend.results.map((row) => ({
      dau: Number(row.dau),
      translation_count: Number(row.translation_count),
      replace_count: Number(row.replace_count),
      error_count: Number(row.error_count),
    }))).toEqual([
      { dau: 1, translation_count: 1, replace_count: 0, error_count: 0 },
      { dau: 1, translation_count: 1, replace_count: 0, error_count: 0 },
      { dau: 1, translation_count: 1, replace_count: 0, error_count: 0 },
      { dau: 2, translation_count: 2, replace_count: 0, error_count: 0 },
      { dau: 2, translation_count: 13, replace_count: 5, error_count: 2 },
    ]);

    const outside = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM usage_daily WHERE date <= date('now', '-40 days')`,
    ).first<{ n: number }>();
    expect(Number(outside?.n)).toBe(3);
  });
});
