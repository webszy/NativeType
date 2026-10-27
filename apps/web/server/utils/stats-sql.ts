/**
 * Operator queries for `wrangler d1 execute`. They are not an HTTP API.
 * `date('now')` is UTC in D1. Active installs are rows with translation_count > 0.
 * WAU and MAU are rolling windows ending today, inclusive, and count each
 * install_hash once. A day with no rows is a zero and does not appear in the trend.
 */

export const todayDauSql = `SELECT COUNT(*) AS dau
FROM usage_daily
WHERE date = date('now')
  AND translation_count > 0`;

export const rollingWauSql = `SELECT COUNT(DISTINCT install_hash) AS wau
FROM usage_daily
WHERE date BETWEEN date('now', '-6 days') AND date('now')
  AND translation_count > 0`;

export const rollingMauSql = `SELECT COUNT(DISTINCT install_hash) AS mau
FROM usage_daily
WHERE date BETWEEN date('now', '-29 days') AND date('now')
  AND translation_count > 0`;

export const dailyTrendSql = `SELECT
  date,
  SUM(CASE WHEN translation_count > 0 THEN 1 ELSE 0 END) AS dau,
  SUM(translation_count) AS translation_count,
  SUM(replace_count) AS replace_count,
  SUM(error_count) AS error_count
FROM usage_daily
WHERE date BETWEEN date('now', '-29 days') AND date('now')
GROUP BY date
ORDER BY date`;

export const rollingTotalsSql = `SELECT
  COALESCE(SUM(translation_count), 0) AS translation_count,
  COALESCE(SUM(replace_count), 0) AS replace_count,
  COALESCE(SUM(error_count), 0) AS error_count
FROM usage_daily
WHERE date BETWEEN date('now', '-29 days') AND date('now')`;
