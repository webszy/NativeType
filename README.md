# NativeType

Write in your language. Publish in another.

Experimental open-source Chrome extension for frictionless cross-language writing.

**Status:** v0 / Experimental.

Current v0: **Chinese → Chrome Built-in Translator → English → Replace**.

Experimental build for X on desktop Chrome. New Post, Reply and Quote Post have been verified with Chrome’s real Translator and X’s current editor. Type Chinese in a post, reply, or quote-post composer, pause for one second, review the English preview, then choose **Replace**. **Retry** translates the current draft again. NativeType never clicks Post.

## Requirements

- Node.js 20.19+ and pnpm 11.24.0 for development.
- Desktop Google Chrome 138+ for installation and the built-in Translator API.

## Development

```sh
pnpm install
pnpm dev
```

WXT starts the development extension. Open X in that browser and sign in if needed. Production permissions below refer to `pnpm build`; WXT's development tooling may add development-only access.

## Installation

```sh
pnpm typecheck
pnpm build
```

In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `.output/chrome-mv3` inside this repository. Reload X after loading or updating the extension. `pnpm zip` optionally creates a distributable ZIP; unpack it before using Load unpacked.

## One-minute manual test

1. Use up-to-date **desktop Google Chrome (138+)** and open <https://x.com>.
2. Focus an empty New Post composer and type `你好，世界！今天开始尝试用英文分享我的想法。`.
3. Pause for one second. On first use, click **Enable translation**. Chrome may need to download its translation model/language pack; this first download can take longer than a minute and needs connectivity.
4. Review the English preview, optionally click **Retry**, then **Replace**.
5. Verify the composer contains English, the Post button remains enabled, and you can append text, move the caret, and undo normally. Publish only when you intend to.
6. Repeat in Reply/Quote Post, including multiline text and Chinese IME input. With two composers open, only the focused one should translate or change.

## Translator API

Uses the stable [`Translator` API](https://developer.chrome.com/docs/ai/translator-api), `availability({ sourceLanguage: 'zh', targetLanguage: 'en' })`, `create`, download progress, and `translate`. One instance is reused per page. First-use activation is explicit; downloadable/downloading models offer **Enable translation**, then report progress. An unavailable API/pair produces a readable status; errors offer Retry. There is no server fallback.

Chrome 138 introduced the stable desktop API; use the latest Chrome. Stable supported installations do **not** normally need an origin-trial token or experimental flags. Availability still depends on Chrome's policies, platform, language-pack availability and downloads. Chromium-derived browsers and incognito profiles may differ. If unavailable, try a regular profile on current Google Chrome, check browser policy and model download/connectivity, and reload X. We do not bypass a disabled API.

## Privacy and permissions

- No account, API key, server, or external translation API.
- Translation uses Chrome's built-in Translator API.
- NativeType itself does not upload text to a NativeType server, record drafts, or add analytics/telemetry. Chrome manages its own model downloads and implementation.
- Production Manifest V3 declares no `permissions` or `host_permissions`. Its only site match is `https://x.com/*`, allowing the content script to read the active composer and replace it on request. Chrome may still describe this as access to X site content.

## Implementation

- `entrypoints/content.ts`: focused composer tracking, one-second debounce, IME handling, stale-request protection, one-entry in-memory result reuse, and cleanup.
- `lib/translator.ts`: Chrome API availability, activation, download progress, cancellation, and instance lifecycle.
- `lib/editable.ts`: semantic X selector (`contenteditable`, `role`, `data-testid`), paragraph reading, native selection + a plain-text `paste` event. X's own paste handler updates the editor state and DOM; no direct `innerHTML` replacement, clipboard permission or private React state access.
- `lib/overlay.ts`: small Shadow DOM preview with Retry/Replace, matching X's light/dark background, scroll/resize positioning, transformed-dialog coordinates and temporary space to keep X's controls unobstructed.

## Verification

```sh
node --test tests/translator.test.mjs
pnpm typecheck
pnpm build
```

For the browser regression fixture:

```sh
pnpm exec vite --host 127.0.0.1 --port 5174
```

Open <http://127.0.0.1:5174/tests/browser.html> and click **Run regression tests**. It tests real DOM editing with a **fake Translator**, not Chrome's real translation model or X's React internals. Test files are not included in the production extension. No additional test dependency is needed.

See [VERIFICATION.md](VERIFICATION.md) for the executed checks, real-X observations and testing limits.

## License

[MIT License](LICENSE).

## Current limitations

- Chrome Built-in Translator API compatibility; desktop Chrome only.
- Chinese → English only (Han character detection; not full language identification).
- X-first; New Post, Reply and Quote Post depend on X retaining its current semantic composer attributes.
- Experimental contenteditable support: replacement depends on X's editor accepting a plain-text paste event. X may change its editor behavior. Formatting/mention entities can be flattened by whole-draft replacement; review before posting.
- First model download can take time. Retry is deterministic machine translation, not AI rewriting.
- Very tall/offscreen composers may require scrolling to reach a preview; it is kept outside the input text.
- The 0.0.1 build passed real-X translation, Replace and continued-editing checks in New Post, Reply and Quote Post. The 0.0.2 cleanup passed the local browser regression fixture; it has not been retested on X. Posting was intentionally not executed. A cold language-pack download and rich-text entities were not tested on X.
