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

In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `dist/chrome-mv3` inside this repository. Reload X after loading or updating the extension. `pnpm zip` optionally creates a distributable ZIP; unpack it before using Load unpacked.

## Chrome Web Store screenshots

With current desktop Google Chrome installed, run:

```sh
pnpm install
pnpm screenshot:store
```

The script builds the production extension into `dist/chrome-mv3`, loads that unpacked Manifest V3 build into a separate headed Chrome window, and opens X's New Post composer. **On the first run, sign in to X manually in that window**, including any authentication challenges. The script waits up to ten minutes and resumes automatically after login. Keep the window open and let the script control the composer once login completes. Future runs reuse that login and Chrome's downloaded language models. Your everyday Chrome profile is not used.

The persistent profile lives **outside the repository** in the OS cache, under `NativeType/store-screenshots/<project-id>/chrome`: `~/Library/Caches/` on macOS, `$XDG_CACHE_HOME` or `~/.cache/` on Linux, and `%LOCALAPPDATA%` on Windows. The terminal prints its exact location. Treat it as private authentication data; never commit or copy it into store assets. No cookies, passwords, tokens, storage-state files, traces or HAR recordings are exported. An optional in-repository profile is restricted to the gitignored `.cache/store-screenshots/` directory.

The three live browser-page captures are saved to `store-assets/screenshots/`:

| File | Real NativeType / X state |
| --- | --- |
| `01-write.png` | Chinese draft; NativeType's own Close button dismisses the initial preview. |
| `02-preview.png` | Same Chinese draft with the English translation preview and Replace button visible. |
| `03-replace.png` | NativeType's Replace button puts the English text in X; the preview closes. |

Each PNG is **exactly 1280 × 800 pixels**, with a 1280 × 800 viewport and CSS pixel capture at device scale 1. The script verifies the PNG dimensions, composer text and preview state, and waits for fonts, stable layout and finite animations. It captures the actual X page and production extension UI; browser toolbars are outside the viewport. X's account, theme and live background content belong to the persistent session, so use the same account and appearance for consistent future captures.

Demo input: `今天终于把 NativeType 的第一个版本做完了。` Expected preview and replacement: `Finally finished the first version of NativeType today.` This is the accepted real Chrome translation. The script uses ordinary editor input, automatically clicks NativeType's **Enable translation** if Chrome needs to download its language pack, and never publishes a post. A different real Chrome translation fails the capture instead of substituting the expected text. Login, translation or replacement failures preserve the previous screenshot set. Existing unrelated drafts are not overwritten, and the script clears its own known demo text before closing.

Chrome's model/version can produce different wording. To approve another known real result, pass its exact text with `--expected-translation`; this changes the validation only and still requires Chrome to produce that text.

Optional settings:

```sh
pnpm screenshot:store --help
pnpm screenshot:store --headless # After the one-time headed login
pnpm screenshot:store --login-timeout 1200000 --translation-timeout 1200000
pnpm screenshot:store --profile .cache/store-screenshots/chrome-profile
pnpm screenshot:store --executable /path/to/a/current/chrome
pnpm screenshot:store --connect # Reuse your running Chrome and its X login
```

System Chrome is recommended because NativeType needs Chrome's real built-in Translator. Current Chrome loads the extension through `Extensions.loadUnpacked` with `--enable-unsafe-extension-debugging`; the removed branded-Chrome `--load-extension` switch is not needed. If you prefer Playwright Chromium, install it with `pnpm exec playwright install chromium` and run `pnpm screenshot:store --browser chromium`. That browser has a separate persistent profile and may lack Chrome's translation API/models; the workflow reports that limitation instead of mocking translation. Close any other capture process using the same profile before starting another run.

To reuse your everyday Chrome (144+) without another X login, open `chrome://inspect/#remote-debugging` in that browser and enable **Allow remote debugging for this browser instance**. Then run `pnpm screenshot:store --connect` and approve Chrome's connection dialog. Chrome's own consent allows a local debugging client to control that session; the capture script scopes Playwright to a new tab, clears only its own demo, closes that tab, and disconnects while leaving the existing browser and tabs open. Existing tabs are not paused or initialized by Playwright. It reads only `DevToolsActivePort` to discover the local WebSocket endpoint; it does not copy or export the profile. Chrome's consent-based server may return 404 for `/json/version`, so `--connect` uses the WebSocket endpoint directly. Use `--chrome-data-dir PATH` for a non-default Chrome user-data root, or `--cdp URL` for another explicitly enabled local debugging endpoint.

An existing Chrome may require manually loading the fresh `dist/chrome-mv3` build in `chrome://extensions`, because extension installation through CDP normally requires a launch flag. The script checks the enabled unpacked extension's build path when it cannot load it automatically. If NativeType was installed from this project's legacy `.output/chrome-mv3` path, the script copies the production `dist/chrome-mv3` build there and reloads that same installation, preserving its extension ID. Keep only one enabled NativeType installation in that browser. The default command continues to use its dedicated persistent profile. `--connect` cannot be combined with `--headless`, `--profile`, or `--executable`.

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

See [ARCHITECTURE.md](ARCHITECTURE.md) for module boundaries and the later extension points.

- `entrypoints/content.ts`: resolves the X platform, Chrome provider, and zh → en pair, then starts and stops the content script.
- `core/`: focused composer tracking, one-second debounce, IME handling, stale-request protection, one-entry in-memory result reuse, retry, replace, and cleanup.
- `translators/chrome.ts`: Chrome API availability, activation, download progress, cancellation, and instance lifecycle.
- `platforms/x.ts`: semantic X selector (`contenteditable`, `role`, `data-testid`), paragraph reading, local editor observation, native selection + a plain-text `paste` event. X's own paste handler updates the editor state and DOM; no direct `innerHTML` replacement, clipboard permission or private React state access.
- `languages/config.ts`: the zh → en pair and Han-script input check.
- `ui/overlay.ts`: Shadow DOM preview with Retry/Replace and Close, matching X's light/dark background. A top-layer popover stays 4px below the last rendered text line, including wrapping and line breaks, with a two-character indent. It follows edits immediately while the next translation is pending and updates on scroll/resize. The X adapter supplies an input container whose minimum height temporarily expands to fit the text and preview; hiding, closing, replacing or switching composers restores its original height style.

## Verification

```sh
node --test tests/translator.test.mjs
pnpm typecheck
pnpm build
```

`tests/translator.test.mjs` loads the language, core, X platform, Chrome provider, and boundary checks. CI uses that same command.

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
