import type { ExportedHandler } from '@cloudflare/workers-types';
import nitroWorker from 'nitropack/presets/cloudflare/runtime/cloudflare-module';
import type { AnalyticsBindings } from '../server/utils/events';
import { corsHeaders, jsonError, MAX_BODY_BYTES, readBodyLimited, resolveAllowedOrigins } from '../server/utils/http';

type NitroBindings = Parameters<NonNullable<typeof nitroWorker.fetch>>[1];

export default {
  ...nitroWorker,
  async fetch(request, env, context) {
    // Nitro 2's adapter buffers the entire body before dispatching server routes.
    // Bound every request here, including unknown paths, before it reaches Nitro.
    if (request.body !== null) {
      const body = await readBodyLimited(request, MAX_BODY_BYTES);
      if (typeof body === 'string') {
        // A declared-length rejection has not consumed the stream. Cancel it so
        // the adapter cannot drain an unfinished upload before returning 413.
        if (!request.bodyUsed) await request.body.cancel().catch(() => undefined);
        const headers = corsHeaders(request, resolveAllowedOrigins(env));
        return body === 'too_large'
          ? jsonError(413, 'payload_too_large', headers)
          : jsonError(400, 'invalid_request', headers);
      }
      request = new Request(request, { body });
    }
    return nitroWorker.fetch!(request, env, context);
  },
} satisfies ExportedHandler<AnalyticsBindings & NitroBindings>;
