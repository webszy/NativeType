import { handleScheduled } from '../utils/events';
import type { UsageDatabase } from '../utils/analytics';

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('cloudflare:scheduled', async ({ controller, env }) => {
    const db = (env as { DB?: UsageDatabase } | undefined)?.DB;
    if (!db) throw new Error('usage retention failed');
    await handleScheduled(db, new Date(controller.scheduledTime));
  });
});
