# API origin configuration verification

Verified on 2026-10-27, Asia/Shanghai, against `https://api.typewith.si/v1/events`.

## Configuration and deployment

- Production extension ID supplied by the user: `emicomnfbabkhcpphlihhbddhlmkdhfk`.
- Local extension ID read from NativeType Settings in the nianchen Chrome profile: `eoiplhjpakggmbahkkkcaacdcbdfklbf`.
- `.dev.vars` contains separate `PRODUCTION_ID` and `DEV_ID` fields. Its existing local HMAC secret was preserved.
- Wrangler 4.152.0 loads `.dev.vars` without variable interpolation. `resolveAllowedOrigins()` in `apps/api/src/http.ts` builds the two `chrome-extension://` origins, validates IDs, and removes duplicates. The optional legacy `ALLOWED_ORIGINS` binding can supply additional exact origins.
- `.dev.vars` overrides local development values only. The same two IDs are configured in `apps/api/wrangler.jsonc` for deployment.
- Worker `nativetype-api` was redeployed as version `3b86bdc3-0501-4a7f-827d-87081dcaed34` through the database-ID guard. The existing production HMAC secret was reused. The custom domain and daily cron remain configured.

## Automated and HTTPS checks

27 Worker tests and 12 configuration tests passed. TypeScript, generated-binding verification, Wrangler deployment dry run, and diff whitespace checks passed.

| OPTIONS origin | Status | Access-Control-Allow-Origin |
| --- | --- | --- |
| `chrome-extension://emicomnfbabkhcpphlihhbddhlmkdhfk` | 204 | Exact requested origin |
| `chrome-extension://eoiplhjpakggmbahkkkcaacdcbdfklbf` | 204 | Exact requested origin |
| `https://unlisted.example` | 403 | Absent |

Each HTTPS check requested the `POST` method and `content-type` header. Allowed responses advertised `POST, OPTIONS` and `content-type`.

## Actual Chrome request

Requests were entered through the native DevTools UI on the installed extension's options page, with this origin visible in the console output:

```text
chrome-extension://eoiplhjpakggmbahkkkcaacdcbdfklbf
```

| Browser request | Status | Fetch response type | Readable body |
| --- | --- | --- | --- |
| `OPTIONS /v1/events` | 204 | `cors` | Empty |
| `POST /v1/events`, JSON body `{}` | 400 | `cors` | `{"error":"invalid_request"}` |

The readable POST error confirms the browser's automatic JSON preflight and subsequent response passed CORS. The deliberately invalid payload is rejected before analytics writes; no test event was added to production data. This check does not verify successful production event persistence or add automatic reporting to the extension.

The installed extension was a development build whose options assets referenced `localhost:3000`. Those assets failed to load and the settings view was blank before the API requests. API connectivity was verified from the extension origin despite that separate local-development issue; settings rendering was not verified in this check.

## Subsequent valid production request and extension update

Later on 2026-10-27, the user explicitly requested one real API request and confirmed loading `apps/extension/dist/chrome-mv3` in the nianchen Chrome profile. The extension ID remained `eoiplhjpakggmbahkkkcaacdcbdfklbf`, matching `DEV_ID` in both the local `.dev.vars` and deployed origin configuration. No further deployment was needed for this ID.

One valid `POST /v1/events` was submitted through the extension's native DevTools console using a dedicated synthetic UUID v4 and `event: "translation_success"`. It was a manual API check; it did not send draft text or enable automatic usage reporting. Read-only queries against production D1 before and after the request confirmed:

| UTC date 2026-10-27 | Before | After |
| --- | --- | --- |
| Installations | 0 | 1 |
| Successful translations | 0 | 1 |
| Replacements | 0 | 0 |
| Translation errors | 0 | 0 |

A final query confirmed the counts stayed at one installation and one translation, with no duplicate event. This production test record remains in the database.

After the update took effect, the settings page rendered normally with `config for X` and the Privacy & Analytics section. The statistics switch remained Off. A subsequent manual `OPTIONS` request from that updated extension produced the `NativeType production check` console entry; the user confirmed its status was `204`.

The POST response status was not captured before the original console closed. Production persistence is established by the D1 before/after checks. Browser URL policy subsequently denied acquiring the extension page to read logs; no alternate browser surface was used after that denial. The final OPTIONS status is user-confirmed. These checks do not verify the automatic X-to-Background reporting flow.
