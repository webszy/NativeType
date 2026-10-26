# NativeType verification

**Current status: quote switches, language changes, and Replace passed on real X after reloading the fixed 0.0.4 extension. Settings recovery also has regression coverage for missed notifications and asynchronous races. The original intermittent notification failure has not been reproduced consistently.**

Earlier version results below are historical. The latest automated checks pass 75 Node tests, 57 local browser checks, and extension TypeScript; the production 0.0.4 build and zip are ready.

## Build and automated checks

- `pnpm typecheck`: passed with WXT’s strict TypeScript configuration.
- `pnpm build`: passed for 0.0.2; Chrome Manifest V3, 13.56 kB total (264 B manifest + 13.29 kB content script).
- `node --test tests/translator.test.mjs`: 6 tests passed. Covers absent APIs and unavailable pairs, explicit activation, download progress, instance reuse, shared initialization, cancellation, retryable initialization errors, translation errors/empty output and disposal during download.
- `tests/browser.html`: all 22 regression checks passed in the local browser. Covers English filtering, debounce reset, activation, preview, deduplication, Retry and instance reuse, editor-handled paste replacement, equivalent text-node selection boundaries, continued editing, multiline replacement, IME composition/commit, stale results, modal containment, transformed-dialog coordinates, transparent-white theme detection, dialog clipping, toolbar separation, spacing restoration, active-composer isolation and removal cleanup.
- The browser fixture uses a fake Translator and a minimal paste adapter. It verifies NativeType’s DOM/event orchestration, not Chrome’s model or X’s React editor; the real-X checks below provide that evidence.
- Production manifest contains only the `https://x.com/*` content script. It has no `permissions`, `host_permissions`, background, popup, options or external resources. Tests and screenshots are not packaged.
- No existing lint configuration/script; no lint toolchain was added. No dependencies were added or upgraded for v0.

## Real Chrome + X checks

The NativeType 0.0.1 build was loaded unpacked from `.output/chrome-mv3` in desktop Google Chrome. Testing used the X page explicitly authorized by the user as disposable. No post, reply or quote was published.

| Composer | Chinese input | Chrome’s preview and replacement | Result |
| --- | --- | --- | --- |
| Home/New Post | `你好，世界！` | `hello world!` | Only English remained; continued typing, select-all/delete, undo and Post state worked. |
| New Post dialog | Two lines: `你好，世界！` and `今天开始尝试用英文分享我的想法。` | `hello world! Start trying to share my thoughts in English today.` | Retry worked; Replace removed all Chinese; appending ` Still editable.` worked; Post stayed enabled. Clearing disabled Post. |
| Reply dialog | `谢谢分享，祝你今天愉快！` | `Thank you for sharing, and I wish you a happy today!` | Replace removed all Chinese; typing ` Still editable.` worked; Reply stayed enabled. Clearing disabled Reply. |
| Quote Post dialog | `这个观点很有意思，值得继续讨论。` | `This view is interesting and worth continuing to discuss.` | Replace removed all Chinese; typing ` Still editable.` worked; Post stayed enabled and the quoted post remained intact. |

First-use Enable translation invoked the real Chrome Translator. Subsequent translation reused the initialized service. The floating preview appeared near the composer, and its controls were accessible inside X’s dialogs.

A read-only DevTools inspection of the current Home composer’s Draft component (`stateNode.props.editorState`, not a stale fiber snapshot) confirmed DOM and editor state both contained `hello world! Still editable.`, with `postDisabled: false`. Deleting disabled Post; undo restored the draft and enabled Post.

The test text was cleared and the test dialogs closed after verification. The extension remains installed for dogfooding.

Screenshots captured before cleanup:

- [New Post after Replace and continued editing](tests/x-post-verified.png)
- [Reply after Replace and continued typing](tests/x-reply-verified.png)

## Replacement implementation

The earlier native `insertText` approach was replaced after debugging Draft.js synchronization. The current implementation focuses the unchanged composer, selects its contents, signals the selection with a standard mouseup, waits briefly for X’s deferred selection update, and dispatches a plain-text paste event. X’s own paste handler updates its editor state and DOM.

Before paste, NativeType rechecks the source, focus and full selected text. Draft may normalize element-boundary selections to equivalent text-node boundaries; the implementation accepts that equivalent selection, and a regression test covers it. It requires the paste handler to accept the event and verifies the resulting text. Failure produces a readable error and never clicks Post.

## Preview styling follow-up

The user's screenshot exposed a real preview regression that the first acceptance checks missed. X's dialog has an identity transform, which makes it the fixed-position containing block; viewport coordinates therefore displaced and clipped the card. An input ancestor's `rgba(255, 255, 255, 0)` background was also incorrectly treated as white.

The overlay now measures its actual positioning origin, skips fully transparent backgrounds, and matches X's opaque background. A small temporary spacer outside Draft's shared-height nodes keeps reply settings and the attachment toolbar below the card; it is removed when the preview hides or switches composers. No input-container margins are changed.

