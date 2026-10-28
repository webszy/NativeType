# @nativetype/web

NativeType website and analytics API. Nuxt 4 serves the prerendered site and the Worker API from one Cloudflare Worker.

Production pages are built with `nuxt build` and the Nitro `cloudflare_module` preset. Do not publish this app with `nuxt generate`: that build has no Worker and cannot reach D1.

Run these commands from the repository root:

```bash
pnpm dev:web
pnpm test:web
pnpm --filter @nativetype/web typecheck
pnpm build:web
pnpm test:web:built
pnpm db:migrate:web:local
```

`pnpm db:migrate:web:remote` and `pnpm deploy:web` change the Cloudflare account. They are not part of local verification. Do not delete the existing D1 database or its rows.

## Site

| Route | Page |
| --- | --- |
| `/` | Homepage |
| `/privacy` | Privacy Policy, last updated October 27, 2026 |
| `/support` | Getting started, translation FAQs, GitHub Issues and email support |
| `/changelog` | Release notes |

Those four routes are prerendered. `/api/**` stays dynamic. The homepage is the product landing page. Support contains a three-step getting-started guide, seven native FAQ accordions, and developer contact links. The default layout sets `noindex, follow`; Changelog overrides this with `index, follow` when release notes exist.

`app/composables/useSiteSeo.ts` supplies the shared SEO, Open Graph, and Twitter Card metadata. Public pages override the default title and description as needed. Canonical and OG page URLs use `https://typewith.si`, omit queries and fragments, and keep a trailing slash only for the homepage. All four pages use `public/og/nativetype-og.png` (1200 × 630 PNG), derived from the original `public/og-image.png`. Metadata is included in prerendered HTML and updates on client navigation. This configuration preserves each page's existing robots policy.

`app/site.ts` holds the GitHub URL and the published `chromeWebStoreUrl`. The homepage brand link and all Add to Chrome buttons use that same store URL.

The production Worker entry in `worker/entry.ts` limits every request body to 1024 bytes before Nitro can buffer it. It checks both declared lengths and streamed bytes, returning 413 as soon as the limit is exceeded. Nitro still handles the site, API routes, and scheduled retention. `pnpm test:web:built` runs the actual build locally with isolated test bindings and verifies streaming limits, API responses, and the rendered store links; run it after `pnpm build:web`.

## API

`POST /api/v1/events`

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

`installId` must be a UUID v4. The extension creates it with `crypto.randomUUID()` and keeps it in `chrome.storage.local`. Uppercase hex is accepted and hashed as lowercase. The server stores `HMAC-SHA256(installId, secret)`, not the raw id. This is pseudonymous measurement of participating installations. It is not a count of people.

The body has exactly `installId` and `event`. Draft text, translations, URLs, account names, and client timestamps are rejected. A successful D1 write returns `204 No Content`.

| Status | Code | When |
| --- | --- | --- |
| 400 | `invalid_json` | The body is not UTF-8 JSON. |
| 400 | `invalid_request` | The UUID, event, or object shape is wrong, including extra fields. |
| 403 | `forbidden` | An `OPTIONS` preflight origin is not allowlisted. |
| 404 | `not_found` | Any `/api/**` path other than `/api/v1/events`. |
| 405 | `method_not_allowed` | Any method other than `POST` or `OPTIONS` on `/api/v1/events`. |
| 413 | `payload_too_large` | The body is larger than 1024 bytes. |
| 415 | `unsupported_media_type` | The media type is not `application/json`. UTF-8 charset is optional. |
| 429 | `rate_limited` | The hashed install is over the rate limit. `Retry-After: 60`. |
| 503 | `unavailable` | The HMAC secret is missing or unusable, hashing fails, the rate limiter fails, or D1 does not confirm the write. |

Error bodies are `{ "error": "<code>" }`. Every API response sets `Cache-Control: no-store`. Repeated `POST`s increment the matching counter again. There is no event id. Active-install queries still count that install once inside the window.

The UTC date comes from the Worker clock. `POST /api/v1/translate` is absent. Unknown site paths use the Nuxt error page, not this JSON body.

## Active installs

