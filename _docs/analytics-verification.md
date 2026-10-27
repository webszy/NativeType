# Analytics Extension Delivery — 2026-10-27

## Result and verification limits

The opt-in extension integration is implemented. Existing Worker source, production configuration, migrations and shared request contract are unchanged. No production event, migration, deployment, Git commit/push or Chrome Web Store publication was performed. The pre-existing root `package.json` package-manager change was preserved.

| Check actually executed | Result |
| --- | --- |
| `pnpm test:extension` | 112 passed, 0 failed. Includes existing regression tests and new analytics cases. |
| `pnpm test:api` | 23 Worker runtime tests and 12 configuration tests passed against local isolated test bindings. |
| `pnpm typecheck` | Extension, contracts and API passed; generated Worker types remain current. |
| `pnpm build:extension` | Production Manifest V3 build passed, final output approximately 77.82 kB; no application was launched. |
| Actual production manifest inspection | Only `storage`, `https://api.typewith.si/*` analytics host permission, and original `https://x.com/*` content-script match. |
| Production build with `WXT_ANALYTICS_API_BASE_URL=http://127.0.0.1:8787` | Rejected before bundling with the required HTTPS URL validation error. |
| Development build with `WXT_ANALYTICS_API_BASE_URL=https://api.typewith.si` | Built with empty analytics `host_permissions`; production endpoint rejected. The entry uses the same validator at runtime. |
| One-off extension service → unchanged Worker → test D1 check | Passed. Off created no ID/request; opt-in accepted one of each event with 204; one D1 row had translation/replacement/error counters of 1 each and a hashed ID; disable removed ID and sent no further event. |
| Production endpoint reachability | Read-only GET `/v1/events` returned expected 405, `Allow: POST, OPTIONS`. This did not test event ingestion or write production data. |
| Diff scope and whitespace | Checked; protected implementation files have no diff. |

Initial Worker testing failed to start under sandbox restrictions on localhost listening and Wrangler's log directory. The authorized rerun outside that sandbox passed. Typecheck was likewise rerun successfully with normal Wrangler log access. These environment failures are not claimed as successful test runs.

The one-off integration used the existing Cloudflare Vitest configuration, migrations, test secret and isolated D1 via `cloudflare:test`. Its temporary files are `/tmp/nativetype-analytics.integration.config.mts` and `/tmp/nativetype-analytics.integration.test.ts`. Workerd does not implement the browser's `redirect: "error"` value: the test asserted that the extension requested `error`, then adapted only this value to `manual` for `SELF.fetch`. The original Worker route never redirects. This confirms HTTP payload acceptance and real local D1 writes, not Chrome fetch/TLS/CORS or actual X UI behavior.

The final lockfile retains only the added extension-to-contracts workspace link; incidental pnpm package-manager metadata generated during installation was removed. The existing contracts package is now an extension workspace dependency; no third-party analytics SDK or new third-party dependency was added.

## Architecture and triggers

`core/controller.ts` passes only an event name to the injected Analytics Client. That client sends an internal `analytics:event` runtime message. The existing Background validates sender and exact message fields, checks persisted consent, serializes installation-ID operations, and performs one native fetch with a four-second timeout. Errors, rate limits, timeouts, disabled consent, unavailable storage and closed reply ports do not affect local translation. At most eight reports are pending; excess events are dropped, with no persistent queue or retry.

| Event | Trigger |
| --- | --- |
| `translation_success` | Current successful provider result is nonempty and has entered usable Preview; cache reuse and later rendering do not report. |
| `replace_success` | Existing verified replacement returns true, editor/revision/context are current, session state is updated and Preview hidden. |
| `translation_error` | Current provider execution ends in a real terminal failure, excluding activation prompts, aborts, detection and stale operations. |

Settings adds `analytics.enabled: false` to schema 1 and a normal switch under Privacy & Analytics. Missing/corrupt/legacy consent is Off. Saves and open-tab updates use the existing settings mechanism. Background creates `crypto.randomUUID()` only after opt-in, persists it as `analytics.installId`, reuses it across restarts/upgrades, deletes it on disable and creates a new UUID on re-enable. It never logs or sends the ID back to content scripts. If storage deletion fails, disabled reporting remains blocked; future startup/reads can retry removal.

Production uses the public `WXT_ANALYTICS_API_BASE_URL=https://api.typewith.si` in the extension's production environment file. Development has no endpoint fallback and rejects both known production hosts. Only the configured HTTPS API host is added to Manifest; no server secret is embedded. Adding this required host permission can cause a Chrome install/update permission warning; the switch itself requests no additional permission dialog.

## Regression status and remaining manual checks

The automated suite passed language configuration/detection, Chinese → English defaults, X Post/Reply/Quote classification and gates, Preview/Replace, Retry, IME cancellation, stale-request safety, model activation/download progress, provider initialization/reuse/disposal, and settings synchronization. These use fixtures/mocks and source-boundary checks. They do not establish that current live X, actual Chrome model downloads, real rich-text synchronization, or browser permission prompts have been exercised in this session.

