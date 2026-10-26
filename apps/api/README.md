# @nativetype/api

Planned Cloudflare Workers backend for NativeType. Nothing in this package is implemented or deployed.

The extension does not call this API. There is no Worker config, production hostname, D1 database, or secret.

Later work can add:

- `POST /v1/events` for anonymous usage analytics
- `POST /v1/translate` for an online translation API
- Cloudflare D1 for analytics and other stored data

Those routes, the Worker framework, and any deployment stay out of this package until that work starts. Shared request and event types belong in `@nativetype/contracts`.
