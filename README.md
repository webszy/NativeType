# NativeType

Write in your language. Publish in another.

Experimental open-source Chrome extension for frictionless cross-language writing.

**Status:** Experimental, version 0.0.4.

Default: **Chinese → Chrome Built-in Translator → English → Replace**. Settings can change the trigger language, the target language, and which X composers run translation.

Experimental build for X on desktop Chrome. The original Chinese → English flow was verified with Chrome’s real Translator and X’s current editor. Type in the configured language, pause for one second, review the preview, then choose **Replace**. **Retry** translates the current draft again. NativeType never clicks Post. Click the toolbar icon to open Settings.

## Requirements

- Node.js 20.19+ and pnpm 11.24.0 for development.
- Desktop Google Chrome 138+ for installation and the built-in Translator API.

## Repository

pnpm workspaces, without Turborepo or Nx:

```text
apps/extension/        Chrome extension (WXT)
apps/web/              Nuxt 4 website and analytics API
packages/contracts/    Shared types for the extension and API
```

Run commands from the repository root. These call the extension package:

```sh
pnpm dev:extension
pnpm build:extension
pnpm test:extension
```

The same scripts work through the filter:

```sh
pnpm --filter @nativetype/extension dev
pnpm --filter @nativetype/extension build
pnpm --filter @nativetype/extension test
```

`pnpm dev`, `pnpm build`, and `pnpm zip` remain the root aliases for the extension. `pnpm typecheck` also checks `@nativetype/contracts` and `@nativetype/web`. Optional statistics reuse the contracts package and the Nuxt server route `POST /api/v1/events`. Website and API commands are `pnpm dev:web`, `pnpm test:web`, `pnpm build:web`, and `pnpm db:migrate:web:local`. Remote migration and deploy are documented in `apps/web/README.md` and are not part of the extension workflow.

## Development

```sh
pnpm install
pnpm dev:extension
```

WXT starts the development extension from `apps/extension`. Open X in that browser and sign in if needed. Production permissions below refer to `pnpm build`; WXT's development tooling may add development-only access.

Development statistics have no default endpoint. Copy `apps/extension/.env.development.example` to `.env.development.local` in the same directory and set `WXT_ANALYTICS_API_BASE_URL` to a separate HTTPS local/test Worker base URL. Known production hosts are rejected outside production mode. Production builds read the public base URL `https://typewith.si/api` from `.env.production` and fail if it is missing or invalid. The base path is preserved, so statistics are sent to `https://typewith.si/api/v1/events`. These URLs are not credentials; server secrets must never be added to extension environment files. See [Analytics integration and manual checks](_docs/analytics-integration.md).

## Installation

```sh
pnpm typecheck
pnpm build
```

In Chrome, open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select `apps/extension/dist/chrome-mv3`. Reload X after loading or updating the extension. `pnpm zip` creates `apps/extension/dist/nativetype-0.0.4-chrome.zip`; unpack it before using Load unpacked. The zip keeps the `nativetype` artifact name so it can update the existing Chrome Web Store item. The current extension version is `0.0.4`.

## Chrome Web Store screenshots

With current desktop Google Chrome installed, run:

```sh
pnpm install
pnpm screenshot:store
```

The script builds the production extension into `apps/extension/dist/chrome-mv3`, loads that unpacked Manifest V3 build into a separate headed Chrome window, and opens X's New Post composer. **On the first run, sign in to X manually in that window**, including any authentication challenges. The script waits up to ten minutes and resumes automatically after login. Keep the window open and let the script control the composer once login completes. Future runs reuse that login and Chrome's downloaded language models. Your everyday Chrome profile is not used.

The persistent profile lives **outside the repository** in the OS cache, under `NativeType/store-screenshots/<project-id>/chrome`: `~/Library/Caches/` on macOS, `$XDG_CACHE_HOME` or `~/.cache/` on Linux, and `%LOCALAPPDATA%` on Windows. The terminal prints its exact location. Treat it as private authentication data; never commit or copy it into store assets. No cookies, passwords, tokens, storage-state files, traces or HAR recordings are exported. An optional in-repository profile is restricted to the gitignored `.cache/store-screenshots/` directory.

The three live browser-page captures are saved to `apps/extension/store-assets/screenshots/`:

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

