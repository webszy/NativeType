# @nativetype/api

Cloudflare Worker for NativeType usage measurement. The extension does not call it yet.

This is pseudonymous measurement of participating installations. It is not a count of people, and it is not the Chrome Web Store install total. Do not describe it as fully anonymous: the database stores `HMAC-SHA256(installId, secret)`. Someone who has both the secret and an install id can match a row.

The Worker accepts three event names and nothing else. It does not receive draft text, translations, post contents, URLs, account names, or client timestamps. It does not store IP addresses or User-Agent strings.

`POST /v1/translate` is intentionally absent. The router in `src/index.ts` is a direct path match so that route can be added later.

## API

`POST /v1/events`

```json
{
  "installId": "550e8400-e29b-41d4-a716-446655440000",
  "event": "translation_success"
}
```

| Event | Meaning |
| --- | --- |
| `translation_success` | A translation finished and a preview was produced. |
| `replace_success` | The user replaced the draft with the translation. |
| `translation_error` | The translation flow failed terminally. |

`installId` must be a canonical UUID v4. The extension is expected to create it with `crypto.randomUUID()` and keep it in `chrome.storage.local`. The Worker does not create one. Uppercase hex is accepted and hashed as lowercase, so one UUID is one install.

A successful D1 write returns `204 No Content` with an empty body. Anything else:

| Status | Code | When |
| --- | --- | --- |
| 400 | `invalid_json` | The body is not UTF-8 JSON. |
| 400 | `invalid_request` | The UUID, event, or object shape is wrong, including extra fields. |
| 403 | `forbidden` | An `OPTIONS` preflight origin is not allowlisted. |
| 404 | `not_found` | Any path other than `/v1/events`. |
| 405 | `method_not_allowed` | Any method other than `POST` or `OPTIONS` on `/v1/events`. |
| 413 | `payload_too_large` | The body is larger than 1024 bytes. |
| 415 | `unsupported_media_type` | The media type is not `application/json`. UTF-8 charset is optional. |
| 429 | `rate_limited` | The hashed install is over the rate limit. `Retry-After: 60`. |
| 503 | `unavailable` | The HMAC secret is missing or unusable, hashing fails, the rate limiter fails, or D1 does not confirm the write. |

Error bodies are `{ "error": "<code>" }`. They do not echo the install id, the hash, or the payload. Every response sets `Cache-Control: no-store`.

The UTC date comes from the Worker clock. A client-supplied time is not a field, and an extra field is rejected.

Repeated `POST`s increment the matching counter again. The API has no event id, so it cannot tell a retry from a new event. Daily, weekly, and monthly active-install queries still count that install once inside the window. Event totals do not.

## Active installs

An install is active on a UTC date when its `translation_count` for that date is greater than zero. `replace_success` and `translation_error` do not make an install active on their own.

| Metric | Definition |
| --- | --- |
| DAU | Distinct installs with a successful translation on one UTC date. |
| WAU | Distinct installs with a successful translation on any of the 7 UTC dates ending that day, including that day. |
| MAU | The same, over the 30 UTC dates ending that day. |

Windows roll. They are not calendar weeks or calendar months. These numbers describe installations that opted into reporting.

## Data

`migrations/0001_init.sql` creates `usage_daily`. One install has at most one row per UTC date. The primary key is `(date, install_hash)`. SQLite applies the upsert atomically, so concurrent reports add to the counters instead of replacing them.

`date` is the leftmost primary-key column, which covers the daily read, the range scan, and `DELETE WHERE date < ?`. A second index, `idx_usage_daily_translating`, contains only rows with `translation_count > 0` for the active-install queries. There is no raw event table, so storage does not grow with every translation.

Dates are stored as `YYYY-MM-DD` text. Zero-padded ISO dates sort correctly, which is what the retention delete relies on.

### Queries

Run these with `wrangler d1 execute` after the database id is set. `date('now')` is UTC in D1. A UTC date with no rows is zero and does not appear in the trend. `dau` in the trend is the distinct translating installs that day.

Today's DAU:

```sql
SELECT COUNT(*) AS dau
FROM usage_daily
WHERE date = date('now')
  AND translation_count > 0;
```

Rolling 7-day WAU:

```sql
SELECT COUNT(DISTINCT install_hash) AS wau
FROM usage_daily
WHERE date BETWEEN date('now', '-6 days') AND date('now')
  AND translation_count > 0;
```

Rolling 30-day MAU:

```sql
SELECT COUNT(DISTINCT install_hash) AS mau
FROM usage_daily
WHERE date BETWEEN date('now', '-29 days') AND date('now')
  AND translation_count > 0;
```

