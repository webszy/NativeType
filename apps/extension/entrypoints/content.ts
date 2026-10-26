import { startNativeType } from '../core/controller';
import { defaultLanguagePair } from '../languages/config';
import { createTriggerDetector } from '../languages/detector';
import { resolvePlatform } from '../platforms/registry';
import { createChromeSettingsStore } from '../settings/chrome';
import { getTranslationProvider } from '../translators/registry';

export default defineContentScript({
  matches: ['https://x.com/*'],
  runAt: 'document_idle',
  main(ctx) {
    const platform = resolvePlatform(window.location);
    if (!platform) return;
    startNativeType({
      platform,
      provider: getTranslationProvider('chrome'),
      languagePair: defaultLanguagePair,
      settings: createChromeSettingsStore(),
      detector: createTriggerDetector(),
      host: {
        listen: (target, type, listener) => ctx.addEventListener(target, type, listener),
        onInvalidated: listener => ctx.onInvalidated(listener),
      },
    });
  },
});
