import { handleEventRequest, handleScheduled } from './events';
import { jsonError, corsHeaders } from './http';

// Path matching stays explicit so /v1/translate can be added beside /v1/events.
export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/v1/events') return handleEventRequest(request, env);
    return jsonError(404, 'not_found', corsHeaders(request, env.ALLOWED_ORIGINS));
  },

  async scheduled(controller, env): Promise<void> {
    await handleScheduled(env.DB, new Date(controller.scheduledTime));
  },
} satisfies ExportedHandler<Env>;
