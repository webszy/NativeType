# Extension Analytics Integration

Implemented against the existing Worker and `@nativetype/contracts`. Event ingestion and the D1 schema are unchanged. The merged Worker configuration derives allowed extension origins from `PRODUCTION_ID` and `DEV_ID`; see [origin configuration and browser checks](2026-10-27-api-origins-verification.md). Statistics are optional pseudonymous measurement of participating installations, not a count of people or an absolute anonymity guarantee.

## Data path and event boundaries

```text
Translation Controller -> Analytics Client -> internal runtime message
    -> existing Background -> persisted consent + installation ID -> POST /api/v1/events
```

| Event | Actual trigger in `apps/extension/core/controller.ts` |
| --- | --- |
| `translation_success` | `provider.translate()` returns a nonempty current result, and `show({ kind: 'translated' })` makes Preview usable. One call per executed operation. Cache reuse, Preview repositioning, debounce, detection and download progress do not report. Retry executes a new operation. |
| `replace_success` | The existing `platform.replaceText()` has returned true, the editor/revision/context are still valid, and the success branch has updated session state and hidden Preview. X's existing verified Draft.js paste path is untouched. |
| `translation_error` | A current provider invocation fails terminally, including unavailable models, creation failure, empty output and timeout. Activation/download prompts, detection, AbortError, replaced requests, closed scenes and detached editors are excluded. Existing messages and Retry are unchanged. |

The controller only passes an event string. It never awaits a report. The client catches synchronous runtime failures and rejected messages. Background accepts only internal messages with exactly `type` and a shared-contract `event`, and never accepts a URL, install ID or consent value from the page. There is no `window.postMessage`/Main World reporting bridge or external-message listener.

Background fetch bodies have exactly `installId` and `event`. Text, translations, URLs, titles, account information, detector input, stacks and timestamps are absent. Reporting errors never re-enter the translation error path. The response acknowledgement contains only a boolean, never the installation ID.

## Consent, ID and resource limits

- The existing schema version remains 1. `analytics.enabled` defaults to false for missing, invalid or legacy settings; only a boolean true in schema 1 enables reporting. The switch uses existing serial saves and storage subscriptions. Open X tabs receive changes without reloading.
- On opt-in, Background uses `crypto.randomUUID()` and saves it as `analytics.installId` in `chrome.storage.local`. No account, fingerprint, IP or hardware ID is used. Short storage operations are serialized, including simultaneous first events from multiple tabs. Restarts/upgrades read the saved ID. It is never logged or returned to content scripts.
- Each report re-reads persisted consent. Disable notifications invalidate pending initialization, abort active fetches, and serialize ID removal. Rapid re-enable waits behind the old write/removal and creates a fresh UUID. Storage/UUID failures stop reporting. If storage itself cannot delete, no disabled events are sent; later reads/startup can complete removal.
- No SDK, periodic timer, polling, heartbeat, page-interaction observer, persistent event queue or retry exists. At most eight reports are pending in memory; excess reports are dropped. The only new timer is a four-second timeout while a request is active.
- Native fetch omits cookies and referrers, disables caching and rejects redirects. Only 204 means success. All other statuses, offline errors and timeouts are dropped without user UI or repeat POSTs. The Worker has no idempotency key, so this is intentionally best effort.
- Requests accepted before disable cannot be undone. The Worker retains aggregate rows for the latest 90 UTC dates through daily cleanup; missed cleanup may extend this. Disabling locally does not immediately erase server history. Re-enabling creates a different installation identity.

## Configuration and permissions

`apps/extension/.env.production` contains the public production base URL: `WXT_ANALYTICS_API_BASE_URL=https://typewith.si/api`. The base path is preserved, producing `https://typewith.si/api/v1/events`. That path is the Nuxt server route on the same Worker as the website. It is not a credential. No HMAC secret, Cloudflare token or other server secret belongs in extension files.

Copy `.env.development.example` to `.env.development.local` in `apps/extension` for development. Set a separate HTTPS base URL, optionally including a path prefix. With no valid base URL, development does not report. The Worker custom domain is only `typewith.si`, and API paths are `https://typewith.si/api/v1/*`. `api.typewith.si` is not routed. `typewith.si`, `api.typewith.si` and `nativetype-api.cycceme.workers.dev` are rejected outside production mode, including hostname case/trailing-dot variants. HTTP, credentials, query strings and fragments are rejected. Production rejects local/test origins and fails the build for missing/invalid configuration. The same validator derives the Background endpoint and manifest permission.