After reloading the latest unpacked build and X, the two-line New Post example displayed a complete dark preview, with both buttons, reply settings, attachment controls and Post visible. Replace then removed the preview and reserved space, inserted only English, and allowed normal continued typing with Post enabled. Test text was cleared; no post was published. The updated local fixture passed all 22 checks, including the five layout/cleanup regressions.

[Verified preview screenshot](tests/x-preview-fixed-detail.png)

## Testing limits

- The real language pack was already available during the final checks. A cold model download was not forced; progress/download failures were tested with the fake API.
- Actual posting was intentionally not tested. Post/Reply enablement, editing and editor-state synchronization were checked.
- Rich-text mention entities, attachments and formatting were not covered. Whole-draft plain-text replacement may flatten formatting/entities; review before posting.
- Chrome translation quality and paragraph layout are model output. For example, Chrome joined the two-line source into one English paragraph in the New Post check.
- X may change its semantic attributes or paste/selection handling. These are experimental integrations, not a compatibility guarantee for future X releases.
- Light/dark matching and scroll/resize positioning are implemented; real-X checks were in the user’s current dark theme. Tall composers may require scrolling to reach the preview.

## Phase 1 — language settings and X contexts (2026-10-26)

Version remains 0.0.3. This pass was not published and was not committed. The v0 real-X results above are unchanged; Phase 1 was not repeated on live X.

### Automated checks

- `node --test tests/translator.test.mjs`: 39 tests passed. Adds settings defaults and corrupt-storage fallback, language matching, detector confidence and download gating, X context decisions, language-pair stale requests, translator pair isolation, and the `storage` permission boundary.
- `pnpm typecheck`: passed.
- `pnpm build`: passed. Production manifest is Chrome MV3, version 0.0.3, `permissions: ["storage"]`, no `host_permissions`, `options_ui.open_in_tab: true`, a background service worker that opens Settings from the toolbar icon, no popup, and a content script still limited to `https://x.com/*`. Built size 64.53 kB. Tests and the Settings fixture are not packaged.
- `tests/browser.html`: 57 local regression checks passed in system Chrome through Playwright. The new checks cover reply and quote switches, quote versus reply DOM fixtures, a language-pair change that cannot reuse the previous English preview, detector mismatch, unavailable detection, and Enable translation for detection. The fixture still uses a fake Translator and a minimal paste adapter. It does not verify Chrome’s model or X’s React editor.
- Settings UI: `tests/settings-page.html` was driven in system Chrome at 1280px and 375px, in light and dark, including auto-save, remount, equal-language separation, a second writer updating the form, keyboard tab and space, save failure, and load failure. The same Chrome then loaded the production unpacked extension. Its options page opened with Chinese → English and all three contexts on, kept Korean and a disabled Quote switch across reload, and mirrored a New posts change into a second Settings tab through `chrome.storage.local`.

### Not verified on this pass

- Live X classification of the home composer, the compose page, an inline reply, a reply dialog, and a quote dialog. The DOM signals are covered with fixtures, not with x.com’s current markup.
- Chrome’s real Language Detector inside the extension content script.
- Chrome Translator packs for pairs other than the historical Chinese → English flow, including a cold download.
- An edit-post composer. It is not classified separately and may be treated as a new post.
- Publishing. NativeType still has no path that clicks Post.

## Monorepo move (2026-10-26)

The extension now lives in `apps/extension`. `apps/api` and `packages/contracts` were added empty of product behavior. This move did not change the production bundle: every file in `dist/chrome-mv3` has the same SHA-256 as the build from before the move, and `manifest.json` is identical. From the repository root, `pnpm typecheck`, `pnpm test:extension` (39 passed), `pnpm build`, and `pnpm zip` passed. `pnpm install --frozen-lockfile` passed. The dev server started and wrote `apps/extension/dist/chrome-mv3-dev`; that development manifest adds WXT's usual reload permissions and is not the store zip. Live X was not retested for this move.

## Review fixes (2026-10-26)

- Settings saves are serialized and keep the latest edit, including a quick revert while an earlier write is pending. Storage echoes and slow initial loads cannot overwrite newer local changes. Failed saves keep the current form available for retry.
- The active composer observes local quote/reply structure changes as well as text edits. Entering a disabled context cancels pending work, hides the preview, and restores input height. Replace rechecks the context on click and before the X adapter sends the paste, including changes during its selection delay.
- A Traditional Chinese trigger receiving the older detector's generic `zh` result displays a Chrome 151+ upgrade message and the option to use Chinese as the trigger. It does not guess the script. Script-aware results still match Traditional Chinese and skip Simplified Chinese.
- Detector initialization cleanup handles rejected promises, including failed creation and reset during initialization.
- `pnpm test:extension`: 55 passed, including 16 new Node regression tests. The new DOM fixture uses fixed geometry and simulated mutation delivery to test control flow; it does not validate visual layout or X's editor internals.
- `pnpm typecheck` and `pnpm build`: passed. The production bundle is 65.33 kB; version and manifest permissions are unchanged.
- Chrome was not launched for this review or these fixes. The browser fixture, live X, and Chrome's real models were not rerun.