An existing Chrome may require manually loading the fresh `apps/extension/dist/chrome-mv3` build in `chrome://extensions`, because extension installation through CDP normally requires a launch flag. The script checks the enabled unpacked extension's build path when it cannot load it automatically. If NativeType was installed from this project's legacy `.output/chrome-mv3` path, the script copies the production `apps/extension/dist/chrome-mv3` build there and reloads that same installation, preserving its extension ID. Keep only one enabled NativeType installation in that browser. The default command continues to use its dedicated persistent profile. `--connect` cannot be combined with `--headless`, `--profile`, or `--executable`.

## One-minute manual test

1. Use up-to-date **desktop Google Chrome (138+)** and open <https://x.com>.
2. Focus an empty New Post composer and type `你好，世界！今天开始尝试用英文分享我的想法。`.
3. Pause for one second. On first use, click **Enable translation**. Chrome may need to download its translation model/language pack; this first download can take longer than a minute and needs connectivity.
4. Review the English preview, optionally click **Retry**, then **Replace**.
5. Verify the composer contains English, the Post button remains enabled, and you can append text, move the caret, and undo normally. Publish only when you intend to.
6. Repeat in Reply/Quote Post, including multiline text and Chinese IME input. With two composers open, only the focused one should translate or change.

Click the NativeType toolbar icon or the gear beside the language pair in the translation preview to open Settings in its own tab. Changes save automatically and apply to X tabs that are already open. Returning to an X tab also rechecks saved settings before resuming its preview. Turning off Replies, for example, hides NativeType on reply composers and leaves the draft untouched. A non-Chinese trigger uses Chrome’s Language Detector and does not translate text in another language. The first use of a language pair still asks for **Enable translation** before Chrome downloads that pack. Settings does not download language packs by itself.

## Translator API