The generated production Manifest V3 has `permissions: ["storage"]`, `host_permissions: ["https://typewith.si/*"]`, and the original `https://x.com/*` content-script match. It has no broad host wildcard. No local development host is included in the release.

The added required host permission can produce Chrome's install/update permission warning, potentially requiring existing users to re-enable the extension. The statistics switch itself opens no permission dialog. Chrome documents both [host permission warnings](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) and [service-worker cross-origin fetch permissions](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests).

Worker CORS behavior is unchanged: exact allowlisted preflights return 204; other preflights return 403; ordinary POST is processed even without an allowed Origin. The Worker derives extension origins from `PRODUCTION_ID` and `DEV_ID`, configured locally in `.dev.vars` or for deployment in `wrangler.jsonc`. Chrome extension service-worker requests with host permission use extension cross-origin privileges; page/content-script fetches do not. A successful Node/Worker test does not prove Chrome's actual permission, Origin or CORS behavior. Verify the real development extension before release. Configure the actual extension ID; do not guess it or loosen the Worker.

## Automated verification

Run from the repository root:

```sh
pnpm test:extension
pnpm test:web
pnpm typecheck
pnpm build:extension
```

Extension tests cover consent normalization, persisted UI state and cross-tab updates, runtime validation/async acknowledgement, concurrency/restarts/disable races, storage failures, strict payloads, HTTP failures, offline and timeout behavior, no retries, Preview/cache/Retry/cancellation/stale-result boundaries, successful versus failed Replace, and failure isolation. Existing language, IME, scene classification, provider/model initialization and replacement tests remain part of the same suite.

## Manual local integration

Use a separate Chrome test profile and an unpacked **development** extension. Keep production statistics disabled in any other NativeType installation. Never use `--remote`, `deploy:web`, the production endpoints, or production D1 for these steps.

1. Prepare `apps/web/.dev.vars` from `.dev.vars.example`. Generate a local-only HMAC secret with `openssl rand -base64 32` and put it in that gitignored file. Set `DEV_ID` to the actual unpacked extension ID after step 4; the server adds `chrome-extension://` automatically. `.dev.vars` does not expand variable references. No secret goes in extension environment files.
2. Apply the existing migration to **local** D1, then start the website Worker over HTTPS. The extension appends `/v1/events` to the base path, so the base must end in `/api`:

   ```sh
   pnpm db:migrate:web:local
   pnpm --filter @nativetype/web exec nuxt dev --https --port 8787 --host 127.0.0.1
   ```

   Trust the local certificate if Chrome rejects it. Keep TLS verification enabled. Do not point this exercise at production D1.
3. Create `apps/extension/.env.development.local` containing `WXT_ANALYTICS_API_BASE_URL=https://127.0.0.1:8787/api`. Start `pnpm dev:extension`, or build without auto-launching Chrome:

   ```sh
   pnpm --filter @nativetype/extension exec wxt build --mode development
   ```

4. Load `apps/extension/dist/chrome-mv3-dev` through `chrome://extensions` if not using WXT's dev browser. Note the real extension ID. Update `DEV_ID` in the local Worker's `.dev.vars` and restart it if necessary. Inspect this development manifest: its analytics host must be localhost/test, never production.
5. Open the extension's Service Worker DevTools Network panel with Preserve log, plus Settings. Confirm **Privacy & Analytics → Share anonymous usage statistics** is Off. Translate in X and Replace. Preview/replacement must work; there must be no `/v1/events` request and no `analytics.installId` in extension local storage. View only key presence in screenshots/logs; do not print the ID.
6. Enable statistics. Confirm local storage now contains the ID key; simply enabling must not POST an event. Refresh Settings to confirm the switch stays On. Keep the existing X tab open to test live synchronization.
7. Enter one new Chinese draft in an enabled Post/Reply/Quote context, wait for Preview, then click Replace once. Expect one `translation_success` and one `replace_success`. Each request must contain only `installId` and `event`; response must be empty 204. Repositioning or re-rendering Preview must not create another success request.
8. For a controlled failure, open the **NativeType isolated-world context** in X DevTools in this test profile, temporarily replace the global Translator with a stub, and invalidate any cached provider with a previously unused language pair:

   ```js
   globalThis.__nativeTypeTranslatorForTest = globalThis.Translator;
   globalThis.Translator = {
     availability: async () => 'available',
     create: async () => { throw new DOMException('Test initialization failure', 'OperationError'); },
   };
   ```

   Change the target language in Settings to an unused language, then enter a fresh Chinese draft. Expect the existing error state and exactly one `translation_error`, without uploading the draft or stack. Restore `globalThis.Translator = globalThis.__nativeTypeTranslatorForTest`, delete the temporary property, return to the normal pair, and Retry. If this Chrome build does not allow that test-context override, reload X to restore the browser API and use the automated provider-error tests instead; do not claim the real-browser error case passed.
