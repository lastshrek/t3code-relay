# Product analytics

The server owns product analytics delivery. In this customized build analytics are opt-in and
disabled by default (`T3CODE_TELEMETRY_ENABLED=true` is required). Clients never load the PostHog
browser SDK, PostHog person profiles stay disabled, and visiting hosted web without an authenticated
connection does not count as product use.

## Identity

- When explicitly enabled, `distinct_id`/`installId` is derived from a random installation id.
  The identity file is not read or created while analytics are off.
- No T3 Connect, Codex, Claude, provider-account, or client-device identity is read or attached to
  analytics. Connection URLs carry descriptive client metadata only, not account or device hashes.

## Attribution boundaries

- Client dimensions (`surface`, etc.) belong to the event's WebSocket connection, never a
  server-global "current client". Keep client and server dimensions separate, and leave missing
  client metadata unknown rather than backfilling from server properties.
- Active-use reports count `client.turn.requested` (deduplicated by command ID), not connections
  (T3 Connect sessions renew hourly).

## Collection boundary and delivery

- Payloads stay strictly to product metadata, closed contract enums, and normalized measurements:
  never attach prompts, file paths, credentials, raw provider payloads, device names, conversation
  IDs, or user-named provider instance IDs. Models in the bundled manifest or a vendor's own
  model list report their catalog slug, with aliases and routed IDs mapped to it. Any other model
  ID can name a user, a deployment, or a local file, so it reports only `custom:<driver>`.
- The sole exception is opt-in `agent.feedback`, which
  [`FeedbackService`](../../apps/server/src/feedback/FeedbackService.ts) scrubs of paths, private
  values, and secret-shaped strings, and only attaches bounded conversation traces when the user
  explicitly previews and sends them. Each report is sent under its own id without `installId` or
  host properties, in a request of its own, so it links to no install or other report; reports sent
  without a preview carry only their categories.
- Delivery ([`AnalyticsService.ts`](../../apps/server/src/telemetry/AnalyticsService.ts)) attaches a
  UUID per event, backs off on failure, and drops batches after bounded retries so a stuck batch
  cannot loop forever.
- Product analytics and relay tracing default to off in this customized build; explicitly set
  `T3CODE_TELEMETRY_ENABLED=true` to opt in.