Before release, follow the complete 12-step process in [analytics-integration.md](analytics-integration.md): start a local/test HTTPS Worker and D1, load the development build, check Off/no ID/no network, enable and check each event/204/count delta, disable and verify cancellation/ID removal, restart Chrome and Background, test simultaneous tabs and API failure, then exercise real language/scene/IME/model behavior.

The policy source was updated with random ID, three events, own Cloudflare Worker, pseudonymous hash correlation, 90-UTC-date retention, disabling and historical-data limits. The existing external privacy URL and actual Chrome Web Store Privacy Practices form have not been inspected through a signed-in dashboard, changed or published. The integration guide includes concrete replacement wording and permission justifications for the owner to apply before publishing. The form's final selections and review outcome require the owner's actual dashboard.

## Added files

All paths below are relative to the repository root.

| File | Purpose |
| --- | --- |
| `apps/extension/analytics/client.ts` | Event-only message client and strict shared-contract message validation. |
| `apps/extension/analytics/background.ts` | Consent, UUID, concurrency, timeout, cancellation and best-effort network service. |
| `apps/extension/analytics/config.ts` | HTTPS endpoint validation and environment separation. |
| `apps/extension/.env.production` | Public production origin from existing Worker configuration. |
| `apps/extension/.env.development.example` | Separate development/test endpoint template. |
| `apps/extension/env.d.ts` | Analytics environment typing. |
| `apps/extension/settings/keys.ts` | Storage key shared by settings and Background without loading the WXT adapter in tests. |
| `apps/extension/tests/analytics/client.test.mjs` | Message payload and failure isolation tests. |
| `apps/extension/tests/analytics/background.test.mjs` | Consent/ID/network/concurrency/restart tests. |
| `apps/extension/tests/analytics/messaging.test.mjs` | Existing Background listener and asynchronous receipt tests. |
| `apps/extension/tests/analytics/config.test.mjs` | URL validation and production isolation tests. |
| `apps/extension/tests/analytics/fixture.mjs` | Shared test storage, request and abort fixtures. |
| `_docs/analytics-integration.md` | Architecture, manual integration, privacy/store checklist and rollback. |
| `_docs/analytics-verification.md` | This delivery record and complete file inventory. |
| `.codegraph/.gitignore` | Created by the requested CodeGraph initialization; machine-local index files stay ignored. |

## Modified files

| File | Change |
| --- | --- |
| `apps/extension/core/controller.ts` | Three completed-operation event hooks and analytics failure isolation. |
| `apps/extension/entrypoints/content.ts` | Inject the runtime Analytics Client. |
| `apps/extension/entrypoints/background.ts` | Reuse existing listener; storage adapter, sender validation and safe async acknowledgements. |
| `apps/extension/settings/store.ts` | Default-off consent schema, validation and equality. |
| `apps/extension/settings/page.ts` | Existing-style privacy switch, explanation and immediate persistence. |
| `apps/extension/settings/chrome.ts` | Reuse/export the shared settings key. |
| `apps/extension/wxt.config.ts` | Validate production API origin and derive the minimal host permission. |
| `apps/extension/package.json` | Add existing workspace contracts dependency. |
| `pnpm-lock.yaml` | Record that workspace link only. |
| `apps/extension/tests/core/controller.test.mjs` | Operation triggers, dedupe, cancellation, consent and error-isolation regression tests. |
| `apps/extension/tests/core/boundaries.test.mjs` | Update expected minimal API host permission. |
| `apps/extension/tests/load-ts.mjs` | Load real workspace contract imports, isolate test output directories and supply test-only WXT environment. |
| `apps/extension/tests/settings/store.test.mjs` | Consent defaults, invalid values, persistence and cross-reader changes. |
| `apps/extension/tests/settings/page.test.mjs` | Default-off switch, saves and storage synchronization. |
| `apps/extension/tests/settings/navigation.test.mjs` | Existing settings-navigation fixture includes Background storage APIs. |
| `apps/extension/tests/translator.test.mjs` | Register new analytics tests in the existing suite. |
| `apps/extension/store-assets/privacy.html` | Necessary privacy disclosures. |
| `.gitignore` | Ignore extension-local environment overrides. |
| `README.md` | Current integration, privacy, permissions and configuration. |
| `ARCHITECTURE.md` | Current event/data boundaries and lifecycle. |
| `apps/api/README.md` | Update only the now-stale extension-integration status and disclosure link. |

The root `package.json` remains dirty from the user's original `pnpm@12.15.0` edit and is not an implementation change by this task. Shared contract source, Worker implementation/configuration/migrations, X adapter, Translator/Detector implementations, session logic and Preview implementation were preserved.
