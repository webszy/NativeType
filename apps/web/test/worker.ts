import { analyticsEventsPath, handleEventRequest, handleScheduled } from '../server/utils/events';
import { corsHeaders, jsonError, resolveAllowedOrigins } from '../server/utils/http';

interface ScheduledTick {
  scheduledTime: number;
  cron: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === analyticsEventsPath) return handleEventRequest(request, env);
    return jsonError(404, 'not_found', corsHeaders(request, resolveAllowedOrigins(env)));
  },

  async scheduled(controller: ScheduledTick, env: Env): Promise<void> {
    await handleScheduled(env.DB, new Date(controller.scheduledTime));
  },
};