Uses the stable [`Translator` API](https://developer.chrome.com/docs/ai/translator-api). `availability`, `create`, download progress, and `translate` receive the source and target languages from Settings. Each language pair keeps its own instance. Switching pairs drops the others so an old result cannot fill the new preview. First-use activation is explicit; downloadable/downloading models offer **Enable translation**, then report progress. An unavailable API/pair produces a readable status; errors offer Retry. There is no server fallback.

Chinese as the trigger language still uses the Han-script check and does not call the Language Detector. Every other trigger language asks Chrome’s Language Detector (`LanguageDetector`, or `ai.languageDetector` on earlier Chrome 138 builds). Traditional Chinese as a trigger requires Chrome 151+ to distinguish Chinese scripts. If an older detector returns only `zh`, the preview explains how to upgrade or choose Chinese as the trigger. Short text, mixed languages, low confidence, and text that is only a link, emoji, mention, or punctuation do not translate. If detection is missing, the preview says NativeType will not guess.

Chrome 138 introduced the stable desktop API; use the latest Chrome. Stable supported installations do **not** normally need an origin-trial token or experimental flags. Availability still depends on Chrome's policies, platform, language-pack availability and downloads. Chromium-derived browsers and incognito profiles may differ. If unavailable, try a regular profile on current Google Chrome, check browser policy and model download/connectivity, and reload X. We do not bypass a disabled API.

## Privacy and permissions

- No account, API key, or external translation API is needed for translation.
- Translation uses Chrome's built-in Translator API.
- NativeType does not upload text or translations or record drafts. Optional usage statistics default off, including on upgrade. Enabling the Privacy & Analytics switch sends only a random installation ID and successful translation, successful replacement, or terminal translation error event name to NativeType's Cloudflare Worker. Its D1 database keeps daily counts with a keyed hash of the ID for 90 UTC dates. This is pseudonymous measurement of participating installations, not an absolute anonymity guarantee or a count of people. Turning it off deletes the local ID, stops reporting and attempts to cancel pending requests. Already accepted counts expire on the server's retention schedule. Re-enabling creates a new ID. Chrome manages its own model downloads and implementation.
- Production Manifest V3 retains `storage` and adds only `https://typewith.si/*` in `host_permissions`. The only content-script site match is still `https://x.com/*`. The storage permission saves preferences and the optional installation ID; draft text is not stored. The API permission allows background statistics requests and can trigger a Chrome install/update permission warning. The toolbar icon opens Settings; there is no popup or separate permission wizard.

## Implementation

See [ARCHITECTURE.md](ARCHITECTURE.md) for module boundaries and the later extension points.

- `entrypoints/content.ts`: resolves the X platform and Chrome provider, then starts and stops the content script with the saved settings and trigger detector.
- `entrypoints/background.ts`: opens Settings and owns statistics requests and installation ID storage. `entrypoints/options/`: the Settings page.
- `analytics/`: shared-contract message validation, a fire-and-forget client, endpoint validation, and bounded background reporting. No SDK, heartbeat, retry, or persistent event queue.
- `settings/`: settings types, defaults, validation, `chrome.storage.local`, and the page renderer.
- `settings/config.ts`: platform groups, collapse titles/default state, context labels and default values. The Settings UI and stored-context validation use this object when adding platforms or options.
- `core/`: focused composer tracking, X context gate, one-second debounce, IME handling, stale-request protection, in-memory result reuse for the current language pair, retry, replace, and cleanup.
- `translators/chrome.ts`: Chrome API availability, activation, download progress, cancellation, and one instance per language pair.
- `platforms/x.ts`: semantic X selector (`contenteditable`, `role`, `data-testid`), paragraph reading, local editor observation, post/reply/quote classification, native selection + a plain-text `paste` event. X's own paste handler updates the editor state and DOM; no direct `innerHTML` replacement, clipboard permission or private React state access.
- `languages/`: the supported language list, the default Chinese → English pair, the Han-script fast path, and the Language Detector.
- `ui/overlay.ts`: Shadow DOM preview with Retry/Replace and Close, matching X's light/dark background. A top-layer popover stays 4px below the last rendered text line, including wrapping and line breaks, with a two-character indent. It follows edits immediately while the next translation is pending and updates on scroll/resize. The X adapter supplies an input container whose minimum height temporarily expands to fit the text and preview; hiding, closing, replacing, disabling the current context, or switching composers restores its original height style.

## Verification

```sh
pnpm test:extension
pnpm typecheck
pnpm build
```

`pnpm test:extension` runs `apps/extension/tests/translator.test.mjs`. It loads the language, core, X platform, Chrome provider, and boundary checks. CI uses that command.

For the browser regression fixture:

```sh
pnpm --filter @nativetype/extension exec vite --host 127.0.0.1 --port 5174
```

Open <http://127.0.0.1:5174/tests/browser.html> and click **Run regression tests**. It tests real DOM editing with a **fake Translator**, not Chrome's real translation model or X's React internals. <http://127.0.0.1:5174/tests/settings-page.html> mounts the Settings page against an in-memory store. Test files are not included in the production extension. No additional test dependency is needed.

See [VERIFICATION.md](VERIFICATION.md) for the executed checks, real-X observations and testing limits.

## License

[MIT License](LICENSE).

## Current limitations

- Chrome Built-in Translator API compatibility; desktop Chrome only.
- Trigger languages other than Chinese need Chrome’s Language Detector. NativeType does not guess when detection is unavailable, and it does not translate a low-confidence or mixed result.
- A saved language pair is kept even when that pack is not installed yet. Chrome may still report the pair as unavailable or require a download the first time it is used.
- X-first; New Post, Reply and Quote Post depend on X retaining its current composer structure. Quote and reply detection uses the composer’s surrounding DOM, not the URL alone. An edit-post composer is not identified separately and can be treated as a new post. A composer with conflicting quote and reply signals is left alone.
- Experimental contenteditable support: replacement depends on X's editor accepting a plain-text paste event. X may change its editor behavior. Formatting/mention entities can be flattened by whole-draft replacement; review before posting.
- First model download can take time. Retry is deterministic machine translation, not AI rewriting.
- Very tall/offscreen composers may require scrolling to reach a preview; it is kept outside the input text.
- The 0.0.4 real-X run exercised language settings, New posts and Replies switches, replacement, persistence, and two Settings tabs. After follow-up fixes, quote switches, language changes and Replace also passed on real X. Automated checks pass 71 Node tests and 57 local browser checks. The original intermittent settings notification failure remains difficult to reproduce; missed-notification recovery has regression coverage. See [VERIFICATION.md](VERIFICATION.md). Cold language-pack downloads and rich-text entities remain unverified on X.
