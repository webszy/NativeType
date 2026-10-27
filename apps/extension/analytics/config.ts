// These are public deployment addresses, not credentials.
const productionHosts = new Set(['api.typewith.si', 'nativetype-api.cycceme.workers.dev']);

export function analyticsEndpoint(value: unknown, mode: string): string | undefined {
  if (typeof value !== 'string' || !value || value !== value.trim()) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') return undefined;
    const hostname = url.hostname.replace(/\.$/, '');
    const local = hostname === 'localhost' || hostname.endsWith('.localhost')
      || hostname === '[::1]' || /^127\./.test(hostname)
      || hostname.endsWith('.test') || hostname.endsWith('.invalid');
    if (mode === 'production' ? local : productionHosts.has(hostname)) return undefined;
    return new URL('/v1/events', url.origin).href;
  } catch {
    return undefined;
  }
}
