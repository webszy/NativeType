const UTC_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** UTC calendar date. Client timestamps are never used. */
export function utcDateString(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function addUtcDays(date: string, days: number): string {
  const match = UTC_DATE.exec(date);
  if (!match) {
    throw new Error("expected a UTC date");
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new Error("expected a real UTC date");
  }
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export const RETENTION_DAYS = 90;
export const WAU_DAYS = 7;
export const MAU_DAYS = 30;

/** Oldest UTC date that is still inside the inclusive retention window. */
export function oldestRetainedUtcDate(
  today: string,
  retentionDays = RETENTION_DAYS,
): string {
  return addUtcDays(today, -(retentionDays - 1));
}

/** First UTC date of an inclusive window that ends on endDate. */
export function windowStartUtcDate(endDate: string, windowDays: number): string {
  return addUtcDays(endDate, -(windowDays - 1));
}