9. Query **local** D1:

   ```sh
   pnpm --filter @nativetype/web exec wrangler d1 execute nativetype-analytics --local --command "SELECT date, COUNT(*) AS installs, SUM(translation_count) AS translations, SUM(replace_count) AS replacements, SUM(error_count) AS errors FROM usage_daily GROUP BY date ORDER BY date;"
   ```

   Compare deltas against a baseline. For exactly steps 7–8 before Retry, the expected delta is one of each counter and one participating installation. Retry adds another translation success. Extra manual translations each add their own count; do not assume an empty database. Inspecting the schema may confirm that rows use `install_hash`, not the raw ID.
10. Toggle statistics Off while a test request is pending (Network throttling can help), then translate and Replace again on the same X tab. Pending requests should abort where still possible, ID should disappear, no subsequent event should POST, and local translation must keep working. Counts already accepted by the Worker can remain.
11. Close and reopen Chrome. With consent Off, confirm no ID or reporting. Enable again, confirm a new ID (compare locally without printing it), then restart Chrome with consent On: the ID and consent should persist. Open two X tabs simultaneously and verify both use that single ID. Stop/restart the extension Service Worker and verify the next operation still reports with the saved ID.
12. Stop the local API, set DevTools offline, or block the test endpoint. Preview, Replace and Retry must still work and no statistics error UI should appear. Restore connectivity; failed events must not replay. Exercise language changes, independent Post/Reply/Quote switches, IME composition, Close, stale requests, and actual Chrome language-pack download. These live browser/model behaviors require manual verification.

## Privacy and Chrome Web Store publication checklist

Repository policy source: `apps/extension/store-assets/privacy.html`. It now explains purpose, random ID, three events, own Worker, keyed hash, 90-date retention, disabling, historical counts, and excluded content. External policy hosting and the Chrome Web Store dashboard were not changed or published.

The repository contains no saved dashboard Privacy Practices form. Before publishing, the account owner must review the current form against [Chrome's privacy field instructions](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) and [User Data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), then:

- Publish the updated privacy policy at the existing policy URL and verify the store link opens that revision.
- Remove any listing claim that NativeType never sends telemetry. Disclose voluntary counts and a persistent random installation identifier. Do not select a blanket “no data collected” solely because there is no name/account ID. Review the form's identifier/personal-information and user-activity definitions for the random ID and three events, and preserve accurate disclosure of existing local composer processing. This is a content checklist, not a verified dashboard submission or review outcome.
- Explain `storage`: “Stores translation and X context preferences, optional analytics consent, and a random installation ID created only after opt-in. Drafts and translations are not saved.”
- Explain `https://typewith.si/*`: “Allows the background service worker to submit optional pseudonymous usage counts to NativeType's own Cloudflare Worker. Reports contain only a random installation ID and one of three event names; they exclude text, translations, URLs and account information.”
- Confirm the existing X host justification covers composer reading, Preview and user-requested Replace. No broader browsing access is added.
- Remote code remains unused: this integration sends JSON and executes no downloaded analytics JavaScript. Keep the form consistent with the final package and applicable limited-use certifications.

Suggested listing/Privacy Practices explanatory text:

> NativeType translates locally with Chrome's built-in Translator API. Optional usage statistics are disabled by default. If enabled in Settings, NativeType sends a random installation ID and one of three events—successful translation, successful replacement, or translation error—to its own Cloudflare Worker. The server stores a keyed hash of the ID and daily counts for the latest 90 UTC dates. We never send draft text, translations, URLs, page titles or account information. This is pseudonymous installation measurement, not an absolute anonymity guarantee. Turn it off at any time to stop reporting and clear the local ID; previously accepted counts expire under the retention policy. Re-enabling creates a new ID.

## Rollback

Disable statistics in Settings immediately to stop reports and remove the ID. A code rollback can restore only this integration's extension, lock-entry and documentation changes; preserve unrelated edits. Returning to a release without this feature should first disable it, so the old release does not retain the optional ID indefinitely. No server schema rollback or production deployment is involved.