Daily trend for the last 30 UTC dates:

```sql
SELECT
  date,
  SUM(CASE WHEN translation_count > 0 THEN 1 ELSE 0 END) AS dau,
  SUM(translation_count) AS translation_count,
  SUM(replace_count) AS replace_count,
  SUM(error_count) AS error_count
FROM usage_daily
WHERE date BETWEEN date('now', '-29 days') AND date('now')
GROUP BY date
ORDER BY date;
```

Translation, Replace, and error totals for those 30 dates:

```sql
SELECT
  COALESCE(SUM(translation_count), 0) AS translation_count,
  COALESCE(SUM(replace_count), 0) AS replace_count,
  COALESCE(SUM(error_count), 0) AS error_count
FROM usage_daily
WHERE date BETWEEN date('now', '-29 days') AND date('now');
```

`test/config.test.mjs` checks that this README still contains the statements in `src/stats-sql.ts`.

## Retention

A Cron Trigger runs at 03:00 UTC every day (`0 3 * * *`). It deletes rows whose UTC date is older than the 90 dates ending that cron's UTC day. The oldest retained date is included. The job is one `DELETE` and can be run again: the second run deletes nothing new. If a day is missed, the next run still removes everything outside the window.

Failure is logged as JSON through `console.error` and then rethrown so Cloudflare can retry the cron. The log records the error name's message only after secrets, UUID-shaped strings, and 64-character hex strings are removed. It does not include install ids or hashes. There is no HTTP route for cleanup. `POST /v1/retention` is a 404.

Local check, from `apps/api`, after `.dev.vars` exists and the local migration has been applied:

```sh
pnpm exec wrangler dev --test-scheduled
curl http://127.0.0.1:8787/cdn-cgi/local/scheduled
```

`/cdn-cgi/local/scheduled` is provided by `wrangler dev --test-scheduled`. It is not part of the deployed Worker. The automated test calls the `scheduled` handler with a fixed `scheduledTime`.

## Privacy boundary

The HMAC secret is `ANALYTICS_HMAC_SECRET`. It must be at least 32 characters, with no leading or trailing whitespace. If it is missing or shorter, event ingestion returns 503. There is no built-in default. Retention does not need the secret and still runs.

Create a secret locally in `apps/api/.dev.vars` (gitignored):

```sh
openssl rand -base64 32
```

Set the deployed secret from a prompt or a file descriptor, not as a shell argument that lands in history:

```sh
pnpm exec wrangler secret put ANALYTICS_HMAC_SECRET
```

`wrangler secret put` uploads a secret onto the Worker. If no Worker exists yet, Wrangler can create an empty draft script after a prompt (the prompt defaults to yes when stdin is not a terminal). Run it only after `database_id` is in the config and you mean to publish. It does not create the D1 database. A later `wrangler deploy` without `database_id` does.

Rotating the secret changes every hash. The same installation before and after the rotation is two installations in any window that crosses the change. Old rows age out after 90 days. This version does not keep a key id, so two keys cannot be read together.

The hash is not written to logs. The raw install id is not written to D1 or logs.

## CORS and abuse

`ALLOWED_ORIGINS` is a comma-separated list of exact origins. The committed value is empty because this repository has no published extension id and no pinned unpacked id. Put the production origin in `wrangler.jsonc` before a browser client is turned on:

```text
chrome-extension://<extension id>
```

Find the id on `chrome://extensions` or in the Chrome Web Store developer dashboard. Do not invent one. For local `wrangler dev`, set the same name in `.dev.vars`; that file overrides `vars` and is not uploaded. Copy `.dev.vars.example`. A wildcard in the list is ignored. The Worker never sends `Access-Control-Allow-Origin: *`.

`OPTIONS` from an allowlisted origin returns 204 and allows `POST` with `Content-Type`. Any other preflight returns 403. A normal `POST` is still processed when the origin is missing or unlisted. Origin is not authentication, and any HTTP client can set it. CORS only decides whether a browser will expose the response to extension script.

The rate limit binding allows 60 accepted events per hashed install per 60 seconds. `namespace_id` `10001` is chosen in this repo and must be unique among rate-limit namespaces in the Cloudflare account. Change it before deploy if the account already uses `10001`. Cloudflare applies that simple limit inside one location, and the documented behavior is that requests can exceed the threshold. A client can also mint a new UUID and start a fresh budget. The limit reduces accidental loops. It does not prove an event came from NativeType.

Invalid bodies are rejected before the limiter, so they do not spend an install's budget. A flood of invalid or rotating ids is outside what this binding can see. A WAF rate limiting rule can sit in front of the Worker:

