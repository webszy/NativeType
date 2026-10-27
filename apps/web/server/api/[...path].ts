import type { AnalyticsBindings } from '../utils/events';
import { corsHeaders, jsonError, resolveAllowedOrigins } from '../utils/http';

/** Unknown `/api/**` paths stay a JSON 404. Site pages are not handled here. */
export default defineEventHandler((event) => {
  const env = event.context.cloudflare?.env as Partial<AnalyticsBindings> | undefined;
  const request = toWebRequest(event);
  return jsonError(404, 'not_found', corsHeaders(request, resolveAllowedOrigins(env ?? {})));
});