An install is active on a UTC date when its `translation_count` for that date is greater than zero. `replace_success` and `translation_error` do not make an install active on their own.

| Metric | Definition |
| --- | --- |
| DAU | Distinct installs with a successful translation on one UTC date. |
| WAU | Distinct installs with a successful translation on any of the 7 UTC dates ending that day, including that day. |
| MAU | The same, over the 30 UTC dates ending that day. |

Windows roll. They are not calendar weeks or calendar months.

## Data

`migrations/0001_init.sql` creates `usage_daily`. One install has at most one row per UTC date. The primary key is `(date, install_hash)`. The same Cloudflare D1 database is `nativetype-analytics`, id `6080527d-a65a-44de-a308-c8eed695fb32`, binding `DB`. Server code reads that binding from `event.context.cloudflare.env`. The client bundle does not receive the binding, the secret, or the database id.

### Queries

Run these with `wrangler d1 execute` after the database id is set. `date('now')` is UTC in D1. A UTC date with no rows is zero and does not appear in the trend. `dau` in the trend is the distinct translating installs that day. These statements are not an HTTP API.

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

`test/config.test.mjs` checks that this README still contains the statements in `server/utils/stats-sql.ts`.

## Retention

A Cron Trigger runs at 03:00 UTC every day (`0 3 * * *`). It deletes rows whose UTC date is older than the 90 dates ending that cron's UTC day. The oldest retained date is included. The job is one `DELETE` and can be run again. If a day is missed, the next run still removes everything outside the window.

Failure is logged as JSON through `console.error` and then rethrown so Cloudflare can retry the cron. The log removes secrets, UUID-shaped strings, and 64-character hex strings. There is no HTTP route for cleanup.

## Privacy boundary

`ANALYTICS_HMAC_SECRET` must be at least 32 characters, with no leading or trailing whitespace. If it is missing or shorter, event ingestion returns 503. There is no built-in default. Retention does not need the secret.

Create a local secret in `apps/web/.dev.vars` (gitignored). Copy `.dev.vars.example` and generate the secret with `openssl rand -base64 32`.

Set the deployed secret from a prompt, not as a shell argument:

```sh
pnpm --filter @nativetype/web exec wrangler secret put ANALYTICS_HMAC_SECRET
```

The production secret is already stored on the `nativetype-api` Worker. A later deploy of that same Worker reuses it. Rotating the secret changes every hash, so the same installation counts as two across the rotation.

## CORS

`wrangler.jsonc` sets `PRODUCTION_ID` and `DEV_ID`. The server turns each valid id into `chrome-extension://<id>`. `.dev.vars` can override either id locally and does not expand variables. The legacy `ALLOWED_ORIGINS` binding is an extra comma-separated list of exact origins. A wildcard is ignored. The Worker never sends `Access-Control-Allow-Origin: *`.

`OPTIONS` from an allowlisted origin returns 204 and allows `POST` with `Content-Type`. Any other preflight returns 403. A normal `POST` is still processed when the origin is missing or unlisted. Origin is not authentication.

The rate limit binding allows 60 accepted events per hashed install per 60 seconds. `namespace_id` `10001` must stay unique in the Cloudflare account. Invalid bodies are rejected before the limiter.

## Cloudflare

The Worker name stays `nativetype-api` so the existing secret, rate-limit namespace, and D1 binding remain attached. Nitro writes `main` and the assets directory into the generated deploy config under `.output`. Source `wrangler.jsonc` holds the bindings.

- Account: `d44223ee73c4210abdaf28c3a7dcffe6`.
- Custom domain: `typewith.si`. API paths are `https://typewith.si/api/v1/*`. `api.typewith.si` is not attached.
- The extension calls `https://typewith.si/api/v1/events`.
- `workers.dev` remains `https://nativetype-api.cycceme.workers.dev`.

Local `nuxt dev` loads bindings through Wrangler's platform proxy and `apps/web/.dev.vars`. Apply `migrations/` to that local database with `pnpm db:migrate:web:local` before expecting writes to succeed.

For a later release, authenticate with that account, run `pnpm db:migrate:web:remote`, then `pnpm deploy:web`. Remote migration refuses to run until the top-level `DB` binding has a UUID `database_id`.