- Path equals `/v1/events` and method is `POST`.
- Characteristic: IP.
- Starting point: 600 requests per minute, then adjust.
- Action: block.

That rule can affect people behind the same NAT. It still does not prove the event is genuine. UUID checks, CORS, and rate limits together do not prove authenticity. There is no account system in this version.

## Commands

From the repository root. Node.js 22 or newer is required by Wrangler 4.152. The extension package can still be developed on Node.js 20.19.

```sh
pnpm dev:api
pnpm test:api
pnpm --filter @nativetype/api typecheck
pnpm build:api
pnpm db:migrate:api:local
pnpm db:migrate:api:remote
pnpm deploy:api
```

`build:api` is `wrangler deploy --dry-run`. It packages the Worker and does not upload it. In Wrangler 4.152 a dry-run also skips D1 provisioning when `database_id` is absent.

`db:migrate:api:remote` and `deploy:api` change the Cloudflare account. Both scripts run `scripts/require-database-id.mjs` first and exit before Wrangler unless the top-level `DB` binding for `nativetype-analytics` has a UUID `database_id` in `wrangler.jsonc`. The guard uses Wrangler's JSONC parser, so ids in comments, other bindings, or other environments do not satisfy it. That guard is there because `wrangler deploy` auto-provisions a D1 database when the field is omitted, and remote migration resolves `nativetype-analytics` by name. The first production migration and deployment were completed on 2026-10-26 after pinning the database id. Local migration does not use the guard.

`pnpm dev`, `pnpm build`, and `pnpm test:extension` stay the extension commands.

## Production deployment

The production bindings are pinned in `wrangler.jsonc`:

- Worker: `nativetype-api`.
- Cloudflare account: `d44223ee73c4210abdaf28c3a7dcffe6`.
- D1 database: `nativetype-analytics`, id `6080527d-a65a-44de-a308-c8eed695fb32`, created in APAC. Migration `0001_init.sql` has been applied.
- `ANALYTICS_HMAC_SECRET`: generated for production and uploaded as an encrypted Worker secret during the first deploy. Routine deploys reuse that secret.
- Custom domain: `https://api.typewith.si`.

For subsequent releases, authenticate with that account, apply pending migrations with `pnpm db:migrate:api:remote`, then run `pnpm deploy:api`. Configure `ALLOWED_ORIGINS` with the actual client origins before enabling a browser client.

The domain uses `custom_domain: true`; Cloudflare manages its DNS record and TLS certificate. The `workers.dev` endpoint is also enabled at `https://nativetype-api.cycceme.workers.dev`. See [Cloudflare Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

First production version: `1f6a0dc5-ffd7-4401-b192-83a15a8753dd`, deployed on 2026-10-26 (Asia/Shanghai). Before deployment, 23 Worker runtime tests, 12 configuration tests, TypeScript, and a Wrangler dry run passed. After deployment, HTTPS `GET /v1/events` returned the expected `405` with `Allow: POST, OPTIONS`; a read-only D1 query confirmed `usage_daily` exists, and Worker secret metadata confirmed `ANALYTICS_HMAC_SECRET` is a `secret_text` binding. No production analytics event was inserted by these checks. The root path returns `404`; event ingestion uses `POST /v1/events`.

Optional: add the WAF rule above. Logs and traces are enabled at a sampling rate of 1 because this Worker is expected to stay small. Lower `head_sampling_rate` if volume grows.

## Extension follow-up

Do not send events until the disclosure and the opt-in exist. Suggested minimum:

- Keep using `AnalyticsEventRequest` from `@nativetype/contracts`. Generate `installId` once with `crypto.randomUUID()` and store it in `chrome.storage.local`.
- Default the setting off. Explain what is sent before the first enable: event name and a random install id, not text, URLs, or account data. Let the user turn it off later. A disabled setting sends nothing.
- Report from the extension service worker after a finished preview, Replace, or terminal failure. Swallow request failures. Do not await them on the translation path. Set `referrerPolicy: "no-referrer"`.
- Add a host permission only for the API origin.
- Update the Chrome Web Store Privacy Practices and `apps/extension/store-assets/privacy.html` in the same release as the opt-in. The current extension still does not phone home, and its privacy text should stay that way until this ships.

## Local tests

`pnpm test:api` applies `migrations/` to a test D1, then checks the HTTP contract, the active-install definitions, concurrent upserts, UTC date boundaries, the operator SQL, and the cron cleanup. `pnpm db:migrate:api:local` applies the same migration through Wrangler to the local database.

The database guard tests use temporary configuration fixtures for missing, invalid, commented, misplaced, and valid ids. They run a local stub command and work both before and after the real database id is configured.
