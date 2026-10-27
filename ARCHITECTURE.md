# Architecture

NativeType translates the focused X composer with Chrome's built-in translator, shows a preview, and replaces the draft only when the user chooses Replace. The default pair is Chinese → English. Settings can change the pair and can turn New Post, Reply, or Quote Post off independently.

The Chrome extension is `apps/extension`. `apps/web` is the Nuxt site and the Cloudflare Worker for optional pseudonymous usage events. The extension reports only after the user opts in. `packages/contracts` exports the event types and runtime validator used by both packages. Translation still happens only in the extension.

## Modules

Paths below are inside `apps/extension/`.

- `entrypoints/content.ts` resolves the platform and provider, then starts and stops the content script. `entrypoints/background.ts` opens the options page from the toolbar icon. `entrypoints/options/` is that page.
- `settings/store.ts` owns the schema, defaults, and validation. `settings/chrome.ts` reads `chrome.storage.local`. `settings/page.ts` renders Settings. The page does not call Translator or Language Detector.
- `core/controller.ts` tracks the focused editor, the X context switch, IME, the one-second debounce, language detection, stale-request protection, retry, and replace. `core/session.ts` holds that request state, including the language pair on each request.
- `platforms/x.ts` owns X's composer selector, text reading, local observation, post/reply/quote classification, the verified paste replacement, and preview placement. `platforms/registry.ts` is a static list.
- `translators/chrome.ts` owns Chrome Translator availability, activation, download progress, one instance per language pair, cancellation, and errors. `translators/registry.ts` returns that provider.
- `languages/catalog.ts` lists Chrome's documented translator languages. `languages/config.ts` owns the default pair, the Han-script fast path, and language matching. `languages/detector.ts` calls Chrome's Language Detector for every trigger language other than Chinese.
- `ui/overlay.ts` owns the preview card. It receives placement from the platform and does not call the translator.
- `analytics/client.ts` validates event-only runtime messages. The content entry injects it into the controller. `analytics/background.ts` owns consent checks, UUID lifecycle and single-attempt fetches. The existing background entry validates internal senders, adapts local storage, and replies asynchronously. No webpage/Main World analytics bridge exists.

Core depends on those interfaces. It does not contain X selectors, Draft.js behavior, `Translator.create`, or `chrome.storage`.

## Settings and activation

Missing or corrupt storage becomes the default: Chinese → English, post/reply/quote enabled, and analytics off. Analytics requires an explicit `analytics.enabled: true` in the supported schema. Invalid language codes fall back per field. A stored pair is not erased because a language pack is currently unavailable. Trigger and target are never saved as the same language.

On an X page the order is: active composer, writing context, that context's switch, trigger check, translator, preview. A disabled or unrecognized context does not show UI, detect language, or translate, and it does not change the draft. Turning the current context off cancels the in-flight request, hides the preview, and restores the temporary input height. Local composer observation includes quote attachments and reply anchors. Replacement checks the current context both when clicked and immediately before X receives the paste.

Chinese input still matches on any Han character, for any target language. Traditional Chinese and every other trigger language go to the detector. A generic `zh` result for a Traditional Chinese trigger shows an upgrade message because script detection requires Chrome 151+. The detector is created only when a translation needs it, and a downloadable model waits for Enable translation.

The Settings page serializes writes and keeps the latest pending form state. Storage notifications do not overwrite local edits while a save is pending, and a slow initial load cannot replace newer changes.

## Extending later

A new platform is a `PlatformAdapter` in `platforms/`, one line in `platforms/registry.ts`, an explicit host in the content-script matches, and a browser check. A new translator is a `TranslationProvider` in `translators/` and one registry entry. A newly supported Chrome translator language is one entry in `languages/catalog.ts`.

The X manifest match stays explicit in the content script. Registry code does not generate it. There is no plugin loader or provider picker. `storage` is used for settings and the optional random installation ID. The only additional production host permission is the validated statistics API origin.

## API

`apps/web` exposes `POST /api/v1/events` and a daily D1 retention cron on the same Worker as the website. The event names and the error body live in `@nativetype/contracts`. The Worker checks the body again at runtime. It stores one aggregated row per UTC date and hashed install id. There is no translate route. See `apps/web/README.md`.

The controller emits `translation_success` after a current completed result enters Preview; cache re-renders do not emit. A verified `PlatformAdapter.replaceText()` success emits `replace_success`. A current provider execution ending in an error emits `translation_error`; detection, activation prompts, aborts and stale results do not. These calls never await a statistics result.

Background reads persisted consent again for each event, serializes short ID storage operations, and sends exactly `{ installId, event }`. The random UUID persists across background restarts and normal updates. Disabling aborts pending requests and removes it; re-enabling generates another. A request has a four-second timeout, accepts only 204 as success, omits credentials and referrers, rejects redirects and never retries. At most eight reports can be pending in memory; excess reports are dropped. No event is persisted or replayed.

`WXT_ANALYTICS_API_BASE_URL` is a public HTTPS base URL. Production uses `https://typewith.si/api`, preserving `/api` when appending `/v1/events`. Production builds require a valid value; development has no fallback and rejects known production hosts. The same validator controls the generated host permission and runtime endpoint. See `_docs/analytics-integration.md` for local D1 checks and publication disclosures.