## Live-X follow-up fixes (0.0.4, 2026-10-26)

The first real Chrome/X settings run passed language changes, New posts and Replies switches, inline replies, replacement, persistence, and two Settings tabs syncing in both directions. It also exposed two failures:

- Quote drafts followed New posts instead of Quote posts. Read-only inspection of the real quote composer confirmed that X now uses an `attachments` container with an attached post button, `User-Name`, and a `time[datetime]`. There is no `quoteTweet` marker or status link. The adapter now recognizes that structure as well as the older marker, without relying on translated UI copy. Quotes in menus, another composer, or a reply's parent post do not change the active context. Attachment hydration and removal are observed.
- One existing X tab retained an old target language and ignored a context switch until X was refreshed. A stable cause was not established. The controller now re-reads persisted settings on visible-tab return, window focus, pageshow, and entering a composer. It hides the old preview and cancels pending translation/paste while reading, preserves active IME composition, and then resumes the focused editor. New storage events take precedence over an older read; another resume during a slow read queues a fresh read. Invalidation cannot restart a disposed controller.

Validation:

- `node --test tests/translator.test.mjs` in `apps/extension`: 71 passed. The 16 added tests cover the observed quote structure, independent context switches, missed settings notifications, asynchronous read races, stale replacement, disposal, and IME composition during resync. Existing controller context/removal tests now use the observed quote structure too.
- `./node_modules/.bin/tsc --noEmit` in `apps/extension`: passed.
- `tests/browser.html`: all 57 checks passed in the in-app browser, including editor-handled paste, IME, stale requests, modal containment, context switches, and language changes. This fixture uses a fake Translator and its own paste handler; it does not provide evidence about Chrome's model or X's React editor.
- `./node_modules/.bin/wxt zip` in `apps/extension`: passed; production build 66.11 kB, zip 37.98 kB. Manifest remains version 0.0.4 with only the `storage` permission.

After the user manually reloaded the extension, the following passed in the nianchen Chrome profile on real X, using ordinary clicks and typing, the real Language Detector/Translator, and no storage injection:

| Check | Observed result |
| --- | --- |
| Only Quote posts on | The quote draft translated English → Chinese while New posts and Replies were off. |
| Only New posts on | Disabling Quote posts hid the same preview. Further input left the draft unchanged and did not translate. |
| Re-enable Quote posts | The same edited draft translated again without reloading X. |
| Change target while X is in the background | Returning to X showed English → Japanese and an actual Japanese translation, with no stale Chinese result. |
| Change trigger to Chinese | The unchanged English draft stopped translating. Returning to English restored the Japanese preview. |
| Replace in the quote composer | X accepted the Japanese text, hid the preview, and kept the quoted-post attachment intact. |
| Cleanup | Close → Discard removed the temporary draft. Settings were restored to English → Chinese with all contexts on and Saved. |

The original intermittent notification anomaly was not forced or reproduced reliably in this live retest. Tests simulate missed notifications and slow reads to verify recovery; live checks verify normal Settings changes across tab switches. A cold model download, true IME candidate interaction, and publishing were not part of this retest.

The original E2E report, local-browser output, and follow-up screenshots are retained in `apps/extension/.output/e2e-2026-10-26/`. Screenshots 17–20 show the fixed quote-only preview, disabled quote, updated Japanese preview, and restored settings. The original report's failures remain historical evidence. The production content script SHA-256 is `249dff1a9b1d01f39b996aa36ce351c8200d9d370d27b2760e2db7256ba43f69`.

## Settings controls and preview shortcut (0.0.4, 2026-10-26)

- The three X switches now live in an initially open `config for X` disclosure. The platform metadata, labels, defaults, UI rendering, and stored-context validation use `settings/config.ts`. Clicking the header, Enter, and Space were checked in the local Settings page; folding preserves saved switch values.
- A gear beside the preview's target language opens the extension's existing options page through a content-to-background message. Updating the language label preserves the button. Pointer clicks keep the editor caret, and returning with keyboard focus in the preview resumes the same composer. Open failures preserve the current translation and draft.
- The background replies through `sendResponse` and `return true`, following the [Chrome messaging documentation](https://developer.chrome.com/docs/extensions/develop/concepts/messaging), to support the declared Chrome minimum rather than require Promise-returning message listeners.
- 75 Node tests passed, including message routing, failed opens, preserved drafts, language updates, and returning from Settings. Extension TypeScript passed. Production build/zip passed: 70.03 kB build, 39.27 kB zip, version 0.0.4, permission still limited to `storage`.
- A local click opened the Settings fixture and kept the composer text. A fresh independent run passed all 57 browser regression checks. An earlier run failed the fixed-delay IME-commit assertion; this was not reproduced in the clean run. Local browser checks use the fake Translator and a fixture navigation handler; the new gear has not been retested in the installed Chrome extension on X.
- Header screenshot and browser results: `apps/extension/.output/preview-settings-2026-10-26/`. The earlier content-script hash above identifies the live-X follow-up build before these Settings UI additions.
