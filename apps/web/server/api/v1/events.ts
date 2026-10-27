import { handleEventRequest, type AnalyticsBindings } from '../../utils/events';
import { jsonError } from '../../utils/http';

export default defineEventHandler((event) => {
  const env = event.context.cloudflare?.env as AnalyticsBindings | undefined;
  if (!env) return jsonError(503, 'unavailable', new Headers());
  return handleEventRequest(toWebRequest(event), env);
});
