import type { AnalyticsBindings } from '../utils/events';

declare module 'h3' {
  interface H3EventContext {
    cloudflare?: {
      env?: AnalyticsBindings;
    };
  }
}

export {};
