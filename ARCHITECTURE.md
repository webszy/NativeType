# Architecture

NativeType still does one thing: Chinese text in an X composer, Chrome's built-in translator, an English preview, then Replace. This layout is the boundary for later platforms, providers, and languages. It does not add those products.

## Modules

- `entrypoints/content.ts` resolves the platform, provider, and language pair, then starts and stops the content script.
- `core/controller.ts` tracks the focused editor, IME, the one-second debounce, stale-request protection, retry, and replace. `core/session.ts` holds that request state.
- `platforms/x.ts` owns X's composer selector, text reading, local observation, the verified paste replacement, and preview placement. `platforms/registry.ts` is a static list.
- `translators/chrome.ts` owns Chrome Translator availability, activation, download progress, instance reuse, cancellation, and errors. `translators/registry.ts` returns that provider.
- `languages/config.ts` owns the `zh` → `en` pair and the Han-script input check.
- `ui/overlay.ts` owns the preview card. It receives placement from the platform and does not call the translator.

Core depends on those interfaces. It does not contain X selectors, Draft.js behavior, or `Translator.create`.

## Extending later

A new platform is a `PlatformAdapter` in `platforms/`, one line in `platforms/registry.ts`, an explicit host in the content-script matches, and a browser check. A new translator is a `TranslationProvider` in `translators/` and one registry entry. A new language is a change to `languages/config.ts`.

The manifest host stays explicit in the content script. Registry code does not generate it. There is no plugin loader, provider picker, or language picker.
