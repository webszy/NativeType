# Architecture

NativeType translates the focused X composer with Chrome's built-in translator, shows a preview, and replaces the draft only when the user chooses Replace. The default pair is Chinese → English. Settings can change the pair and can turn New Post, Reply, or Quote Post off independently.

The Chrome extension is `apps/extension`. `apps/api` is a future Cloudflare Workers package and is not called by the extension. `packages/contracts` is reserved for shared types and currently exports nothing.

## Modules

Paths below are inside `apps/extension/`.

- `entrypoints/content.ts` resolves the platform and provider, then starts and stops the content script. `entrypoints/background.ts` opens the options page from the toolbar icon. `entrypoints/options/` is that page.
- `settings/store.ts` owns the schema, defaults, and validation. `settings/chrome.ts` reads `chrome.storage.local`. `settings/page.ts` renders Settings. The page does not call Translator or Language Detector.
- `core/controller.ts` tracks the focused editor, the X context switch, IME, the one-second debounce, language detection, stale-request protection, retry, and replace. `core/session.ts` holds that request state, including the language pair on each request.
- `platforms/x.ts` owns X's composer selector, text reading, local observation, post/reply/quote classification, the verified paste replacement, and preview placement. `platforms/registry.ts` is a static list.
- `translators/chrome.ts` owns Chrome Translator availability, activation, download progress, one instance per language pair, cancellation, and errors. `translators/registry.ts` returns that provider.
- `languages/catalog.ts` lists Chrome's documented translator languages. `languages/config.ts` owns the default pair, the Han-script fast path, and language matching. `languages/detector.ts` calls Chrome's Language Detector for every trigger language other than Chinese.
- `ui/overlay.ts` owns the preview card. It receives placement from the platform and does not call the translator.

Core depends on those interfaces. It does not contain X selectors, Draft.js behavior, `Translator.create`, or `chrome.storage`.

## Settings and activation

Missing or corrupt storage becomes the default: Chinese → English, and post, reply, and quote all enabled. Invalid language codes fall back per field. A stored pair is not erased because a language pack is currently unavailable. Trigger and target are never saved as the same language.

On an X page the order is: active composer, writing context, that context's switch, trigger check, translator, preview. A disabled or unrecognized context does not show UI, detect language, or translate, and it does not change the draft. Turning the current context off cancels the in-flight request, hides the preview, and restores the temporary input height. Local composer observation includes quote attachments and reply anchors. Replacement checks the current context both when clicked and immediately before X receives the paste.

Chinese input still matches on any Han character, for any target language. Traditional Chinese and every other trigger language go to the detector. A generic `zh` result for a Traditional Chinese trigger shows an upgrade message because script detection requires Chrome 151+. The detector is created only when a translation needs it, and a downloadable model waits for Enable translation.

The Settings page serializes writes and keeps the latest pending form state. Storage notifications do not overwrite local edits while a save is pending, and a slow initial load cannot replace newer changes.

## Extending later

A new platform is a `PlatformAdapter` in `platforms/`, one line in `platforms/registry.ts`, an explicit host in the content-script matches, and a browser check. A new translator is a `TranslationProvider` in `translators/` and one registry entry. A newly supported Chrome translator language is one entry in `languages/catalog.ts`.

The manifest host stays explicit in the content script. Registry code does not generate it. There is no plugin loader or provider picker. The `storage` permission is only for this settings record.
